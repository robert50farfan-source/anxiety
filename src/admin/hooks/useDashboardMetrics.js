import { useCallback, useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'

function hace7dias() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

function inicioSemanaActual() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// Retorna { count } o null si la tabla no existe o hay error
async function contarSeguro(tabla, filtros = []) {
  if (!supabaseAdmin) return null
  try {
    let q = supabaseAdmin.from(tabla).select('*', { count: 'exact', head: true })
    for (const [col, op, val] of filtros) {
      q = q.filter(col, op, val)
    }
    const { count, error } = await q
    if (error) return null
    return count
  } catch {
    return null
  }
}

// Últimos eventos de un tipo, defensivo ante tabla inexistente
async function ultimosEventos(tabla, columnaFecha, columnaUsuario, tipo, icono, limite = 5) {
  if (!supabaseAdmin) return []
  try {
    const { data, error } = await supabaseAdmin
      .from(tabla)
      .select(`${columnaFecha}, ${columnaUsuario}`)
      .order(columnaFecha, { ascending: false })
      .limit(limite)
    if (error || !data) return []
    return data.map(row => ({
      tipo,
      icono,
      participante: String(row[columnaUsuario] ?? '').slice(0, 8).toUpperCase(),
      timestamp: row[columnaFecha],
    }))
  } catch {
    return []
  }
}

export function useDashboardMetrics() {
  const [metricas, setMetricas] = useState({
    participantesTotales: null,
    participantesActivos: null,
    eventosCrisis: null,
    baiCompletados: null,
  })
  const [actividadReciente, setActividadReciente] = useState([])
  const [configuracion, setConfiguracion] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [
      totales,
      activosRaw,
      crisis,
      bai,
      config,
      evEpisodios,
      evPerfiles,
    ] = await Promise.all([
      // Participantes totales
      contarSeguro('perfiles'),
      // Participantes activos: episodios distintos últimos 7 días
      // (no hay COUNT DISTINCT en supabase-js, así que traemos IDs y deduplicamos)
      supabaseAdmin
        ? supabaseAdmin
            .from('episodios')
            .select('user_id')
            .gte('fecha', hace7dias())
            .then(({ data, error }) => {
              if (error || !data) return null
              return new Set(data.map(r => r.user_id)).size
            })
            .catch(() => null)
        : Promise.resolve(null),
      // Eventos de crisis últimos 7 días (tabla puede no existir)
      contarSeguro('eventos_crisis', [['timestamp', 'gte', hace7dias()]]),
      // BAI completados esta semana
      contarSeguro('bai_respuestas', [['fecha', 'gte', inicioSemanaActual()]]),
      // Configuración del estudio
      supabaseAdmin
        ? supabaseAdmin
            .from('configuracion_estudio')
            .select('*')
            .single()
            .then(({ data }) => data)
            .catch(() => null)
        : Promise.resolve(null),
      // Actividad: episodios recientes
      ultimosEventos('episodios', 'fecha', 'user_id', 'Ejercicio completado', '🧘', 5),
      // Actividad: registros nuevos
      ultimosEventos('perfiles', 'created_at', 'id', 'Nuevo participante', '👤', 5),
    ])

    setMetricas({
      participantesTotales: totales,
      participantesActivos: activosRaw,
      eventosCrisis: crisis,
      baiCompletados: bai,
    })
    setConfiguracion(config)

    // Combinar y ordenar por timestamp desc, top 10
    const todo = [...evEpisodios, ...evPerfiles]
      .filter(e => e.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10)
    setActividadReciente(todo)
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return { metricas, actividadReciente, configuracion, cargando, recargar: cargar }
}
