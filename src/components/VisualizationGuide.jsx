import { useState } from 'react'
import { useStats } from '../hooks/useStats'

const SCENES = [
  {
    icon: '🌅',
    title: 'Llegando al lugar',
    text: 'Cierra los ojos. Imagina que llegas a un lugar tranquilo junto al mar. El sol comienza a ponerse tiñendo el cielo de naranja y rosa. Sientes la brisa suave en tu piel.',
  },
  {
    icon: '🏖️',
    title: 'La playa',
    text: 'Caminas descalzo por la orilla. La arena tibia masajea tus pies. Escuchas el suave romper de las olas, una tras otra, como una respiración lenta y constante.',
  },
  {
    icon: '🌊',
    title: 'El sonido del agua',
    text: 'Te sientas en la arena y observas el océano. Las olas vienen y van, llevándose contigo cualquier preocupación. Cada ola que se aleja se lleva tensión de tu cuerpo.',
  },
  {
    icon: '☀️',
    title: 'La luz del sol',
    text: 'El sol tibio toca tu piel. Sientes su calor recorriendo desde tu cabeza hasta los hombros, el pecho, los brazos, las piernas. Ese calor es relajación pura.',
  },
  {
    icon: '🌿',
    title: 'Los aromas',
    text: 'Respiras profundo y percibes el aroma salado del mar mezclado con flores silvestres. Cada inhalación te llena de calma. Cada exhalación suelta lo que no necesitas.',
  },
  {
    icon: '🐚',
    title: 'Encuentras algo especial',
    text: 'Junto a ti hay una concha perfecta en la arena. La tomas y sientes su textura suave. Es un símbolo de paz que siempre puedes llevar contigo en tu mente.',
  },
  {
    icon: '🌙',
    title: 'Las primeras estrellas',
    text: 'El cielo se oscurece suavemente y aparecen las primeras estrellas. El universo es vasto y tú formas parte de él. En este momento, estás completamente seguro y en paz.',
  },
  {
    icon: '✨',
    title: 'Llevando la calma',
    text: 'Guarda este momento en tu memoria. Puedes volver aquí siempre que lo necesites. Ahora comienza a volver lentamente, trayendo contigo esta sensación de calma y bienestar.',
  },
]

export default function VisualizationGuide({ onClose, currentMood = null, moodNote = '' }) {
  const [phase, setPhase]       = useState('intro')   // 'intro' | 'session' | 'done'
  const [sceneIdx, setSceneIdx] = useState(0)
  const { logExercise } = useStats()

  const scene    = SCENES[sceneIdx]
  const isLast   = sceneIdx === SCENES.length - 1
  const progress = (sceneIdx + 1) / SCENES.length

  const startSession = () => {
    setSceneIdx(0)
    setPhase('session')
  }

  const next = () => {
    if (isLast) {
      logExercise('visualization', { moodLevel: currentMood?.level, moodNote, durationMinutes: 8 })
      setPhase('done')
    } else {
      setSceneIdx(i => i + 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-gray-900 via-purple-950 to-gray-900 animate-fade-in">

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <>
          <Header title="Visualización guiada" onClose={onClose} />
          <div className="flex-1 flex flex-col items-center justify-center px-7 text-center gap-7">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-400 to-ocean-500
                            flex items-center justify-center shadow-lg text-4xl">
              🏞️
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Visualización guiada</h2>
              <p className="text-purple-300 mt-1 font-medium">Viaje a un lugar de paz</p>
            </div>
            <p className="text-white/70 leading-relaxed max-w-xs">
              Te llevaré en un viaje imaginario a una playa tranquila.
              Cierra los ojos entre cada escena y permítete sentir lo que describes.
            </p>
            <div className="flex flex-col gap-2 text-sm text-white/50">
              <div className="flex items-center gap-2 justify-center">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">8</span>
                <span>escenas guiadas</span>
              </div>
              <span>Duración aproximada: 8 min</span>
            </div>
          </div>
          <div className="px-6 pb-safe pb-10">
            <button onClick={startSession} className="w-full py-4 rounded-2xl
                                                        bg-gradient-to-r from-purple-500 to-ocean-500
                                                        text-white text-lg font-semibold
                                                        active:scale-95 transition-transform">
              Comenzar viaje
            </button>
          </div>
        </>
      )}

      {/* ── SESSION ── */}
      {phase === 'session' && (
        <>
          {/* Top bar */}
          <div className="px-5 pt-safe pt-5 pb-3 flex items-center gap-3 shrink-0">
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center
                                                  justify-center text-white active:scale-90 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-xs text-white/60 shrink-0">{sceneIdx + 1}/{SCENES.length}</span>
          </div>

          {/* Scene content */}
          <div
            className="flex-1 flex flex-col items-center justify-center px-7 gap-7 animate-fade-in"
            key={sceneIdx}
          >
            {/* Scene icon */}
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/15
                            flex items-center justify-center text-5xl
                            shadow-[0_0_40px_rgba(168,85,247,0.2)]">
              {scene.icon}
            </div>

            {/* Scene title */}
            <div className="text-center">
              <p className="text-xs font-bold tracking-widest uppercase text-purple-400 mb-2">
                Escena {sceneIdx + 1}
              </p>
              <h3 className="text-2xl font-bold text-white">{scene.title}</h3>
            </div>

            {/* Scene text */}
            <div className="bg-white/5 border border-white/10 rounded-3xl px-6 py-5 max-w-sm">
              <p className="text-white/80 text-sm leading-relaxed text-center">
                {scene.text}
              </p>
            </div>

            {/* Breathe hint */}
            <p className="text-white/30 text-xs italic">
              Cierra los ojos un momento y visualízalo
            </p>
          </div>

          {/* Next button */}
          <div className="px-6 pb-safe pb-10 shrink-0">
            <button
              onClick={next}
              className={`w-full py-4 rounded-2xl text-white text-base font-semibold
                          active:scale-95 transition-all
                          ${isLast
                            ? 'bg-gradient-to-r from-purple-500 to-ocean-500 shadow-lg'
                            : 'bg-white/15 border border-white/20'}`}
            >
              {isLast ? 'Completar visualización' : 'Siguiente escena →'}
            </button>
          </div>
        </>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <>
          <Header title="Visualización guiada" onClose={onClose} />
          <div className="flex-1 flex flex-col items-center justify-center px-7 text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-purple-500/20 border-2 border-purple-400
                            flex items-center justify-center animate-fade-in">
              <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="#c084fc" strokeWidth="3.5"
                   strokeLinecap="round" strokeLinejoin="round">
                <circle cx="24" cy="24" r="20" strokeOpacity="0.4" />
                <path d="M 13 24 L 20 32 L 35 16" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Viaje completado</h2>
              <p className="text-purple-300 mt-1">Llevas la playa contigo.</p>
            </div>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              Tu mente acaba de visitar un lugar de paz. Puedes volver a este
              viaje siempre que necesites calma y claridad.
            </p>
          </div>
          <div className="px-6 pb-safe pb-10 space-y-3">
            <button onClick={startSession} className="btn-secondary w-full py-3.5 bg-white/10 text-white border-white/20">
              Repetir viaje
            </button>
            <button onClick={onClose} className="w-full py-4 rounded-2xl
                                                  bg-gradient-to-r from-purple-500 to-ocean-500
                                                  text-white font-semibold active:scale-95 transition-transform">
              Volver
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Header({ title, onClose }) {
  return (
    <div className="flex items-center justify-between px-5 pt-safe pt-5 pb-2 shrink-0">
      <div className="w-8" />
      <span className="text-sm font-semibold text-white/70">{title}</span>
      <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center
                         text-white hover:bg-white/20 active:scale-90 transition-all">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
