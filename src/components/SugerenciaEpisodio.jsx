import { useState } from 'react'
import EpisodioWizard from './EpisodioWizard'
import { useEpisodios } from '../hooks/useEpisodios'
import { useParticipante } from '../context/ParticipanteContext'

// ─── Sugerencia de registrar un episodio tras un ejercicio ────────────────────
// Igual para ambos grupos (control activo): mismo texto y misma frecuencia,
// para que el número de episodios registrados no dependa del grupo.

export { tocaSugerirEpisodio } from '../lib/episodios'

export default function SugerenciaEpisodio({ estrategia, onCerrar }) {
  const { guardarEpisodio } = useEpisodios()
  const { esExperimental } = useParticipante() ?? {}
  const [showWizard, setShowWizard] = useState(false)

  const guardarBorradorRapido = async () => {
    const ahora = new Date()
    await guardarEpisodio({
      id: crypto.randomUUID(),
      tipo_evento: 'ansiedad',
      fecha_inicio: new Date(ahora - 30 * 60000).toISOString(),
      intensidad_numerica: 5,
      intensidad: 'moderada',
      duracion_minutos: null,
      en_curso: false,
      contexto: 'no_especifica',
      contexto_otro: '',
      desencadenante: null,
      sintomas_fisicos: [],
      sintomas_emocionales: [],
      estrategias_aplicadas: estrategia ? [estrategia] : [],
      efectividad_estrategia: null,
      notas: null,
      completado: false,
      paso_actual: 1,
    })
  }

  if (showWizard) {
    return (
      <EpisodioWizard
        onClose={onCerrar}
        prefilledEstrategia={estrategia}
        esExperimental={esExperimental ?? false}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="fixed inset-0 bg-black/40" onClick={onCerrar} />
      <div className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl">
        <p className="font-semibold text-gray-800 mb-1">¿Acabas de atravesar un episodio?</p>
        <p className="text-sm text-gray-500 mb-4">Registrarlo te ayuda a entender tus patrones de ansiedad.</p>
        <div className="space-y-2">
          <button onClick={() => setShowWizard(true)}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm">
            Sí, registrarlo
          </button>
          <button onClick={() => { guardarBorradorRapido(); onCerrar() }}
            className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm">
            Más tarde
          </button>
          <button onClick={onCerrar} className="w-full py-2 text-gray-400 text-sm">
            No, gracias
          </button>
        </div>
      </div>
    </div>
  )
}
