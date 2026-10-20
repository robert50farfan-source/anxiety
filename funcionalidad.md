# AppAnxiety — Resumen de Funcionalidad

## Propósito General

Plataforma web progresiva (PWA) de salud mental para **estudiantes universitarios con ansiedad**, diseñada como instrumento de investigación clínica. Combina intervenciones de **Terapia Cognitivo-Conductual (TCC)** mediadas por IA, técnicas somáticas guiadas y seguimiento longitudinal de síntomas mediante el **Inventario de Ansiedad de Beck (BAI)**.

**Contexto de investigación:** Ensayo aleatorizado controlado de 12 semanas con:
- **Grupo experimental:** acceso a chat IA con TCC (texto y voz) + todas las funciones
- **Grupo control:** las mismas funciones (ejercicios, registro de episodios, BAI/SWLS/SUS, gestión de crisis) **sin el chat IA**

Diferencias entre grupos implementadas en la app:
- Pestaña de chat bloqueada para el grupo control (y rechazada también en el servidor)
- Opciones de estrategias distintas en el registro de episodios (ver sección 4)
- Tras un ejercicio, solo al grupo experimental se le sugiere registrar un episodio (máx. una vez al día)

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 6, Tailwind CSS 3.4 |
| Routing | React Router 6 |
| Backend / DB | Supabase PostgreSQL + Auth anónima + RLS |
| IA | Anthropic Claude (haiku-4-5) vía Edge Function |
| Serverless | Supabase Edge Functions (Deno) |
| Push | Web Push API (VAPID) |
| Instrumentos | BAI, SWLS, SUS |
| Email | Resend API |
| PWA | Workbox 7 (Service Worker + offline) |

---

## Módulos Principales

### 1. Onboarding y Consentimiento

```
Código participante → Auth anónima Supabase
→ Consentimiento informado (v1.0, auditable: versión, fecha, user-agent y texto aceptado)
→ Evaluación inicial obligatoria: BAI basal → SWLS basal
  (bloquea el acceso desde el día 0 hasta completar ambas)
→ Acceso a app
```

- Códigos `EXP-XXX` / `CTR-XXX` determinan automáticamente el grupo
- Recuperación de sesión por código si hay logout
- La evaluación basal se exige **antes** de cualquier exposición a la intervención (chat IA)
- Cuentas que ya pasaron el día 3 sin SWLS basal (p. ej. de prueba): se les pide una vez por sesión, sin bloquear el uso

---

### 2. Home — Panel de Estado Emocional

- Selector de estado emocional diario (1-5 con emojis) con nota opcional
- Tarjeta "Evaluación de N semanas" cuando hay una evaluación de seguimiento pendiente (semanas 8 y 12)
- Botón **"Estoy en crisis"** → lanza guía de respiración inmediatamente
- Acceso rápido a 3 ejercicios frecuentes
- Botón de registro de episodio

---

### 3. Ejercicios Terapéuticos

| Técnica | Descripción |
|---------|-------------|
| **Respiración 4-7-8** | Animación de círculo sincronizada, audio por fase, 4 ciclos |
| **Grounding 5-4-3-2-1** | Anclaje sensorial guiado paso a paso |
| **Relajación muscular** | Técnica de Jacobson por grupos musculares |
| **Mindfulness** | Meditación configurable 5-20 min |
| **Visualización** | Guía de lugar seguro con audio |

Todos los ejercicios registran duración, mood asociado y actualización de racha.

---

### 4. Registro de Episodios de Ansiedad (asistente de 5 pasos)

1. Tipo de episodio (ansiedad / ataque de pánico) y momento de inicio
2. Intensidad (1-10, agrupada en leve / moderada / severa) y duración
3. Contexto (casa, aula, examen, laboratorio, transporte, situación social, trabajo, otro, prefiero no decir) + desencadenante (texto libre, opcional)
4. Síntomas físicos (9 opciones + otro) y emocionales (6 opciones + otro), selección múltiple
5. Estrategias aplicadas + efectividad (1-5: nada … mucho) y notas

> Las opciones de estrategias difieren entre grupos:
> - **Experimental:** técnicas de la app (respiración 4-7-8, grounding, relajación muscular, mindfulness, visualización), chat IA, contacto profesional, contacto personal, otra, nada
> - **Control:** respirar por su cuenta, distraerse, hablar con alguien, esperar, buscar información, contacto profesional, contacto personal, otra, nada

Auto-guardado en cada paso (localStorage + Supabase). Permite retomar, editar y borrar.

---

### 5. Chat IA con TCC

- Sistema de chat con **Claude (claude-haiku-4-5-20251001)**, máximo 512 tokens por respuesta
- System prompt TCC definido server-side (no visible ni modificable por el cliente); cualquier cambio constituye una modificación de la variable independiente
- **Historial:** el servidor lee los últimos 10 mensajes de la BD y guarda cada intercambio (el cliente no puede alterar la conversación)
- **Contexto insertado dinámicamente** (armado en el servidor): estado emocional del día y nota, racha, ejercicios de la última semana y técnica más usada, y episodios de ansiedad registrados en la última semana (tipo, intensidad, contexto, desencadenante, efectividad)
- Estilo: validación emocional antes de intervención, preguntas socráticas, reformulación equilibrada
- **Detección de crisis:** el modelo añade el marcador `[CRISIS_BLOCK]`; si no lo hace pero el mensaje contiene frases de riesgo, el servidor lo añade igualmente (respaldo por palabras clave) → UI muestra `CrisisCard` con recursos de emergencia; cada detección se registra como evento de crisis
- **Modo voz:** dictado por micrófono (reconocimiento de voz del navegador) y lectura en voz alta de las respuestas (ElevenLabs, con la voz del navegador como respaldo)
- Límites: 60 mensajes por participante cada 24 h; 2000 caracteres por mensaje
- Solo disponible para el grupo experimental

---

### 6. BAI (Beck Anxiety Inventory)

- 21 ítems en español, escala 0-3
- Score interpretado: Mínima (0-7) / Leve (8-15) / Moderada (16-25) / Grave (26+)
- **Trigger PostgreSQL auto-tipifica** cada medición por días desde inicio:

| Días | Tipo |
|------|------|
| 0-2 (o primera medición) | `basal` |
| 25-35 | `intermedia_4sem` |
| 53-63 | `final_8sem` |
| 81-91 | `seguimiento_12sem` |
| Fuera de ventana | `voluntaria` |

- Alertas automáticas: basal pendiente, score grave, tendencia ascendente (+5 pts)
- Primera medición siempre `basal` (con `ventana_esperada` solo si fue en días 0–2); duplicados de un tipo programado pasan a `voluntaria`
- El participante **sí ve** su puntaje BAI y la categoría al terminar (a diferencia de SWLS y SUS)
- Sin BAI basal al día 7, el participante pasa a estado `inactivo_sin_basal` y se avisa al investigador

---

### 6b. SWLS (Escala de Satisfacción con la Vida)

- 5 ítems en español, escala Likert 1–7; puntaje total 5–35 (columna generada en BD)
- Se aplica a **ambos grupos** en semana 0, 8 y 12 (no en semana 4)
- Tabla `resultados_swls` con RLS igual que el BAI; trigger `tipificar_swls_automatica`:

| Días | Tipo |
|------|------|
| 0-2 (o primera medición) | `basal` |
| 53-63 | `final_8sem` |
| 81-91 | `seguimiento_12sem` |
| Fuera de ventana / repetida | `voluntaria` |

- Máximo una medición por tipo programado (trigger + índice único); la fecha la fija el servidor
- **El participante no ve su puntaje** (para no influir en las respuestas); solo el panel admin muestra la interpretación:
  31–35 extremadamente satisfecho · 26–30 satisfecho · 21–25 ligeramente satisfecho · 20 neutral · 15–19 ligeramente insatisfecho · 10–14 insatisfecho · 5–9 extremadamente insatisfecho

### 6c. SUS (Escala de Usabilidad del Sistema)

- 10 ítems en español, escala 1–5 (Totalmente en desacuerdo … Totalmente de acuerdo)
- Se aplica **una sola vez**, a ambos grupos, en la ventana `final_8sem` (días 53–63), después del BAI y la SWLS
- Tabla `resultados_sus` con RLS igual que el BAI; trigger `tipificar_sus_automatica`: `final_8sem` en ventana (una por participante), cualquier otra → `voluntaria`
- Puntaje calculado en BD (columna generada): ítems impares (respuesta − 1), ítems pares (5 − respuesta), suma × 2,5 → 0–100
- El participante no ve su puntaje

### 6d. Evaluaciones de seguimiento (semanas 8 y 12)

- En ventana, Inicio muestra la tarjeta "Evaluación de N semanas" y el BAI de Progreso abre el flujo completo
- Flujo único: **semana 8: BAI → SWLS → SUS** · **semana 12: BAI → SWLS** (cada cuestionario enlaza con el siguiente)
- Un solo recordatorio push por ventana para todos los instrumentos

| Instrumento | Semana 0 | Semana 4 | Semana 8 | Semana 12 |
|---|---|---|---|---|
| BAI | ✓ | ✓ | ✓ | ✓ |
| SWLS | ✓ | — | ✓ | ✓ |
| SUS | — | — | ✓ | — |

---

### 7. Progreso

- Gráfico de estado emocional últimos 7 días
- Racha de días activos (visualización calendario)
- Sistema de logros desbloqueables
- Configuración de contacto de emergencia personal
- Notificaciones push: recordatorio diario a hora elegida
- Acceso a historial BAI y botón para nueva medición

---

### 8. Gestión de Crisis

```
Usuario presiona "Estoy en crisis"  → Guía de respiración inmediata
Chat detecta crisis (modelo o palabras clave) → CrisisCard en la conversación
   CrisisCard: botón de respiración + WhatsApp/llamada a contacto personal
   + directorio de profesionales de apoyo
   + línea nacional (800-10-4100 Bolivia)
→ Cada acción queda registrada en eventos_crisis
→ Email al investigador (Resend) al abrir la pantalla de crisis o contactar a un profesional
```

| Evento registrado | ¿Email al investigador? |
|---|---|
| Apertura de pantalla de crisis | Sí |
| Contacto a profesional de apoyo | Sí |
| Contacto a persona de confianza | No |
| Llamada a la línea nacional | No |
| Crisis detectada en el chat | No (visible en el panel) |

---

### 9. Panel de Administración (Investigadores)

- Dashboard: métricas generales, alertas activas (BAI + episodios)
- CRUD: participantes, administradores, profesionales de apoyo
- Visualización: mediciones por instrumento (pestañas BAI / SWLS / SUS) con tipo, fecha, puntaje e interpretación; episodios con filtros
- Ficha del participante con su historial BAI, SWLS y SUS
- **Exportación en formato largo** (CSV con BOM para SPSS, y JSON): una fila por participante × instrumento × medición, con grupo (EXP/CTR), tipo, fecha, días, ventana, total, interpretación e `item_1…item_21`
- Conversaciones del chat (solo investigador, auditado) con exportación CSV
- Log de eventos de crisis por participante
- Auditoría completa de acciones administrativas

---

## Edge Functions (Supabase / Deno)

| Función | Disparador | Descripción |
|---------|-----------|-------------|
| `chat-proxy` | POST desde cliente (JWT, solo grupo experimental) | Llama Anthropic API con contexto TCC; historial leído de BD; límite 60 msgs/día; detección de crisis con respaldo por palabras clave |
| `notificar-bai` | Cron 9 AM diario (header `x-cron-secret`) | Push por ventana de evaluación pendiente (BAI en semana 4; BAI + SWLS + SUS en semana 8; BAI + SWLS en semana 12); marca `inactivo_sin_basal` al día 7 |
| `notificar-crisis` | POST desde cliente (JWT) | Email al investigador al detectar crisis |
| `tts-proxy` | POST desde cliente (JWT, solo grupo experimental) | Voz ElevenLabs para el chat |
| `send-daily-reminder` | Cron configurable | Push diario de estado emocional a hora elegida |

---

## Seguridad y Auditabilidad

- Auth anónima trazable por código participante (sin nombre ni correo del participante)
- **Row-Level Security (RLS)** en las tablas de datos: cada participante ve solo los suyos; el investigador y la tutora leen todo (las conversaciones del chat, solo el investigador)
- Funciones `SECURITY DEFINER` para operaciones críticas (asignación de código, consentimiento, tipificación de mediciones)
- Puntajes de SWLS y SUS calculados en la BD y fecha de medición fijada por el servidor (el cliente no puede alterarlos)
- Edge Functions protegidas: las del participante exigen su sesión (JWT); la del cron exige un secreto
- Consentimiento auditado: versión, timestamp, user-agent y texto íntegro aceptado
- Bloqueo de acceso si el consentimiento no está vigente
- Auditoría de acciones del panel admin (incluye la consulta y exportación de conversaciones)

---

*PWA con Service Worker Workbox — los ejercicios funcionan offline; los cuestionarios (BAI, SWLS, SUS) y el chat requieren conexión.*
