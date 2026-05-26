import { useState, useMemo } from 'react'
import { useMedicionesAdmin } from '../hooks/useMedicionesAdmin'
import { useAdminSession } from '../hooks/useAdminSession'

const TIPO_LABEL = {
  basal: 'Basal',
  intermedia_4sem: '4 sem',
  final_8sem: '8 sem',
  seguimiento_12sem: '12 sem',
  voluntaria: 'Voluntaria',
}

const CLASIFICACION_COLOR = {
  Mínima:   'bg-green-100 text-green-700',
  Leve:     'bg-yellow-100 text-yellow-700',
  Moderada: 'bg-orange-100 text-orange-700',
  Grave:    'bg-red-100 text-red-700',
}

function GraficaComparativa({ graficaData }) {
  const W = 350, H = 180
  const padL = 30, padR = 10, padT = 10, padB = 30
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const xPos = (i) => padL + (i / (graficaData.length - 1)) * innerW
  const yPos = (v) => padT + innerH - (v / 63) * innerH

  const expPts = graficaData.filter(d => d.experimental !== null)
  const ctrPts = graficaData.filter(d => d.control !== null)

  const guias = [0, 15, 25, 63]

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md" style={{ height: H }}>
        {guias.map(g => (
          <g key={g}>
            <line
              x1={padL} y1={yPos(g)} x2={W - padR} y2={yPos(g)}
              stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3 3"
            />
            <text x={padL - 4} y={yPos(g) + 4} textAnchor="end" fontSize={8} fill="#94a3b8">{g}</text>
          </g>
        ))}

        {expPts.length >= 2 && (
          <polyline
            points={graficaData.map((d, i) => d.experimental !== null ? `${xPos(i)},${yPos(d.experimental)}` : null).filter(Boolean).join(' ')}
            fill="none" stroke="#4f46e5" strokeWidth={2}
          />
        )}
        {ctrPts.length >= 2 && (
          <polyline
            points={graficaData.map((d, i) => d.control !== null ? `${xPos(i)},${yPos(d.control)}` : null).filter(Boolean).join(' ')}
            fill="none" stroke="#d97706" strokeWidth={2}
          />
        )}

        {graficaData.map((d, i) => (
          <g key={i}>
            {d.experimental !== null && (
              <circle cx={xPos(i)} cy={yPos(d.experimental)} r={4} fill="#4f46e5" />
            )}
            {d.control !== null && (
              <circle cx={xPos(i)} cy={yPos(d.control)} r={4} fill="#d97706" />
            )}
            <text x={xPos(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#64748b">{d.label}</text>
          </g>
        ))}
      </svg>

      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
          Experimental
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-600 inline-block" />
          Control
        </span>
      </div>
    </div>
  )
}

export default function Mediciones() {
  const { mediciones, cargando, error, cargar, resumen, graficaData, alertas, exportarCSVWide, clasificacion } = useMedicionesAdmin()
  const { esInvestigador } = useAdminSession()

  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroGrupo, setFiltroGrupo] = useState('todos')
  const [filtroClasif, setFiltroClasif] = useState('todos')
  const [alertasColapsadas, setAlertasColapsadas] = useState(false)

  const filtradas = useMemo(() => {
    return mediciones.filter(m => {
      if (busqueda && !m.codigo_participante.toLowerCase().includes(busqueda.toLowerCase())) return false
      if (filtroTipo !== 'todos' && m.tipo_medicion !== filtroTipo) return false
      if (filtroGrupo !== 'todos' && m.grupo !== filtroGrupo) return false
      if (filtroClasif !== 'todos' && m.clasificacion !== filtroClasif) return false
      return true
    })
  }, [mediciones, busqueda, filtroTipo, filtroGrupo, filtroClasif])

  const hayAlertas = alertas && Object.values(alertas).some(a => a.length > 0)

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Mediciones BAI</h1>
          <p className="text-sm text-slate-500 mt-0.5">Historial tipificado de cuestionarios</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportarCSVWide}
            className="text-sm px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition">
            Exportar CSV (Wide)
          </button>
          <button onClick={cargar} disabled={cargando}
            className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-40 px-2">
            {cargando ? 'Cargando…' : '↻'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total BAI', val: resumen.total,      cls: 'bg-slate-50 border-slate-200' },
          { label: 'Basales',   val: resumen.basales,    cls: 'bg-indigo-50 border-indigo-200' },
          { label: 'Esta semana',val: resumen.estasSemana,cls:'bg-green-50 border-green-200' },
          { label: 'Prom. Exp', val: resumen.promedioExp ?? '—', cls: 'bg-purple-50 border-purple-200' },
          { label: 'Prom. Ctr', val: resumen.promedioCtr ?? '—', cls: 'bg-amber-50 border-amber-200' },
        ].map(({ label, val, cls }) => (
          <div key={label} className={`rounded-xl border p-3 ${cls}`}>
            <p className="text-2xl font-bold text-slate-800">{val}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {hayAlertas && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-amber-800">Alertas activas</h2>
            <button onClick={() => setAlertasColapsadas(v => !v)}
              className="text-xs text-amber-600 hover:text-amber-800 transition">
              {alertasColapsadas ? 'Mostrar' : 'Ocultar'}
            </button>
          </div>
          {!alertasColapsadas && (
            <div className="space-y-3">
              {alertas.basal_pendientes?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-700 mb-1">Basal pendiente >2 días — {alertas.basal_pendientes.length} participante{alertas.basal_pendientes.length > 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap gap-1">
                    {alertas.basal_pendientes.map(p => (
                      <span key={p.id} className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-700">{p.codigo}</span>
                    ))}
                  </div>
                </div>
              )}
              {alertas.scores_graves?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-700 mb-1">Puntaje grave (≥26) — últimas 2 semanas — {alertas.scores_graves.length} participante{alertas.scores_graves.length > 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap gap-1">
                    {alertas.scores_graves.map(p => (
                      <span key={p.id} className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-700">{p.codigo} ({p.puntaje})</span>
                    ))}
                  </div>
                </div>
              )}
              {alertas.ventana_incompleta?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-blue-700 mb-1">En ventana sin completar — {alertas.ventana_incompleta.length} participante{alertas.ventana_incompleta.length > 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap gap-1">
                    {alertas.ventana_incompleta.map(p => (
                      <span key={p.id} className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-700">{p.codigo}</span>
                    ))}
                  </div>
                </div>
              )}
              {alertas.tendencia_ascendente?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-orange-700 mb-1">Tendencia ascendente (>5 pts) — {alertas.tendencia_ascendente.length} participante{alertas.tendencia_ascendente.length > 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap gap-1">
                    {alertas.tendencia_ascendente.map(p => (
                      <span key={p.id} className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-700">{p.codigo}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Gráfica comparativa (solo investigador) */}
      {esInvestigador && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Promedio BAI por tipo y grupo</h2>
          <GraficaComparativa graficaData={graficaData} />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar código…"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44"
        />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="todos">Todos los tipos</option>
          {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="todos">Todos los grupos</option>
          <option value="experimental">Experimental</option>
          <option value="control">Control</option>
        </select>
        <select value={filtroClasif} onChange={e => setFiltroClasif(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="todos">Todas las clasificaciones</option>
          {['Mínima','Leve','Moderada','Grave'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(busqueda || filtroTipo !== 'todos' || filtroGrupo !== 'todos' || filtroClasif !== 'todos') && (
          <button onClick={() => { setBusqueda(''); setFiltroTipo('todos'); setFiltroGrupo('todos'); setFiltroClasif('todos') }}
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Código</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Grupo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Puntaje</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Clasificación</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ventana</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Días inicio</th>
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
                          : <span className="text-slate-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-600">{TIPO_LABEL[m.tipo_medicion] ?? m.tipo_medicion ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">{m.puntaje_total}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CLASIFICACION_COLOR[m.clasificacion] ?? 'bg-slate-100 text-slate-600'}`}>
                        {m.clasificacion}
                      </span>
                    </td>
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
