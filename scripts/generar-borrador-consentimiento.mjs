// Genera docs/consentimiento-v1.1-borrador.md a partir de v1_1.js, marcando
// qué secciones cambian respecto al texto plano de v1.0.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SECCIONES, ENCABEZADO, TEXTO_PLANO_V1_1 } from '../src/content/consentimiento/v1_1.js'

// Uso: node scripts/generar-borrador-consentimiento.mjs
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const v10src = readFileSync(`${ROOT}/src/content/consentimiento/v1_0.jsx`, 'utf8')
const v10 = v10src.match(/TEXTO_PLANO_V1_0 = `([\s\S]*?)`/)[1]

const norm = s => s.replace(/\s+/g, ' ').trim()
// Secciones de v1.0 por título (primera línea en mayúsculas)
const seccionesV10 = {}
for (const parte of v10.split('\n---\n').slice(1)) {
  const [titulo, ...resto] = parte.trim().split('\n')
  seccionesV10[norm(titulo).toUpperCase()] = norm(resto.join('\n'))
}
const partesV11 = TEXTO_PLANO_V1_1.split('\n\n---\n\n').slice(1, -1)

const filas = []
const cuerpo = []
SECCIONES.forEach((s, i) => {
  const clave = s.titulo.toUpperCase()
  const [, ...resto] = partesV11[i].split('\n')
  const contenidoV11 = norm(resto.join('\n'))
  const previo = seccionesV10[clave]
  // Investigador y tutora están en el bloque de encabezado de v1.0 (antes del primer ---)
  const enEncabezadoV10 = previo === undefined && norm(v10.split('\n---\n')[0]).includes(contenidoV11)
  const estado = enEncabezadoV10 ? 'Sin cambios'
    : previo === undefined ? 'Nueva'
    : previo === contenidoV11 ? 'Sin cambios' : 'Modificada'
  filas.push(`| ${s.titulo} | ${estado} |`)

  const marca = estado === 'Sin cambios' ? '' : ` — **[${estado.toUpperCase()}]**`
  cuerpo.push(`### ${s.titulo}${marca}`)
  if (s.nota) cuerpo.push(`*${s.nota}*`)
  for (const b of s.bloques) {
    if (b.p) cuerpo.push(b.p)
    if (b.lista) cuerpo.push(b.lista.map(x => `- ${x}`).join('\n'))
    if (b.lineas) cuerpo.push(b.lineas.join('  \n'))
  }
  if (estado === 'Modificada') {
    cuerpo.push(`<details><summary>Texto en v1.0</summary>\n\n> ${previo}\n\n</details>`)
  }
})

const md = `# Consentimiento informado v1.1 — BORRADOR

**Estado:** pendiente de revisión por el comité de ética. **No vigente**: la app sigue mostrando y registrando la v1.0.
**Fuente:** \`src/content/consentimiento/v1_1.js\` (este documento se genera desde ese archivo; lo que se apruebe aquí es lo que verá el participante).

## Motivo de la nueva versión

1. La v1.0 afirma que el investigador no accede al contenido de los mensajes del chat. Para la seguridad de los participantes y para el análisis, el investigador necesita poder leer las conversaciones; el acceso queda registrado.
2. La v1.0 dice que la tutora accede solo a datos agregados; en la práctica tiene acceso de solo lectura a datos individuales identificados por código.
3. Se incorporan la SWLS y la SUS al plan de mediciones.
4. Se informa sobre los proveedores externos del chat (Anthropic) y del modo voz (ElevenLabs y el reconocimiento de voz del navegador).
5. Las alertas de crisis ahora también se envían cuando el chat detecta señales de riesgo, y el investigador podrá contactar al participante.
6. «Asignación a grupos» precisa que ambos grupos tienen los mismos ejercicios, cuestionarios y recursos, y que la única diferencia es el acceso al asistente (diseño de control activo).
7. Se informa dónde se almacenan los datos (Supabase, Estados Unidos), que el servidor web (Hostinger, Estados Unidos) registra la IP de conexión, y qué proveedores externos los procesan fuera de Bolivia (Anthropic, ElevenLabs, servicio de voz del navegador, Resend).

## Resumen de cambios por sección

| Sección | Estado respecto a v1.0 |
|---|---|
${filas.join('\n')}

## Texto completo propuesto (v1.1)

**${ENCABEZADO.titulo}**
${ENCABEZADO.subtitulo}

${cuerpo.join('\n\n')}

---

*Versión del documento: v1.1 (borrador)*

## Al activarla

- Se cambia \`VERSION_CONSENTIMIENTO_VIGENTE\` a \`'v1.1'\` en \`src/config/consentimiento.js\`.
- Quien haya aceptado la v1.0 deberá leer y aceptar la v1.1 la próxima vez que abra la app; sus fechas del estudio no cambian.
- La página «Conversaciones» del panel se habilita automáticamente con la v1.1.
`

mkdirSync(`${ROOT}/docs`, { recursive: true })
writeFileSync(`${ROOT}/docs/consentimiento-v1.1-borrador.md`, md)
console.log(filas.join('\n'))
