import { useState, useMemo } from 'react'
import { useEpisodiosAdmin } from '../hooks/useEpisodiosAdmin'
import { useAdminSession } from '../hooks/useAdminSession'
import { INTENSIDAD_CONFIG, ESTRATEGIA_LABEL } from '../../hooks/useEpisodios'

const PAGE_SIZE = 25

function GrupoBadge({ grupo }) {
  if (grupo === 'experimental') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">Experimental</span>
  if (grupo === 'control')      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Control</span>
  return <span className="text-slate-400 text-xs">—</span>
}

function IntensidadChip({ intensidad }) {
  const cfg = INTENSIDAD_CONFIG[intensidad]
  if (!cfg) return <span className="text-slate-400 text-xs">—</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function GraficaLineas({ datos }) {
  const W = 320, H = 150
  const maxVal = Math.max(...datos.flatMap(d => [d.experimental, d.control]), 0.01)
  const padL = 30, padB = 20, padR = 10, padT = 10
  const wInner = W - padL - padR
  const hInner = H - padT - padB

  const xPos = (i) => padL + (i / (datos.length - 1)) * wInner
  const yPos = (v) => padT + hInner - (v / maxVal) * hInner

  const ptsExp = datos.map((d, i) => `${xPos(i)},${yPos(d.experimental)}`).join(' ')
  const ptsCtr = datos.map((d, i) => `${xPos(i)},${yPos(d.control)}`).join(' ')

  const yLines = [0, 0.25, 0.5, 0.75, 1].map(f => f * maxVal)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {yLines.map((v, i) => {
        const y = yPos(v)
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={padL - 3} y={y + 3} fontSize={7} fill="#94a3b8" textAnchor="end">
              {v.toFixed(2)}
            </text>
          </g>
        )
      })}
      <polyline points={ptsExp} fill="none" stroke="#6366f1" strokeWidth={2} />
      <polyline points={ptsCtr} fill="none" stroke="#f59e0b" strokeWidth={2} />
      {datos.map((d, i) => (
        <g key={i}>
          <circle cx={xPos(i)} cy={yPos(d.experimental)} r={3} fill="#6366f1" />
          <circle cx={xPos(i)} cy={yPos(d.control)} r={3} fill="#f59e0b" />
          <text x={xPos(i)} y={H - 5} fontSize={8} fill="#94a3b8" textAnchor="middle">{d.semana}</text>
        </g>
      ))}
    </svg>
  )
}

function sigLabel(p) {
  const pNum = parseFloat(p)
  if (pNum < 0.001) return '***'
  if (pNum < 0.01)  return '**'
  if (pNum < 0.05)  return '*'
  return 'n.s.'
}

export default function Episodios() {
  const { episodios, alertas, resumen, graficaComparativa, calcularTTest, efectividadPorEstrategia, exportarCSV, cargando, recargar } = useEpisodiosAdmin()
  const { esInvestigador } = useAdminSession()

  const [filtroGrupo,     setFiltroGrupo]     = useState('todos')
  const [filtroTipo,      setFiltroTipo]       = useState('todos')
  const [filtroIntensidad,setFiltroIntensidad] = useState('todas')
  const [filtroContexto,  setFiltroContexto]  = useState('todos')
  const [fechaDesde,      setFechaDesde]      = useState('')
  const [fechaHasta,      setFechaHasta]      = useState('')
  const [busqueda,        setBusqueda]        = useState('')
  const [pagina,          setPagina]          = useState(1)
  const [alertasColapsadas, setAlertasColapsadas] = useState(false)

  const filtrados = useMemo(() => {
    return episodios.filter(e => {
      const p = e.participantes ?? {}
      if (filtroGrupo !== 'todos' && p.grupo !== filtroGrupo) return false
      if (filtroTipo !== 'todos' && e.tipo_evento !== filtroTipo) return false
      if (filtroIntensidad !== 'todas' && e.intensidad !== filtroIntensidad) return false
      if (filtroContexto !== 'todos' && e.contexto !== filtroContexto) return false
      if (fechaDesde && new Date(e.fecha_inicio) < new Date(fechaDesde)) return false
      if (fechaHasta && new Date(e.fecha_inicio) > new Date(fechaHasta + 'T23:59:59')) return false
      if (busqueda && !p.codigo_participante?.toLowerCase().includes(busqueda.toLowerCase())) return false
      return true
    })
  }, [episodios, filtroGrupo, filtroTipo, filtroIntensidad, filtroContexto, fechaDesde, fechaHasta, busqueda])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))
  const paginados = filtrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)

  const ttestIntensidad = calcularTTest('intensidad_numerica')
  const ttestDuracion   = calcularTTest('duracion_minutos')

  // Frecuencia: agrupar episodios por semana por participante
  const frecuenciaExp = (() => {
    const parts = {}
    episodios.filter(e => e.participantes?.grupo === 'experimental' && e.completado).forEach(e => {
      const pid = e.participante_id
      if (!parts[pid]) parts[pid] = []
      parts[pid].push(e)
    })
    return Object.values(parts).map(eps => eps.length)
  })()
  const frecuenciaCtr = (() => {
    const parts = {}
    episodios.filter(e => e.participantes?.grupo === 'control' && e.completado).forEach(e => {
      const pid = e.participante_id
      if (!parts[pid]) parts[pid] = []
      parts[pid].push(e)
    })
    return Object.values(parts).map(eps => eps.length)
  })()

  const ttestFrecuencia = (() => {
    if (frecuenciaExp.length < 2 || frecuenciaCtr.length < 2) return null
    // Re-use calcularTTest logic inline using the raw arrays
    return null // placeholder — real calc via hook method
  })()

  const hayAlertas = alertas && Object.values(alertas).some(a => Array.isArray(a) && a.length > 0)

  const limpiarFiltros = () => {
    setFiltroGrupo('todos'); setFiltroTipo('todos'); setFiltroIntensidad('todas')
    setFiltroContexto('todos'); setFechaDesde(''); setFechaHasta(''); setBusqueda(''); setPagina(1)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Episodios de ansiedad</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registro de episodios reportados por participantes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarCSV}
            className="text-sm px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
          >
            Exportar CSV
          </button>
          <button
            onClick={recargar}
            disabled={cargando}
            className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-40 px-2"
          >
            {cargando ? 'Cargando…' : '↻'}
          </button>
        </div>
      </div>

      {/* Tarjetas resumen scrollable */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[
          { label: 'Total episodios',    val: resumen.total,     cls: 'bg-slate-50 border-slate-200' },
          { label: 'Esta semana',        val: resumen.estaSemana, cls: 'bg-blue-50 border-blue-200' },
          { label: 'Severos esta semana', val: resumen.graves,   cls: resumen.graves > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200' },
          { label: 'Experimental',       val: resumen.totalExp,  cls: 'bg-indigo-50 border-indigo-200' },
          { label: 'Control',            val: resumen.totalCtr,  cls: 'bg-amber-50 border-amber-200' },
        ].map(({ label, val, cls }) => (
          <div key={label} className={`rounded-xl border p-3 shrink-0 min-w-[120px] ${cls}`}>
            <p className="text-2xl font-bold text-slate-800">{val}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Sección comparativa (solo investigador) */}
      {esInvestigador && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Comparativa por grupo (episodios/participante/semana)</h2>
            <GraficaLineas datos={graficaComparativa} />
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
              {[
                { color: '#6366f1', label: 'Experimental' },
                { color: '#f59e0b', label: 'Control' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded" style={{ backgroundColor: l.color, display: 'inline-block' }} />
                  <span className="text-xs text-slate-500">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla t-test */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Análisis estadístico (Welch's t-test)</h2>
            {(ttestIntensidad?.nExp ?? 0) < 5 || (ttestIntensidad?.nCtr ?? 0) < 5 ? (
              <p className="text-sm text-slate-400 italic">Datos insuficientes para análisis estadístico.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Variable</th>
                        <th className="py-2 pr-4 text-xs font-semibold text-indigo-500 uppercase tracking-wider">Exp. (media)</th>
                        <th className="py-2 pr-4 text-xs font-semibold text-amber-500 uppercase tracking-wider">Ctr. (media)</th>
                        <th className="py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">t</th>
                        <th className="py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">p-value</th>
                        <th className="py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sig.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { label: 'Intensidad', data: ttestIntensidad },
                        { label: 'Duración (min)', data: ttestDuracion },
                      ].map(({ label, data }) => data ? (
                        <tr key={label}>
                          <td className="py-2.5 pr-4 text-slate-700 font-medium">{label}</td>
                          <td className="py-2.5 pr-4 text-indigo-700">{data.avgExp}</td>
                          <td className="py-2.5 pr-4 text-amber-700">{data.avgCtr}</td>
                          <td className="py-2.5 pr-4 text-slate-600 font-mono">{data.t}</td>
                          <td className="py-2.5 pr-4 text-slate-600 font-mono">{data.p}</td>
                          <td className="py-2.5 font-bold text-slate-700">{sigLabel(data.p)}</td>
                        </tr>
                      ) : (
                        <tr key={label}>
                          <td className="py-2.5 text-slate-700 font-medium">{label}</td>
                          <td colSpan={5} className="py-2.5 text-slate-400 text-xs italic">Datos insuficientes</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400 mt-3 italic">
                  Welch's t-test (bilateral). *p&lt;0.05, **p&lt;0.01, ***p&lt;0.001
                </p>
              </>
            )}
          </div>

          {/* Efectividad por estrategia */}
          {efectividadPorEstrategia.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Efectividad de estrategias (grupo experimental)</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Estrategia</th>
                    <th className="py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Promedio (1-5)</th>
                    <th className="py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">N</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {efectividadPorEstrategia.map(r => (
                    <tr key={r.estrategia}>
                      <td className="py-2 pr-4 text-slate-700">{r.estrategia}</td>
                      <td className="py-2 pr-4 text-right">
                        <span className={`font-semibold ${r.promedio >= 4 ? 'text-green-600' : r.promedio >= 3 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {r.promedio}
                        </span>
                      </td>
                      <td className="py-2 text-right text-slate-500">{r.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Alertas episodios */}
      {hayAlertas && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl">
          <button
            type="button"
            onClick={() => setAlertasColapsadas(c => !c)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-amber-800"
          >
            <span>Alertas activas</span>
            <svg className={`w-4 h-4 transition-transform ${alertasColapsadas ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {!alertasColapsadas && (
            <div className="px-4 pb-4 space-y-3">
              {alertas.severos_semana?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-700 mb-1">
                    Episodios severos — {alertas.severos_semana.length} participante{alertas.severos_semana.length > 1 ? 's' : ''} con ≥3 en los últimos 7 días
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {alertas.severos_semana.map((p, i) => (
                      <span key={i} className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-700">
                        {p.codigo} ({p.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {alertas.borradores_viejos?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-orange-700 mb-1">
                    Borradores sin completar &gt;7 días — {alertas.borradores_viejos.length} participante{alertas.borradores_viejos.length > 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {alertas.borradores_viejos.map((p, i) => (
                      <span key={i} className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-700">
                        {p.codigo} ({p.dias}d)
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {alertas.tendencia_frecuencia?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-700 mb-1">
                    Tendencia ascendente en frecuencia — {alertas.tendencia_frecuencia.length} participante{alertas.tendencia_frecuencia.length > 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {alertas.tendencia_frecuencia.map((p, i) => (
                      <span key={i} className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-700">
                        {p.codigo}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
          placeholder="Código participante…"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44"
        />
        <select value={filtroGrupo} onChange={e => { setFiltroGrupo(e.target.value); setPagina(1) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="todos">Todos los grupos</option>
          <option value="experimental">Experimental</option>
          <option value="control">Control</option>
        </select>
        <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="todos">Todos los tipos</option>
          <option value="ansiedad">Ansiedad</option>
          <option value="ataque_panico">Ataque de pánico</option>
        </select>
        <select value={filtroIntensidad} onChange={e => { setFiltroIntensidad(e.target.value); setPagina(1) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="todas">Todas las intensidades</option>
          <option value="leve">Leve</option>
          <option value="moderada">Moderada</option>
          <option value="severa">Severa</option>
        </select>
        <select value={filtroContexto} onChange={e => { setFiltroContexto(e.target.value); setPagina(1) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="todos">Todos los contextos</option>
          <option value="casa">Casa</option>
          <option value="aula">Aula</option>
          <option value="examen">Examen</option>
          <option value="laboratorio">Laboratorio</option>
          <option value="transporte">Transporte</option>
          <option value="social">Social</option>
          <option value="trabajo">Trabajo</option>
          <option value="otro">Otro</option>
          <option value="no_especifica">No especifica</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fechaDesde}
            onChange={e => { setFechaDesde(e.target.value); setPagina(1) }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <span className="text-slate-400 text-sm">—</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={e => { setFechaHasta(e.target.value); setPagina(1) }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        {(busqueda || filtroGrupo !== 'todos' || filtroTipo !== 'todos' || filtroIntensidad !== 'todas' || filtroContexto !== 'todos' || fechaDesde || fechaHasta) && (
          <button onClick={limpiarFiltros} className="text-sm text-slate-400 hover:text-slate-600 transition">
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
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">No se encontraron episodios</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Código</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Grupo</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Fecha</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Tipo</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Intensidad</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Duración</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Estado</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Estrategias</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Efect.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginados.map(e => {
                  const p = e.participantes ?? {}
                  const estrategias = e.estrategias_aplicadas ?? []
                  const visible = estrategias.slice(0, 3)
                  const resto = estrategias.length - 3
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-800 text-xs">{p.codigo_participante ?? '—'}</td>
                      <td className="py-3 px-4"><GrupoBadge grupo={p.grupo} /></td>
                      <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
                        {e.fecha_inicio ? new Date(e.fecha_inicio).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {e.tipo_evento === 'ataque_panico' ? '😱 Pánico' : '😰 Ansiedad'}
                      </td>
                      <td className="py-3 px-4"><IntensidadChip intensidad={e.intensidad} /></td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {e.en_curso ? <span className="text-blue-600 font-medium">En curso</span> :
                         e.duracion_minutos ? `${e.duracion_minutos} min` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {!e.completado && (
                          <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">Borrador</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {visible.map(s => (
                            <span key={s} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              {ESTRATEGIA_LABEL[s] ?? s}
                            </span>
                          ))}
                          {resto > 0 && (
                            <span className="text-[10px] text-slate-400">+{resto} más</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {e.efectividad_estrategia ? `${e.efectividad_estrategia}/5` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{filtrados.length} episodios · página {pagina} de {totalPaginas}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
