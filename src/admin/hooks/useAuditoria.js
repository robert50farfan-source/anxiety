import { supabaseAdmin } from '../lib/supabaseAdmin'

export function useAuditoria() {
  async function registrar(accion, entidad = null, entidadId = null, detalles = null) {
    if (!supabaseAdmin) return
    const { data: { session } } = await supabaseAdmin.auth.getSession()
    if (!session) return
    await supabaseAdmin.from('auditoria_admin').insert({
      admin_id: session.user.id,
      accion,
      entidad,
      entidad_id: entidadId,
      detalles,
    })
  }

  return { registrar }
}
