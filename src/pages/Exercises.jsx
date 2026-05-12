import { useState } from 'react'
import BreathingGuide from '../components/BreathingGuide'
import GroundingGuide from '../components/GroundingGuide'
import MuscleGuide from '../components/MuscleGuide'
import MindfulnessGuide from '../components/MindfulnessGuide'
import VisualizationGuide from '../components/VisualizationGuide'

function BreathingCircleIcon({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Outer arc with arrow */}
      <path d="M 24 4 A 20 20 0 1 1 40.97 34" />
      <polyline points="35,28 41,34 47,29" />
      {/* Breath wave */}
      <path d="M 12 24 Q 15.5 18 19 24 Q 22.5 30 26 24 Q 29.5 18 33 24 Q 36.5 30 40 24" strokeWidth="2" />
    </svg>
  )
}

const exercises = [
  {
    id: 'breathing478',
    icon: <BreathingCircleIcon />,
    title: 'Respiración 4-7-8',
    subtitle: 'Técnica del Dr. Weil',
    duration: '5-10 min',
    level: 'Básico',
    levelColor: 'text-green-600 bg-green-50',
    description: 'Reduce la ansiedad activando el sistema nervioso parasimpático. Ideal para momentos de crisis.',
    isBreathing: true,
  },
  {
    id: 'grounding',
    icon: '🌿',
    title: 'Grounding 5-4-3-2-1',
    subtitle: 'Anclaje sensorial',
    duration: '3-5 min',
    level: 'Básico',
    levelColor: 'text-green-600 bg-green-50',
    description: 'Conecta con el presente identificando 5 cosas que ves, 4 que tocas, 3 que escuchas, 2 que hueles y 1 que saboreas.',
  },
  {
    id: 'muscle',
    icon: '💪',
    title: 'Relajación muscular',
    subtitle: 'Técnica de Jacobson',
    duration: '10-15 min',
    level: 'Intermedio',
    levelColor: 'text-orange-600 bg-orange-50',
    description: 'Tensa y relaja sistemáticamente cada grupo muscular para liberar tensión acumulada.',
  },
  {
    id: 'mindfulness',
    icon: '🧘',
    title: 'Mindfulness',
    subtitle: 'Atención plena',
    duration: '5-20 min',
    level: 'Intermedio',
    levelColor: 'text-orange-600 bg-orange-50',
    description: 'Observa tus pensamientos sin juzgarlos. Reduce el ciclo de rumiación ansiosa.',
  },
  {
    id: 'visualization',
    icon: '🏞️',
    title: 'Visualización guiada',
    subtitle: 'Lugar seguro',
    duration: '10 min',
    level: 'Avanzado',
    levelColor: 'text-purple-600 bg-purple-50',
    description: 'Imagina un lugar seguro y tranquilo con detalle sensorial completo para reducir la activación del sistema de estrés.',
  },
]

export default function Exercises() {
  const [showBreathing,      setShowBreathing]      = useState(false)
  const [showGrounding,      setShowGrounding]      = useState(false)
  const [showMuscle,         setShowMuscle]         = useState(false)
  const [showMindfulness,    setShowMindfulness]    = useState(false)
  const [showVisualization,  setShowVisualization]  = useState(false)
  const [expanded, setExpanded] = useState(null)

  const getAction = (id) => {
    if (id === 'breathing478') return () => setShowBreathing(true)
    if (id === 'grounding')    return () => setShowGrounding(true)
    if (id === 'muscle')       return () => setShowMuscle(true)
    if (id === 'mindfulness')  return () => setShowMindfulness(true)
    if (id === 'visualization')return () => setShowVisualization(true)
    return null
  }

  return (
    <>
      <div className="px-5 pt-8 pb-4 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-800">Ejercicios</h1>
        <p className="text-sm text-gray-500 mt-1 mb-5">Técnicas basadas en evidencia para el manejo de la ansiedad</p>

        <div className="space-y-3">
          {/* Crisis fast-access card */}
          <button
            onClick={() => setShowBreathing(true)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl
                       bg-gradient-to-r from-calm-500 to-calm-600
                       shadow-md shadow-calm-200/60
                       active:scale-[0.98] transition-all duration-150 text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-white">
              <BreathingCircleIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-snug">
                ¿Tienes ansiedad ahora?
              </p>
              <p className="text-white/75 text-xs mt-0.5">Empieza aquí con respiración 4-7-8</p>
            </div>
            <svg className="w-5 h-5 text-white/80 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>

          {/* Exercise list */}
          {exercises.map(ex => (
            <div key={ex.id} className="card overflow-hidden">
              <button
                className="w-full text-left flex items-start gap-4"
                onClick={() => setExpanded(expanded === ex.id ? null : ex.id)}
              >
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5
                                  ${ex.isBreathing ? 'bg-calm-100 text-calm-600' : 'bg-calm-50 text-2xl'}`}>
                  {ex.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-800">{ex.title}</p>
                    <svg
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${expanded === ex.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">{ex.subtitle}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ex.levelColor}`}>{ex.level}</span>
                    <span className="text-xs text-gray-400">⏱ {ex.duration}</span>
                  </div>
                </div>
              </button>

              {expanded === ex.id && (
                <div className="mt-4 pt-4 border-t border-calm-100 animate-fade-in">
                  <p className="text-sm text-gray-600 leading-relaxed">{ex.description}</p>
                  <button
                    onClick={getAction(ex.id)}
                    className="btn-primary w-full mt-4 text-center"
                  >
                    Iniciar ejercicio
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showBreathing     && <BreathingGuide     onClose={() => setShowBreathing(false)} />}
      {showGrounding     && <GroundingGuide     onClose={() => setShowGrounding(false)} />}
      {showMuscle        && <MuscleGuide        onClose={() => setShowMuscle(false)} />}
      {showMindfulness   && <MindfulnessGuide   onClose={() => setShowMindfulness(false)} />}
      {showVisualization && <VisualizationGuide onClose={() => setShowVisualization(false)} />}
    </>
  )
}
