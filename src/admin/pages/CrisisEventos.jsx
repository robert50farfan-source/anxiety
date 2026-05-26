import { useCallback, useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import MetricCard from '../components/MetricCard'

// ── Helpers ───────────────────────────────────────────────────────────
function hace7dias() {
  const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString()
}

function formatTs(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function tiempoRelativo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000)     return 'ahora mismo'
  if (diff < 3_600_000)  return `hace ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)} h`
  return `hace ${Math.floor(diff / 86_400_000)} días`
}

const TIPO_LABEL = {
  apertura_pantalla:          { label: 'Abrió pantalla de crisis', icono: '🆘' },
  contacto_profesional_apoyo: { label: 'Contactó profesional',     icono: '🏥' },
  contacto_personal:          { label: 'Contactó persona personal', icono: '👤' },
  contacto_linea_nacional:    { label: 'Llamó línea nacional',      icono: '📞' },
}

const TIPOS_FILTRO = [
  { value: '', label: 'Todos los tipos' },
  { value: 'apertura_pantalla',          label: 'Apertura de pantalla' },
  { value: 'contacto_profesional_apoyo', label: 'Contacto a profesional' },
  { value: 'contacto_personal',          label: 'Contacto personal' },
  { value: 'contacto_linea_nacional',    label: 'Línea nacional' },
]

// ── Componente ────────────────────────────────────────────────────────
export default function CrisisEventos() {
  const [eventos, setEventos]     = useState([])
  const [resumen, setResumen]     = useState({ total: null, participantes: null, profesionalTop: null })
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState(null)

  // Filtros
  const hoy = new Date().toISOString().slice(0, 10)
  const hace7 = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
  const [filtroDesde, setFiltroDesde] = useState(hace7)
  const [filtroHasta, setFiltroHasta] = useState(hoy)
  const [filtroTipo,  setFiltroTipo]  = useState('')
  const [pagina,      setPagina]      = useState(0)
  const POR_PAGINA = 25

  const cargar = useCallback(async () => {
    setCargando(true); setError(null)

    // ── Resumen de últimos 7 días (siempre, independiente de filtros) ──
    const [
      { count: total7d },
      { data: eventosActivos },
      { data: topProf },
    ] = await Promise.all([
      supabaseAdmin
        .from('eventos_crisis')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', hace7dias()),

      supabaseAdmin
        .from('eventos_crisis')
        .select('user_id')
        .gte('timestamp', hace7dias()),

      supabaseAdmin
        .from('eventos_crisis')
        .select('profesional_contactado_id, profesionales_apoyo(nombre_completo)')
        .not('profesional_contactado_id', 'is', null)
        .gte('timestamp', hace7dias()),
    ])

    const participantesUnicos = new Set((eventosActivos ?? []).map(e => e.user_id)).size

    // Profesional más contactado
    const conteo = {}
    ;(topProf ?? []).forEach((e) => {
      const id = e.profesional_contactado_id
      if (!id) return
      const nombre = e.profesionales_apoyo?.nombre_completo ?? 'Desconocido'
      conteo[id] = { nombre, count: (conteo[id]?.count ?? 0) + 1 }
    })
    const top = Object.values(conteo).sort((a, b) => b.count - a.count)[0]

    setResumen({
      total:          total7d,
      participantes:  participantesUnicos,
      profesionalTop: top ? `${top.nombre} (${top.count})` : null,
    })

    // ── Eventos con filtros ──────────────────────────────────────────
    let q = supabaseAdmin
      .from('eventos_crisis')
      .select(`
        id, timestamp, tipo_evento, user_id, detalles,
        profesionales_apoyo ( nombre_completo, rol_profesional )
      `)
      .order('timestamp', { ascending: false })
      .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1)

    if (filtroDesde) q = q.gte('timestamp', `${filtroDesde}T00:00:00`)
    if (filtroHasta) q = q.lte('timestamp', `${filtroHasta}T23:59:59`)
    if (filtroTipo)  q = q.eq('tipo_evento', filtroTipo)

    const { data, error: err } = await q
    if (err) setError('No se pudieron cargar los eventos.')
    else setEventos(data ?? [])
    setCargando(false)
  }, [filtroDesde, filtroHasta, filtroTipo, pagina])

  useEffect(() => { cargar() }, [cargar])

  // Resetear página al cambiar filtros
  useEffect(() => { setPagina(0) }, [filtroDesde, filtroHasta, filtroTipo])

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Eventos de crisis</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registro de activaciones y contactos en pantalla de crisis</p>
        </div>
        <button
          onClick={cargar}
          disabled={cargando}
          className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors"
        >
          {cargando ? 'Cargando…' : '↻ Actualizar'}
        </button>
      </div>

      {/* Tarjetas resumen (últimos 7 días) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          titulo="Eventos (7 días)"
          valor={resumen.total}
          icono="🆘"
          color="rose"
          subtitulo="Total de activaciones"
        />
        <MetricCard
          titulo="Participantes únicos"
          valor={resumen.participantes}
          icono="👥"
          color="amber"
          subtitulo="Con al menos un evento de crisis"
        />
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Profesional más contactado</p>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 ring-1 ring-indigo-100 flex items-center justify-center text-lg">🏥</div>
          </div>
          <p className={`text-sm font-semibold ${resumen.profesionalTop ? 'text-slate-800' : 'text-slate-300'}`}>
            {resumen.profesionalTop ?? '—'}
          </p>
          <p className="text-xs text-slate-400">Últimos 7 días</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Desde</label>
          <input
            type="date" value={filtroDesde}
            onChange={e => setFiltroDesde(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Hasta</label>
          <input
            type="date" value={filtroHasta}
            onChange={e => setFiltroHasta(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Tipo de evento</label>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {TIPOS_FILTRO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla de eventos */}
      {error ? (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">{error}</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {cargando ? (
            <div className="p-4 space-y-2">
              {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
            </div>
          ) : eventos.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">Sin eventos en el período seleccionado</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-8" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Evento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Participante</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Profesional</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eventos.map(ev => {
                  const meta    = TIPO_LABEL[ev.tipo_evento] ?? { label: ev.tipo_evento, icono: '📝' }
                  const codigo  = String(ev.user_id ?? '').slice(0, 8).toUpperCase()
                  const profNom = ev.profesionales_apoyo?.nombre_completo
                  return (
                    <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-base">{meta.icono}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{meta.label}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          #{codigo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {profNom ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        <p>{formatTs(ev.timestamp)}</p>
                        <p className="text-xs text-slate-400">{tiempoRelativo(ev.timestamp)}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Paginación */}
      {!cargando && eventos.length > 0 && (
        <div className="flex justify-between items-center text-sm text-slate-500">
          <button onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina === 0}
            className="disabled:opacity-30 hover:text-slate-800 transition-colors">← Anterior</button>
          <span>Página {pagina + 1}</span>
          <button onClick={() => setPagina(p => p + 1)} disabled={eventos.length < POR_PAGINA}
            className="disabled:opacity-30 hover:text-slate-800 transition-colors">Siguiente →</button>
        </div>
      )}
    </div>
  )
}
