import { useCallback, useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { traerTodo } from '../lib/traerTodo'

// Mediciones de una escala complementaria (SWLS, SUS) con código y grupo del participante.
// `interpretar(score)` devuelve la etiqueta de interpretación (solo admin).
export function useEscalaAdmin(tabla, interpretar) {
  const [mediciones, setMediciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true); setError(null)
    try {
      const filas = await traerTodo(() => supabaseAdmin
        .from(tabla)
        .select('*, participantes!participante_id(codigo_participante, grupo)')
        .not('participante_id', 'is', null)
        .order('fecha', { ascending: false }))
      setMediciones(filas.map(m => ({
        ...m,
        codigo_participante: m.participantes?.codigo_participante ?? '—',
        grupo: m.participantes?.grupo ?? null,
        interpretacion: interpretar ? interpretar(m.puntaje_total) : null,
      })))
    } catch (err) {
      setError(err.message)
    }
    setCargando(false)
  }, [tabla, interpretar])

  useEffect(() => { cargar() }, [cargar])

  return { mediciones, cargando, error, cargar }
}
