import { useState } from 'react'
import { useParticipante } from '../context/ParticipanteContext'
import BAI from '../pages/BAI'

export default function BasalBloqueada() {
  const [showBAI, setShowBAI] = useState(false)
  const { recargar } = useParticipante()

  const handleBAIClose = () => {
    setShowBAI(false)
    recargar() // re-check basalRequerida: if BAI was saved, gate lifts
  }

  if (showBAI) return <BAI onClose={handleBAIClose} />

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-calm-50 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mb-5 text-3xl">
        📋
      </div>
      <h2 className="text-lg font-semibold text-calm-800 mb-3">
        Antes de continuar, completa tu BAI inicial
      </h2>
      <p className="text-sm text-calm-600 leading-relaxed max-w-xs mb-6">
        Esto es necesario para que tu participación sea analizable. Solo toma unos 10 minutos.
      </p>
      <button
        onClick={() => setShowBAI(true)}
        className="px-6 py-3 rounded-xl bg-calm-600 text-white font-semibold text-sm hover:bg-calm-700 transition"
      >
        Hacer BAI ahora
      </button>
    </div>
  )
}
