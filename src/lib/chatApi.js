import { supabase } from './supabase'

// ─── User context builder ─────────────────────────────────────────────────────
// El system prompt TCC vive en la Edge Function (server-side).
// Aquí solo se envía lo que vive en localStorage (ánimo y racha); ejercicios
// y episodios los lee chat-proxy desde la BD.

const MOOD_LABELS = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien']

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function loadLocalStats() {
  try { return JSON.parse(localStorage.getItem('anxietyapp_stats') || '{}') }
  catch { return {} }
}

export function buildContext() {
  const stats    = loadLocalStats()
  const today    = getTodayKey()
  const moods    = stats[today]?.moods ?? []
  const lastMood = moods[moods.length - 1]

  // Streak from localStorage
  let streak = 0
  const cursor = new Date()
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().slice(0, 10)
    if (i === 0 && !stats[key]?.exercises) break
    if (!stats[key]?.exercises) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return {
    mood:     lastMood ? `${MOOD_LABELS[lastMood.level]} (${lastMood.level}/5)` : null,
    moodNote: lastMood?.note ?? null,
    streak,
  }
}

// ─── Supabase chat history ────────────────────────────────────────────────────

function parseDbMessage(msg) {
  const hasCrisis = msg.contenido?.includes('[CRISIS_BLOCK]') ?? false
  return {
    ...msg,
    contenido: (msg.contenido ?? '').replace('[CRISIS_BLOCK]', '').trim(),
    hasCrisis,
  }
}

export async function loadChatHistory(userId) {
  if (!supabase || !userId) return []
  try {
    const { data } = await supabase
      .from('chat_mensajes')
      .select('id, rol, contenido, fecha')
      .eq('user_id', userId)
      .order('fecha', { ascending: false })
      .limit(20)
    return (data ?? []).reverse().map(parseDbMessage)
  } catch {
    return []
  }
}

// ─── Claude API (via Supabase Edge Function) ──────────────────────────────────
// chat-proxy lee el historial y guarda ambos mensajes en chat_mensajes.

export async function callChatProxy(message, context) {
  if (!supabase) throw new Error('supabase-unavailable')

  const { data, error } = await supabase.functions.invoke('chat-proxy', {
    body: { message, context },
  })

  if (error) {
    if (error.context?.status === 429) throw new Error('rate-limited')
    throw error
  }
  if (!data?.content) throw new Error('empty-response')
  return data.content // raw string, may contain [CRISIS_BLOCK]
}
