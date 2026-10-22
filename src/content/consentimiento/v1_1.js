// ─── Consentimiento informado v1.1 — BORRADOR (no vigente) ───────────────────
// Pendiente de revisión por el comité de ética. Para activarlo, cambiar
// VERSION_CONSENTIMIENTO_VIGENTE en src/config/consentimiento.js.
//
// Fuente única: la pantalla (DocumentoConsentimiento) y el texto plano que se
// guarda como "texto aceptado" se generan de estas secciones, así no pueden
// diferir.
//
// Cambios respecto a v1.0:
//  - Qué datos recogemos: SWLS y SUS; el investigador puede leer los mensajes del chat.
//  - Confidencialidad: la tutora accede a datos individuales identificados solo por código.
//  - Dónde se guardan tus datos (nueva): Supabase en EE. UU.; Anthropic, ElevenLabs,
//    voz del navegador y Resend operan fuera de Bolivia.
//  - Uso de IA: no es profesional de salud; proveedor externo (Anthropic); lectura de
//    conversaciones por el investigador con registro de acceso.
//  - Modo voz (nuevo): ElevenLabs para lectura en voz alta; reconocimiento de voz del navegador.
//  - Manejo de emergencias: reemplaza "sin acceso al contenido de tus mensajes"; alerta por
//    email con código; el investigador podrá contactarte.

export const VERSION = 'v1.1'

export const SECCIONES = [
  {
    titulo: 'Investigador responsable',
    bloques: [{ lineas: [
      'MSc. Luis Robert Farfán Sivila',
      'Doctorado en Ciencias — Universidad Autónoma Juan Misael Saracho',
      'Correo: robert50.farfan@gmail.com',
      'Teléfono: 77894423',
    ] }],
  },
  {
    titulo: 'Tutora de tesis',
    bloques: [{ lineas: ['Ph.D. Liliana Ximena Ayarde Ponce'] }],
  },
  {
    titulo: 'Propósito del estudio',
    bloques: [{ p: 'Esta investigación evalúa si un asistente virtual inteligente puede ayudar a estudiantes universitarios de la Facultad de Ingeniería en Recursos Naturales y Tecnología a manejar episodios de ansiedad. Tu participación contribuirá al desarrollo de herramientas accesibles de apoyo emocional.' }],
  },
  {
    titulo: 'Qué datos recogemos',
    bloques: [
      { p: 'Durante el estudio se registrará la siguiente información:' },
      { lista: [
        'Tus respuestas al Inventario de Ansiedad de Beck (BAI), a la Escala de Satisfacción con la Vida (SWLS) y, en la semana 8, a la Escala de Usabilidad del Sistema (SUS).',
        'Registros de tu estado de ánimo y de episodios de ansiedad que reportes voluntariamente.',
        'Tu uso de los ejercicios disponibles en la aplicación (cuáles, cuándo, por cuánto tiempo).',
        'Si te corresponde acceso al chat con IA, los mensajes que intercambies. El investigador puede leerlos (ver «Uso de inteligencia artificial»).',
        'Fechas y horas de uso de la aplicación.',
      ] },
    ],
  },
  {
    titulo: 'Confidencialidad',
    bloques: [{ p: 'Tu identidad permanece anónima dentro de la aplicación. Esta no pide tu nombre, número de matrícula ni datos personales identificables. Solo el investigador principal conoce la asociación entre tu nombre y tu código de participante, mediante un registro físico resguardado bajo llave. Tu tutora de tesis tiene acceso de solo lectura a los datos del estudio, identificados únicamente por tu código de participante y nunca por tu nombre. Los resultados se publicarán de forma agregada, sin identificar a participantes individuales.' }],
  },
  {
    titulo: 'Dónde se guardan tus datos',
    bloques: [{ p: 'Tus respuestas y registros se guardan de forma segura en servidores ubicados en los Estados Unidos (Supabase). Las conversaciones con el asistente se procesan mediante Anthropic y, si usas el modo voz, mediante ElevenLabs y el servicio de voz de tu navegador. Las alertas de seguridad al investigador se envían por correo electrónico mediante Resend e incluyen solo tu código de participante. Estos proveedores también operan fuera de Bolivia. La aplicación no te pide tu nombre: en la base de datos te identificas únicamente con un código.' }],
  },
  {
    titulo: 'Riesgos',
    bloques: [{ p: 'La participación implica reflexionar sobre tu estado emocional, lo cual puede generar incomodidad temporal. Si en cualquier momento sientes malestar significativo, dispones de los recursos de ayuda profesional incluidos en la aplicación (línea nacional de salud mental y profesionales de apoyo del estudio). Puedes retirarte del estudio en cualquier momento sin consecuencias académicas ni de ningún tipo.' }],
  },
  {
    titulo: 'Beneficios',
    bloques: [{ p: 'Tendrás acceso a ejercicios de manejo de ansiedad basados en evidencia científica. Según el grupo al que seas asignado, podrías tener acceso adicional a un asistente conversacional con inteligencia artificial. No hay compensación económica por participar.' }],
  },
  {
    titulo: 'Asignación a grupos',
    bloques: [{ p: 'Esta investigación compara dos grupos de estudiantes. Tu asignación a un grupo es aleatoria y se hace antes de conocerte personalmente. Ambos grupos tienen acceso a los mismos ejercicios de manejo de ansiedad, cuestionarios y recursos de ayuda profesional. La única diferencia es el acceso al asistente conversacional. Al finalizar el estudio, si los resultados muestran beneficio, el grupo que no tuvo acceso podrá usar todas las funcionalidades.' }],
  },
  {
    titulo: 'Voluntariedad y retiro',
    bloques: [{ p: 'Tu participación es totalmente voluntaria. Puedes retirarte en cualquier momento eliminando la aplicación o contactando al investigador para que tus datos sean eliminados. Tu retiro no afecta tu situación académica de ninguna manera.' }],
  },
  {
    titulo: 'Uso de inteligencia artificial',
    nota: '(Solo aplica al grupo con acceso al chat conversacional)',
    bloques: [
      { p: 'El chat conversacional es un sistema de inteligencia artificial. NO es un profesional de la salud: no realiza diagnósticos, no receta tratamientos y no reemplaza la atención profesional. Es una herramienta de apoyo complementario.' },
      { p: 'Tus mensajes se procesan mediante un proveedor externo, Anthropic (modelo Claude Haiku), que los envía a sus servidores para generar las respuestas. Anthropic no usa estos mensajes para entrenar su modelo.' },
      { p: 'El investigador puede leer tus conversaciones con el asistente, con fines de seguridad (por ejemplo, ante señales de riesgo) y de investigación. Cada vez que el investigador consulta o exporta conversaciones, ese acceso queda registrado.' },
    ],
  },
  {
    titulo: 'Modo voz (opcional)',
    nota: '(Solo aplica al grupo con acceso al chat conversacional)',
    bloques: [
      { p: 'El chat ofrece un modo voz que puedes activar o no, según prefieras. Si lo usas:' },
      { lista: [
        'La lectura en voz alta envía el texto de las respuestas del asistente a un proveedor externo, ElevenLabs, que genera el audio.',
        'El dictado por micrófono usa el reconocimiento de voz de tu navegador, que puede procesar tu audio en servidores del fabricante del navegador (por ejemplo, Google en Chrome).',
      ] },
      { p: 'Puedes usar el chat solo por escrito, sin activar el modo voz.' },
    ],
  },
  {
    titulo: 'Manejo de emergencias',
    bloques: [
      { p: 'Si la aplicación detecta señales de crisis o de ideación de hacerte daño, te presentará recursos de ayuda profesional inmediata.' },
      { p: 'El investigador recibe una alerta por correo electrónico cuando abres la pantalla de crisis, cuando contactas a un profesional de apoyo o cuando el chat detecta señales de riesgo. La alerta indica tu código de participante (no tu nombre), la fecha, la hora y el tipo de evento, pero no el contenido de tus mensajes; el investigador puede revisarlo en el panel del estudio.' },
      { p: 'Ante señales de riesgo, el investigador podrá contactarte, directamente o a través del profesional de apoyo del estudio, para hacer un seguimiento de tu seguridad.' },
    ],
  },
  {
    titulo: 'Conservación y eliminación de datos',
    bloques: [{ p: 'Los datos se conservarán durante 5 años después de la publicación de la tesis, conforme a las normas de investigación de la universidad. Después de ese plazo se eliminarán de forma segura. Puedes solicitar la eliminación anticipada de tus datos en cualquier momento contactando al investigador.' }],
  },
  {
    titulo: 'Contacto',
    bloques: [
      { p: 'Para preguntas, aclaraciones o solicitudes relacionadas con tu participación:' },
      { lineas: ['Investigador responsable:', 'MSc. Luis Robert Farfán Sivila', 'robert50.farfan@gmail.com', '77894423'] },
    ],
  },
]

export const ENCABEZADO = {
  titulo:    'CONSENTIMIENTO INFORMADO PARA PARTICIPACIÓN EN INVESTIGACIÓN',
  subtitulo: 'Universidad Autónoma Juan Misael Saracho — Doctorado en Ciencias',
}

// Texto plano que se guarda en consentimientos.texto_aceptado
export function textoPlano({ secciones, encabezado, version }) {
  const partes = [`${encabezado.titulo}\n${encabezado.subtitulo}`]
  for (const s of secciones) {
    const lineas = [s.titulo.toUpperCase()]
    if (s.nota) lineas.push('', s.nota)
    for (const b of s.bloques) {
      lineas.push('')
      if (b.p) lineas.push(b.p)
      if (b.lista) lineas.push(...b.lista.map(x => `- ${x}`))
      if (b.lineas) lineas.push(...b.lineas)
    }
    partes.push(lineas.join('\n'))
  }
  partes.push(`Versión del documento: ${version}`)
  return partes.join('\n\n---\n\n')
}

export const TEXTO_PLANO_V1_1 = textoPlano({ secciones: SECCIONES, encabezado: ENCABEZADO, version: VERSION })
