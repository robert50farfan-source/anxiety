import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useParticipante } from '../context/ParticipanteContext'

function maskInput(raw) {
  const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (upper.length <= 3) return upper
  const prefix = upper.slice(0, 3)
  if (prefix !== 'EXP' && prefix !== 'CTR') return upper.slice(0, 3)
  const digits = upper.slice(3).replace(/\D/g, '').slice(0, 3)
  return digits.length > 0 ? `${prefix}-${digits}` : prefix
}

function errorMessage(msg) {
  if (msg?.includes('FORMATO_INVALIDO'))     return 'Formato inválido. Usa el formato EXP-001 o CTR-001.'
  if (msg?.includes('CODIGO_NO_ENCONTRADO')) return 'Código no encontrado. Verifica que lo ingresaste correctamente.'
  if (msg?.includes('CODIGO_YA_USADO'))      return 'Este código ya fue usado por otro participante. Contacta al investigador.'
  if (msg?.includes('CODIGO_NO_USADO_AUN'))  return 'Este código aún no fue registrado. Si eres nuevo participante, usa el campo de arriba.'
  if (msg?.includes('PARTICIPANTE_RETIRADO')) return 'Tu participación en el estudio fue cerrada. Contacta al investigador para más información.'
  return 'Ocurrió un error. Inténtalo de nuevo o contacta al investigador.'
}

export default function CodigoParticipanteGate() {
  const { recargar } = useParticipante()
  const [codigo, setCodigo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [modo, setModo] = useState('validar')
  const [emailContacto, setEmailContacto] = useState(null)
  const [exito, setExito] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.rpc('obtener_contacto_investigador').then(({ data }) => {
      if (data) setEmailContacto(data)
    })
  }, [])

  const handleChange = (e) => {
    setError(null)
    setCodigo(maskInput(e.target.value))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const regex = /^(EXP|CTR)-\d{3}$/
    if (!regex.test(codigo)) { setError('Formato inválido. Usa el formato EXP-001 o CTR-001.'); return }
    setCargando(true); setError(null)
    const fn = modo === 'validar' ? 'validar_codigo_participante' : 'recuperar_sesion_participante'
    const { error: rpcError } = await supabase.rpc(fn, { p_codigo: codigo })
    if (rpcError) { setError(errorMessage(rpcError.message)); setCargando(false); return }
    setExito(true)
    await recargar()
  }

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-calm-50 p-6">
        <div className="w-16 h-16 rounded-full bg-calm-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-calm-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-calm-700 font-semibold text-lg">Código verificado</p>
        <p className="text-calm-500 text-sm mt-1">Cargando la aplicación…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-calm-50 px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-calm-600 flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
        </div>

        <h1 className="text-center text-xl font-bold text-calm-800 mb-2">
          {modo === 'validar' ? 'Código de participante' : 'Recuperar sesión'}
        </h1>

        <p className="text-center text-sm text-calm-600 mb-6 leading-relaxed">
          {modo === 'validar'
            ? 'Para usar esta aplicación necesitas el código que te entregó el investigador al firmar el consentimiento informado.'
            : 'Si ya registraste tu código en otro dispositivo o reinstalaste la app, ingresa tu código para recuperar tu sesión.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-calm-700 mb-1.5">
              Tu código
            </label>
            <input
              type="text"
              value={codigo}
              onChange={handleChange}
              placeholder="EXP-001 o CTR-001"
              maxLength={7}
              autoFocus
              className={`w-full px-4 py-3 rounded-xl border text-center text-lg font-mono tracking-widest
                bg-white focus:outline-none focus:ring-2 focus:ring-calm-400 transition
                ${error ? 'border-red-400 focus:ring-red-300' : 'border-calm-200'}`}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 text-center leading-snug">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={cargando || codigo.length < 7}
            className="w-full py-3 rounded-xl bg-calm-600 text-white font-semibold
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:bg-calm-700 active:scale-[0.98] transition"
          >
            {cargando ? 'Verificando…' : modo === 'validar' ? 'Validar y continuar' : 'Recuperar sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setModo(m => m === 'validar' ? 'recuperar' : 'validar'); setError(null); setCodigo('') }}
            className="text-sm text-calm-500 underline underline-offset-2"
          >
            {modo === 'validar'
              ? '¿Ya registraste tu código antes? Recuperar sesión'
              : '← Volver al ingreso normal'}
          </button>
        </div>

        <div className="mt-8 p-4 bg-calm-100 rounded-xl text-center">
          <p className="text-xs text-calm-600">¿No tienes código?</p>
          <p className="text-xs text-calm-500 mt-0.5">Contacta al investigador para obtenerlo al firmar el consentimiento informado.</p>
          {emailContacto && (
            <a href={`mailto:${emailContacto}`}
              className="mt-2 inline-block text-xs font-medium text-calm-700 underline">
              {emailContacto}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
