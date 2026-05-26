import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useBAIContext } from '../hooks/useBAIContext'

// ─── BAI items (validated Spanish translation) ────────────────────────────────

const ITEMS = [
  'Entumecimiento u hormigueo',
  'Sensación de calor',
  'Temblor en las piernas',
  'Incapacidad para relajarse',
  'Miedo a que ocurra algo terrible',
  'Mareo o aturdimiento',
  'Palpitaciones o taquicardia',
  'Sensación de inestabilidad',
  'Terror',
  'Nerviosismo',
  'Sensación de ahogo',
  'Temblor de manos',
  'Sensación de inseguridad',
  'Miedo a perder el control',
  'Dificultad para respirar',
  'Miedo a morir',
  'Asustado/a',
  'Indigestión o malestar abdominal',
  'Desmayo',
  'Enrojecimiento de la cara',
  'Sudoración (no debida al calor)',
]

const OPTIONS = [
  { value: 0, label: 'En absoluto' },
  { value: 1, label: 'Levemente' },
  { value: 2, label: 'Moderadamente' },
  { value: 3, label: 'Severamente' },
]

const PAGE_SIZE = 7   // 3 pages of 7 items each
const TOTAL_PAGES = Math.ceil(ITEMS.length / PAGE_SIZE)

// ─── Score interpretation ─────────────────────────────────────────────────────

function interpret(score) {
  if (score <= 7)  return { label: 'Mínima',    color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200',  bar: 'bg-green-400'  }
  if (score <= 15) return { label: 'Leve',       color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', bar: 'bg-yellow-400' }
  if (score <= 25) return { label: 'Moderada',   color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', bar: 'bg-orange-400' }
  return           { label: 'Grave',             color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    bar: 'bg-red-500'    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function saveResult(userId, answers) {
  if (!supabase || !userId) return
  const puntaje_total = answers.reduce((s, v) => s + v, 0)
  await supabase.from('resultados_bai').insert({
    user_id: userId,
    puntaje_total,
    respuestas: answers,
    semana_estudio: null,
  })
}

async function fetchHistory(userId) {
  if (!supabase || !userId) return []
  const { data } = await supabase
    .from('resultados_bai')
    .select('id, fecha, puntaje_total')
    .eq('user_id', userId)
    .order('fecha', { ascending: false })
    .limit(5)
  return data ?? []
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Header({ onClose }) {
  return (
    <div className="flex items-center justify-between px-5 pt-safe pt-5 pb-2 shrink-0">
      <div className="w-8" />
      <span className="text-sm font-semibold text-gray-600">Inventario de Ansiedad de Beck</span>
      <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center
                         text-gray-500 hover:bg-gray-200 active:scale-90 transition-all">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function HistoryItem({ result }) {
  const interp = interpret(result.puntaje_total)
  const date   = new Date(result.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${interp.bg} ${interp.border}`}>
      <div>
        <p className="text-sm font-semibold text-gray-700">{date}</p>
        <p className={`text-xs font-medium ${interp.color}`}>Ansiedad {interp.label}</p>
      </div>
      <span className={`text-2xl font-bold ${interp.color}`}>{result.puntaje_total}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const bannerColors = {
  verde: 'bg-green-50 border border-green-200 text-green-800',
  ambar: 'bg-amber-50 border border-amber-200 text-amber-800',
  azul:  'bg-blue-50 border border-blue-200 text-blue-800',
  info:  'bg-calm-50 border border-calm-200 text-calm-700',
  neutro:'bg-gray-50 border border-gray-200 text-gray-600',
}

export default function BAI({ onClose }) {
  const { userId } = useAuth()
  const { bannerContext, proximaMedicion, TIPO_LABEL, cargar: recargarBAI } = useBAIContext()

  const [phase,   setPhase]   = useState('intro')    // 'intro' | 'questions' | 'done'
  const [page,    setPage]    = useState(0)
  const [answers, setAnswers] = useState(Array(ITEMS.length).fill(null))
  const [score,   setScore]   = useState(0)
  const [history, setHistory] = useState([])
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    fetchHistory(userId).then(setHistory)
  }, [userId])

  const pageItems   = ITEMS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pageAnswers = answers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pageComplete = pageAnswers.every(a => a !== null)
  const totalAnswered = answers.filter(a => a !== null).length
  const progress = totalAnswered / ITEMS.length

  const setAnswer = (itemIdx, value) => {
    setAnswers(prev => {
      const next = [...prev]
      next[page * PAGE_SIZE + itemIdx] = value
      return next
    })
  }

  const nextPage = () => {
    if (page < TOTAL_PAGES - 1) {
      setPage(p => p + 1)
    } else {
      const total = answers.reduce((s, v) => s + (v ?? 0), 0)
      setScore(total)
      setSaving(true)
      saveResult(userId, answers).finally(() => {
        setSaving(false)
        fetchHistory(userId).then(setHistory)
        recargarBAI()
      })
      setPhase('done')
    }
  }

  const restart = () => {
    setAnswers(Array(ITEMS.length).fill(null))
    setPage(0)
    setPhase('questions')
  }

  const interp = interpret(score)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-calm-50 animate-fade-in">

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <>
          <Header onClose={onClose} />
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <div className="pt-4 pb-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-400 to-calm-500
                              flex items-center justify-center shadow-md text-3xl mx-auto mb-4">
                📋
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Cuestionario BAI</h2>
              <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                21 síntomas de ansiedad del último mes, incluido hoy
              </p>
            </div>

            <div className="card mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">¿Cómo responder?</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Para cada síntoma, indica cuánto te ha molestado durante la última semana,
                incluyendo hoy. No hay respuestas correctas o incorrectas.
              </p>
              <div className="mt-3 space-y-1.5">
                {OPTIONS.map(o => (
                  <div key={o.value} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-calm-100 text-calm-700 text-xs font-bold
                                     flex items-center justify-center shrink-0">{o.value}</span>
                    <span className="text-xs text-gray-600">{o.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Resultados anteriores
                </p>
                <div className="space-y-2">
                  {history.map(r => <HistoryItem key={r.id} result={r} />)}
                </div>
              </div>
            )}

            {bannerContext?.texto && (
              <div className={`mb-4 p-3 rounded-xl text-sm leading-relaxed ${bannerColors[bannerContext.color]}`}>
                {bannerContext.urgente && <span className="font-bold mr-1">⚠</span>}
                {bannerContext.texto}
              </div>
            )}
          </div>

          <div className="px-5 pb-safe pb-8 shrink-0">
            <button
              onClick={() => setPhase('questions')}
              className="w-full py-4 rounded-2xl bg-calm-500 text-white text-lg font-semibold
                         active:scale-95 transition-transform"
            >
              {history.length > 0 ? 'Repetir cuestionario' : 'Comenzar'}
            </button>
          </div>
        </>
      )}

      {/* ── QUESTIONS ── */}
      {phase === 'questions' && (
        <>
          {/* Top bar */}
          <div className="px-5 pt-safe pt-5 pb-3 shrink-0 bg-calm-50 border-b border-calm-100">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white flex items-center
                                                    justify-center text-gray-500 active:scale-90 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Página {page + 1} de {TOTAL_PAGES}</span>
                  <span>{totalAnswered}/{ITEMS.length} respondidas</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-calm-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 italic">
              ¿Cuánto te ha molestado este síntoma en la última semana?
            </p>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {pageItems.map((item, i) => {
              const globalIdx = page * PAGE_SIZE + i
              const selected  = answers[globalIdx]
              return (
                <div key={globalIdx} className="card">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="w-6 h-6 rounded-full bg-calm-100 text-calm-700 text-xs font-bold
                                     flex items-center justify-center shrink-0 mt-0.5">
                      {globalIdx + 1}
                    </span>
                    <p className="text-sm font-semibold text-gray-800 leading-snug">{item}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {OPTIONS.map(o => (
                      <button
                        key={o.value}
                        onClick={() => setAnswer(i, o.value)}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium
                                    transition-all active:scale-95
                                    ${selected === o.value
                                      ? 'bg-calm-500 text-white shadow-sm'
                                      : 'bg-calm-50 text-gray-500 hover:bg-calm-100'}`}
                      >
                        <span className="text-base font-bold">{o.value}</span>
                        <span className="text-[10px] leading-tight text-center px-0.5">{o.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom action */}
          <div className="px-5 pb-safe pb-8 pt-3 shrink-0 bg-calm-50 border-t border-calm-100">
            <button
              onClick={nextPage}
              disabled={!pageComplete}
              className={`w-full py-4 rounded-2xl text-white text-base font-semibold
                          transition-all active:scale-95
                          ${pageComplete ? 'bg-calm-500 shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              {page < TOTAL_PAGES - 1 ? `Siguiente (${page + 2}/${TOTAL_PAGES})` : (saving ? 'Guardando…' : 'Ver resultado')}
            </button>
          </div>
        </>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <>
          <Header onClose={onClose} />
          <div className="flex-1 overflow-y-auto px-5 pb-4">

            {/* Score card */}
            <div className={`mt-4 p-6 rounded-3xl border-2 text-center ${interp.bg} ${interp.border} mb-6`}>
              <p className="text-sm font-semibold text-gray-500 mb-1">Puntuación total</p>
              <p className={`text-6xl font-bold mb-2 ${interp.color}`}>{score}</p>
              <p className="text-sm text-gray-500 mb-3">de 63 puntos posibles</p>

              {/* Score bar */}
              <div className="h-3 bg-white/60 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${interp.bar}`}
                  style={{ width: `${(score / 63) * 100}%` }}
                />
              </div>

              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70`}>
                <span className={`text-sm font-bold ${interp.color}`}>Ansiedad {interp.label}</span>
              </div>
            </div>

            {/* Tipo de medición guardada */}
            <div className="card mb-4 text-center">
              <p className="text-sm text-gray-500">Esta medición fue registrada como</p>
              <p className="font-semibold text-calm-700 mt-1">
                {TIPO_LABEL[bannerContext?.tipo] ?? 'Voluntaria'}
              </p>
              {proximaMedicion && (
                <p className="text-xs text-gray-400 mt-2">
                  Tu siguiente medición programada: {proximaMedicion.label} <br/>
                  Del {proximaMedicion.desde.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} al {proximaMedicion.hasta.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>

            {/* Scale reference */}
            <div className="card mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Escala de referencia</p>
              {[
                { range: '0 – 7',   label: 'Mínima',  bar: 'bg-green-400',  pct: 11 },
                { range: '8 – 15',  label: 'Leve',    bar: 'bg-yellow-400', pct: 24 },
                { range: '16 – 25', label: 'Moderada',bar: 'bg-orange-400', pct: 40 },
                { range: '26 – 63', label: 'Grave',   bar: 'bg-red-500',    pct: 100 },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-3 mb-2 last:mb-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${r.bar}`} />
                  <span className="text-xs text-gray-500 w-16 shrink-0">{r.range}</span>
                  <span className="text-xs font-medium text-gray-700">{r.label}</span>
                </div>
              ))}
            </div>

            {/* History */}
            {history.length > 1 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Historial
                </p>
                <div className="space-y-2">
                  {history.map(r => <HistoryItem key={r.id} result={r} />)}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center leading-relaxed px-4 mb-2">
              Este cuestionario es una herramienta de autoconocimiento, no un diagnóstico clínico.
              Si tienes dudas, consulta con un profesional de salud mental.
            </p>
          </div>

          <div className="px-5 pb-safe pb-8 pt-3 shrink-0 space-y-3 border-t border-calm-100 bg-calm-50">
            <button onClick={restart} className="w-full py-3.5 rounded-2xl bg-white border border-calm-200
                                                  text-gray-700 font-medium text-sm active:scale-95 transition-transform">
              Repetir cuestionario
            </button>
            <button onClick={onClose} className="w-full py-4 rounded-2xl bg-calm-500 text-white font-semibold
                                                  active:scale-95 transition-transform">
              Volver a Progreso
            </button>
          </div>
        </>
      )}
    </div>
  )
}
