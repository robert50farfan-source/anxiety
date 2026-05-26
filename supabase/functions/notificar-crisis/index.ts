import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY          = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL            = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const FROM_EMAIL              = Deno.env.get('NOTIF_FROM_EMAIL') ?? 'notificaciones@resend.dev'

const TIPO_LABELS: Record<string, string> = {
  apertura_pantalla:          'abrió la pantalla de crisis',
  contacto_profesional_apoyo: 'contactó a un profesional de apoyo',
  contacto_personal:          'contactó a su persona de apoyo personal',
  contacto_linea_nacional:    'llamó a la línea nacional de salud mental',
}

// Solo estos tipos generan notificación al investigador
const TIPOS_NOTIFICABLES = new Set(['apertura_pantalla', 'contacto_profesional_apoyo'])

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.tipo_evento || !body?.user_id) {
    return new Response(JSON.stringify({ ok: false, error: 'bad_request' }), { status: 400 })
  }

  const { tipo_evento, user_id, profesional_id } = body

  if (!TIPOS_NOTIFICABLES.has(tipo_evento)) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

  // Obtener emails de investigadores activos
  const { data: admins } = await supabase
    .from('usuarios_admin')
    .select('email, nombre_completo')
    .eq('rol', 'investigador')
    .eq('activo', true)

  const destinatarios: string[] = admins?.map((a: { email: string }) => a.email) ?? []

  if (destinatarios.length === 0) {
    console.warn('notificar-crisis: no hay investigadores activos para notificar')
    return new Response(JSON.stringify({ ok: true, no_recipients: true }), { status: 200 })
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

  const codigo         = String(user_id).slice(0, 8).toUpperCase()
  const accion         = TIPO_LABELS[tipo_evento] ?? tipo_evento
  const horaBolivia    = new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' })

  const cuerpo = `
Un participante de la investigación de ansiedad ha registrado un evento de crisis.

Código de participante : #${codigo}
Evento                 : ${accion}
Hora (Bolivia)         : ${horaBolivia}${lineaProfesional}

---
Mensaje automático — ingresa al panel para ver detalles completos.
`.trim()

  if (!RESEND_API_KEY) {
    console.warn('notificar-crisis: RESEND_API_KEY no configurado — email no enviado')
    return new Response(JSON.stringify({ ok: true, email_skipped: true }), { status: 200 })
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
      subject: `⚠️ Crisis — Participante #${codigo} ${accion}`,
      text:    cuerpo,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('notificar-crisis: Resend error', err)
    return new Response(JSON.stringify({ ok: false, error: err }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
