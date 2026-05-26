import { useState, useEffect, useRef } from 'react'
import { useStats } from '../hooks/useStats'
import { useMuscleAudio } from '../hooks/useMuscleAudio'

const GROUPS = [
  { name: 'Pies y dedos',  tense: 'Dobla los dedos del pie hacia abajo con fuerza',         relax: 'Suelta completamente, siente el peso en el suelo' },
  { name: 'Pantorrillas',  tense: 'Apunta los pies hacia arriba, tensa las piernas',         relax: 'Deja caer los pies, suelta las pantorrillas' },
  { name: 'Muslos',        tense: 'Aprieta muslos y glúteos con toda tu fuerza',             relax: 'Afloja, nota el calor que se libera' },
  { name: 'Abdomen',       tense: 'Contrae el abdomen como si esperaras un golpe',           relax: 'Libera el abdomen, respira profundo' },
  { name: 'Manos',         tense: 'Cierra los puños apretando al máximo',                    relax: 'Abre las manos lentamente, siente el calor' },
  { name: 'Brazos',        tense: 'Dobla los codos y aprieta los bíceps al máximo',          relax: 'Estira los brazos suavemente y déjalos caer' },
  { name: 'Hombros',       tense: 'Sube los hombros hacia las orejas todo lo que puedas',   relax: 'Déjalos caer, siente el peso que se libera' },
  { name: 'Cuello',        tense: 'Presiona suavemente la cabeza hacia atrás',               relax: 'Vuelve al centro, cuello suelto y pesado' },
  { name: 'Cara',          tense: 'Arruga la frente, cierra ojos y aprieta la mandíbula',   relax: 'Suelta todo: frente, ojos, mejillas, boca' },
]

const TENSE_SEC = 7
const RELAX_SEC = 15

export default function MuscleGuide({ onClose, currentMood = null, moodNote = '' }) {
  const [phase, setPhase]         = useState('intro')   // 'intro' | 'exercise' | 'done'
  const [groupIdx, setGroupIdx]   = useState(0)
  const [stage, setStage]         = useState('tense')   // 'tense' | 'relax'
  const [timeLeft, setTimeLeft]   = useState(TENSE_SEC)
  const [relaxed, setRelaxed]     = useState(false)     // drives CSS relax animation
  const timerRef = useRef(null)
  const { logExercise } = useStats()
  const { muted, toggleMute, cue, cancel } = useMuscleAudio()

  const group = GROUPS[groupIdx]

  // Timer tick
  useEffect(() => {
    if (phase !== 'exercise') return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          advance()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, groupIdx, stage])

  // Audio cue at each stage/group change
  useEffect(() => {
    if (phase !== 'exercise') return
    const instruction = stage === 'tense' ? group.tense : group.relax
    cue(stage, group.name, instruction)
  }, [phase, groupIdx, stage])

  // CSS animation: relax circle expands over RELAX_SEC
  useEffect(() => {
    if (stage === 'relax') {
      const id = requestAnimationFrame(() => setRelaxed(true))
      return () => cancelAnimationFrame(id)
    }
    setRelaxed(false)
  }, [stage])

  const advance = () => {
    if (stage === 'tense') {
      setStage('relax')
      setTimeLeft(RELAX_SEC)
    } else {
      if (groupIdx < GROUPS.length - 1) {
        setGroupIdx(i => i + 1)
        setStage('tense')
        setTimeLeft(TENSE_SEC)
      } else {
        clearInterval(timerRef.current)
        logExercise('muscle', { moodLevel: currentMood?.level, moodNote, durationMinutes: 10 })
        setPhase('done')
      }
    }
  }

  const startExercise = () => {
    setGroupIdx(0)
    setStage('tense')
    setTimeLeft(TENSE_SEC)
    setRelaxed(false)
    setPhase('exercise')
  }

  const isTense = stage === 'tense'
  const progress = (groupIdx * 2 + (isTense ? 0 : 1)) / (GROUPS.length * 2)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-gray-900 via-calm-900 to-gray-900 animate-fade-in">

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <>
          <Header title="Relajación muscular" onClose={onClose} />
          <div className="flex-1 flex flex-col items-center justify-center px-7 text-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-400 to-calm-500
                            flex items-center justify-center shadow-lg text-4xl">
              💪
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Relajación muscular</h2>
              <p className="text-calm-300 mt-1 font-medium">Técnica de Jacobson</p>
            </div>
            <p className="text-white/70 leading-relaxed max-w-xs">
              Tensarás y relajarás 9 grupos musculares de forma progresiva.
              Al contraer y soltar, el cuerpo aprende a liberar tensión acumulada.
            </p>
            <div className="flex gap-2 flex-wrap justify-center">
              {GROUPS.map((g, i) => (
                <span key={i} className="text-xs text-calm-300 bg-white/10 px-2 py-1 rounded-full">
                  {g.name}
                </span>
              ))}
            </div>
            <p className="text-white/50 text-sm">Duración aproximada: 10 min</p>
          </div>
          <div className="px-6 pb-safe pb-10">
            <button onClick={startExercise} className="w-full py-4 rounded-2xl bg-calm-500 text-white
                                                        text-lg font-semibold active:scale-95 transition-transform">
              Comenzar
            </button>
          </div>
        </>
      )}

      {/* ── EXERCISE ── */}
      {phase === 'exercise' && (
        <>
          {/* Progress bar */}
          <div className="px-5 pt-safe pt-5 pb-3 flex items-center gap-3 shrink-0">
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center
                                                  justify-center text-white active:scale-90 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button onClick={toggleMute} className="w-8 h-8 rounded-full bg-white/10 flex items-center
                                                     justify-center text-white active:scale-90 transition-all shrink-0">
              {muted ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              )}
            </button>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-calm-400 rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-xs text-white/60 shrink-0">{groupIdx + 1}/{GROUPS.length}</span>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in" key={`${groupIdx}-${stage}`}>
            {/* Phase badge */}
            <div className={`px-5 py-1.5 rounded-full text-sm font-bold tracking-widest uppercase
                             ${isTense ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                       : 'bg-calm-500/20 text-calm-300 border border-calm-500/30'}`}>
              {isTense ? 'TENSA' : 'RELAJA'}
            </div>

            {/* Animated circle */}
            <div
              className={`rounded-full border-4 shadow-[0_0_40px_rgba(0,0,0,0.4)]
                          flex items-center justify-center`}
              style={{
                width: 180, height: 180,
                transform: isTense ? 'scale(0.78)' : (relaxed ? 'scale(1.28)' : 'scale(0.78)'),
                transition: isTense
                  ? 'transform 0.4s ease-in'
                  : `transform ${RELAX_SEC}s ease-out`,
                borderColor:     isTense ? '#f87171' : '#2dd4bf',
                backgroundColor: isTense ? 'rgba(239,68,68,0.12)' : 'rgba(45,212,191,0.12)',
                boxShadow: isTense
                  ? '0 0 30px rgba(239,68,68,0.2)'
                  : '0 0 40px rgba(45,212,191,0.25)',
              }}
            >
              <span className="text-5xl font-light text-white tabular-nums">{timeLeft}</span>
            </div>

            {/* Group name & instruction */}
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-bold text-white">{group.name}</h3>
              <p className="text-white/70 text-sm max-w-xs leading-relaxed">
                {isTense ? group.tense : group.relax}
              </p>
            </div>
          </div>

          {/* Skip button */}
          <div className="px-6 pb-safe pb-8 shrink-0">
            <button onClick={() => { cancel(); advance() }}
                    className="w-full py-3 rounded-2xl bg-white/8 border border-white/15
                               text-white/60 text-sm active:scale-95 transition-transform">
              Saltar al siguiente
            </button>
          </div>
        </>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <>
          <Header title="Relajación muscular" onClose={onClose} />
          <div className="flex-1 flex flex-col items-center justify-center px-7 text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-calm-500/20 border-2 border-calm-400
                            flex items-center justify-center animate-fade-in">
              <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="#2dd4bf" strokeWidth="3.5"
                   strokeLinecap="round" strokeLinejoin="round">
                <circle cx="24" cy="24" r="20" strokeOpacity="0.4" />
                <path d="M 13 24 L 20 32 L 35 16" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">¡Completado!</h2>
              <p className="text-calm-300 mt-1">Los 9 grupos musculares relajados.</p>
            </div>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              Tu cuerpo acaba de liberar tensión acumulada. Este estado de relajación
              puede durar varios minutos. Tómate tu tiempo.
            </p>
          </div>
          <div className="px-6 pb-safe pb-10 space-y-3">
            <button onClick={startExercise} className="btn-secondary w-full py-3.5 bg-white/10 text-white border-white/20">
              Repetir
            </button>
            <button onClick={onClose} className="w-full py-4 rounded-2xl bg-calm-500 text-white font-semibold
                                                  active:scale-95 transition-transform">
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
