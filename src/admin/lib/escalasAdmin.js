import { interpretarSWLS } from '../../config/escalas'

// Configuración de las escalas complementarias para el panel admin
export const ESCALAS_ADMIN = {
  swls: {
    id:          'swls',
    tabla:       'resultados_swls',
    nombre:      'SWLS',
    descripcion: 'Escala de Satisfacción con la Vida · 5 ítems (1–7) · rango 5–35',
    tipos:       ['basal', 'final_8sem', 'seguimiento_12sem', 'voluntaria'],
    nItems:      5,
    puntajeMax:  35,
    interpretar: interpretarSWLS,
  },
  sus: {
    id:          'sus',
    tabla:       'resultados_sus',
    nombre:      'SUS',
    descripcion: 'Escala de Usabilidad del Sistema · 10 ítems (1–5) · rango 0–100 · solo semana 8',
    tipos:       ['final_8sem', 'voluntaria'],
    nItems:      10,
    puntajeMax:  100,
    interpretar: sinInterpretacion, // la tesis no define categorías de interpretación para la SUS
  },
}

function sinInterpretacion() { return null }

export function interpretarBAI(score) {
  if (score == null) return null
  if (score <= 7)  return 'Mínima'
  if (score <= 15) return 'Leve'
  if (score <= 25) return 'Moderada'
  return 'Grave'
}
