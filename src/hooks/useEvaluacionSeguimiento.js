import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useParticipante } from '../context/ParticipanteContext'
import { calcularSeguimiento } from '../lib/evaluaciones'

// Instrumentos pendientes en la ventana de seguimiento actual (semanas 8 y 12)
const TABLAS = { bai: 'resultados_bai', swls: 'resultados_swls' }

export function useEvaluacionSeguimiento() {
  const { userId } = useAuth()
  const { fechaInicio } = useParticipante() ?? {}
  const [estado, setEstado] = useState({ ventana: null, pendientes: [] })

  const cargar = useCallback(async () => {
    if (!supabase || !userId || !fechaInicio) { setEstado({ ventana: null, pendientes: [] }); return }
    const entradas = await Promise.all(Object.entries(TABLAS).map(async ([inst, tabla]) => {
      const { data } = await supabase.from(tabla).select('tipo_medicion').eq('user_id', userId)
      return [inst, new Set((data ?? []).map(r => r.tipo_medicion))]
    }))
    setEstado(calcularSeguimiento({ fechaInicio, hechos: Object.fromEntries(entradas) }))
  }, [userId, fechaInicio])

  useEffect(() => { cargar() }, [cargar])

  return { ...estado, recargar: cargar }
}
