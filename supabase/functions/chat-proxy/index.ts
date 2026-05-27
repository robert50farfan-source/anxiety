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

function buildSystemPrompt(context: {
  mood?: string | null
  moodNote?: string | null
  streak?: number
  ejerciciosSemana?: number
  tecnicaMasUsada?: string | null
  episodiosRecientes?: string | null
}): string {
  const lines: string[] = []

  if (context.mood) {
    lines.push(`Estado emocional hoy: ${context.mood}`)
    if (context.moodNote) lines.push(`Desencadenante reportado: "${context.moodNote}"`)
  } else {
    lines.push('Estado emocional hoy: No registrado')
  }

  if (context.streak != null) lines.push(`Días de racha activos: ${context.streak}`)
  if (context.ejerciciosSemana) lines.push(`Ejercicios esta semana: ${context.ejerciciosSemana}`)
  if (context.tecnicaMasUsada) lines.push(`Técnica más usada: ${context.tecnicaMasUsada}`)

  const ctxBlock = lines.length
    ? `\n\nCONTEXTO DEL USUARIO:\n${lines.join('\n')}`
    : ''

  const episodiosBlock = context.episodiosRecientes
    ? `\n\nEPISODIOS RECIENTES (última semana):\n${context.episodiosRecientes}`
    : ''

  return TCC_SYSTEM_PROMPT + ctxBlock + episodiosBlock
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
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // El cliente envía mensajes + contexto estructurado (nunca el system prompt)
    const { messages, context = {} } = await req.json()

    const systemPrompt = buildSystemPrompt(context)

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[chat-proxy]', err)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
