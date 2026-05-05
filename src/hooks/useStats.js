import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// ─── localStorage helpers (offline / fallback) ───────────────────────────────

const STORAGE_KEY = 'anxietyapp_stats'

function getTodayKey() {
  return new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
}

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

function saveStats(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function calcStreak(data) {
  let streak = 0
  const cursor = new Date()
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().slice(0, 10)
    if (i === 0 && !data[key]?.exercises) break
    if (!data[key]?.exercises) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

// Returns local-timezone day boundaries as ISO strings for Supabase range queries
function localDayBounds() {
  const d = new Date()
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
  const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
  return { start: start.toISOString(), end: end.toISOString() }
}

async function fetchRemoteStats(userId) {
  if (!supabase || !userId) return null
  try {
    const { start, end } = localDayBounds()
    const [{ count }, { data: profile }] = await Promise.all([
      supabase
        .from('episodios')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('fecha', start)
        .lte('fecha', end),
      supabase
        .from('perfiles')
        .select('dias_racha')
        .eq('id', userId)
        .single(),
    ])
    return {
      todayExercises: count ?? 0,
      streak: profile?.dias_racha ?? 0,
    }
  } catch {
    return null
  }
}

async function writeEpisodio(userId, technique, meta) {
  if (!supabase || !userId) return
  try {
    await supabase.from('episodios').insert({
      user_id: userId,
      tecnica_usada: technique,
      estado_emocional: meta.moodLevel  ?? null,
      desencadenante:   meta.moodNote   || null,
      duracion_minutos: meta.durationMinutes ?? null,
    })
    await refreshProfileStats(userId)
  } catch (e) {
    console.warn('[supabase] write failed, localStorage only:', e.message)
  }
}

async function refreshProfileStats(userId) {
  const { data: profile } = await supabase
    .from('perfiles')
    .select('dias_racha, ultima_actividad, ejercicios_completados')
    .eq('id', userId)
    .single()

  if (!profile) return

  const today     = getTodayKey()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yStr = yesterday.toISOString().slice(0, 10)

  // Streak logic: same day → unchanged, yesterday → +1, older → reset to 1
  let newStreak = 1
  if (profile.ultima_actividad === today)  newStreak = profile.dias_racha
  else if (profile.ultima_actividad === yStr) newStreak = (profile.dias_racha ?? 0) + 1

  await supabase
    .from('perfiles')
    .update({
      dias_racha:             newStreak,
      ultima_actividad:       today,
      ejercicios_completados: (profile.ejercicios_completados ?? 0) + 1,
    })
    .eq('id', userId)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStats() {
  const { userId } = useAuth()
  const [localStats,  setLocalStats]  = useState(() => loadStats())
  const [remoteStats, setRemoteStats] = useState(null)

  const todayKey = getTodayKey()

  // Fetch remote stats once userId is available
  useEffect(() => {
    if (!userId || !supabase) return
    fetchRemoteStats(userId).then(data => { if (data) setRemoteStats(data) })
  }, [userId])

  // Primary = remote (Supabase), fallback = local (localStorage)
  const todayExercises = remoteStats?.todayExercises ?? localStats[todayKey]?.exercises ?? 0
  const streak         = remoteStats?.streak         ?? calcStreak(localStats)

  // Write mood to localStorage (no Supabase table for standalone moods)
  const logMood = (level, note = '') => {
    setLocalStats(prev => {
      const next = {
        ...prev,
        [todayKey]: {
          ...prev[todayKey],
          exercises: prev[todayKey]?.exercises ?? 0,
          moods: [...(prev[todayKey]?.moods ?? []), { level, note, ts: Date.now() }],
        },
      }
      saveStats(next)
      return next
    })
  }

  // Write exercise to localStorage AND Supabase
  const logExercise = async (name, meta = {}) => {
    // 1. Always write to localStorage first (instant, offline-safe)
    setLocalStats(prev => {
      const next = {
        ...prev,
        [todayKey]: {
          ...prev[todayKey],
          exercises:   (prev[todayKey]?.exercises ?? 0) + 1,
          exerciseLog: [...(prev[todayKey]?.exerciseLog ?? []), { name, ts: Date.now(), ...meta }],
        },
      }
      saveStats(next)
      return next
    })

    // 2. Write to Supabase and refresh displayed stats
    if (userId && supabase) {
      await writeEpisodio(userId, name, meta)
      const fresh = await fetchRemoteStats(userId)
      if (fresh) setRemoteStats(fresh)
    }
  }

  return { todayExercises, streak, logMood, logExercise }
}
