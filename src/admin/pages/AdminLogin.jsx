import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminSession } from '../hooks/useAdminSession'

const ERRORES = {
  'Invalid login credentials':                    'Credenciales incorrectas. Verifica tu email y contraseña.',
  no_admin:                                       'Este usuario no tiene acceso al panel de administración.',
  'Email not confirmed':                          'Confirma tu email antes de ingresar.',
  sin_cliente:                                    'Error de configuración. Contacta al administrador técnico.',
  timeout:                                        'El servidor no respondió. Verifica tu conexión e intenta nuevamente.',
  default:                                        'Error de conexión. Verifica tu acceso a internet e intenta nuevamente.',
}

function mensajeError(err) {
  return ERRORES[err?.message] ?? ERRORES.default
}

export default function AdminLogin() {
  const { admin, cargando, iniciarSesion } = useAdminSession()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [enviando, setEnviando] = useState(false)

  // Si ya hay sesión activa, redirigir
  useEffect(() => {
    if (!cargando && admin) navigate('/admin/dashboard', { replace: true })
  }, [admin, cargando, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await iniciarSesion(email.trim(), password)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white text-2xl mb-4">
            🔬
          </div>
          <h1 className="text-xl font-bold text-white">Panel de Investigación</h1>
          <p className="text-slate-400 text-sm mt-1">AnxietyApp — Acceso restringido</p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 rounded-2xl p-6 space-y-4 border border-slate-700"
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="investigador@universidad.edu"
              className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rose-900/50 border border-rose-700 text-rose-300 text-sm px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {enviando ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-6">
          Acceso solo para personal autorizado del estudio
        </p>
      </div>
    </div>
  )
}
