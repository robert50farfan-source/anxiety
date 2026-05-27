import { supabase } from './supabase'

// ─── User context builder ─────────────────────────────────────────────────────
// El system prompt TCC vive en la Edge Function (server-side).
// Aquí solo construimos el contexto estructurado que se envía como datos.

const MOOD_LABELS = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien']

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function loadLocalStats() {
  try { return JSON.parse(localStorage.getItem('anxietyapp_stats') || '{}') }
  catch { return {} }
}

export async function buildContext(userId) {
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

  const context = {
    mood:             lastMood ? `${MOOD_LABELS[lastMood.level]} (${lastMood.level}/5)` : null,
    moodNote:         lastMood?.note ?? null,
    streak,
    ejerciciosSemana: null,
    tecnicaMasUsada:  null,
    episodiosRecientes: null,
  }

  if (supabase && userId) {
    try {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const { data: eps } = await supabase
        .from('episodios')
        .select('tecnica_usada, estado_emocional, fecha')
        .eq('user_id', userId)
        .gte('fecha', weekAgo.toISOString())
        .order('fecha', { ascending: false })
        .limit(10)

      if (eps?.length) {
        context.ejerciciosSemana = eps.length

        const counts = {}
        eps.forEach(e => { counts[e.tecnica_usada] = (counts[e.tecnica_usada] ?? 0) + 1 })
        context.tecnicaMasUsada = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]

        context.episodiosRecientes = eps.slice(0, 5).map(e =>
          `- ${e.fecha.slice(0, 10)}: ${e.tecnica_usada}` +
          (e.estado_emocional ? `, ánimo ${e.estado_emocional}/5` : '')
        ).join('\n')
      }
    } catch { /* silent — context is optional */ }
  }

  return context
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

export async function saveMessage(userId, rol, contenido) {
  if (!supabase || !userId) return
  try {
    await supabase.from('chat_mensajes').insert({ user_id: userId, rol, contenido })
  } catch { /* silent — message still visible in UI */ }
}

// ─── Claude API (via Supabase Edge Function) ──────────────────────────────────

export async function callChatProxy(messages, context) {
  if (!supabase) throw new Error('supabase-unavailable')

  const { data, error } = await supabase.functions.invoke('chat-proxy', {
    body: { messages, context },
  })

  if (error) throw error
  if (!data?.content) throw new Error('empty-response')
  return data.content // raw string, may contain [CRISIS_BLOCK]
}
