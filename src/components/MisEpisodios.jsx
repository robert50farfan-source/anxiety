import { useState } from 'react'
import {
  useEpisodios,
  calcularEstadisticas,
  INTENSIDAD_CONFIG,
  ESTRATEGIA_LABEL,
  formatDuracion,
  formatFechaRelativa,
  intensidadDesdeNumero,
} from '../hooks/useEpisodios'

const COLORES_PIE = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4']

function arc(cx, cy, r, startAngle, endAngle) {
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)
  const large = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

function PieChart({ pieData }) {
  if (!pieData || pieData.length === 0) return null
  const cx = 70, cy = 70, r = 60
  let angle = -Math.PI / 2
  const slices = pieData.map((d, i) => {
    const start = angle
    const delta = d.pct * 2 * Math.PI
    angle += delta
    return { ...d, start, end: angle, color: COLORES_PIE[i % COLORES_PIE.length] }
  })

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 140" width={140} height={140} className="shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={arc(cx, cy, r, s.start, s.end)} fill={s.color} stroke="white" strokeWidth={1} />
        ))}
      </svg>
      <div className="space-y-1.5 flex-1 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-600 truncate">{s.label}</span>
            <span className="text-xs text-gray-400 ml-auto shrink-0">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GraficaSemanas({ semanas }) {
  const W = 320, H = 120
  const maxCount = Math.max(...semanas.map(s => s.count), 1)
  const barW = (W - 20) / semanas.length - 2
  const etiquetasMostrar = new Set([0, 3, 6, 9, 11])

  const barColor = (avgInt) => {
    if (avgInt === 0) return '#e2e8f0'
    if (avgInt <= 3) return '#22c55e'
    if (avgInt <= 6) return '#f59e0b'
    return '#ef4444'
  }

  const yLines = []
  for (let i = 0; i <= maxCount; i++) {
    yLines.push(i)
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Líneas horizontales */}
      {yLines.map(y => {
        const yPos = H - 20 - (y / maxCount) * (H - 30)
        return (
          <g key={y}>
            <line x1={10} y1={yPos} x2={W - 10} y2={yPos} stroke="#f1f5f9" strokeWidth={1} />
            <text x={5} y={yPos + 4} fontSize={8} fill="#94a3b8" textAnchor="end">{y}</text>
          </g>
        )
      })}
      {/* Barras */}
      {semanas.map((s, i) => {
        const x = 10 + i * ((W - 20) / semanas.length) + 1
        const barH = s.count > 0 ? Math.max(4, (s.count / maxCount) * (H - 30)) : 0
        const y = H - 20 - barH
        return (
          <g key={i}>
            {s.count > 0 && (
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={2}
                fill={barColor(s.avgIntensidad)}
              />
            )}
            {etiquetasMostrar.has(i) && (
              <text x={x + barW / 2} y={H - 5} fontSize={9} fill="#94a3b8" textAnchor="middle">
                {s.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function TarjetaEpisodio({ ep, onClick }) {
  const intensidad = INTENSIDAD_CONFIG[ep.intensidad] ?? INTENSIDAD_CONFIG.leve
  const esBorrador = !ep.completado

  return (
    <button
      type="button"
      onClick={onClick}
      className="card w-full text-left flex items-start gap-3 active:scale-[0.98] transition-all"
    >
      {esBorrador && (
        <span className="absolute top-3 right-3 text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
          Sin completar
        </span>
      )}
      <span className="text-2xl shrink-0 mt-0.5">
        {ep.tipo_evento === 'ataque_panico' ? '😱' : '😰'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">{formatFechaRelativa(ep.fecha_inicio)}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${intensidad.bg} ${intensidad.color}`}>
            {intensidad.label}
          </span>
          {ep.duracion_minutos && (
            <span className="text-xs text-gray-400">{formatDuracion(ep.duracion_minutos)}</span>
          )}
          {ep.en_curso && (
            <span className="text-xs bg-blue-100 text-blue-600 font-medium px-2 py-0.5 rounded-full">En curso</span>
          )}
        </div>
        {ep.desencadenante && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
            {ep.desencadenante.slice(0, 60)}{ep.desencadenante.length > 60 ? '…' : ''}
          </p>
        )}
      </div>
    </button>
  )
}

function DetalleEpisodio({ ep, onVolver, onEditar, onEliminar, onMarcarTerminado }) {
  const [confirmEliminar, setConfirmEliminar] = useState(false)
  const intensidad = INTENSIDAD_CONFIG[ep.intensidad] ?? INTENSIDAD_CONFIG.leve

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onClick={onVolver}
          className="text-indigo-600 text-sm font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Volver
        </button>
        <button type="button" onClick={onEditar}
          className="ml-auto text-sm text-indigo-600 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50">
          Editar
        </button>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{ep.tipo_evento === 'ataque_panico' ? '😱' : '😰'}</span>
          <div>
            <p className="font-semibold text-gray-800">
              {ep.tipo_evento === 'ataque_panico' ? 'Ataque de pánico' : 'Episodio de ansiedad'}
            </p>
            <p className="text-xs text-gray-500">{new Date(ep.fecha_inicio).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${intensidad.bg} ${intensidad.color}`}>
            {intensidad.label} ({ep.intensidad_numerica}/10)
          </span>
          {ep.duracion_minutos && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {formatDuracion(ep.duracion_minutos)}
            </span>
          )}
          {ep.en_curso && (
            <span className="text-xs bg-blue-100 text-blue-600 font-medium px-2 py-1 rounded-full">En curso</span>
          )}
          {!ep.completado && (
            <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-1 rounded-full">Borrador</span>
          )}
        </div>
      </div>

      {ep.contexto && ep.contexto !== 'no_especifica' && (
        <div className="card">
          <p className="text-xs text-gray-500 font-medium mb-1">Contexto</p>
          <p className="text-sm text-gray-700 capitalize">
            {ep.contexto_otro || ep.contexto.replace(/_/g, ' ')}
          </p>
          {ep.desencadenante && (
            <div className="mt-2 pt-2 border-t border-calm-100">
              <p className="text-xs text-gray-500 font-medium mb-1">Desencadenante</p>
              <p className="text-sm text-gray-700">{ep.desencadenante}</p>
            </div>
          )}
        </div>
      )}

      {(ep.sintomas_fisicos?.length > 0 || ep.sintomas_emocionales?.length > 0) && (
        <div className="card space-y-3">
          {ep.sintomas_fisicos?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2">Síntomas físicos</p>
              <div className="flex flex-wrap gap-1.5">
                {ep.sintomas_fisicos.map(s => (
                  <span key={s} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{s.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          )}
          {ep.sintomas_emocionales?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2">Síntomas emocionales</p>
              <div className="flex flex-wrap gap-1.5">
                {ep.sintomas_emocionales.map(s => (
                  <span key={s} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{s.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {ep.estrategias_aplicadas?.length > 0 && (
        <div className="card">
          <p className="text-xs text-gray-500 font-medium mb-2">Estrategias aplicadas</p>
          <div className="flex flex-wrap gap-1.5">
            {ep.estrategias_aplicadas.map(s => (
              <span key={s} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {ESTRATEGIA_LABEL[s] ?? s}
              </span>
            ))}
          </div>
          {ep.efectividad_estrategia && (
            <p className="text-xs text-gray-500 mt-2">
              Efectividad: <span className="font-semibold text-gray-700">{ep.efectividad_estrategia}/5</span>
            </p>
          )}
        </div>
      )}

      {ep.notas && (
        <div className="card">
          <p className="text-xs text-gray-500 font-medium mb-1">Notas</p>
          <p className="text-sm text-gray-700">{ep.notas}</p>
        </div>
      )}

      {ep.en_curso && (
        <button
          type="button"
          onClick={onMarcarTerminado}
          className="w-full py-3 rounded-2xl bg-calm-500 text-white font-semibold text-sm active:scale-95 transition-all"
        >
          Marcar como terminado
        </button>
      )}

      {confirmEliminar ? (
        <div className="card border-red-200 bg-red-50 space-y-3">
          <p className="text-sm font-medium text-red-700">¿Eliminar este episodio?</p>
          <p className="text-xs text-red-500">Esta acción no se puede deshacer.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmEliminar(false)}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm">
              Cancelar
            </button>
            <button type="button" onClick={onEliminar}
              className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold">
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmEliminar(true)}
          className="w-full py-2.5 rounded-2xl border border-red-200 text-red-500 text-sm font-medium active:scale-95 transition-all"
        >
          Eliminar episodio
        </button>
      )}
    </div>
  )
}

export default function MisEpisodios({ onAbrirWizard }) {
  const { episodios, cargando, eliminarEpisodio, guardarEpisodio } = useEpisodios()
  const [detalleId, setDetalleId] = useState(null)

  const stats = calcularEstadisticas(episodios)
  const epDetalle = episodios.find(e => e.id === detalleId)

  const borradores = episodios.filter(e => !e.completado)
  const completados = episodios.filter(e => e.completado)

  if (cargando) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[0,1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (epDetalle) {
    return (
      <DetalleEpisodio
        ep={epDetalle}
        onVolver={() => setDetalleId(null)}
        onEditar={() => {
          setDetalleId(null)
          onAbrirWizard({ initialData: epDetalle, initialPaso: epDetalle.paso_actual ?? 1 })
        }}
        onEliminar={async () => {
          await eliminarEpisodio(epDetalle.id)
          setDetalleId(null)
        }}
        onMarcarTerminado={async () => {
          await guardarEpisodio({ ...epDetalle, en_curso: false, completado: true, fecha_completado: new Date().toISOString() })
          setDetalleId(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Mis episodios</h2>
        <button
          type="button"
          onClick={() => onAbrirWizard({})}
          className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center
                     active:scale-95 transition-all shadow-sm shadow-indigo-200 text-lg font-light"
        >
          +
        </button>
      </div>

      {episodios.length > 0 && (
        <>
          {/* Stats cards 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            {/* Episodios este mes */}
            <div className="card flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-800">{stats.esteMes}</span>
                {stats.esteMes !== stats.mesPasado && (
                  <span className={`text-sm font-bold ${stats.esteMes > stats.mesPasado ? 'text-red-500' : 'text-green-500'}`}>
                    {stats.esteMes > stats.mesPasado ? '↑' : '↓'}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">Este mes</span>
              <span className="text-[10px] text-gray-400">vs {stats.mesPasado} el mes pasado</span>
            </div>

            {/* Intensidad promedio */}
            <div className="card flex flex-col gap-1">
              {stats.avgIntensidad != null ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className={`text-2xl font-bold ${
                      stats.avgIntensidad <= 3 ? 'text-green-600' :
                      stats.avgIntensidad <= 6 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {stats.avgIntensidad.toFixed(1)}
                    </span>
                    {stats.avgIntensidadPrev != null && stats.avgIntensidad !== stats.avgIntensidadPrev && (
                      <span className={`text-sm font-bold ${stats.avgIntensidad > stats.avgIntensidadPrev ? 'text-red-500' : 'text-green-500'}`}>
                        {stats.avgIntensidad > stats.avgIntensidadPrev ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">Intensidad prom.</span>
                  <span className="text-[10px] text-gray-400">últimas 4 semanas</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-gray-300">—</span>
                  <span className="text-xs text-gray-400">Intensidad prom.</span>
                </>
              )}
            </div>

            {/* Duración promedio */}
            <div className="card flex flex-col gap-1">
              <span className="text-xl font-bold text-gray-800">
                {stats.avgDuracion != null ? formatDuracion(Math.round(stats.avgDuracion)) : '—'}
              </span>
              <span className="text-xs text-gray-500">Duración prom.</span>
            </div>

            {/* Estrategia más usada */}
            {stats.estrategiaMasUsada ? (
              <div className="card flex flex-col gap-1">
                <span className="text-sm font-bold text-indigo-600 leading-tight">
                  {ESTRATEGIA_LABEL[stats.estrategiaMasUsada] ?? stats.estrategiaMasUsada}
                </span>
                <span className="text-xs text-gray-500">Estrategia más usada</span>
                {stats.avgEfectividad != null && (
                  <span className="text-[10px] text-gray-400">Efectividad: {stats.avgEfectividad.toFixed(1)}/5</span>
                )}
              </div>
            ) : (
              <div className="card flex flex-col gap-1">
                <span className="text-2xl font-bold text-gray-300">—</span>
                <span className="text-xs text-gray-400">Sin estrategias aún</span>
              </div>
            )}
          </div>

          {/* Gráfica barras — episodios por semana */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title">Episodios por semana</h3>
              <span className="text-xs text-gray-400">12 semanas</span>
            </div>
            <GraficaSemanas semanas={stats.semanas} />
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-calm-100">
              {[
                { color: '#22c55e', label: 'Leve' },
                { color: '#f59e0b', label: 'Moderada' },
                { color: '#ef4444', label: 'Severa' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-xs text-gray-400">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfica pie — estrategias */}
          {stats.pieData.length > 0 && (
            <div className="card">
              <h3 className="section-title mb-3">Estrategias utilizadas</h3>
              <PieChart pieData={stats.pieData} />
            </div>
          )}
        </>
      )}

      {/* Lista de episodios */}
      <div className="space-y-2">
        {episodios.length === 0 && (
          <div className="card text-center py-8 text-gray-400">
            <p className="text-sm">Sin episodios registrados aún</p>
            <button
              type="button"
              onClick={() => onAbrirWizard({})}
              className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all"
            >
              Registrar episodio
            </button>
          </div>
        )}

        {/* Borradores primero */}
        {borradores.map(ep => (
          <div key={ep.id} className="relative">
            <TarjetaEpisodio ep={ep} onClick={() => setDetalleId(ep.id)} />
            <button
              type="button"
              onClick={() => onAbrirWizard({ initialData: ep, initialPaso: ep.paso_actual ?? 1 })}
              className="absolute right-3 bottom-3 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg active:scale-95 transition-all"
            >
              Terminar
            </button>
          </div>
        ))}

        {/* Completados */}
        {completados.map(ep => (
          <TarjetaEpisodio key={ep.id} ep={ep} onClick={() => setDetalleId(ep.id)} />
        ))}
      </div>
    </div>
  )
}
