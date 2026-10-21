import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY          = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL            = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY       = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const FROM_EMAIL              = Deno.env.get('NOTIF_FROM_EMAIL') ?? 'notificaciones@resend.dev'

const TIPO_LABELS: Record<string, string> = {
  apertura_pantalla:          'abrió la pantalla de crisis',
  contacto_profesional_apoyo: 'contactó a un profesional de apoyo',
  contacto_personal:          'contactó a su persona de apoyo personal',
  contacto_linea_nacional:    'llamó a la línea nacional de salud mental',
  deteccion_chat:             'crisis detectada en el chat',
}

const ORIGEN_LABELS: Record<string, string> = {
  modelo:         'por el asistente (modelo)',
  palabras_clave: 'por palabras clave (respaldo del servidor)',
}

// Solo estos tipos generan notificación al investigador
const TIPOS_NOTIFICABLES = new Set(['apertura_pantalla', 'contacto_profesional_apoyo', 'deteccion_chat'])

// Crisis del chat: como máximo un email por participante en esta ventana
const VENTANA_CHAT_MS = 30 * 60 * 1000

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verificar auth — el user_id sale del JWT, nunca del body (evita avisos falsos)
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return json({ ok: false, error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => null)
  if (!body?.tipo_evento) return json({ ok: false, error: 'bad_request' }, 400)

  const { tipo_evento, profesional_id, evento_id } = body
  const user_id = user.id

  if (!TIPOS_NOTIFICABLES.has(tipo_evento)) return json({ ok: true, skipped: true })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

  // Crisis del chat: el evento debe existir y ser del usuario; el origen se lee de la BD
  let lineaOrigen = ''
  if (tipo_evento === 'deteccion_chat') {
    if (!evento_id) return json({ ok: false, error: 'bad_request' }, 400)

    const { data: evento } = await supabase
      .from('eventos_crisis')
      .select('id, detalles')
      .eq('id', evento_id)
      .eq('user_id', user_id)
      .eq('tipo_evento', 'deteccion_chat')
      .maybeSingle()
    if (!evento) return json({ ok: false, error: 'evento_no_encontrado' }, 404)

    const desde = new Date(Date.now() - VENTANA_CHAT_MS).toISOString()
    const { count } = await supabase
      .from('eventos_crisis')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('tipo_evento', 'deteccion_chat')
      .eq('notificado_email', true)
      .gte('timestamp', desde)
    if ((count ?? 0) > 0) return json({ ok: true, throttled: true })

    const origen = evento.detalles?.origen
    lineaOrigen = `\nOrigen                 : detectada en el chat, ${ORIGEN_LABELS[origen] ?? origen ?? 'desconocido'}`
  }

  // Obtener emails de investigadores activos
  const { data: admins } = await supabase
    .from('usuarios_admin')
    .select('email, nombre_completo')
    .eq('rol', 'investigador')
    .eq('activo', true)

  const destinatarios: string[] = admins?.map((a: { email: string }) => a.email) ?? []

  if (destinatarios.length === 0) {
    console.warn('notificar-crisis: no hay investigadores activos para notificar')
    return json({ ok: true, no_recipients: true })
  }

  // Info del profesional contactado (si aplica)
  let lineaProfesional = ''
  if (profesional_id) {
    const { data: prof } = await supabase
      .from('profesionales_apoyo')
      .select('nombre_completo, rol_profesional')
      .eq('id', profesional_id)
      .single()
    if (prof) {
      lineaProfesional = `\nProfesional contactado: ${prof.nombre_completo} (${prof.rol_profesional})`
    }
  }

  // Código de participante real (EXP-XXX / CTR-XXX)
  const { data: participante } = await supabase
    .from('participantes')
    .select('codigo_participante')
    .eq('auth_user_id', user_id)
    .maybeSingle()
  const codigo         = participante?.codigo_participante ?? `#${String(user_id).slice(0, 8).toUpperCase()}`
  const accion         = TIPO_LABELS[tipo_evento] ?? tipo_evento
  const horaBolivia    = new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' })

  // Nunca se incluye el contenido de mensajes: el investigador lo consulta en el panel
  const cuerpo = `
Un participante de la investigación de ansiedad ha registrado un evento de crisis.

Código de participante : ${codigo}
Evento                 : ${accion}
Hora (Bolivia)         : ${horaBolivia}${lineaOrigen}${lineaProfesional}

---
Mensaje automático — ingresa al panel para ver detalles completos.
`.trim()

  if (!RESEND_API_KEY) {
    console.warn('notificar-crisis: RESEND_API_KEY no configurado — email no enviado')
    return json({ ok: true, email_skipped: true })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      destinatarios,
      subject: `⚠️ Crisis — Participante ${codigo}: ${accion}`,
      text:    cuerpo,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('notificar-crisis: Resend error', err)
    return json({ ok: false, error: 'email_failed' }, 502)
  }

  // Marcar como notificado solo si el email salió (si falla, el próximo evento reintenta)
  if (evento_id) {
    await supabase.from('eventos_crisis').update({ notificado_email: true }).eq('id', evento_id).eq('user_id', user_id)
  }

  return json({ ok: true })
})
