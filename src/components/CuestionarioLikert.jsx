import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// ─── Cuestionario Likert genérico (SWLS, SUS) ─────────────────────────────────
// Misma estructura visual que BAI.jsx (intro → preguntas → listo), pero:
// - el puntaje lo calcula la BD (columna generada) y NO se muestra al participante,
//   para no influir en sus respuestas;
// - si el guardado falla se muestra el error y se puede reintentar.
//
// `escala`: { tabla, encabezado, titulo, subtitulo, icono, instruccion, pregunta, items, opciones }

async function guardar(tabla, userId, answers) {
  if (!supabase || !userId) throw new Error('sin-conexion')
  const fila = { user_id: userId }
  answers.forEach((v, i) => { fila[`item_${i + 1}`] = v })
  const { error } = await supabase.from(tabla).insert(fila)
  if (error) throw error
}

function CloseButton({ onClick, white = false }) {
  return (
    <button onClick={onClick}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-gray-500
                        active:scale-90 transition-all
                        ${white ? 'bg-white shadow-sm' : 'bg-gray-100 hover:bg-gray-200'}`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

function Header({ titulo, onClose }) {
  return (
    <div className="flex items-center justify-between px-5 pt-safe pt-5 pb-2 shrink-0">
      <div className="w-8" />
      <span className="text-sm font-semibold text-gray-600">{titulo}</span>
      <CloseButton onClick={onClose} />
    </div>
  )
}

export default function CuestionarioLikert({ escala, onClose, onContinuar, continuarLabel, paso }) {
  const { userId } = useAuth()
  const { items, opciones } = escala

  const [phase,   setPhase]   = useState('intro')   // 'intro' | 'questions' | 'done'
  const [answers, setAnswers] = useState(Array(items.length).fill(null))
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  const totalAnswered = answers.filter(a => a !== null).length
  const completo      = totalAnswered === items.length

  const setAnswer = (idx, value) => {
    setAnswers(prev => { const next = [...prev]; next[idx] = value; return next })
  }

  const enviar = async () => {
    setSaving(true); setError(null)
    try {
      await guardar(escala.tabla, userId, answers)
      setPhase('done')
    } catch {
      setError('No pudimos guardar tus respuestas. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-calm-50 animate-fade-in">

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <>
          <Header titulo={escala.encabezado} onClose={onClose} />
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <div className="pt-4 pb-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-ocean-400 to-calm-500
                              flex items-center justify-center shadow-md text-3xl mx-auto mb-4">
                {escala.icono}
              </div>
              {paso && <p className="text-xs font-semibold text-calm-600 uppercase tracking-wide mb-1">{paso}</p>}
              <h2 className="text-2xl font-bold text-gray-800">{escala.titulo}</h2>
              <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">{escala.subtitulo}</p>
            </div>

            <div className="card mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">¿Cómo responder?</p>
              <p className="text-sm text-gray-500 leading-relaxed">{escala.instruccion}</p>
            </div>
          </div>

          <div className="px-5 pb-safe pb-8 shrink-0">
            <button
              onClick={() => setPhase('questions')}
              className="w-full py-4 rounded-2xl bg-calm-500 text-white text-lg font-semibold
                         active:scale-95 transition-transform"
            >
              Comenzar
            </button>
          </div>
        </>
      )}

      {/* ── QUESTIONS ── */}
      {phase === 'questions' && (
        <>
          <div className="px-5 pt-safe pt-5 pb-3 shrink-0 bg-calm-50 border-b border-calm-100">
            <div className="flex items-center gap-3 mb-3">
              <CloseButton onClick={onClose} white />
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{escala.encabezado}</span>
                  <span>{totalAnswered}/{items.length} respondidas</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-calm-500 rounded-full transition-all duration-300"
                    style={{ width: `${(totalAnswered / items.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 italic">{escala.pregunta}</p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {items.map((item, idx) => {
              const selected = answers[idx]
              return (
                <div key={idx} className="card">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="w-6 h-6 rounded-full bg-calm-100 text-calm-700 text-xs font-bold
                                     flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-gray-800 leading-snug">{item}</p>
                  </div>
                  <div className="space-y-1.5">
                    {opciones.map(o => (
                      <button
                        key={o.value}
                        onClick={() => setAnswer(idx, o.value)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-medium
                                    transition-all active:scale-[0.98]
                                    ${selected === o.value
                                      ? 'bg-calm-500 text-white shadow-sm'
                                      : 'bg-calm-50 text-gray-600 hover:bg-calm-100'}`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                          ${selected === o.value ? 'bg-white/20' : 'bg-white text-calm-700'}`}>
                          {o.value}
                        </span>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="px-5 pb-safe pb-8 pt-3 shrink-0 bg-calm-50 border-t border-calm-100 space-y-2">
            {error && <p className="text-xs text-red-600 text-center">{error}</p>}
            <button
              onClick={enviar}
              disabled={!completo || saving}
              className={`w-full py-4 rounded-2xl text-white text-base font-semibold
                          transition-all active:scale-95
                          ${completo && !saving ? 'bg-calm-500 shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              {saving ? 'Guardando…' : error ? 'Reintentar' : 'Enviar respuestas'}
            </button>
          </div>
        </>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <>
          <Header titulo={escala.encabezado} onClose={onContinuar ?? onClose} />
          <div className="flex-1 overflow-y-auto px-5 pb-4 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-calm-100 flex items-center justify-center text-3xl mb-4">
              ✓
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">¡Gracias!</h2>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              Tus respuestas quedaron registradas. Son muy valiosas para la investigación.
            </p>
          </div>

          <div className="px-5 pb-safe pb-8 pt-3 shrink-0 border-t border-calm-100 bg-calm-50">
            <button onClick={onContinuar ?? onClose}
                    className="w-full py-4 rounded-2xl bg-calm-500 text-white font-semibold
                               active:scale-95 transition-transform">
              {onContinuar ? (continuarLabel ?? 'Continuar') : 'Listo'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
