import { useCallback, useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { useAuditoria } from './useAuditoria'
import { useAdminSession } from './useAdminSession'

export function useParticipantesAdmin() {
  const [participantes, setParticipantes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const { registrar } = useAuditoria()
  const { admin } = useAdminSession()

  const cargar = useCallback(async () => {
    setCargando(true); setError(null)
    const { data, error: err } = await supabaseAdmin
      .from('participantes')
      .select('*')
      .order('fecha_generacion_codigo', { ascending: false })
    if (err) setError(err.message)
    else setParticipantes(data ?? [])
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function proximoNumero(tipo) {
    const nums = participantes
      .filter(p => p.codigo_participante.startsWith(tipo + '-'))
      .map(p => parseInt(p.codigo_participante.split('-')[1], 10))
      .filter(n => !isNaN(n))
    return nums.length > 0 ? Math.max(...nums) + 1 : 1
  }

  async function generarCodigos({ cantExp, cantCtr, inicioExp, inicioCtr }) {
    if (!admin) return { error: 'Sin sesión admin' }
    const nuevos = []
    for (let i = 0; i < cantExp; i++) {
      nuevos.push({ codigo_participante: `EXP-${String(inicioExp + i).padStart(3, '0')}`, grupo: 'experimental', creado_por: admin.id })
    }
    for (let i = 0; i < cantCtr; i++) {
      nuevos.push({ codigo_participante: `CTR-${String(inicioCtr + i).padStart(3, '0')}`, grupo: 'control', creado_por: admin.id })
    }
    const { error: err } = await supabaseAdmin.from('participantes').insert(nuevos)
    if (err) return { error: err.message }
    await registrar('generar_codigos', 'participantes', null, {
      cantExp, cantCtr, inicioExp, inicioCtr, total: nuevos.length
    })
    await cargar()
    return { ok: true, generados: nuevos.length }
  }

  async function actualizarNotas(id, notas) {
    const { error: err } = await supabaseAdmin
      .from('participantes')
      .update({ notas_investigador: notas })
      .eq('id', id)
    if (err) return { error: err.message }
    await cargar()
    return { ok: true }
  }

  async function retirarParticipante(id, motivo) {
    const { error: err } = await supabaseAdmin
      .from('participantes')
      .update({ estado: 'retirado', motivo_retiro: motivo, fecha_retiro: new Date().toISOString() })
      .eq('id', id)
    if (err) return { error: err.message }
    await registrar('retirar_participante', 'participantes', id, { motivo })
    await cargar()
    return { ok: true }
  }

  async function resetearCodigo(id) {
    const { error: err } = await supabaseAdmin
      .from('participantes')
      .update({ auth_user_id: null, estado: 'codigo_generado', fecha_asignacion: null, ultimo_login: null })
      .eq('id', id)
    if (err) return { error: err.message }
    await registrar('resetear_codigo', 'participantes', id, {})
    await cargar()
    return { ok: true }
  }

  return { participantes, cargando, error, cargar, proximoNumero, generarCodigos, actualizarNotas, retirarParticipante, resetearCodigo }
}
