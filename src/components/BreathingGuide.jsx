import { useState, useEffect, useRef } from 'react'
import { useStats } from '../hooks/useStats'

const PHASES = [
  { key: 'inhale',   label: 'Inhala',        duration: 4, instruction: 'Respira profundo por la nariz',   color: 'from-ocean-400 to-calm-400' },
  { key: 'holdIn',   label: 'Retén',         duration: 7, instruction: 'Mantén el aire suavemente',       color: 'from-calm-400 to-calm-600'  },
  { key: 'exhale',   label: 'Exhala',        duration: 8, instruction: 'Suelta lento por la boca',        color: 'from-calm-600 to-ocean-600' },
]

const SCALE_PER_PHASE = { inhale: 1.35, holdIn: 1.35, exhale: 1 }
const OPACITY_PER_PHASE = { inhale: 1, holdIn: 1, exhale: 0.7 }

export default function BreathingGuide({ onClose, currentMood = null, moodNote = '' }) {
  const [phaseIdx, setPhaseIdx]     = useState(0)
  const [timeLeft, setTimeLeft]     = useState(PHASES[0].duration)
  const [cycles, setCycles]         = useState(0)
  const [isActive, setIsActive]     = useState(false)
  const [circleScale, setCircleScale] = useState(1)
  const [circleOpacity, setCircleOpacity] = useState(0.7)
  const timerRef  = useRef(null)
  const animRef   = useRef(null)
  const startRef  = useRef(null)
  const loggedRef = useRef(false)   // prevent double-logging per session

  const { logExercise } = useStats()

  const phase = PHASES[phaseIdx]

  // Animate the circle using requestAnimationFrame for smoothness
  useEffect(() => {
    if (!isActive) return

    const targetScale   = SCALE_PER_PHASE[phase.key]
    const targetOpacity = OPACITY_PER_PHASE[phase.key]
    const prevScale     = phaseIdx === 0 ? 1 : SCALE_PER_PHASE[PHASES[(phaseIdx - 1 + PHASES.length) % PHASES.length].key]
    const prevOpacity   = phaseIdx === 0 ? 0.7 : OPACITY_PER_PHASE[PHASES[(phaseIdx - 1 + PHASES.length) % PHASES.length].key]
    const duration      = phase.duration * 1000
    const start         = performance.now()

    const animate = (now) => {
      const elapsed  = now - start
      const progress = Math.min(elapsed / duration, 1)
      const ease     = phase.key === 'inhale'
        ? easeInOut(progress)
        : phase.key === 'exhale'
          ? easeInOut(progress)
          : 1  // hold: stay at target immediately

      setCircleScale(prevScale + (targetScale - prevScale) * ease)
      setCircleOpacity(prevOpacity + (targetOpacity - prevOpacity) * ease)

      if (progress < 1) animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [phaseIdx, isActive])

  // Count down timer
  useEffect(() => {
    if (!isActive) return

    setTimeLeft(phase.duration)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          advancePhase()
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [phaseIdx, isActive])

  const advancePhase = () => {
    setPhaseIdx(prev => {
      const next = (prev + 1) % PHASES.length
      if (next === 0) setCycles(c => c + 1)
      return next
    })
  }

  // Fire once when 4 cycles are completed
  useEffect(() => {
    if (cycles >= 4 && !loggedRef.current) {
      loggedRef.current = true
      logExercise('breathing478', {
        moodLevel:       currentMood?.level ?? null,
        moodNote:        moodNote || '',
        durationMinutes: 2,
      })
    }
  }, [cycles])

  const start = () => {
    setIsActive(true)
    setPhaseIdx(0)
    setCycles(0)
    loggedRef.current = false          // reset so a new session can log again
    setTimeLeft(PHASES[0].duration)
  }

  const stop = () => {
    setIsActive(false)
    clearInterval(timerRef.current)
    cancelAnimationFrame(animRef.current)
    setCircleScale(1)
    setCircleOpacity(0.7)
    setPhaseIdx(0)
    setTimeLeft(PHASES[0].duration)
  }

  // Progress arc (SVG)
  const radius = 110
  const circumference = 2 * Math.PI * radius
  const progressFraction = isActive ? (phase.duration - timeLeft) / phase.duration : 0
  const strokeDashoffset = circumference * (1 - progressFraction)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-calm-900 via-calm-800 to-ocean-900 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe pt-6 pb-4">
        <div>
          <h2 className="text-white font-bold text-xl">Respiración 4-7-8</h2>
          <p className="text-calm-300 text-sm">Técnica de relajación del Dr. Andrew Weil</p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center
                     text-white hover:bg-white/20 transition-colors active:scale-90"
          aria-label="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Cycles counter */}
      <div className="flex justify-center gap-2 px-5 mb-6">
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all duration-500 ${
              i < cycles ? 'bg-calm-400' : i === cycles && isActive ? 'bg-calm-500/60' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Circle animation */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
          {/* SVG progress ring */}
          <svg className="absolute inset-0 -rotate-90" width="280" height="280" viewBox="0 0 280 280">
            <circle
              cx="140" cy="140" r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="4"
            />
            <circle
              cx="140" cy="140" r={radius}
              fill="none"
              stroke={isActive ? '#5eead4' : 'rgba(255,255,255,0.3)'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke] duration-500"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
            />
          </svg>

          {/* Animated breathing circle */}
          <div
            className={`w-44 h-44 rounded-full bg-gradient-to-br ${phase.color}
                        shadow-[0_0_60px_rgba(45,212,191,0.4)] flex items-center justify-center
                        transition-[box-shadow] duration-1000`}
            style={{
              transform: `scale(${circleScale})`,
              opacity: circleOpacity,
              transition: 'transform 0.1s linear, opacity 0.1s linear, box-shadow 1s ease',
            }}
          >
            {/* Inner glow */}
            <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center">
              <div className="text-center text-white">
                {isActive ? (
                  <>
                    <span className="text-4xl font-light leading-none">{timeLeft}</span>
                    <p className="text-xs mt-1 opacity-80">segundos</p>
                  </>
                ) : (
                  <svg className="w-10 h-10 opacity-80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Phase label */}
        <div className="mt-8 text-center min-h-[60px] flex flex-col items-center justify-center">
          {isActive ? (
            <>
              <h3 className="text-white text-3xl font-light tracking-wide animate-fade-in" key={phase.key}>
                {phase.label}
              </h3>
              <p className="text-calm-300 text-sm mt-2">{phase.instruction}</p>
            </>
          ) : (
            <p className="text-calm-300 text-center text-sm max-w-xs">
              Inhala 4 seg · retén 7 seg · exhala 8 seg.<br/>
              Completa 4 ciclos para máximo efecto.
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 pb-safe pb-10 space-y-3">
        {!isActive ? (
          <button onClick={start} className="w-full py-4 rounded-2xl bg-calm-500 text-white text-lg font-semibold
                                             shadow-lg shadow-calm-900/50 active:scale-95 transition-transform">
            Comenzar
          </button>
        ) : (
          <button onClick={stop} className="w-full py-4 rounded-2xl bg-white/10 text-white text-lg font-semibold
                                            border border-white/20 active:scale-95 transition-transform">
            Pausar
          </button>
        )}

        {cycles >= 4 && !isActive && (
          <div className="text-center text-calm-300 text-sm animate-fade-in">
            Completaste 4 ciclos. Bien hecho.
          </div>
        )}
      </div>
    </div>
  )
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}
