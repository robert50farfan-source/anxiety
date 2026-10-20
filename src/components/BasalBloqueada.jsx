import { useState } from 'react'
import { useParticipante } from '../context/ParticipanteContext'
import EvaluacionFlujo from './EvaluacionFlujo'

const INFO = {
  bai:  { nombre: 'Cuestionario de ansiedad (BAI)',           duracion: '~10 min' },
  swls: { nombre: 'Satisfacción con la vida (SWLS)',          duracion: '~2 min'  },
}

// Evaluación inicial obligatoria: BAI + SWLS antes de usar la app
export default function BasalBloqueada() {
  const [enCurso, setEnCurso] = useState(false)
  const { recargar, pendientesBasal } = useParticipante()

  const handleTerminar = () => {
    setEnCurso(false)
    recargar() // re-check: si se guardó todo, el bloqueo se levanta
  }

  if (enCurso) return <EvaluacionFlujo pasos={pendientesBasal} onTerminar={handleTerminar} />

  const n = pendientesBasal.length

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-calm-50 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mb-5 text-3xl">
        📋
      </div>
      <h2 className="text-lg font-semibold text-calm-800 mb-3">
        Antes de empezar, completa tu evaluación inicial
      </h2>
      <p className="text-sm text-calm-600 leading-relaxed max-w-xs mb-5">
        {n > 1 ? `Son ${n} cuestionarios breves.` : 'Te falta un cuestionario breve.'}{' '}
        Esto es necesario para que tu participación sea analizable.
      </p>

      <div className="w-full max-w-xs space-y-2 mb-6">
        {pendientesBasal.map((p, i) => (
          <div key={p} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-calm-100 text-left">
            <span className="w-6 h-6 rounded-full bg-calm-100 text-calm-700 text-xs font-bold
                             flex items-center justify-center shrink-0">{i + 1}</span>
            <span className="flex-1 text-sm text-gray-700">{INFO[p]?.nombre}</span>
            <span className="text-xs text-gray-400">{INFO[p]?.duracion}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => setEnCurso(true)}
        className="px-6 py-3 rounded-xl bg-calm-600 text-white font-semibold text-sm hover:bg-calm-700 transition"
      >
        Comenzar
      </button>
    </div>
  )
}
