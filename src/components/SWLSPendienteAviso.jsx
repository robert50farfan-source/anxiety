import { useState } from 'react'
import { useParticipante } from '../context/ParticipanteContext'
import EvaluacionFlujo from './EvaluacionFlujo'

// Cuentas que ya pasaron el día límite sin SWLS basal: se les pide una vez por
// sesión, sin bloquear el uso de la app.
export default function SWLSPendienteAviso() {
  const { swlsBasalTardia, recargar } = useParticipante()
  const [descartado, setDescartado] = useState(false)
  const [enCurso, setEnCurso]       = useState(false)

  if (enCurso) {
    return <EvaluacionFlujo pasos={['swls']} onTerminar={() => { setEnCurso(false); recargar() }} />
  }
  if (!swlsBasalTardia || descartado) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="fixed inset-0 bg-black/40" onClick={() => setDescartado(true)} />
      <div className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl animate-fade-in">
        <p className="font-semibold text-gray-800 mb-1">Nos falta un cuestionario breve</p>
        <p className="text-sm text-gray-500 mb-4">
          Son 5 preguntas sobre tu satisfacción con la vida (unos 2 minutos). Ayuda mucho a la investigación.
        </p>
        <div className="space-y-2">
          <button onClick={() => setEnCurso(true)}
                  className="w-full py-3 rounded-2xl bg-calm-500 text-white font-semibold active:scale-95 transition-transform">
            Responder ahora
          </button>
          <button onClick={() => setDescartado(true)}
                  className="w-full py-3 rounded-2xl bg-gray-100 text-gray-600 font-medium active:scale-95 transition-transform">
            Más tarde
          </button>
        </div>
      </div>
    </div>
  )
}
