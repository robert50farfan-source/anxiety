import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const vapidPublic  = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidEmail   = Deno.env.get('VAPID_EMAIL')
    const webpushEnabled = vapidPublic && vapidPrivate && vapidEmail

    if (webpushEnabled) {
      webpush.setVapidDetails(
        `mailto:${vapidEmail}`,
        vapidPublic,
        vapidPrivate,
      )
    } else {
      console.warn('[notificar-bai] VAPID keys not configured — push notifications disabled')
    }

    const { data: participantes, error: pErr } = await supabase
      .from('participantes')
      .select('id, auth_user_id, codigo_participante, grupo, fecha_inicio_estudio, estado')
      .in('estado', ['activo', 'consentimiento_firmado'])
      .not('fecha_inicio_estudio', 'is', null)

    if (pErr) throw pErr

    let procesados = 0
    let enviados = 0
    let actualizados_inactivo = 0

    for (const p of (participantes ?? [])) {
      procesados++
      const diasDesdeInicio = Math.floor(
        (Date.now() - new Date(p.fecha_inicio_estudio).getTime()) / 86400000
      )

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, subscription')
        .eq('user_id', p.auth_user_id)

      let notif: { title: string; body: string; url: string } | null = null
      let marcarInactivo = false

      if (diasDesdeInicio === 7) {
        const { count } = await supabase
          .from('resultados_bai')
          .select('id', { count: 'exact', head: true })
          .eq('participante_id', p.id)
          .eq('tipo_medicion', 'basal')
        const tieneBasal = (count ?? 0) > 0

        if (!tieneBasal) {
          notif = {
            title: 'AnxietyApp — BAI pendiente',
            body: 'Tu BAI inicial sigue pendiente. Es importante completarlo para tu participación en el estudio.',
            url: '/',
          }
          marcarInactivo = true
        }
      } else if (diasDesdeInicio === 22 || diasDesdeInicio === 50 || diasDesdeInicio === 78) {
        notif = {
          title: 'AnxietyApp',
          body: 'Pronto será momento de tu siguiente cuestionario BAI. Prepárate para completarlo esta semana.',
          url: '/',
        }
      } else if (diasDesdeInicio === 25 || diasDesdeInicio === 53 || diasDesdeInicio === 81) {
        const tipoMap: Record<number, string> = { 25: 'intermedia_4sem', 53: 'final_8sem', 81: 'seguimiento_12sem' }
        const tipo = tipoMap[diasDesdeInicio]
        const { count } = await supabase
          .from('resultados_bai')
          .select('id', { count: 'exact', head: true })
          .eq('participante_id', p.id)
          .eq('tipo_medicion', tipo)
        if ((count ?? 0) === 0) {
          notif = {
            title: 'AnxietyApp — BAI de seguimiento',
            body: 'Hoy puedes completar tu cuestionario BAI de seguimiento. Solo toma 10 minutos.',
            url: '/',
          }
        }
      } else if (diasDesdeInicio === 36 || diasDesdeInicio === 64 || diasDesdeInicio === 92) {
        const tipoMap: Record<number, string> = { 36: 'intermedia_4sem', 64: 'final_8sem', 92: 'seguimiento_12sem' }
        const tipo = tipoMap[diasDesdeInicio]
        const { count } = await supabase
          .from('resultados_bai')
          .select('id', { count: 'exact', head: true })
          .eq('participante_id', p.id)
          .eq('tipo_medicion', tipo)
        if ((count ?? 0) === 0) {
          notif = {
            title: 'AnxietyApp',
            body: 'Aún puedes completar el cuestionario BAI pendiente. Por favor hazlo hoy.',
            url: '/',
          }
        }
      }

      if (marcarInactivo) {
        await supabase
          .from('participantes')
          .update({ estado: 'inactivo_sin_basal' })
          .eq('id', p.id)
        actualizados_inactivo++

        const horaBolivia = new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' })
        const cuerpo = `Participante ${p.codigo_participante} (${p.grupo}) ha superado 7 días sin completar el BAI basal. Ha sido marcado como inactivo_sin_basal automáticamente.\n\nFecha inicio: ${p.fecha_inicio_estudio}\nHora actual (Bolivia): ${horaBolivia}`

        const resendKey = Deno.env.get('RESEND_API_KEY')
        if (resendKey) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'AnxietyApp <noreply@anxietyapp.com>',
              to: Deno.env.get('INVESTIGADOR_EMAIL') ?? 'robert50.farfan@gmail.com',
              subject: `[AnxietyApp] Participante ${p.codigo_participante} marcado como inactivo_sin_basal`,
              text: cuerpo,
            }),
          })
        }
      }

      if (notif && webpushEnabled && subs && subs.length > 0) {
        for (const sub of subs) {
          try {
            await webpush.sendNotification(sub.subscription, JSON.stringify(notif))
            enviados++
          } catch (err: any) {
            if (err.statusCode === 410) {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ procesados, enviados, actualizados_inactivo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[notificar-bai]', err)
    return new Response(
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// CONFIGURACIÓN CRON:
// URL: https://[project-ref].supabase.co/functions/v1/notificar-bai
// Método: POST
// Cuerpo: {}
// Schedule: 0 9 * * * (diariamente a las 9:00 AM Bolivia = 13:00 UTC)
// En cron-job.org: agregar header Authorization: Bearer [ANON_KEY] (opcional)
