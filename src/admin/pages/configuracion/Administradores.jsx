import { useEffect, useState } from 'react'
import { useAdminSession } from '../../hooks/useAdminSession'
import RequiereRol from '../../components/RequiereRol'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatUltimaSesion(iso) {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 3_600_000)  return `hace ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)} h`
  return formatFecha(iso)
}

const BADGE_ROL = {
  investigador: 'bg-indigo-100 text-indigo-700',
  tutora:       'bg-emerald-100 text-emerald-700',
}

const BADGE_ESTADO = {
  true:  'bg-emerald-100 text-emerald-700',
  false: 'bg-slate-100 text-slate-500',
}

export default function Administradores() {
  const { admin: adminActual } = useAdminSession()
  const [admins, setAdmins]     = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    setError(null)
    const { data, error: err } = await supabaseAdmin
      .from('usuarios_admin')
      .select('*')
      .order('fecha_creacion', { ascending: false })
    if (err) setError('No se pudo cargar la lista de administradores.')
    else setAdmins(data ?? [])
    setCargando(false)
  }

  async function desactivar(id) {
    if (id === adminActual?.id) return // no puede desactivarse a sí mismo
    const { error: err } = await supabaseAdmin
      .from('usuarios_admin')
      .update({ activo: false })
      .eq('id', id)
    if (!err) cargar()
  }

  async function reactivar(id) {
    const { error: err } = await supabaseAdmin
      .from('usuarios_admin')
      .update({ activo: true })
      .eq('id', id)
    if (!err) cargar()
  }

  return (
    <div className="space-y-5">
      {/* Cabecera con botón (solo investigador) */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Administradores registrados en el sistema
        </p>
        <RequiereRol roles={['investigador']}>
          <button
            disabled
            title="Disponible en próxima versión"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg opacity-40 cursor-not-allowed"
          >
            + Agregar administrador
          </button>
        </RequiereRol>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Última sesión</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Creado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{a.nombre_completo}</p>
                    <p className="text-xs text-slate-400">{a.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${BADGE_ROL[a.rol] ?? ''}`}>
                      {a.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_ESTADO[String(a.activo)]}`}>
                      {a.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatUltimaSesion(a.ultima_sesion)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatFecha(a.fecha_creacion)}</td>
                  <td className="px-4 py-3 text-right">
                    <RequiereRol roles={['investigador']}>
                      {a.id === adminActual?.id ? (
                        <span className="text-xs text-slate-300">(tú)</span>
                      ) : a.activo ? (
                        <button
                          onClick={() => desactivar(a.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 transition-colors"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivar(a.id)}
                          className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                        >
                          Reactivar
                        </button>
                      )}
                    </RequiereRol>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
