import { useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'

// Se renderiza en la zona de participantes.
// No usa AdminSessionProvider — consulta supabaseAdmin directamente.
export default function AdminBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!supabaseAdmin) return

    supabaseAdmin.auth.getSession().then(({ data: { session } }) => {
      setVisible(!!session)
    })

    const { data: { subscription } } = supabaseAdmin.auth.onAuthStateChange((_e, session) => {
      setVisible(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!visible) return null

  return (
    <div className="bg-indigo-600 text-white text-sm py-2 px-4 flex items-center justify-between gap-4">
      <span className="flex items-center gap-2">
        <span>🔒</span>
        Estás en modo administrador — vista de participante (solo para QA)
      </span>
      <a
        href="/admin/dashboard"
        className="shrink-0 underline font-semibold hover:text-indigo-200 transition-colors"
      >
        Volver al panel →
      </a>
    </div>
  )
}
