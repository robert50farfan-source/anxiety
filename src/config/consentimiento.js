// Versión del consentimiento que se muestra y registra.
// v1.1 está redactada como BORRADOR (src/content/consentimiento/v1_1.js) y se
// activa cambiando esta constante, tras la aprobación del comité de ética.
// Al cambiarla, quienes aceptaron una versión anterior deberán aceptar la nueva.
export const VERSION_CONSENTIMIENTO_VIGENTE = 'v1.0'

// v1.0 promete que el investigador no accede al contenido de los mensajes del
// chat; desde v1.1 se declara que puede leerlos. La página Conversaciones del
// panel solo se habilita con una versión vigente que lo declare.
const VERSIONES_PERMITEN_LEER_CHAT = ['v1.1']
export const CONSENTIMIENTO_PERMITE_LEER_CHAT = VERSIONES_PERMITEN_LEER_CHAT.includes(VERSION_CONSENTIMIENTO_VIGENTE)
