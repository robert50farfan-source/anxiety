import { supabase } from '../lib/supabase'

const NOTIF_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notificar-crisis`
  : null

const TIPOS_CON_NOTIF = new Set(['apertura_pantalla', 'contacto_profesional_apoyo'])

export function useCrisisLogger(userId) {
  async function registrar(tipo, profesionalId = null, detalles = null) {
    if (!supabase || !userId) return

    // Insertar evento — fire and forget
    supabase
      .from('eventos_crisis')
      .insert({
        user_id:                   userId,
        tipo_evento:               tipo,
        profesional_contactado_id: profesionalId ?? undefined,
        detalles:                  detalles ?? undefined,
      })
      .then(() => {})
      .catch(() => {})

    // Notificar al investigador vía Edge Function para eventos relevantes
    // notificar-crisis exige el JWT del usuario; el user_id lo toma del token
    if (NOTIF_URL && TIPOS_CON_NOTIF.has(tipo)) {
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          if (!session?.access_token) return
          return fetch(NOTIF_URL, {
            method:  'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              tipo_evento:    tipo,
              profesional_id: profesionalId,
            }),
          })
        })
        .catch(() => {}) // non-blocking, nunca falla el flujo del participante
    }
  }

  return { registrar }
}
