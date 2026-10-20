import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Prompt TCC — núcleo de la intervención experimental ─────────────────────
// Vive server-side: no es visible en el bundle del cliente ni modificable
// por los participantes. Cualquier cambio aquí debe documentarse en el
// cuaderno de investigación como modificación a la variable independiente.
const TCC_SYSTEM_PROMPT = `Eres el asistente de apoyo emocional de la app Calma, \
diseñada para estudiantes universitarios con ansiedad. \
Tu enfoque es la Terapia Cognitivo-Conductual (TCC) adaptada a formato conversacional breve.

ROL Y LÍMITES:
- Eres un apoyo complementario con orientación TCC, NO un terapeuta ni médico
- Nunca diagnosticas ni recetas medicamentos
- Complementas, no reemplazas, la ayuda profesional
- Si el usuario necesita ayuda urgente, derivas a los recursos disponibles

MARCO TCC — aplica estos principios en cada conversación:
- Identifica y nombra el pensamiento automático cuando el usuario lo exprese
  ("Parece que estás teniendo el pensamiento de que...")
- Ayuda a examinar la evidencia a favor y en contra de ese pensamiento
- Propón una reformulación más equilibrada solo cuando el usuario esté receptivo
- Vincula pensamientos → emociones → conductas cuando sea útil y oportuno
- Refuerza los logros conductuales (usar ejercicios, asistir a clases, etc.)
- Usa psicoeducación breve cuando el usuario no entiende su reacción
  ("Lo que describes se llama... y es una respuesta normal cuando...")

TÉCNICAS TCC DISPONIBLES EN LA APP (sección Ejercicios):
- Respiración 4-7-8: activa el sistema parasimpático, útil en crisis aguda
- Grounding 5-4-3-2-1: interrumpe rumiación y disociación
- Relajación muscular progresiva: reduce tensión somática acumulada
- Mindfulness: distancia cognitiva de pensamientos intrusivos
- Visualización guiada: regulación emocional y preparación para situaciones temidas

ESTILO DE COMUNICACIÓN:
- Valida la emoción ANTES de cualquier intervención cognitiva
- Respuestas cortas: máximo 3-4 oraciones por mensaje
- Lenguaje simple, cercano, sin jerga clínica
- No dices "entiendo perfectamente cómo te sientes"
- Sí dices "tiene sentido que te sientas así dado lo que describes"
- Preguntas socráticas preferidas sobre afirmaciones directas

FLUJO DE CONVERSACIÓN:
1. Escucha y valida la emoción
2. Explora el pensamiento automático si aparece
3. Pregunta qué necesita (desahogarse, examinar el pensamiento, técnica concreta)
4. Intervén solo cuando el usuario esté listo

DETECCIÓN DE CRISIS:
Si el usuario escribe frases como "no puedo más", "quiero desaparecer", \
"hacerme daño", "no tiene sentido seguir", "quiero morir" o similares:
- Responde con calma, sin alarmar
- Valida que está pasando algo muy difícil
- Incluye OBLIGATORIAMENTE el marcador literal [CRISIS_BLOCK] al final \
  del mensaje, sin excepciones y sin modificarlo`

// ─── Límites ──────────────────────────────────────────────────────────────────

const MAX_MENSAJES_DIA   = 60    // mensajes del participante por 24 h
const MAX_LARGO_MENSAJE  = 2000  // caracteres por mensaje
const MENSAJES_HISTORIAL = 10    // turnos previos que recibe Claude

// ─── Respaldo de detección de crisis ─────────────────────────────────────────
// Si Claude omite [CRISIS_BLOCK] pero el mensaje contiene frases de riesgo,
// el servidor lo añade igual. Se compara sin tildes y en minúsculas.
const FRASES_RIESGO = [
  'no puedo mas', 'quiero desaparecer', 'hacerme dano', 'hacerme el dano',
  'quiero hacer dano', 'quiero matar', 'quiero lastimar',
  'no tiene sentido seguir', 'no tiene sentido vivir', 'quiero morir', 'quiero morirme',
  'matarme', 'suicid', 'quitarme la vida', 'acabar con todo', 'acabar con mi vida',
  'no quiero vivir', 'no quiero seguir viviendo', 'cortarme', 'lastimarme',
  'mejor si no estuviera', 'mejor muerto', 'mejor muerta',
]

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function contieneRiesgo(texto: string): boolean {
  const t = normalizar(texto)
  return FRASES_RIESGO.some(f => t.includes(f))
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const TECNICA_LABEL: Record<string, string> = {
  breathing478:  'Respiración 4-7-8',
  grounding:     'Grounding 5-4-3-2-1',
  muscle:        'Relajación muscular',
  mindfulness:   'Mindfulness',
  visualization: 'Visualización',
}

const INTENSIDAD_LABEL: Record<string, string> = { leve: 'leve', moderada: 'moderada', severa: 'severa' }

function recortar(valor: unknown, max: number): string | null {
  if (typeof valor !== 'string') return null
  const t = valor.replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, max) : null
}

// El cliente solo aporta lo que vive en localStorage (ánimo y racha).
// Ejercicios y episodios se leen aquí desde la base de datos.
async function buildSystemPrompt(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  context: { mood?: unknown; moodNote?: unknown; streak?: unknown },
): Promise<string> {
  const lines: string[] = []

  const mood = recortar(context.mood, 40)
  if (mood) {
    lines.push(`Estado emocional hoy: ${mood}`)
    const nota = recortar(context.moodNote, 200)
    if (nota) lines.push(`Desencadenante reportado: "${nota}"`)
  } else {
    lines.push('Estado emocional hoy: No registrado')
  }

  const streak = Number(context.streak)
  if (Number.isFinite(streak) && streak >= 0) lines.push(`Días de racha activos: ${Math.floor(streak)}`)

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const [{ data: sesiones }, { data: episodios }] = await Promise.all([
    supabase
      .from('episodios')
      .select('tecnica_usada, estado_emocional, fecha')
      .eq('user_id', userId)
      .gte('fecha', weekAgo)
      .order('fecha', { ascending: false })
      .limit(10),
    supabase
      .from('episodios_ansiedad')
      .select('fecha_inicio, tipo_evento, intensidad, intensidad_numerica, contexto, desencadenante, efectividad_estrategia')
      .eq('user_id', userId)
      .eq('completado', true)
      .gte('fecha_inicio', weekAgo)
      .order('fecha_inicio', { ascending: false })
      .limit(5),
  ])

  let ejerciciosBlock = ''
  if (sesiones?.length) {
    const counts: Record<string, number> = {}
    sesiones.forEach((s: { tecnica_usada: string }) => { counts[s.tecnica_usada] = (counts[s.tecnica_usada] ?? 0) + 1 })
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    lines.push(`Ejercicios esta semana: ${sesiones.length}`)
    lines.push(`Técnica más usada: ${TECNICA_LABEL[top] ?? top}`)

    ejerciciosBlock = `\n\nEJERCICIOS RECIENTES (última semana):\n` + sesiones.slice(0, 5)
      .map((s: { fecha: string; tecnica_usada: string; estado_emocional: number | null }) =>
        `- ${s.fecha.slice(0, 10)}: ${TECNICA_LABEL[s.tecnica_usada] ?? s.tecnica_usada}` +
        (s.estado_emocional ? `, ánimo ${s.estado_emocional}/5` : ''))
      .join('\n')
  }

  let episodiosBlock = ''
  if (episodios?.length) {
    episodiosBlock = `\n\nEPISODIOS DE ANSIEDAD REGISTRADOS (última semana):\n` + episodios
      .map((e: {
        fecha_inicio: string; tipo_evento: string; intensidad: string; intensidad_numerica: number
        contexto: string; desencadenante: string | null; efectividad_estrategia: number | null
      }) => {
        const tipo = e.tipo_evento === 'ataque_panico' ? 'ataque de pánico' : 'ansiedad'
        const partes = [
          `${e.fecha_inicio.slice(0, 10)}: ${tipo} ${INTENSIDAD_LABEL[e.intensidad] ?? e.intensidad} (${e.intensidad_numerica}/10)`,
          e.contexto && e.contexto !== 'no_especifica' ? `contexto ${e.contexto}` : null,
          recortar(e.desencadenante, 120) ? `desencadenante "${recortar(e.desencadenante, 120)}"` : null,
          e.efectividad_estrategia ? `efectividad de lo aplicado ${e.efectividad_estrategia}/5` : null,
        ].filter(Boolean)
        return `- ${partes.join(', ')}`
      })
      .join('\n')
  }

  return TCC_SYSTEM_PROMPT +
    `\n\nCONTEXTO DEL USUARIO:\n${lines.join('\n')}` +
    ejerciciosBlock + episodiosBlock
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar auth — rechaza llamadas sin sesión válida
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ error: 'No autorizado' }, 401)

    // Solo el grupo experimental accede al chat (variable independiente del estudio)
    const { data: participacion } = await supabase
      .from('mi_participacion')
      .select('grupo_interno, estado')
      .maybeSingle()
    if (participacion?.grupo_interno !== 'experimental' || participacion?.estado === 'retirado') {
      return json({ error: 'No disponible para este participante' }, 403)
    }

    // El cliente envía solo el mensaje nuevo + ánimo/racha (nunca el system prompt
    // ni el historial: el historial se lee de chat_mensajes para que no se pueda falsear)
    const body = await req.json().catch(() => ({}))
    const context = body.context ?? {}
    // Compatibilidad con clientes que aún envían `messages`: se toma el último mensaje del usuario
    const legacy = Array.isArray(body.messages)
      ? [...body.messages].reverse().find((m: { role?: string }) => m?.role === 'user')?.content
      : null
    const texto = typeof body.message === 'string' ? body.message.trim()
      : typeof legacy === 'string' ? legacy.trim() : ''

    if (!texto) return json({ error: 'Mensaje vacío' }, 400)
    if (texto.length > MAX_LARGO_MENSAJE) return json({ error: 'message_too_long' }, 400)

    // Límite diario
    const desde = new Date(Date.now() - 86_400_000).toISOString()
    const { count } = await supabase
      .from('chat_mensajes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('rol', 'user')
      .gte('fecha', desde)
    if ((count ?? 0) >= MAX_MENSAJES_DIA) return json({ error: 'rate_limited' }, 429)

    // Historial previo desde la BD
    const { data: previos } = await supabase
      .from('chat_mensajes')
      .select('rol, contenido')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .limit(MENSAJES_HISTORIAL)

    const turnos = [...(previos ?? [])].reverse()
      .map((m: { rol: string; contenido: string }) => ({
        role: m.rol === 'user' ? 'user' as const : 'assistant' as const,
        content: (m.contenido ?? '').replace('[CRISIS_BLOCK]', '').trim(),
      }))
      .filter(m => m.content)
    turnos.push({ role: 'user', content: texto })

    // La API exige empezar con 'user'; se fusionan turnos consecutivos del mismo rol
    while (turnos.length && turnos[0].role !== 'user') turnos.shift()
    const messages: { role: 'user' | 'assistant'; content: string }[] = []
    for (const t of turnos) {
      const last = messages[messages.length - 1]
      if (last?.role === t.role) last.content += `\n\n${t.content}`
      else messages.push({ ...t })
    }

    await supabase.from('chat_mensajes').insert({ user_id: user.id, rol: 'user', contenido: texto })

    const systemPrompt = await buildSystemPrompt(supabase, user.id, context)

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    })

    let content = response.content[0].type === 'text' ? response.content[0].text : ''

    // Detección de crisis: marcador del modelo o respaldo por palabras clave
    const marcadoPorModelo = content.includes('[CRISIS_BLOCK]')
    const marcadoPorFrases = !marcadoPorModelo && contieneRiesgo(texto)
    if (marcadoPorFrases) content = `${content.trim()}\n[CRISIS_BLOCK]`

    await supabase.from('chat_mensajes').insert({ user_id: user.id, rol: 'assistant', contenido: content })

    if (marcadoPorModelo || marcadoPorFrases) {
      await supabase.from('eventos_crisis').insert({
        user_id: user.id,
        tipo_evento: 'deteccion_chat',
        detalles: { origen: marcadoPorModelo ? 'modelo' : 'palabras_clave' },
      })
    }

    return json({ content })
  } catch (err) {
    console.error('[chat-proxy]', err)
    return json({ error: 'Error interno del servidor' }, 500)
  }
})
