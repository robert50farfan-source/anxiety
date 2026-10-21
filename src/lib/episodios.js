// ─── Reglas del registro de episodios comunes a ambos grupos ──────────────────
// Lógica pura (sin React) para poder probarla aislada.

// Lista única de estrategias (control activo): la única diferencia permitida
// entre grupos es 'chat_ia', visible solo para el grupo experimental.
export const GRUPOS_ESTRATEGIAS = [
  { titulo: 'Técnicas de la app',  ids: ['respiracion_478', 'grounding_54321', 'relajacion_muscular', 'mindfulness', 'visualizacion_guiada', 'chat_ia'] },
  { titulo: 'Estrategias propias', ids: ['respiro_solo', 'distraccion', 'hable_alguien', 'espere', 'busque_informacion'] },
  { titulo: 'Apoyo',               ids: ['contacto_profesional', 'contacto_personal'] },
  { titulo: 'Otras',               ids: ['otra', 'nada'] },
]

export function gruposEstrategias(esExperimental) {
  return GRUPOS_ESTRATEGIAS.map(g => ({
    ...g,
    ids: esExperimental ? g.ids : g.ids.filter(id => id !== 'chat_ia'),
  }))
}

// Sugerencia de registrar un episodio tras un ejercicio: igual para ambos
// grupos, como máximo una vez al día. Devuelve true (y marca el día) si toca.
const CLAVE_FECHA = 'episodio_prompt_date'

export function tocaSugerirEpisodio(storage = globalThis.localStorage, hoy = new Date().toDateString()) {
  try {
    if (storage.getItem(CLAVE_FECHA) === hoy) return false
    storage.setItem(CLAVE_FECHA, hoy)
    return true
  } catch {
    return false
  }
}
