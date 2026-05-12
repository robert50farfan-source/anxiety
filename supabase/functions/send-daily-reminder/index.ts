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

    webpush.setVapidDetails(
      `mailto:${Deno.env.get('VAPID_EMAIL') ?? 'app@anxietyapp.com'}`,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    )

    // Filter by current UTC hour (caller sets the hour via query param or sends all)
    const url         = new URL(req.url)
    const hourFilter  = url.searchParams.get('hour')

    let query = supabase.from('push_subscriptions').select('id, subscription, reminder_hour')
    if (hourFilter !== null) query = query.eq('reminder_hour', parseInt(hourFilter))

    const { data: subs, error } = await query
    if (error) throw error

    const results = await Promise.allSettled(
      (subs ?? []).map(async sub => {
        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({
              title: 'AnxietyApp',
              body:  '¿Cómo te sientes hoy? Unos minutos de práctica marcan la diferencia. 🌿',
              url:   '/',
            })
          )
          return { id: sub.id, status: 'sent' }
        } catch (err: any) {
          // 410 Gone = subscription expired, remove it
          if (err.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
          return { id: sub.id, status: 'failed', code: err.statusCode }
        }
      })
    )

    const sent   = results.filter(r => r.status === 'fulfilled' && (r as any).value?.status === 'sent').length
    const failed = results.length - sent

    return new Response(
      JSON.stringify({ sent, failed, total: results.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[send-daily-reminder]', err)
    return new Response(
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
