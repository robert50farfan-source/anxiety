import { useEffect, useRef, useState } from 'react'
import ConsentimientoV1_0, { TEXTO_PLANO_V1_0 } from '../content/consentimiento/v1_0'
import { VERSION_CONSENTIMIENTO_VIGENTE } from '../config/consentimiento'
import { useParticipante } from '../context/ParticipanteContext'
import { supabase } from '../lib/supabase'

function PantallaRechazado() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-calm-50 p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-calm-800 mb-3">Has declinado participar</h2>
      <p className="text-sm text-calm-600 leading-relaxed max-w-xs mb-2">
        Si cambias de opinión, contacta al investigador:
      </p>
      <p className="text-sm text-calm-700 font-medium">
        robert50.farfan@gmail.com — 77894423
      </p>
    </div>
  )
}

function ModalRechazo({ onVolver, onConfirmar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-semibold text-gray-800 mb-3">¿Estás seguro?</h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-5">
          No podrás usar la aplicación si no aceptas. Esta decisión no afecta tu situación académica de ninguna manera.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onVolver}
            className="flex-1 py-2.5 rounded-xl border border-calm-200 text-calm-700 text-sm font-medium hover:bg-calm-50 transition"
          >
            Volver
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
          >
            Confirmar, no acepto
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PantallaConsentimiento() {
  const { codigo, recargar } = useParticipante()
  const scrollRef = useRef(null)
  const [scrolledEnough, setScrolledEnough] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [showModalRechazo, setShowModalRechazo] = useState(false)
  const [rechazado, setRechazado] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight <= el.clientHeight) {
      setScrolledEnough(true)
    }
  }, [])

  const handleScroll = () => {
    if (scrolledEnough) return
    const el = scrollRef.current
    if (!el) return
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight)
    if (pct >= 0.8) setScrolledEnough(true)
  }

  const handleAceptar = async () => {
    if (!supabase) return
    setCargando(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('registrar_consentimiento', {
      p_version:    VERSION_CONSENTIMIENTO_VIGENTE,
      p_user_agent: navigator.userAgent,
      p_texto:      TEXTO_PLANO_V1_0,
    })
    if (rpcError) {
      setError('No se pudo registrar el consentimiento. Intenta de nuevo.')
      setCargando(false)
      return
    }
    recargar()
  }

  const handleConfirmarRechazo = async () => {
    if (supabase) await supabase.auth.signOut()
    setRechazado(true)
  }

  if (rechazado) return <PantallaRechazado />

  return (
    <div className="flex flex-col min-h-screen bg-calm-50">
      {/* Header fijo */}
      <div className="shrink-0 bg-white border-b border-calm-100 px-5 py-4">
        <h1 className="font-semibold text-calm-800 text-base">Consentimiento informado</h1>
        <div className="flex items-center gap-3 mt-0.5">
          {codigo && (
            <span className="text-xs text-calm-500 font-mono">{codigo}</span>
          )}
          <span className="text-xs text-calm-400">Versión {VERSION_CONSENTIMIENTO_VIGENTE}</span>
        </div>
      </div>

      {/* Contenido scrollable */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <ConsentimientoV1_0 />
      </div>

      {/* Barra inferior fija */}
      <div className="shrink-0 bg-white border-t border-calm-100 px-5 py-4 space-y-3">
        {!scrolledEnough && (
          <p className="text-xs text-calm-500 text-center">
            Continúa leyendo para habilitar los botones
          </p>
        )}

        {error && (
          <p className="text-xs text-red-600 text-center bg-red-50 px-3 py-2 rounded-xl">
            {error}
          </p>
        )}

        <button
          onClick={handleAceptar}
          disabled={!scrolledEnough || cargando}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all
                      ${scrolledEnough && !cargando
                        ? 'bg-calm-600 text-white hover:bg-calm-700'
                        : 'bg-calm-600 text-white opacity-50 cursor-not-allowed'}`}
        >
          {cargando ? 'Registrando…' : 'Acepto participar'}
        </button>

        <div className="text-center">
          <button
            onClick={() => setShowModalRechazo(true)}
            className="text-sm text-calm-500 underline"
          >
            No acepto
          </button>
        </div>
      </div>

      {showModalRechazo && (
        <ModalRechazo
          onVolver={() => setShowModalRechazo(false)}
          onConfirmar={handleConfirmarRechazo}
        />
      )}
    </div>
  )
}
