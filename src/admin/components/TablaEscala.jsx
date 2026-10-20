import { useMemo, useState } from 'react'
import { useEscalaAdmin } from '../hooks/useEscalaAdmin'

const TIPO_LABEL = {
  basal: 'Basal',
  intermedia_4sem: '4 sem',
  final_8sem: '8 sem',
  seguimiento_12sem: '12 sem',
  voluntaria: 'Voluntaria',
}

// Tabla de mediciones de una escala complementaria (SWLS, SUS), con el mismo
// formato que la tabla del BAI en Mediciones.
//   escala: { tabla, nombre, descripcion, tipos, puntajeMax, interpretar }
export default function TablaEscala({ escala }) {
  const { mediciones, cargando, error, cargar } = useEscalaAdmin(escala.tabla, escala.interpretar)

  const [busqueda, setBusqueda]       = useState('')
  const [filtroTipo, setFiltroTipo]   = useState('todos')
  const [filtroGrupo, setFiltroGrupo] = useState('todos')

  const filtradas = useMemo(() => mediciones.filter(m => {
    if (busqueda && !m.codigo_participante.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtroTipo !== 'todos' && m.tipo_medicion !== filtroTipo) return false
    if (filtroGrupo !== 'todos' && m.grupo !== filtroGrupo) return false
    return true
  }), [mediciones, busqueda, filtroTipo, filtroGrupo])

  const promedio = (grupo) => {
    const xs = mediciones.filter(m => m.grupo === grupo).map(m => Number(m.puntaje_total))
    return xs.length ? Math.round(xs.reduce((s, v) => s + v, 0) / xs.length * 10) / 10 : '—'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Mediciones {escala.nombre}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{escala.descripcion}</p>
        </div>
        <button onClick={cargar} disabled={cargando}
          className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-40 px-2">
          {cargando ? 'Cargando…' : '↻'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: `Total ${escala.nombre}`, val: mediciones.length, cls: 'bg-slate-50 border-slate-200' },
          { label: 'Programadas',             val: mediciones.filter(m => m.ventana_esperada).length, cls: 'bg-indigo-50 border-indigo-200' },
          { label: 'Prom. Exp',               val: promedio('experimental'), cls: 'bg-purple-50 border-purple-200' },
          { label: 'Prom. Ctr',               val: promedio('control'),      cls: 'bg-amber-50 border-amber-200' },
        ].map(({ label, val, cls }) => (
          <div key={label} className={`rounded-xl border p-3 ${cls}`}>
            <p className="text-2xl font-bold text-slate-800">{val}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar código…"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44"
        />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="todos">Todos los tipos</option>
          {escala.tipos.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
        </select>
        <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="todos">Todos los grupos</option>
          <option value="experimental">Experimental</option>
          <option value="control">Control</option>
        </select>
        {(busqueda || filtroTipo !== 'todos' || filtroGrupo !== 'todos') && (
          <button onClick={() => { setBusqueda(''); setFiltroTipo('todos'); setFiltroGrupo('todos') }}
            className="text-sm text-slate-400 hover:text-slate-600 transition">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {cargando ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">No se encontraron mediciones</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Código', 'Grupo', 'Tipo', 'Fecha', 'Puntaje', 'Interpretación', 'Ventana', 'Días inicio'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{m.codigo_participante}</td>
                    <td className="px-4 py-3">
                      {m.grupo === 'experimental'
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">Exp</span>
                        : m.grupo === 'control'
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Ctr</span>
                          : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{TIPO_LABEL[m.tipo_medicion] ?? m.tipo_medicion ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {m.puntaje_total}<span className="text-xs font-normal text-slate-400"> / {escala.puntajeMax}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{m.interpretacion ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{m.ventana_esperada ? '✓' : ''}</td>
                    <td className="px-4 py-3 text-slate-500">{m.dias_desde_inicio ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
          {filtradas.length} de {mediciones.length} medición{mediciones.length !== 1 ? 'es' : ''}
        </div>
      </div>
    </div>
  )
}
