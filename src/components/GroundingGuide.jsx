import { useState, useRef, useEffect } from 'react'
import { useStats } from '../hooks/useStats'

const STEPS = [
  {
    sense: 'VER',
    count: 5,
    emoji: '👁️',
    color: 'from-ocean-400 to-calm-400',
    bgSoft: 'bg-ocean-50',
    ring: 'ring-ocean-300',
    accent: 'text-ocean-600',
    instruction: 'Nombra 5 cosas que puedes VER ahora mismo',
    hint: 'Pueden ser objetos, colores, formas, personas…',
  },
  {
    sense: 'TOCAR',
    count: 4,
    emoji: '✋',
    color: 'from-calm-400 to-calm-600',
    bgSoft: 'bg-calm-50',
    ring: 'ring-calm-300',
    accent: 'text-calm-600',
    instruction: 'Nombra 4 cosas que puedes TOCAR o sentir',
    hint: 'Texturas, temperatura, superficies a tu alrededor…',
  },
  {
    sense: 'ESCUCHAR',
    count: 3,
    emoji: '👂',
    color: 'from-calm-500 to-ocean-500',
    bgSoft: 'bg-calm-50',
    ring: 'ring-calm-300',
    accent: 'text-calm-700',
    instruction: 'Nombra 3 cosas que puedes ESCUCHAR',
    hint: 'Sonidos cercanos, lejanos, tu propia respiración…',
  },
  {
    sense: 'OLER',
    count: 2,
    emoji: '👃',
    color: 'from-ocean-500 to-calm-500',
    bgSoft: 'bg-ocean-50',
    ring: 'ring-ocean-200',
    accent: 'text-ocean-600',
    instruction: 'Nombra 2 cosas que puedes OLER o te gustaría oler',
    hint: 'Aromas presentes o que recuerdas con agrado…',
  },
  {
    sense: 'SABOREAR',
    count: 1,
    emoji: '👅',
    color: 'from-calm-400 to-ocean-400',
    bgSoft: 'bg-calm-50',
    ring: 'ring-calm-300',
    accent: 'text-calm-600',
    instruction: 'Nombra 1 cosa que puedes SABOREAR',
    hint: 'Un sabor presente o que te traiga calma…',
  },
]

// Animated checkmark drawn by a path
function CheckCircle() {
  return (
    <svg viewBox="0 0 80 80" width="80" height="80" className="animate-fade-in">
      <circle
        cx="40" cy="40" r="36"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="4"
        strokeDasharray="226"
        strokeDashoffset="0"
        style={{ animation: 'drawCircle 0.7s ease-out forwards' }}
      />
      <path
        d="M 22 40 L 34 53 L 58 26"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="60"
        strokeDashoffset="0"
        style={{ animation: 'drawCheck 0.4s 0.6s ease-out both' }}
      />
      <style>{`
        @keyframes drawCircle {
          from { stroke-dashoffset: 226; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes drawCheck {
          from { stroke-dashoffset: 60; opacity: 0; }
          to   { stroke-dashoffset: 0;  opacity: 1; }
        }
      `}</style>
    </svg>
  )
}

export default function GroundingGuide({ onClose, currentMood = null, moodNote = '' }) {
  const [phase, setPhase] = useState('intro') // 'intro' | 0..4 | 'done'
  const [answers, setAnswers] = useState(
    STEPS.map(s => Array(s.count).fill(''))
  )
  const firstInputRef = useRef(null)
  const { logExercise } = useStats()

  const stepIdx = typeof phase === 'number' ? phase : null
  const step    = stepIdx !== null ? STEPS[stepIdx] : null

  // Focus first input when a new step loads
  useEffect(() => {
    if (stepIdx !== null) {
      const t = setTimeout(() => firstInputRef.current?.focus(), 300)
      return () => clearTimeout(t)
    }
  }, [stepIdx])

  const updateAnswer = (stepI, fieldI, value) => {
    setAnswers(prev => {
      const next = prev.map(a => [...a])
      next[stepI][fieldI] = value
      return next
    })
  }

  const canAdvance = stepIdx !== null
    && answers[stepIdx].some(v => v.trim().length > 0)

  const handleNext = () => {
    if (stepIdx < STEPS.length - 1) {
      setPhase(stepIdx + 1)
    } else {
      logExercise('grounding', {
        moodLevel:       currentMood?.level ?? null,
        moodNote:        moodNote || '',
        durationMinutes: 5,
        answers: answers.map((group, i) => ({
          sense: STEPS[i].sense,
          items: group.filter(v => v.trim()),
        })),
      })
      setPhase('done')
    }
  }

  const handleRepeat = () => {
    setAnswers(STEPS.map(s => Array(s.count).fill('')))
    setPhase('intro')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-calm-50 animate-fade-in overflow-hidden">

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <>
          <Header onClose={onClose} />
          <div className="flex-1 flex flex-col items-center justify-center px-7 text-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-calm-400 to-ocean-400
                            flex items-center justify-center shadow-lg shadow-calm-200">
              <span className="text-4xl">🌿</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-800">Grounding 5-4-3-2-1</h2>
              <p className="text-calm-600 font-medium">Ancla tu mente al presente</p>
            </div>
            <p className="text-gray-500 leading-relaxed max-w-xs">
              Esta técnica interrumpe el ciclo de ansiedad trayendo tu atención
              al momento actual usando tus sentidos.
            </p>
            <div className="flex gap-1.5 pt-2">
              {STEPS.map((s, i) => (
                <span key={i} className="text-xl">{s.emoji}</span>
              ))}
            </div>
          </div>
          <div className="px-6 pb-safe pb-10">
            <button
              onClick={() => setPhase(0)}
              className="btn-primary w-full py-4 text-lg"
            >
              Comenzar
            </button>
          </div>
        </>
      )}

      {/* ── STEPS ── */}
      {stepIdx !== null && step && (
        <>
          {/* Progress bar */}
          <div className="px-5 pt-safe pt-5 pb-2 flex items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center
                         text-gray-500 hover:bg-gray-200 active:scale-90 transition-all shrink-0"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex-1 flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                    i < stepIdx  ? 'bg-calm-500' :
                    i === stepIdx ? 'bg-calm-400' :
                                    'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400 font-medium shrink-0 w-8 text-right">
              {stepIdx + 1}/{STEPS.length}
            </span>
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 animate-fade-in" key={stepIdx}>
            {/* Sense header */}
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color}
                               flex items-center justify-center shadow-md shrink-0`}>
                <span className="text-3xl">{step.emoji}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  Paso {stepIdx + 1}
                </p>
                <h3 className="text-3xl font-bold text-gray-800 leading-none mt-0.5">
                  {step.count} — {step.sense}
                </h3>
              </div>
            </div>

            <p className="text-base font-semibold text-gray-700 mb-1">{step.instruction}</p>
            <p className="text-sm text-gray-400 mb-5">{step.hint}</p>

            {/* Input fields */}
            <div className="space-y-3">
              {Array.from({ length: step.count }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center
                                    text-sm font-bold shrink-0 transition-colors duration-200
                                    ${answers[stepIdx][i].trim()
                                      ? `bg-gradient-to-br ${step.color} text-white shadow-sm`
                                      : 'bg-gray-100 text-gray-400'
                                    }`}>
                    {i + 1}
                  </span>
                  <input
                    ref={i === 0 ? firstInputRef : null}
                    type="text"
                    value={answers[stepIdx][i]}
                    onChange={e => updateAnswer(stepIdx, i, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && i < step.count - 1) {
                        e.currentTarget.closest('.space-y-3')
                          ?.querySelectorAll('input')[i + 1]?.focus()
                      }
                    }}
                    placeholder={`${step.sense.charAt(0) + step.sense.slice(1).toLowerCase()} ${i + 1}…`}
                    className={`flex-1 bg-white border rounded-xl px-4 py-3 text-sm text-gray-800
                                placeholder-gray-300 transition-all duration-150
                                focus:outline-none focus:ring-2 ${step.ring} focus:border-transparent
                                ${answers[stepIdx][i].trim() ? 'border-calm-200' : 'border-gray-200'}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Next button */}
          <div className="px-5 pb-safe pb-8 pt-3 shrink-0">
            <button
              onClick={handleNext}
              disabled={!canAdvance}
              className={`w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200
                          ${canAdvance
                            ? 'bg-calm-600 text-white shadow-lg shadow-calm-200 active:scale-95'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
            >
              {stepIdx < STEPS.length - 1 ? 'Siguiente →' : 'Finalizar'}
            </button>
          </div>
        </>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <>
          <Header onClose={onClose} />
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 animate-fade-in">
            {/* Success header */}
            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <CheckCircle />
              <h2 className="text-2xl font-bold text-gray-800">¡Lo lograste!</h2>
              <p className="text-calm-600 font-medium">Tu mente está aquí y ahora.</p>
              <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
                Has conectado con el presente a través de tus cinco sentidos.
                La ansiedad disminuye cuando anclas tu atención al momento actual.
              </p>
            </div>

            {/* Summary */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">
                Lo que nombraste
              </p>
              {STEPS.map((s, si) => {
                const items = answers[si].filter(v => v.trim())
                if (!items.length) return null
                return (
                  <div key={si} className={`rounded-2xl p-4 ${s.bgSoft} border border-calm-100`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{s.emoji}</span>
                      <span className={`text-xs font-bold uppercase tracking-wider ${s.accent}`}>
                        {s.sense}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {items.map((item, ii) => (
                        <li key={ii} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-calm-400 mt-0.5">·</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-5 pb-safe pb-10 pt-3 space-y-2.5 shrink-0">
            <button onClick={handleRepeat} className="btn-secondary w-full py-3.5">
              Repetir ejercicio
            </button>
            <button onClick={onClose} className="btn-primary w-full py-3.5">
              Volver al inicio
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Header({ onClose }) {
  return (
    <div className="flex items-center justify-between px-5 pt-safe pt-5 pb-2 shrink-0">
      <div className="w-8" /> {/* spacer */}
      <span className="text-sm font-semibold text-gray-500">Grounding</span>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center
                   text-gray-500 hover:bg-gray-200 active:scale-90 transition-all"
        aria-label="Cerrar"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
