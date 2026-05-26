import { useCallback, useEffect, useState } from 'react'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

const ICONOS = {
  login:               '🔐',
  logout:              '🚪',
  logout_inactividad:  '⏰',
  crear_admin:         '➕',
  desactivar_admin:    '🚫',
  reactivar_admin:     '✅',
}

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Auditoria() {
  const [eventos, setEventos]   = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState(null)
  const [pagina, setPagina]     = useState(0)
  const POR_PAGINA = 25

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    const { data, error: err } = await supabaseAdmin
      .from('auditoria_admin')
      .select(`
        id, accion, entidad, entidad_id, detalles, timestamp,
        usuarios_admin ( nombre_completo, email, rol )
      `)
      .order('timestamp', { ascending: false })
      .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1)
    if (err) setError('No se pudo cargar el log de auditoría.')
    else setEventos(data ?? [])
    setCargando(false)
  }, [pagina])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Registro de acciones del sistema</p>
        <button
          onClick={cargar}
          disabled={cargando}
          className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors"
        >
          {cargando ? 'Cargando…' : '↻ Actualizar'}
        </button>
      </div>

      {error ? (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {cargando ? (
            <div className="p-4 space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : eventos.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">Sin eventos registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-8" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acción</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entidad</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eventos.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-base">{ICONOS[e.accion] ?? '📝'}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {e.accion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {e.usuarios_admin?.nombre_completo ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {e.entidad ?? '—'}
                      {e.entidad_id && (
                        <span className="ml-1 font-mono text-xs text-slate-400">
                          #{String(e.entidad_id).slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatFecha(e.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Paginación simple */}
      {!cargando && eventos.length > 0 && (
        <div className="flex justify-between items-center text-sm text-slate-500">
          <button
            onClick={() => setPagina(p => Math.max(0, p - 1))}
            disabled={pagina === 0}
            className="disabled:opacity-30 hover:text-slate-800 transition-colors"
          >
            ← Anterior
          </button>
          <span>Página {pagina + 1}</span>
          <button
            onClick={() => setPagina(p => p + 1)}
            disabled={eventos.length < POR_PAGINA}
            className="disabled:opacity-30 hover:text-slate-800 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
