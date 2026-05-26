import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Abort any Supabase request (including session refresh) that takes > 10s.
// This prevents the auth state machine from blocking signInWithPassword
// when a stale token refresh hangs on first use.
async function fetchConTimeout(input, init = {}) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 10_000)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

// Cliente independiente con storageKey propio → no interfiere con la sesión
// anónima del participante que usa el cliente en src/lib/supabase.js
export const supabaseAdmin = url && key
  ? createClient(url, key, {
      auth: {
        storageKey: 'anxietyapp_admin_v1',
        persistSession: true,
        autoRefreshToken: true,
      },
      global: { fetch: fetchConTimeout },
    })
  : null
