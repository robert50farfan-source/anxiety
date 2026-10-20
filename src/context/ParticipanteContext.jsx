import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { VERSION_CONSENTIMIENTO_VIGENTE } from '../config/consentimiento'
import { calcularEvaluacionInicial } from '../lib/evaluaciones'

const ParticipanteCtx = createContext(null)
export const useParticipante = () => useContext(ParticipanteCtx)

export function ParticipanteProvider({ children }) {
  const { userId, isReady } = useAuth()
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [consentimientoVigente, setConsentimientoVigente] = useState(null)
  const [basalRequerida, setBasalRequerida] = useState(false)
  const [estaInactivoSinBasal, setEstaInactivoSinBasal] = useState(false)
  const [pendientesBasal, setPendientesBasal] = useState([])   // ['bai', 'swls'] en orden
  const [swlsBasalTardia, setSwlsBasalTardia] = useState(false) // cuenta antigua sin SWLS basal

  const fetchParticipante = useCallback(async () => {
    if (!supabase || !userId) { setCargando(false); return }
    const { data: row } = await supabase
      .from('mi_participacion')
      .select('*')
      .maybeSingle()
    setData(row ?? null)

    let consentData = null
    if (row?.id) {
      const { data: c } = await supabase
        .from('consentimientos')
        .select('id, version_documento, fecha_aceptacion')
        .eq('participante_id', row.id)
        .eq('version_documento', VERSION_CONSENTIMIENTO_VIGENTE)
        .eq('aceptado', true)
        .maybeSingle()
      consentData = c ?? null
    }
    setConsentimientoVigente(consentData)

    // Evaluación inicial (BAI + SWLS): bloquea desde que se firma el consentimiento
    let evaluacion = { bloquea: false, pendientes: [], swlsTardia: false }
    const esInactivo = (row?.estado === 'inactivo_sin_basal')

    if ((row?.estado === 'activo' || row?.estado === 'consentimiento_firmado') && row?.fecha_inicio_estudio) {
      const [{ count: totalBAI }, { count: swlsBasal }] = await Promise.all([
        supabase
          .from('resultados_bai')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('resultados_swls')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('tipo_medicion', 'basal'),
      ])
      evaluacion = calcularEvaluacionInicial({
        estado: row.estado,
        fechaInicio: row.fecha_inicio_estudio,
        totalBAI,
        tieneSWLSBasal: (swlsBasal ?? 0) > 0,
      })
    }
    setBasalRequerida(evaluacion.bloquea)
    setPendientesBasal(evaluacion.pendientes)
    setSwlsBasalTardia(evaluacion.swlsTardia)
    setEstaInactivoSinBasal(esInactivo)

    setCargando(false)
    if (row?.codigo_participante) {
      supabase.rpc('actualizar_ultimo_login').then(() => {})
    }
  }, [userId])

  useEffect(() => {
    if (!isReady) return
    const t = setTimeout(fetchParticipante, 0) // deadlock fix: evita queries PostgREST durante auth state change
    return () => clearTimeout(t)
  }, [isReady, fetchParticipante])

  const value = {
    codigo: data?.codigo_participante ?? null,
    grupo: data?.grupo_etiqueta ?? null,
    grupoInterno: data?.grupo_interno ?? null,
    estado: data?.estado ?? null,
    fechaInicio: data?.fecha_inicio_estudio ?? null,
    fechaRetiro: data?.fecha_retiro ?? null,
    motivoRetiro: data?.motivo_retiro ?? null,
    cargando,
    esExperimental: data?.grupo_interno === 'experimental',
    esControl: data?.grupo_interno === 'control',
    estaRetirado: data?.estado === 'retirado',
    tieneConsentimientoVigente: !!consentimientoVigente,
    consentimientoFecha: consentimientoVigente?.fecha_aceptacion ?? null,
    basalRequerida,
    pendientesBasal,
    swlsBasalTardia,
    estaInactivoSinBasal,
    recargar: fetchParticipante,
  }

  return <ParticipanteCtx.Provider value={value}>{children}</ParticipanteCtx.Provider>
}
