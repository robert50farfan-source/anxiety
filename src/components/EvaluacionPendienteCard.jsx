import { useState } from 'react'
import { useEvaluacionSeguimiento } from '../hooks/useEvaluacionSeguimiento'
import EvaluacionFlujo from './EvaluacionFlujo'

const VENTANA_LABEL = { final_8sem: '8 semanas', seguimiento_12sem: '12 semanas' }

// Tarjeta que aparece mientras hay una evaluación de seguimiento pendiente
export default function EvaluacionPendienteCard() {
  const { ventana, pendientes, recargar } = useEvaluacionSeguimiento()
  const [enCurso, setEnCurso] = useState(false)

  if (enCurso) {
    return <EvaluacionFlujo pasos={pendientes} onTerminar={() => { setEnCurso(false); recargar() }} />
  }
  if (!pendientes.length) return null

  const n = pendientes.length
  return (
    <button
      onClick={() => setEnCurso(true)}
      className="card w-full text-left flex items-center gap-4 border-2 border-calm-300 bg-calm-50
                 active:scale-[0.98] transition-all"
    >
      <span className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shrink-0">📋</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm">Evaluación de {VENTANA_LABEL[ventana]}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {n} cuestionario{n > 1 ? 's' : ''} breve{n > 1 ? 's' : ''} · ayuda mucho a la investigación que la completes esta semana
        </p>
      </div>
      <svg className="w-4 h-4 text-calm-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  )
}
