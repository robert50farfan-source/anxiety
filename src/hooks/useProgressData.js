import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

export const TECNICA = {
  breathing478:  { name: 'Respiración 4-7-8',   icon: '🫁' },
  grounding:     { name: 'Grounding 5-4-3-2-1', icon: '🌿' },
  muscle:        { name: 'Relajación muscular',  icon: '💪' },
  mindfulness:   { name: 'Mindfulness',          icon: '🧘' },
  visualization: { name: 'Visualización',        icon: '🏞️' },
}

const MOOD_EMOJI  = ['', '😨', '😔', '😐', '🙂', '😊']
const DAY_LABELS  = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
}

export function relativeDate(dateStr) {
  const d    = new Date(dateStr)
  const diff = Math.floor((Date.now() - d) / 86400000)
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  if (diff === 0) return `Hoy, ${time}`
  if (diff === 1) return `Ayer, ${time}`
  return `Hace ${diff} días`
}

function weekLabel(days) {
  const opts = { day: 'numeric', month: 'short' }
  return `${new Date(days[0]).toLocaleDateString('es-ES', opts)} – ` +
         `${new Date(days[6]).toLocaleDateString('es-ES', opts)}`
}

// ─── Main fetcher ─────────────────────────────────────────────────────────────

async function fetchAll(userId) {
  const days7      = getLast7Days()
  const weekStart  = `${days7[0]}T00:00:00`

  const [
    { data: episodes = [] },
    { data: profile },
    { count: breathingTotal },
  ] = await Promise.all([
    supabase
      .from('episodios')
      .select('id, tecnica_usada, estado_emocional, duracion_minutos, fecha')
      .eq('user_id', userId)
      .gte('fecha', weekStart)
      .order('fecha', { ascending: false }),

    supabase
      .from('perfiles')
      .select('dias_racha, ejercicios_completados')
      .eq('id', userId)
      .single(),

    supabase
      .from('episodios')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('tecnica_usada', 'breathing478'),
  ])

  // Group episodes by date for chart + streak
  const byDate = {}
  episodes.forEach(ep => {
    const d = ep.fecha.slice(0, 10)
    ;(byDate[d] = byDate[d] ?? []).push(ep)
  })

  // ── Summary ────────────────────────────────────────────────────────────────
  const activeDays     = Object.keys(byDate).length
  const totalExercises = episodes.length
  const totalMinutes   = episodes.reduce((s, e) => s + (e.duracion_minutos ?? 0), 0)

  // ── Chart: avg mood per day (1–5 scale) ────────────────────────────────────
  const weekChart = days7.map(date => {
    const eps    = byDate[date] ?? []
    const moods  = eps.map(e => e.estado_emocional).filter(Boolean)
    const avg    = moods.length ? moods.reduce((s, v) => s + v, 0) / moods.length : null
    return { date, dayLabel: DAY_LABELS[new Date(date).getDay()], moodAvg: avg }
  })

  // ── Streak calendar: last 7 days ───────────────────────────────────────────
  const streak     = profile?.dias_racha ?? 0
  const streakDays = days7.map(date => ({
    dayLabel:    DAY_LABELS[new Date(date).getDay()],
    hasActivity: !!byDate[date],
  }))

  // ── Achievements ───────────────────────────────────────────────────────────
  const totalEver    = profile?.ejercicios_completados ?? 0
  const breathingN   = breathingTotal ?? 0

  const achievements = [
    {
      icon: '🌱', title: 'Primer ejercicio',
      desc: 'Completaste tu primer ejercicio',
      earned: totalEver >= 1,
    },
    {
      icon: '🔥', title: 'Racha de 5 días',
      desc: '5 días consecutivos practicando',
      earned: streak >= 5,
    },
    {
      icon: '🧘', title: 'Maestro de la calma',
      desc: '20 ejercicios completados',
      earned: totalEver >= 20,
      progress: Math.min(totalEver, 20), total: 20,
    },
    {
      icon: '🌊', title: 'Respiración experta',
      desc: '10 sesiones de respiración 4-7-8',
      earned: breathingN >= 10,
      progress: Math.min(breathingN, 10), total: 10,
    },
  ]

  // ── Recent activity (last 5 of the week) ──────────────────────────────────
  const recentActivity = episodes.slice(0, 5).map(ep => ({
    id:        ep.id,
    ...(TECNICA[ep.tecnica_usada] ?? { name: ep.tecnica_usada, icon: '📋' }),
    date:      relativeDate(ep.fecha),
    duration:  ep.duracion_minutos ? `${ep.duracion_minutos} min` : null,
    moodEmoji: MOOD_EMOJI[ep.estado_emocional] ?? '',
  }))

  return {
    activeDays, totalExercises, totalMinutes,
    weekChart, streak, streakDays,
    achievements, recentActivity,
    weekLabel: weekLabel(days7),
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProgressData() {
  const { userId }      = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    if (!userId || !supabase) { setLoading(false); return }
    setLoading(true)
    setError(false)
    fetchAll(userId)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [userId])

  return { data, loading, error }
}
