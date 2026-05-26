import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DRAFT_KEY = 'episodio_draft' // { id, paso }

export function useEpisodios() {
  const [episodios, setEpisodios] = useState([])
  const [cargando, setCargando] = useState(true)

  const fetchEpisodios = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('episodios_ansiedad')
      .select('*')
      .order('fecha_inicio', { ascending: false })
    setEpisodios(data ?? [])
    setCargando(false)
  }, [])

  useEffect(() => { fetchEpisodios() }, [fetchEpisodios])

  // upsert episodio (client generates UUID on first save)
  const guardarEpisodio = async (episodioData) => {
    if (!supabase) return null
    // Remove fields managed by trigger
    const { user_id, participante_id, ...rest } = episodioData
    const { data, error } = await supabase
      .from('episodios_ansiedad')
      .upsert(rest, { onConflict: 'id' })
      .select()
      .single()
    if (!error) {
      await fetchEpisodios()
      return data
    }
    return null
  }

  const eliminarEpisodio = async (id) => {
    if (!supabase) return
    await supabase.from('episodios_ansiedad').delete().eq('id', id)
    await fetchEpisodios()
  }

  // localStorage draft helpers
  const getDraft = () => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) } catch { return null }
  }
  const saveDraftRef = (id, paso) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ id, paso }))
  }
  const clearDraft = () => localStorage.removeItem(DRAFT_KEY)

  return { episodios, cargando, guardarEpisodio, eliminarEpisodio, getDraft, saveDraftRef, clearDraft, recargar: fetchEpisodios }
}

// Stats helpers
export function calcularEstadisticas(episodios) {
  const completados = episodios.filter(e => e.completado)
  const ahora = new Date()
  const hace4sem = new Date(ahora - 28 * 86400000)
  const hace8sem = new Date(ahora - 56 * 86400000)
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)

  const esteMes = completados.filter(e => new Date(e.fecha_inicio) >= inicioMes).length
  const mesPasado = completados.filter(e => {
    const f = new Date(e.fecha_inicio); return f >= inicioMesAnterior && f < inicioMes
  }).length

  const ult4sem = completados.filter(e => new Date(e.fecha_inicio) >= hace4sem)
  const prev4sem = completados.filter(e => {
    const f = new Date(e.fecha_inicio); return f >= hace8sem && f < hace4sem
  })

  const avgIntensidad = (arr) => arr.length
    ? arr.reduce((s, e) => s + e.intensidad_numerica, 0) / arr.length
    : null

  const avgDuracion = completados.filter(e => e.duracion_minutos != null).length
    ? completados.filter(e => e.duracion_minutos != null)
        .reduce((s, e) => s + e.duracion_minutos, 0) /
      completados.filter(e => e.duracion_minutos != null).length
    : null

  // Estrategia más usada
  const estrategiaCount = {}
  completados.forEach(e => {
    ;(e.estrategias_aplicadas ?? []).forEach(s => {
      if (s !== 'nada') estrategiaCount[s] = (estrategiaCount[s] ?? 0) + 1
    })
  })
  const estrategiaMasUsada = Object.entries(estrategiaCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const efectividades = completados.filter(e => e.efectividad_estrategia != null)
  const avgEfectividad = efectividades.length
    ? efectividades.reduce((s, e) => s + e.efectividad_estrategia, 0) / efectividades.length
    : null

  // Episodios por semana (últimas 12 semanas)
  const semanas = []
  for (let i = 11; i >= 0; i--) {
    const ini = new Date(ahora - (i + 1) * 7 * 86400000)
    const fin = new Date(ahora - i * 7 * 86400000)
    const eps = completados.filter(e => {
      const f = new Date(e.fecha_inicio); return f >= ini && f < fin
    })
    const avgInt = eps.length ? eps.reduce((s, e) => s + e.intensidad_numerica, 0) / eps.length : 0
    semanas.push({ label: `S${12 - i}`, count: eps.length, avgIntensidad: avgInt, ini, fin })
  }

  // Distribución de estrategias
  const totalEstrategias = Object.values(estrategiaCount).reduce((s, v) => s + v, 0)
  const pieData = Object.entries(estrategiaCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => ({ label: ESTRATEGIA_LABEL[k] ?? k, value: v, pct: totalEstrategias ? v / totalEstrategias : 0 }))

  return { esteMes, mesPasado, avgIntensidad: avgIntensidad(ult4sem), avgIntensidadPrev: avgIntensidad(prev4sem), avgDuracion, estrategiaMasUsada, avgEfectividad, semanas, pieData }
}

export const ESTRATEGIA_LABEL = {
  respiracion_478: 'Respiración 4-7-8',
  grounding_54321: 'Grounding 5-4-3-2-1',
  relajacion_muscular: 'Relajación muscular',
  mindfulness: 'Mindfulness',
  visualizacion_guiada: 'Visualización',
  chat_ia: 'Chat con IA',
  contacto_profesional: 'Prof. de apoyo',
  contacto_personal: 'Contacto personal',
  respiro_solo: 'Respiré solo',
  distraccion: 'Distracción',
  hable_alguien: 'Hablé con alguien',
  espere: 'Esperé que pasara',
  busque_informacion: 'Busqué info',
  otra: 'Otra',
  nada: 'Nada',
}

export const INTENSIDAD_CONFIG = {
  leve:    { label: 'Leve',    color: 'text-green-600',  bg: 'bg-green-100',  dot: '#22c55e' },
  moderada:{ label: 'Moderada',color: 'text-amber-600',  bg: 'bg-amber-100',  dot: '#f59e0b' },
  severa:  { label: 'Severa',  color: 'text-red-600',    bg: 'bg-red-100',    dot: '#ef4444' },
}

export function intensidadDesdeNumero(n) {
  if (n <= 3) return 'leve'
  if (n <= 6) return 'moderada'
  return 'severa'
}

export function formatDuracion(min) {
  if (min == null) return 'desconocida'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function formatFechaRelativa(fecha) {
  const d = new Date(fecha), ahora = new Date()
  const dias = Math.floor((ahora - d) / 86400000)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  if (dias < 7) return `Hace ${dias} días`
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}
