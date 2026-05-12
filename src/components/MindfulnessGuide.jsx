import { useState, useEffect, useRef } from 'react'
import { useStats } from '../hooks/useStats'

const DURATIONS = [
  { label: '3 min',  value: 3  },
  { label: '5 min',  value: 5  },
  { label: '10 min', value: 10 },
]

const PROMPTS = [
  'Observa tus pensamientos como nubes que pasan. No los juzgues, solo obsérvalos.',
  'Siente el peso de tu cuerpo contra la silla o el suelo. Estás aquí, ahora.',
  'Nota cómo el aire entra frío y sale tibio. Tu respiración siempre está contigo.',
  'Deja que los sonidos a tu alrededor vengan y vayan sin aferrarte a ninguno.',
  'Imagina que cada exhalación libera tensión que no necesitas.',
  'Observa las sensaciones de tu cuerpo sin intentar cambiarlas.',
  'Estás exactamente donde debes estar en este momento.',
  'Si tu mente se aleja, regresa suavemente a tu respiración. Sin juicio.',
  'Nota el espacio entre un pensamiento y el siguiente.',
  'Siente la quietud que existe debajo de todo movimiento.',
]

const BREATH_INHALE = 4000
const BREATH_EXHALE = 6000
const PROMPT_INTERVAL = 30000

export default function MindfulnessGuide({ onClose, currentMood = null, moodNote = '' }) {
  const [phase, setPhase]           = useState('intro')   // 'intro' | 'session' | 'done'
  const [duration, setDuration]     = useState(5)
  const [elapsed, setElapsed]       = useState(0)         // seconds
  const [breathPhase, setBreathPhase] = useState('inhale')
  const [promptIdx, setPromptIdx]   = useState(0)
  const [promptVisible, setPromptVisible] = useState(true)
  const timerRef    = useRef(null)
  const breathRef   = useRef(null)
  const promptRef   = useRef(null)
  const { logExercise } = useStats()

  const totalSec = duration * 60
  const progress = Math.min(elapsed / totalSec, 1)

  // Main countdown
  useEffect(() => {
    if (phase !== 'session') return
    timerRef.current = setInterval(() => {
      setElapsed(s => {
        if (s + 1 >= totalSec) {
          clearInterval(timerRef.current)
          logExercise('mindfulness', { moodLevel: currentMood?.level, moodNote, durationMinutes: duration })
          setPhase('done')
          return totalSec
        }
        return s + 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, totalSec])

  // Breath cycle
  useEffect(() => {
    if (phase !== 'session') return
    const cycle = () => {
      setBreathPhase('inhale')
      breathRef.current = setTimeout(() => {
        setBreathPhase('exhale')
        breathRef.current = setTimeout(cycle, BREATH_EXHALE)
      }, BREATH_INHALE)
    }
    cycle()
    return () => clearTimeout(breathRef.current)
  }, [phase])

  // Rotating prompts with fade
  useEffect(() => {
    if (phase !== 'session') return
    promptRef.current = setInterval(() => {
      setPromptVisible(false)
      setTimeout(() => {
        setPromptIdx(i => (i + 1) % PROMPTS.length)
        setPromptVisible(true)
      }, 600)
    }, PROMPT_INTERVAL)
    return () => clearInterval(promptRef.current)
  }, [phase])

  const startSession = () => {
    setElapsed(0)
    setBreathPhase('inhale')
    setPromptIdx(0)
    setPromptVisible(true)
    setPhase('session')
  }

  const formatTime = s => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const remaining = totalSec - elapsed

  // SVG progress ring
  const R = 54
  const CIRC = 2 * Math.PI * R
  const dash = CIRC * progress
  const gap  = CIRC - dash

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-gray-900 via-ocean-900 to-gray-900 animate-fade-in">

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <>
          <Header title="Mindfulness" onClose={onClose} />
          <div className="flex-1 flex flex-col items-center justify-center px-7 text-center gap-7">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-ocean-400 to-calm-500
                            flex items-center justify-center shadow-lg text-4xl">
              🧘
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Mindfulness</h2>
              <p className="text-ocean-300 mt-1 font-medium">Atención plena</p>
            </div>
            <p className="text-white/70 leading-relaxed max-w-xs">
              Siéntate cómodamente, cierra los ojos o baja la mirada.
              La respiración guiará tu atención al momento presente.
            </p>

            {/* Duration picker */}
            <div className="w-full max-w-xs">
              <p className="text-white/50 text-sm mb-3">Elige la duración</p>
              <div className="flex gap-3 justify-center">
                {DURATIONS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition-all
                                ${duration === d.value
                                  ? 'bg-ocean-500 text-white shadow-lg shadow-ocean-900/40'
                                  : 'bg-white/10 text-white/60'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="px-6 pb-safe pb-10">
            <button onClick={startSession} className="w-full py-4 rounded-2xl bg-ocean-500 text-white
                                                        text-lg font-semibold active:scale-95 transition-transform">
              Comenzar
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
            <div className="flex-1" />
            <span className="text-sm text-white/60 font-medium tabular-nums">{formatTime(remaining)}</span>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">

            {/* Breath label */}
            <div className={`px-5 py-1.5 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-700
                             ${breathPhase === 'inhale'
                               ? 'bg-ocean-500/20 text-ocean-300 border border-ocean-500/30'
                               : 'bg-calm-500/20 text-calm-300 border border-calm-500/30'}`}>
              {breathPhase === 'inhale' ? 'INHALA' : 'EXHALA'}
            </div>

            {/* Progress ring + breath circle */}
            <div className="relative flex items-center justify-center">
              {/* Outer progress ring */}
              <svg width="200" height="200" className="absolute" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                <circle
                  cx="100" cy="100" r={R}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${gap}`}
                  style={{ transition: 'stroke-dasharray 1s linear' }}
                />
              </svg>

              {/* Breath circle */}
              <div
                style={{
                  width: 130, height: 130,
                  borderRadius: '50%',
                  background: breathPhase === 'inhale'
                    ? 'radial-gradient(circle, rgba(56,189,248,0.25) 0%, rgba(56,189,248,0.05) 100%)'
                    : 'radial-gradient(circle, rgba(45,212,191,0.25) 0%, rgba(45,212,191,0.05) 100%)',
                  border: `2px solid ${breathPhase === 'inhale' ? 'rgba(56,189,248,0.5)' : 'rgba(45,212,191,0.5)'}`,
                  transform: breathPhase === 'inhale' ? 'scale(1.15)' : 'scale(0.85)',
                  transition: breathPhase === 'inhale'
                    ? `transform ${BREATH_INHALE}ms ease-in-out`
                    : `transform ${BREATH_EXHALE}ms ease-in-out`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: breathPhase === 'inhale'
                    ? '0 0 40px rgba(56,189,248,0.2)'
                    : '0 0 40px rgba(45,212,191,0.15)',
                }}
              >
                <span className="text-white/40 text-sm font-light">
                  {breathPhase === 'inhale' ? `${BREATH_INHALE / 1000}s` : `${BREATH_EXHALE / 1000}s`}
                </span>
              </div>
            </div>

            {/* Rotating prompt */}
            <div
              className="max-w-xs text-center"
              style={{ opacity: promptVisible ? 1 : 0, transition: 'opacity 0.6s ease' }}
            >
              <p className="text-white/70 text-sm leading-relaxed italic">
                "{PROMPTS[promptIdx]}"
              </p>
            </div>
          </div>

          {/* Finish early */}
          <div className="px-6 pb-safe pb-8 shrink-0">
            <button
              onClick={() => {
                clearInterval(timerRef.current)
                clearTimeout(breathRef.current)
                clearInterval(promptRef.current)
                const mins = Math.max(1, Math.round(elapsed / 60))
                logExercise('mindfulness', { moodLevel: currentMood?.level, moodNote, durationMinutes: mins })
                setPhase('done')
              }}
              className="w-full py-3 rounded-2xl bg-white/8 border border-white/15
                         text-white/60 text-sm active:scale-95 transition-transform"
            >
              Terminar sesión
            </button>
          </div>
        </>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <>
          <Header title="Mindfulness" onClose={onClose} />
          <div className="flex-1 flex flex-col items-center justify-center px-7 text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-ocean-500/20 border-2 border-ocean-400
                            flex items-center justify-center animate-fade-in">
              <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="#38bdf8" strokeWidth="3.5"
                   strokeLinecap="round" strokeLinejoin="round">
                <circle cx="24" cy="24" r="20" strokeOpacity="0.4" />
                <path d="M 13 24 L 20 32 L 35 16" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">¡Sesión completada!</h2>
              <p className="text-ocean-300 mt-1">{duration} minutos de atención plena.</p>
            </div>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              Has entrenado tu mente para estar presente. Con la práctica regular,
              esto se vuelve más natural y poderoso.
            </p>
          </div>
          <div className="px-6 pb-safe pb-10 space-y-3">
            <button onClick={startSession} className="btn-secondary w-full py-3.5 bg-white/10 text-white border-white/20">
              Repetir
            </button>
            <button onClick={onClose} className="w-full py-4 rounded-2xl bg-ocean-500 text-white font-semibold
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
