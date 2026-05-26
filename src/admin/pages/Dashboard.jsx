import { useEffect, useState } from 'react'
import MetricCard from '../components/MetricCard'
import { useDashboardMetrics } from '../hooks/useDashboardMetrics'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { useAdminSession } from '../hooks/useAdminSession'

function tiempoRelativo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000)       return 'ahora mismo'
  if (diff < 3_600_000)    return `hace ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000)   return `hace ${Math.floor(diff / 3_600_000)} h`
  return `hace ${Math.floor(diff / 86_400_000)} días`
}

function semanaEstudio(fechaInicio) {
  if (!fechaInicio) return '—'
  const diff = Date.now() - new Date(fechaInicio).getTime()
  return Math.max(1, Math.ceil(diff / (7 * 86_400_000)))
}

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function AlertaRow({ tipo, participantes, color }) {
  return (
    <div>
      <p className={`text-xs font-medium ${color} mb-1`}>{tipo} — {participantes.length} participante{participantes.length > 1 ? 's' : ''}</p>
      <div className="flex flex-wrap gap-1">
        {participantes.map(p => (
          <span key={p.id} className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-700">
            {p.codigo}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { metricas, actividadReciente, configuracion, cargando, recargar } = useDashboardMetrics()
  const [alertas, setAlertas] = useState(null)

  useEffect(() => {
    if (!supabaseAdmin) return
    supabaseAdmin.rpc('obtener_alertas_bai').then(({ data }) => {
      if (data) setAlertas(data)
    })
  }, [])

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Resumen del estado del estudio</p>
        </div>
        <button
          onClick={recargar}
          disabled={cargando}
          className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors flex items-center gap-1"
        >
          {cargando ? 'Cargando…' : '↻ Actualizar'}
        </button>
      </div>

      {/* Alertas activas */}
      {alertas && Object.values(alertas).some(a => a.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-amber-800">Alertas activas</h2>
          {alertas.basal_pendientes?.length > 0 && (
            <AlertaRow
              tipo="Basal pendiente >2 días"
              participantes={alertas.basal_pendientes}
              color="text-amber-700"
            />
          )}
          {alertas.scores_graves?.length > 0 && (
            <AlertaRow
              tipo="Puntaje grave (≥26) — últimas 2 semanas"
              participantes={alertas.scores_graves}
              color="text-red-700"
            />
          )}
          {alertas.ventana_incompleta?.length > 0 && (
            <AlertaRow
              tipo="En ventana sin completar (mitad de plazo)"
              participantes={alertas.ventana_incompleta}
              color="text-blue-700"
            />
          )}
          {alertas.tendencia_ascendente?.length > 0 && (
            <AlertaRow
              tipo="Tendencia ascendente (>5 puntos)"
              participantes={alertas.tendencia_ascendente}
              color="text-orange-700"
            />
          )}
        </div>
      )}

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          titulo="Participantes totales"
          valor={metricas.participantesTotales}
          icono="👥"
          color="indigo"
          subtitulo="Desde el inicio del estudio"
        />
        <MetricCard
          titulo="Activos (últimos 7 días)"
          valor={metricas.participantesActivos}
          icono="📈"
          color="emerald"
          subtitulo="Con al menos un ejercicio"
        />
        <MetricCard
          titulo="Crisis (últimos 7 días)"
          valor={metricas.eventosCrisis}
          icono="🚨"
          color="rose"
          subtitulo="Eventos de crisis reportados"
        />
        <MetricCard
          titulo="BAI completados"
          valor={metricas.baiCompletados}
          icono="📋"
          color="amber"
          subtitulo="Esta semana"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Actividad reciente */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Actividad reciente</h2>
          {cargando ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : actividadReciente.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Sin actividad registrada aún</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {actividadReciente.map((item, i) => (
                <li key={i} className="flex items-start gap-3 py-3">
                  <span className="text-lg leading-none mt-0.5">{item.icono}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">
                      {item.tipo}
                      <span className="ml-1.5 font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        #{item.participante}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{tiempoRelativo(item.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Estado del estudio */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Estado del estudio</h2>
          <dl className="space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Nombre</dt>
              <dd className="font-medium text-slate-800 text-right max-w-[60%]">
                {configuracion?.nombre_estudio ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Fecha de inicio</dt>
              <dd className="font-medium text-slate-800">{formatFecha(configuracion?.fecha_inicio)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Semana actual</dt>
              <dd className="font-medium text-slate-800">
                {configuracion?.fecha_inicio
                  ? `Semana ${semanaEstudio(configuracion.fecha_inicio)}`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Participantes esperados</dt>
              <dd className="font-medium text-slate-800">
                {configuracion?.participantes_esperados ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Participantes reclutados</dt>
              <dd className="font-medium text-slate-800">
                {metricas.participantesTotales ?? '—'}
              </dd>
            </div>
            {configuracion?.participantes_esperados > 0 && metricas.participantesTotales !== null && (
              <div className="pt-1">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Progreso de reclutamiento</span>
                  <span>
                    {Math.min(100, Math.round(
                      (metricas.participantesTotales / configuracion.participantes_esperados) * 100
                    ))}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (metricas.participantesTotales / configuracion.participantes_esperados) * 100)}%`
                    }}
                  />
                </div>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}
