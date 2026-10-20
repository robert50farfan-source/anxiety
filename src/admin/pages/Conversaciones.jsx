import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { useAdminSession } from '../hooks/useAdminSession'
import { useAuditoria } from '../hooks/useAuditoria'
import MetricCard from '../components/MetricCard'

// ── Helpers ───────────────────────────────────────────────────────────
const PAGINA_BD = 1000 // límite de filas por respuesta de PostgREST

// Trae todas las filas paginando (PostgREST corta en 1000)
async function traerTodo(construirQuery) {
  const filas = []
  for (let desde = 0; ; desde += PAGINA_BD) {
    const { data, error } = await construirQuery().range(desde, desde + PAGINA_BD - 1)
    if (error) throw error
    filas.push(...(data ?? []))
    if (!data || data.length < PAGINA_BD) return filas
  }
}

function formatTs(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const tieneCrisis = (m) => m.contenido?.includes('[CRISIS_BLOCK]')
const limpiar     = (m) => (m.contenido ?? '').replace('[CRISIS_BLOCK]', '').trim()
const csvCampo    = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

// ── Componente ────────────────────────────────────────────────────────
export default function Conversaciones() {
  const { esInvestigador } = useAdminSession()
  const { registrar } = useAuditoria()

  const [participantes, setParticipantes] = useState([])
  const [resumen, setResumen]   = useState({}) // user_id → { mensajes, crisis, ultimo }
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState(null)
  const [busqueda, setBusqueda] = useState('')

  const [seleccionado, setSeleccionado] = useState(null)
  const [mensajes, setMensajes]         = useState([])
  const [cargandoChat, setCargandoChat] = useState(false)
  const [exportando, setExportando]     = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true); setError(null)
    try {
      const [{ data: parts, error: errP }, filas] = await Promise.all([
        supabaseAdmin
          .from('participantes')
          .select('id, codigo_participante, grupo, estado, auth_user_id')
          .eq('grupo', 'experimental')
          .not('auth_user_id', 'is', null)
          .order('codigo_participante'),
        traerTodo(() => supabaseAdmin
          .from('chat_mensajes')
          .select('user_id, rol, contenido, fecha')
          .order('fecha', { ascending: true })),
      ])
      if (errP) throw errP

      const r = {}
      filas.forEach(m => {
        const s = (r[m.user_id] ??= { mensajes: 0, crisis: 0, ultimo: null })
        if (m.rol === 'user') s.mensajes++
        if (tieneCrisis(m)) s.crisis++
        s.ultimo = m.fecha
      })
      setParticipantes(parts ?? [])
      setResumen(r)
    } catch {
      setError('No se pudieron cargar las conversaciones.')
    }
    setCargando(false)
  }, [])

  useEffect(() => { if (esInvestigador) cargar() }, [esInvestigador, cargar])

  const abrir = async (p) => {
    setSeleccionado(p); setCargandoChat(true); setMensajes([])
    try {
      const filas = await traerTodo(() => supabaseAdmin
        .from('chat_mensajes')
        .select('id, rol, contenido, fecha')
        .eq('user_id', p.auth_user_id)
        .order('fecha', { ascending: true }))
      setMensajes(filas)
      registrar('ver_conversacion', 'participantes', p.id, { codigo: p.codigo_participante })
    } catch {
      setMensajes([])
    }
    setCargandoChat(false)
  }

  const exportarCSV = async () => {
    setExportando(true)
    try {
      const porUsuario = Object.fromEntries(participantes.map(p => [p.auth_user_id, p]))
      const filas = await traerTodo(() => supabaseAdmin
        .from('chat_mensajes')
        .select('user_id, rol, contenido, fecha')
        .order('fecha', { ascending: true }))

      const headers = 'Codigo,Grupo,Fecha,Rol,Crisis,Contenido'
      const rows = filas
        .filter(m => porUsuario[m.user_id])
        .map(m => [
          porUsuario[m.user_id].codigo_participante,
          porUsuario[m.user_id].grupo,
          m.fecha,
          m.rol,
          tieneCrisis(m) ? 1 : 0,
          csvCampo(limpiar(m)),
        ].join(','))

      const csv  = [headers, ...rows].join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `conversaciones_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      registrar('exportar_conversaciones', 'chat_mensajes', null, { filas: rows.length })
    } finally {
      setExportando(false)
    }
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase()
    return participantes.filter(p => !q || p.codigo_participante.includes(q))
  }, [participantes, busqueda])

  const totales = useMemo(() => {
    const vals = Object.values(resumen)
    return {
      mensajes: vals.reduce((a, s) => a + s.mensajes, 0),
      activos:  participantes.filter(p => resumen[p.auth_user_id]?.mensajes).length,
      crisis:   vals.reduce((a, s) => a + s.crisis, 0),
    }
  }, [resumen, participantes])

  if (!esInvestigador) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 max-w-xl">
        Las conversaciones solo están disponibles para el investigador principal.
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Conversaciones del chat</h1>
          <p className="text-sm text-slate-500 mt-0.5">Mensajes entre participantes del grupo experimental y el asistente TCC</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={cargar} disabled={cargando}
            className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors">
            {cargando ? 'Cargando…' : '↻ Actualizar'}
          </button>
          <button onClick={exportarCSV} disabled={exportando || cargando}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
            {exportando ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard titulo="Mensajes de participantes" valor={cargando ? null : totales.mensajes} icono="💬" color="indigo" subtitulo="Total histórico" />
        <MetricCard titulo="Participantes que usan el chat" valor={cargando ? null : totales.activos} icono="👥" color="amber" subtitulo={`De ${participantes.length} experimentales con código asignado`} />
        <MetricCard titulo="Respuestas con crisis" valor={cargando ? null : totales.crisis} icono="🆘" color="rose" subtitulo="Con tarjeta de crisis mostrada" />
      </div>

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-4">
        {/* Lista de participantes */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col max-h-[70vh]">
          <div className="p-3 border-b border-slate-200">
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar código…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="overflow-y-auto divide-y divide-slate-100">
            {cargando ? (
              <div className="p-3 space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
              </div>
            ) : filtrados.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Sin participantes</p>
            ) : filtrados.map(p => {
              const s = resumen[p.auth_user_id]
              const activo = seleccionado?.id === p.id
              return (
                <button key={p.id} onClick={() => abrir(p)}
                  className={`w-full text-left px-4 py-3 transition-colors ${activo ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium text-slate-700">{p.codigo_participante}</span>
                    {s?.crisis > 0 && <span className="text-xs text-rose-600">🆘 {s.crisis}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {s?.mensajes ? `${s.mensajes} mensajes · ${formatTs(s.ultimo)}` : 'Sin mensajes'}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Transcripción */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col max-h-[70vh]">
          {!seleccionado ? (
            <p className="text-sm text-slate-400 py-16 text-center">Selecciona un participante para ver su conversación</p>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-200">
                <p className="font-mono text-sm font-semibold text-slate-700">{seleccionado.codigo_participante}</p>
                <p className="text-xs text-slate-400">{mensajes.length} mensajes en total</p>
              </div>
              <div className="overflow-y-auto p-4 space-y-3 bg-slate-50 flex-1">
                {cargandoChat ? (
                  [...Array(4)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)
                ) : mensajes.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">Este participante no ha usado el chat</p>
                ) : mensajes.map(m => (
                  <div key={m.id} className={`flex ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.rol === 'user'
                        ? 'bg-indigo-600 text-white'
                        : tieneCrisis(m)
                          ? 'bg-rose-50 border border-rose-200 text-slate-700'
                          : 'bg-white border border-slate-200 text-slate-700'
                    }`}>
                      {limpiar(m)}
                      <p className={`text-[10px] mt-1 ${m.rol === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {formatTs(m.fecha)}{tieneCrisis(m) && ' · 🆘 tarjeta de crisis'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
