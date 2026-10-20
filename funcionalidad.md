# AppAnxiety — Resumen de Funcionalidad

## Propósito General

Plataforma web progresiva (PWA) de salud mental para **estudiantes universitarios con ansiedad**, diseñada como instrumento de investigación clínica. Combina intervenciones de **Terapia Cognitivo-Conductual (TCC)** mediadas por IA, técnicas somáticas guiadas y seguimiento longitudinal de síntomas mediante el **Inventario de Ansiedad de Beck (BAI)**.

**Contexto de investigación:** Ensayo aleatorizado controlado de 12 semanas con:
- **Grupo experimental:** acceso a chat IA con TCC + todas las funciones
- **Grupo control:** acceso a ejercicios básicos sin IA

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
→ Consentimiento informado (v1.0, auditable con IP hash + user-agent)
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

- Selector de estado emocional diario (1-5 con emojis)
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

### 4. Registro de Episodios (Wizard 6 pasos)

1. Tipo de evento + intensidad (1-10)
2. Contexto (casa, aula, examen, social, trabajo, etc.)
3. Desencadenante (texto libre)
4. Síntomas físicos (9 opciones, multi-select)
5. Síntomas emocionales (7 opciones)
6. Estrategias aplicadas + efectividad (1-5)

> Las opciones de estrategias difieren entre grupos: el experimental incluye `chat_ia`, el control no.

Auto-guardado en cada paso (localStorage + Supabase). Permite retomar, editar y borrar.

---

### 5. Chat IA con TCC

- Sistema de chat con **Claude (haiku-4-5)**, máximo 512 tokens por respuesta
- System prompt definido server-side (no modificable por el cliente)
- **Contexto insertado dinámicamente:** mood del día, racha, ejercicios de la semana, episodios recientes, técnica más usada
- Estilo: validación emocional antes de intervención, preguntas socráticas, reformulación equilibrada
- **Detección de crisis:** frases clave → marcador `[CRISIS_BLOCK]` → UI muestra `CrisisCard` con recursos de emergencia
- Solo disponible para el grupo experimental

---

### 6. BAI (Beck Anxiety Inventory)

- 21 ítems en español, escala 0-3
- Score interpretado: Mínima (0-7) / Leve (8-15) / Moderada (16-25) / Grave (26+)
- **Trigger PostgreSQL auto-tipifica** cada medición por días desde inicio:

| Días | Tipo |
|------|------|
| 0-3 | `basal` |
| 25-35 | `intermedia_4sem` |
| 53-63 | `final_8sem` |
| 81-91 | `seguimiento_12sem` |
| Fuera de ventana | `voluntaria` |

- Alertas automáticas: basal pendiente, score grave, tendencia ascendente (+5 pts)
- Primera medición siempre `basal` (con `ventana_esperada` solo si fue en días 0–2); duplicados de un tipo programado pasan a `voluntaria`

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
Usuario presiona "Crisis" / IA detecta palabras clave
→ Guía de respiración inmediata
→ CrisisCard: botón ejercicio + WhatsApp/llamada a contacto personal
   + directorio de profesionales locales
   + línea nacional (800-10-4100 Bolivia)
→ Edge Function notifica al investigador vía email (Resend)
→ Evento registrado en BD
```

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

- Auth anónima trazable por código participante
- **Row-Level Security (RLS)** en todas las tablas: participantes ven solo sus datos
- Funciones `SECURITY DEFINER` para operaciones críticas
- Consentimiento auditado: versión, timestamp, IP hash, user-agent, texto íntegro aceptado
- Bloqueo de acceso si consentimiento no vigente

---

*PWA con Service Worker Workbox — funciona offline para ejercicios y registro local.*
