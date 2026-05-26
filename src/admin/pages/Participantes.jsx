import { useState, useMemo, useEffect } from 'react'
import { useParticipantesAdmin } from '../hooks/useParticipantesAdmin'
import { useAdminSession } from '../hooks/useAdminSession'
import { supabaseAdmin } from '../lib/supabaseAdmin'

const ESTADO_BADGE = {
  codigo_generado:       'bg-slate-100 text-slate-600',
  codigo_asignado:       'bg-blue-100 text-blue-700',
  consentimiento_firmado:'bg-purple-100 text-purple-700',
  activo:                'bg-green-100 text-green-700',
  retirado:              'bg-red-100 text-red-600',
  completado:            'bg-teal-100 text-teal-700',
  inactivo_sin_basal:    'bg-orange-100 text-orange-700',
}

const ESTADO_LABEL = {
  codigo_generado:        'Sin asignar',
  codigo_asignado:        'Asignado',
  consentimiento_firmado: 'Consentimiento',
  activo:                 'Activo',
  retirado:               'Retirado',
  completado:             'Completado',
  inactivo_sin_basal:     'Inactivo/sin basal',
}

const TODOS_ESTADOS = Object.keys(ESTADO_LABEL)

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function EstadoBadge({ estado }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[estado] ?? 'bg-slate-100 text-slate-500'}`}>
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  )
}

function GrupoBadge({ grupo }) {
  if (grupo === 'experimental') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">Experimental</span>
  if (grupo === 'control')      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Control</span>
  return <span className="text-slate-400 text-xs">—</span>
}

function interpretarBAI(score) {
  if (score <= 7)  return { label: 'Mínima',   color: 'text-green-700' }
  if (score <= 15) return { label: 'Leve',      color: 'text-yellow-700' }
  if (score <= 25) return { label: 'Moderada',  color: 'text-orange-700' }
  return           { label: 'Grave',            color: 'text-red-700' }
}

function ModalGenerarCodigos({ onClose, onGenerar, proximoNumero }) {
  const [cantExp, setCantExp] = useState(1)
  const [cantCtr, setCantCtr] = useState(1)
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const inicioExp = proximoNumero('EXP')
  const inicioCtr = proximoNumero('CTR')

  const codesPreview = () => {
    const exp = cantExp > 0 ? `EXP-${String(inicioExp).padStart(3,'0')} … EXP-${String(inicioExp + cantExp - 1).padStart(3,'0')}` : ''
    const ctr = cantCtr > 0 ? `CTR-${String(inicioCtr).padStart(3,'0')} … CTR-${String(inicioCtr + cantCtr - 1).padStart(3,'0')}` : ''
    return [exp, ctr].filter(Boolean).join('  |  ')
  }

  const handleConfirmar = async () => {
    if (cantExp + cantCtr === 0) return
    setCargando(true)
    const res = await onGenerar({ cantExp, cantCtr, inicioExp, inicioCtr })
    setCargando(false)
    if (res.ok) setResultado(res.generados)
  }

  if (resultado !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-slate-800">{resultado} código{resultado !== 1 ? 's' : ''} generado{resultado !== 1 ? 's' : ''}</p>
          <button onClick={onClose} className="mt-4 w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">Cerrar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-slate-800 mb-4">Generar códigos</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Cantidad EXP <span className="text-slate-400">(desde EXP-{String(inicioExp).padStart(3,'0')})</span>
              </label>
              <input type="number" min={0} max={50} value={cantExp}
                onChange={e => setCantExp(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Cantidad CTR <span className="text-slate-400">(desde CTR-{String(inicioCtr).padStart(3,'0')})</span>
              </label>
              <input type="number" min={0} max={50} value={cantCtr}
                onChange={e => setCantCtr(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          {(cantExp + cantCtr) > 0 && (
            <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg font-mono">{codesPreview()}</p>
          )}
        </div>
        <div className="mt-5 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition">Cancelar</button>
          <button onClick={handleConfirmar} disabled={cargando || cantExp + cantCtr === 0}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
            {cargando ? 'Generando…' : `Generar ${cantExp + cantCtr} código${cantExp + cantCtr !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function DrawerParticipante({ p, onClose, onActualizarNotas, onRetirar, onResetear, esInvestigador }) {
  const [notas, setNotas] = useState(p.notas_investigador ?? '')
  const [guardandoNotas, setGuardandoNotas] = useState(false)
  const [notasGuardadas, setNotasGuardadas] = useState(false)

  const [showRetirarModal, setShowRetirarModal] = useState(false)
  const [motivoRetiro, setMotivoRetiro] = useState('')
  const [retirando, setRetirando] = useState(false)

  const [confirmReset, setConfirmReset] = useState(false)
  const [reseteando, setReseteando] = useState(false)

  const [consent, setConsent] = useState(null)
  const [bais, setBais] = useState([])

  useEffect(() => {
    supabaseAdmin
      .from('consentimientos')
      .select('*')
      .eq('participante_id', p.id)
      .eq('aceptado', true)
      .order('fecha_aceptacion', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setConsent(data ?? null))

    supabaseAdmin
      .from('resultados_bai')
      .select('id, fecha, puntaje_total, tipo_medicion, dias_desde_inicio, ventana_esperada, respuestas')
      .eq('participante_id', p.id)
      .order('fecha', { ascending: false })
      .then(({ data }) => setBais(data ?? []))
  }, [p.id])

  function descargarTxt() {
    if (!consent) return
    const contenido = [
      'CONSENTIMIENTO INFORMADO ACEPTADO',
      '',
      `Participante: ${p.codigo_participante}`,
      `Versión: ${consent.version_documento}`,
      `Fecha de aceptación: ${new Date(consent.fecha_aceptacion).toLocaleString('es-PE')}`,
      `User agent: ${consent.user_agent ?? 'no disponible'}`,
      '',
      '---',
      '',
      consent.texto_aceptado,
    ].join('\n')
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consentimiento_${p.codigo_participante}_${new Date(consent.fecha_aceptacion).toISOString().slice(0,10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleGuardarNotas = async () => {
    setGuardandoNotas(true)
    await onActualizarNotas(p.id, notas)
    setGuardandoNotas(false)
    setNotasGuardadas(true)
    setTimeout(() => setNotasGuardadas(false), 2000)
  }

  const handleRetirar = async () => {
    if (!motivoRetiro.trim()) return
    setRetirando(true)
    await onRetirar(p.id, motivoRetiro.trim())
    setRetirando(false)
    onClose()
  }

  const handleResetear = async () => {
    setReseteando(true)
    await onResetear(p.id)
    setReseteando(false)
    setConfirmReset(false)
    onClose()
  }

  const timestamps = [
    { label: 'Generación del código',  valor: p.fecha_generacion_codigo },
    { label: 'Asignación',             valor: p.fecha_asignacion },
    { label: 'Consentimiento',         valor: p.fecha_consentimiento },
    { label: 'Inicio del estudio',     valor: p.fecha_inicio_estudio },
    { label: 'Último login',           valor: p.ultimo_login },
    { label: 'Retiro',                 valor: p.fecha_retiro },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-slate-800 text-base">{p.codigo_participante}</span>
              <GrupoBadge grupo={p.grupo} />
              <EstadoBadge estado={p.estado} />
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Sección: Información */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Información</h3>
            <dl className="space-y-2">
              {timestamps.map(({ label, valor }) => (
                <div key={label} className="flex justify-between text-sm py-1.5 border-b border-slate-50">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-slate-700 font-medium">{fmtFecha(valor)}</dd>
                </div>
              ))}
            </dl>
            {p.motivo_retiro && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-xs font-medium text-red-700 mb-0.5">Motivo de retiro</p>
                <p className="text-sm text-red-600">{p.motivo_retiro}</p>
              </div>
            )}
          </section>

          {/* Sección: Consentimiento */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Consentimiento</h3>
            {consent ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Versión</span>
                  <span className="text-slate-700 font-medium">{consent.version_documento}</span>
                </div>
                <div className="flex justify-between text-sm py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Fecha aceptación</span>
                  <span className="text-slate-700 font-medium">{fmtFecha(consent.fecha_aceptacion)}</span>
                </div>
                <button
                  onClick={descargarTxt}
                  className="mt-2 w-full py-2 px-4 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition text-center"
                >
                  Descargar como .txt
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Sin consentimiento registrado</p>
            )}
          </section>

          {/* Sección: Historial de estado */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Historial de estado</h3>
            <ol className="relative border-l border-slate-200 space-y-3 pl-4">
              {timestamps.filter(t => t.valor).map(({ label, valor }) => (
                <li key={label} className="relative">
                  <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-400 border-2 border-white" />
                  <p className="text-sm text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{fmtFecha(valor)}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Sección: Mediciones BAI */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Mediciones BAI</h3>
            {bais.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sin mediciones registradas</p>
            ) : (
              <>
                {bais.length >= 2 && (() => {
                  const puntos = [...bais].reverse()
                  const W = 200, H = 50
                  const pts = puntos.map((b, i) => `${10 + i * (W - 20) / (puntos.length - 1)},${H - 10 - (b.puntaje_total / 63) * (H - 20)}`)
                  return (
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mb-3 rounded-lg bg-slate-50" style={{ height: 50 }}>
                      <polyline points={pts.join(' ')} fill="none" stroke="#6366f1" strokeWidth={2} />
                      {puntos.map((b, i) => {
                        const x = 10 + i * (W - 20) / (puntos.length - 1)
                        const y = H - 10 - (b.puntaje_total / 63) * (H - 20)
                        return <circle key={i} cx={x} cy={y} r={3} fill="#6366f1" />
                      })}
                    </svg>
                  )
                })()}

                {(() => {
                  const alertasLocales = []
                  const sorted = [...bais].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                  if (sorted.length >= 2 && sorted[0].puntaje_total > sorted[1].puntaje_total + 5) {
                    alertasLocales.push('Tendencia ascendente: +' + (sorted[0].puntaje_total - sorted[1].puntaje_total) + ' pts en última medición')
                  }
                  if (sorted[0]?.puntaje_total >= 26) {
                    alertasLocales.push('Puntaje grave (' + sorted[0].puntaje_total + ') en última medición')
                  }
                  return alertasLocales.map((a, i) => (
                    <p key={i} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded mb-2">{a}</p>
                  ))
                })()}

                <div className="space-y-1.5">
                  {bais.map(b => {
                    const iv = interpretarBAI(b.puntaje_total)
                    const tipoLabel = { basal:'Basal', intermedia_4sem:'4 sem', final_8sem:'8 sem', seguimiento_12sem:'12 sem', voluntaria:'Voluntaria' }[b.tipo_medicion] ?? b.tipo_medicion ?? '—'
                    return (
                      <div key={b.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                        <span className="text-slate-500">{new Date(b.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</span>
                        <span className="text-slate-600">{tipoLabel}</span>
                        <span className={`font-bold ${iv.color}`}>{b.puntaje_total}</span>
                        <span className="text-slate-400">{b.ventana_esperada ? '✓ ventana' : ''}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          {/* Sección: Episodios (próxima versión) */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Episodios</h3>
            <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <p className="text-xs text-slate-400 text-center">Episodios — disponible en próxima versión</p>
            </div>
          </section>

          {/* Sección: Notas del investigador */}
          {esInvestigador && (
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Notas del investigador</h3>
              <textarea
                value={notas}
                onChange={e => { setNotas(e.target.value); setNotasGuardadas(false) }}
                rows={4}
                placeholder="Notas internas sobre este participante…"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="flex justify-end mt-2">
                {notasGuardadas
                  ? <span className="text-xs text-green-600 font-medium">Guardado</span>
                  : <button onClick={handleGuardarNotas} disabled={guardandoNotas}
                      className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                      {guardandoNotas ? 'Guardando…' : 'Guardar notas'}
                    </button>
                }
              </div>
            </section>
          )}

          {/* Sección: Acciones peligrosas */}
          {esInvestigador && p.estado !== 'retirado' && (
            <section>
              <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">Acciones</h3>
              <div className="space-y-2">
                <button onClick={() => setShowRetirarModal(true)}
                  className="w-full py-2 px-4 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition text-left">
                  Retirar del estudio
                </button>
                <button onClick={() => setConfirmReset(true)}
                  className="w-full py-2 px-4 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-left">
                  Resetear código
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {showRetirarModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => setShowRetirarModal(false)}>
          <div className="bg-white rounded-2xl p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-3">Retirar participante</h3>
            <textarea
              value={motivoRetiro}
              onChange={e => setMotivoRetiro(e.target.value)}
              placeholder="Motivo del retiro (requerido)"
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="mt-3 flex gap-2 justify-end">
              <button onClick={() => setShowRetirarModal(false)} className="text-sm text-slate-500 px-3 py-1.5">Cancelar</button>
              <button onClick={handleRetirar} disabled={retirando || !motivoRetiro.trim()}
                className="text-sm px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition">
                {retirando ? 'Retirando…' : 'Confirmar retiro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmReset && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => setConfirmReset(false)}>
          <div className="bg-white rounded-2xl p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-2">Resetear código</h3>
            <p className="text-sm text-slate-500 mb-4">Esto desvinculará el código del usuario actual y lo devolverá al estado "Sin asignar". El participante deberá ingresar su código nuevamente.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmReset(false)} className="text-sm text-slate-500 px-3 py-1.5">Cancelar</button>
              <button onClick={handleResetear} disabled={reseteando}
                className="text-sm px-4 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition">
                {reseteando ? 'Reseteando…' : 'Confirmar reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function Participantes() {
  const { participantes, cargando, error, cargar, proximoNumero, generarCodigos, actualizarNotas, retirarParticipante, resetearCodigo } = useParticipantesAdmin()
  const { esInvestigador } = useAdminSession()

  const [busqueda, setBusqueda] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [showModalGenerar, setShowModalGenerar] = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)

  const filtrados = useMemo(() => {
    return participantes.filter(p => {
      if (busqueda && !p.codigo_participante.toLowerCase().includes(busqueda.toLowerCase())) return false
      if (filtroGrupo !== 'todos' && p.grupo !== filtroGrupo) return false
      if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false
      return true
    })
  }, [participantes, busqueda, filtroGrupo, filtroEstado])

  const resumen = useMemo(() => {
    const r = { total: participantes.length, experimental: 0, control: 0 }
    TODOS_ESTADOS.forEach(e => { r[e] = 0 })
    participantes.forEach(p => {
      r[p.grupo]++
      r[p.estado]++
    })
    return r
  }, [participantes])

  const exportarCSV = () => {
    const headers = 'Codigo,Grupo,Estado,Fecha_Generacion_Codigo,Fecha_Asignacion,Ultimo_Login'
    const rows = filtrados.map(p =>
      [
        p.codigo_participante,
        p.grupo,
        p.estado,
        p.fecha_generacion_codigo ?? '',
        p.fecha_asignacion ?? '',
        p.ultimo_login ?? '',
      ].join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `participantes_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Participantes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestión de códigos y seguimiento</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportarCSV}
            className="text-sm px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition">
            Exportar CSV
          </button>
          {esInvestigador && (
            <button onClick={() => setShowModalGenerar(true)}
              className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium">
              Generar códigos
            </button>
          )}
          <button onClick={cargar} disabled={cargando}
            className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-40 px-2">
            {cargando ? 'Cargando…' : '↻'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Cards resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', val: resumen.total, cls: 'bg-slate-50 border-slate-200' },
          { label: 'Sin asignar', val: resumen.codigo_generado, cls: 'bg-slate-50 border-slate-200' },
          { label: 'Asignados', val: resumen.codigo_asignado, cls: 'bg-blue-50 border-blue-200' },
          { label: 'Activos', val: resumen.activo, cls: 'bg-green-50 border-green-200' },
          { label: 'Retirados', val: resumen.retirado, cls: 'bg-red-50 border-red-200' },
          { label: 'Completados', val: resumen.completado, cls: 'bg-teal-50 border-teal-200' },
        ].map(({ label, val, cls }) => (
          <div key={label} className={`rounded-xl border p-3 ${cls}`}>
            <p className="text-2xl font-bold text-slate-800">{val}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-2xl font-bold text-indigo-700">{resumen.experimental}</p>
          <p className="text-xs text-indigo-500 mt-0.5">Experimental</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-2xl font-bold text-amber-700">{resumen.control}</p>
          <p className="text-xs text-amber-500 mt-0.5">Control</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar código…"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44"
        />
        <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="todos">Todos los grupos</option>
          <option value="experimental">Experimental</option>
          <option value="control">Control</option>
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="todos">Todos los estados</option>
          {TODOS_ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
        </select>
        {(busqueda || filtroGrupo !== 'todos' || filtroEstado !== 'todos') && (
          <button onClick={() => { setBusqueda(''); setFiltroGrupo('todos'); setFiltroEstado('todos') }}
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
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">No se encontraron participantes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Código</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Grupo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Asignación</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Último login</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{p.codigo_participante}</td>
                    <td className="px-4 py-3"><GrupoBadge grupo={p.grupo} /></td>
                    <td className="px-4 py-3"><EstadoBadge estado={p.estado} /></td>
                    <td className="px-4 py-3 text-slate-500">{fmtFecha(p.fecha_asignacion)}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtFecha(p.ultimo_login)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSeleccionado(p)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition">
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
          {filtrados.length} de {participantes.length} participante{participantes.length !== 1 ? 's' : ''}
        </div>
      </div>

      {showModalGenerar && (
        <ModalGenerarCodigos
          onClose={() => setShowModalGenerar(false)}
          onGenerar={generarCodigos}
          proximoNumero={proximoNumero}
        />
      )}

      {seleccionado && (
        <DrawerParticipante
          p={seleccionado}
          onClose={() => setSeleccionado(null)}
          onActualizarNotas={actualizarNotas}
          onRetirar={retirarParticipante}
          onResetear={resetearCodigo}
          esInvestigador={esInvestigador}
        />
      )}
    </div>
  )
}
