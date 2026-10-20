// ─── Instrumentos de medición complementarios al BAI ─────────────────────────
// Los textos son la versión en español declarada en la tesis; cualquier cambio
// debe documentarse como modificación del instrumento.

export const SWLS = {
  id:          'swls',
  tabla:       'resultados_swls',
  encabezado:  'Satisfacción con la vida',
  titulo:      'Cuestionario SWLS',
  subtitulo:   '5 afirmaciones sobre tu vida en general',
  icono:       '🌱',
  instruccion: 'A continuación hay cinco afirmaciones. Indica en qué medida estás de acuerdo con cada una. Responde con sinceridad; no hay respuestas correctas ni incorrectas.',
  pregunta:    '¿En qué medida estás de acuerdo con cada afirmación?',
  items: [
    'En la mayoría de los aspectos, mi vida es como yo quiero que sea.',
    'Las circunstancias de mi vida son muy buenas.',
    'Estoy satisfecho/a con mi vida.',
    'Hasta ahora he conseguido de la vida las cosas que considero importantes.',
    'Si pudiera vivir mi vida otra vez, no cambiaría casi nada.',
  ],
  opciones: [
    { value: 1, label: 'Totalmente en desacuerdo' },
    { value: 2, label: 'En desacuerdo' },
    { value: 3, label: 'Ligeramente en desacuerdo' },
    { value: 4, label: 'Ni de acuerdo ni en desacuerdo' },
    { value: 5, label: 'Ligeramente de acuerdo' },
    { value: 6, label: 'De acuerdo' },
    { value: 7, label: 'Totalmente de acuerdo' },
  ],
}

// Interpretación (solo panel admin; no se muestra al participante)
export function interpretarSWLS(score) {
  if (score == null) return null
  if (score >= 31) return 'Extremadamente satisfecho'
  if (score >= 26) return 'Satisfecho'
  if (score >= 21) return 'Ligeramente satisfecho'
  if (score === 20) return 'Neutral'
  if (score >= 15) return 'Ligeramente insatisfecho'
  if (score >= 10) return 'Insatisfecho'
  return 'Extremadamente insatisfecho'
}
