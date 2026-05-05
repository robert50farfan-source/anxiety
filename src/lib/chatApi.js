import { supabase } from './supabase'

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT_TEMPLATE = `Eres el asistente de apoyo emocional de la app Calma, \
diseñada para estudiantes universitarios con ansiedad.

ROL Y LÍMITES:
- Eres un apoyo emocional, NO un terapeuta ni médico
- Nunca diagnosticas ni recetas medicamentos
- Complementas, no reemplazas, la ayuda profesional
- Si el usuario necesita ayuda urgente, siempre derivas

PERSONALIDAD:
- Cálido, empático, paciente y sin juicios
- Usas lenguaje simple y cercano, nunca clínico
- Validas la emoción ANTES de ofrecer cualquier técnica
- Respuestas cortas (3-4 oraciones máximo por mensaje)
- Nunca dices "entiendo perfectamente cómo te sientes"
- Sí dices frases como "tiene sentido que te sientas así"

FLUJO DE CONVERSACIÓN:
1. Primero escucha y valida
2. Luego pregunta qué necesita (desahogarse, técnica, info)
3. Ofrece ayuda concreta solo cuando el usuario la pide

DETECCIÓN DE CRISIS:
Si el usuario escribe frases como "no puedo más", "quiero desaparecer", \
"hacerme daño", "no tiene sentido seguir", "quiero morir" o similares:
- Responde con calma, sin alarmar
- Valida que está pasando algo muy difícil
- Incluye OBLIGATORIAMENTE el marcador literal [CRISIS_BLOCK] al final \
  del mensaje, sin excepciones y sin modificarlo

TÉCNICAS DISPONIBLES EN LA APP (sección Ejercicios):
- Respiración 4-7-8 (para crisis inmediatas)
- Grounding 5-4-3-2-1 (para disociación o terrores nocturnos)
- Relajación muscular progresiva (para tensión acumulada)
- Mindfulness (para ansiedad generalizada)
- Visualización guiada (para antes de dormir)

CONTEXTO DEL USUARIO:
{user_context}

HISTORIAL RECIENTE DE EPISODIOS:
{recent_episodes}`

export function buildSystemPrompt(userContext, recentEpisodes) {
  return SYSTEM_PROMPT_TEMPLATE
    .replace('{user_context}', userContext || 'Sin datos disponibles')
    .replace('{recent_episodes}', recentEpisodes || 'Sin episodios recientes')
}

// ─── User context builder ─────────────────────────────────────────────────────

const MOOD_LABELS = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien']

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function loadLocalStats() {
  try { return JSON.parse(localStorage.getItem('anxietyapp_stats') || '{}') }
  catch { return {} }
}

export async function buildContext(userId) {
  const stats   = loadLocalStats()
  const today   = getTodayKey()
  const moods   = stats[today]?.moods ?? []
  const lastMood = moods[moods.length - 1]

  const ctxLines = []

  if (lastMood) {
    ctxLines.push(`Estado emocional hoy: ${MOOD_LABELS[lastMood.level]} (${lastMood.level}/5)`)
    if (lastMood.note) ctxLines.push(`Desencadenante: "${lastMood.note}"`)
  } else {
    ctxLines.push('Estado emocional hoy: No registrado')
  }

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
  ctxLines.push(`Días de racha activos: ${streak}`)

  let recentEpisodes = 'Sin episodios registrados esta semana'

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
        ctxLines.push(`Ejercicios esta semana: ${eps.length}`)

        // Most used technique
        const counts = {}
        eps.forEach(e => { counts[e.tecnica_usada] = (counts[e.tecnica_usada] ?? 0) + 1 })
        const [[top]] = Object.entries(counts).sort((a, b) => b[1] - a[1])
        ctxLines.push(`Técnica más usada: ${top}`)

        recentEpisodes = eps.slice(0, 5).map(e =>
          `- ${e.fecha.slice(0, 10)}: ${e.tecnica_usada}` +
          (e.estado_emocional ? `, ánimo ${e.estado_emocional}/5` : '')
        ).join('\n')
      }
    } catch { /* silent — context is optional */ }
  }

  return {
    userContext:     ctxLines.join('\n'),
    recentEpisodes,
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

export async function saveMessage(userId, rol, contenido) {
  if (!supabase || !userId) return
  try {
    await supabase.from('chat_mensajes').insert({ user_id: userId, rol, contenido })
  } catch { /* silent — message still visible in UI */ }
}

// ─── Claude API (via Supabase Edge Function) ──────────────────────────────────

export async function callChatProxy(messages, systemPrompt) {
  if (!supabase) throw new Error('supabase-unavailable')

  const { data, error } = await supabase.functions.invoke('chat-proxy', {
    body: { messages, systemPrompt },
  })

  if (error) throw error
  if (!data?.content) throw new Error('empty-response')
  return data.content // raw string, may contain [CRISIS_BLOCK]
}
