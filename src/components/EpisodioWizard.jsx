import { useState } from 'react'
import { useEpisodios, intensidadDesdeNumero, ESTRATEGIA_LABEL } from '../hooks/useEpisodios'

const INTENSIDAD_LABEL = (n) => {
  if (n === 1)  return 'Muy leve — apenas perceptible'
  if (n <= 3)   return 'Leve — incómodo pero manejable'
  if (n <= 5)   return 'Moderada — claramente presente'
  if (n === 6)  return 'Moderada-alta — difícil concentrarse'
  if (n <= 8)   return 'Severa — muy difícil funcionar'
  return 'Muy severa — incapacitante'
}

const CONTEXTO_OPCIONES = [
  { value: 'casa',          label: 'Casa' },
  { value: 'aula',          label: 'Aula' },
  { value: 'examen',        label: 'Examen' },
  { value: 'laboratorio',   label: 'Laboratorio' },
  { value: 'transporte',    label: 'Transporte' },
  { value: 'social',        label: 'Situación social' },
  { value: 'trabajo',       label: 'Trabajo' },
  { value: 'otro',          label: 'Otro' },
  { value: 'no_especifica', label: 'Prefiero no decir' },
]

const SINTOMAS_FISICOS_OPCIONES = [
  { value: 'palpitaciones',      label: 'Palpitaciones' },
  { value: 'sudoración',         label: 'Sudoración' },
  { value: 'mareo',              label: 'Mareo' },
  { value: 'falta_de_aire',      label: 'Falta de aire' },
  { value: 'temblor',            label: 'Temblor' },
  { value: 'náusea',             label: 'Náusea' },
  { value: 'tensión_muscular',   label: 'Tensión muscular' },
  { value: 'dolor_de_pecho',     label: 'Dolor de pecho' },
  { value: 'hormigueo',          label: 'Hormigueo' },
  { value: 'otro_fisico',        label: 'Otro' },
]

const SINTOMAS_EMOCIONALES_OPCIONES = [
  { value: 'preocupación_intensa',      label: 'Preocupación intensa' },
  { value: 'miedo',                     label: 'Miedo' },
  { value: 'irritabilidad',             label: 'Irritabilidad' },
  { value: 'sensación_de_irrealidad',   label: 'Sensación de irrealidad' },
  { value: 'miedo_a_perder_control',    label: 'Miedo a perder el control' },
  { value: 'miedo_a_morir',             label: 'Miedo a morir' },
  { value: 'otro_emocional',            label: 'Otro' },
]

const ESTRATEGIAS_EXP = [
  'respiracion_478', 'grounding_54321', 'relajacion_muscular', 'mindfulness',
  'visualizacion_guiada', 'chat_ia', 'contacto_profesional', 'contacto_personal', 'otra', 'nada',
]

const ESTRATEGIAS_CTR = [
  'respiro_solo', 'distraccion', 'hable_alguien', 'espere', 'busque_informacion',
  'contacto_profesional', 'contacto_personal', 'otra', 'nada',
]

const EFECTIVIDAD_LABEL = { 1: 'Nada', 2: 'Poco', 3: 'Algo', 4: 'Bastante', 5: 'Mucho' }

function Chip({ active, onClick, children, color = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95
        ${active
          ? `bg-indigo-600 text-white border-indigo-600 ${color}`
          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
    >
      {children}
    </button>
  )
}

export default function EpisodioWizard({ onClose, initialData = null, initialPaso = 1, prefilledEstrategia = null, esExperimental = false }) {
  const { guardarEpisodio, saveDraftRef, clearDraft } = useEpisodios()

  const [form, setForm] = useState({
    id: initialData?.id ?? crypto.randomUUID(),
    paso: initialPaso,
    tipo_evento: initialData?.tipo_evento ?? null,
    fecha_inicio: initialData?.fecha_inicio ?? null,
    intensidad_numerica: initialData?.intensidad_numerica ?? 5,
    duracion_minutos: initialData?.duracion_minutos ?? null,
    en_curso: initialData?.en_curso ?? false,
    contexto: initialData?.contexto ?? null,
    contexto_otro: initialData?.contexto_otro ?? '',
    desencadenante: initialData?.desencadenante ?? '',
    sintomas_fisicos: initialData?.sintomas_fisicos ?? [],
    sintomas_emocionales: initialData?.sintomas_emocionales ?? [],
    estrategias_aplicadas: initialData?.estrategias_aplicadas ?? (prefilledEstrategia ? [prefilledEstrategia] : []),
    efectividad_estrategia: initialData?.efectividad_estrategia ?? null,
    notas: initialData?.notas ?? '',
  })

  const [timeMode, setTimeMode] = useState(null)
  const [horaInput, setHoraInput] = useState('')
  const [datetimeInput, setDatetimeInput] = useState('')
  const [otroFisicoInput, setOtroFisicoInput] = useState('')
  const [otroEmocionalInput, setOtroEmocionalInput] = useState('')
  const [otraEstrategiaInput, setOtraEstrategiaInput] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [confirmandoClose, setConfirmandoClose] = useState(false)

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const autoGuardar = async (campos = {}) => {
    const payload = {
      id: form.id,
      tipo_evento: form.tipo_evento ?? 'ansiedad',
      fecha_inicio: form.fecha_inicio ?? new Date().toISOString(),
      intensidad_numerica: form.intensidad_numerica,
      intensidad: intensidadDesdeNumero(form.intensidad_numerica),
      duracion_minutos: form.en_curso ? null : form.duracion_minutos,
      en_curso: form.en_curso,
      contexto: form.contexto ?? 'no_especifica',
      contexto_otro: form.contexto_otro,
      desencadenante: form.desencadenante || null,
      sintomas_fisicos: form.sintomas_fisicos,
      sintomas_emocionales: form.sintomas_emocionales,
      estrategias_aplicadas: form.estrategias_aplicadas,
      efectividad_estrategia: form.efectividad_estrategia,
      notas: form.notas || null,
      completado: false,
      paso_actual: form.paso,
      ...campos,
    }
    await guardarEpisodio(payload)
    saveDraftRef(form.id, form.paso)
  }

  const irPaso = async (nuevoPaso) => {
    await autoGuardar({ paso_actual: nuevoPaso })
    setForm(f => ({ ...f, paso: nuevoPaso }))
  }

  const handleBack = () => {
    if (form.paso === 1) {
      // Confirmar si hay datos
      if (form.tipo_evento || form.fecha_inicio) {
        setConfirmandoClose(true)
      } else {
        onClose()
      }
    } else {
      setForm(f => ({ ...f, paso: f.paso - 1 }))
    }
  }

  const handleFechaChip = (modo) => {
    setTimeMode(modo)
    const ahora = new Date()
    if (modo === 'ahora') {
      setField('fecha_inicio', ahora.toISOString())
    } else if (modo === 'menos1h') {
      setField('fecha_inicio', new Date(ahora - 30 * 60000).toISOString())
    } else {
      setField('fecha_inicio', null) // esperar input
    }
  }

  const handleHoraInput = (val) => {
    setHoraInput(val)
    if (val) {
      const [h, m] = val.split(':').map(Number)
      const d = new Date()
      d.setHours(h, m, 0, 0)
      setField('fecha_inicio', d.toISOString())
    }
  }

  const handleDatetimeInput = (val) => {
    setDatetimeInput(val)
    if (val) setField('fecha_inicio', new Date(val).toISOString())
  }

  const toggleSintomaFisico = (val) => {
    if (val === 'otro_fisico') {
      setForm(f => {
        const tiene = f.sintomas_fisicos.includes('otro_fisico')
        if (tiene) {
          return { ...f, sintomas_fisicos: f.sintomas_fisicos.filter(s => s !== 'otro_fisico') }
        }
        return { ...f, sintomas_fisicos: [...f.sintomas_fisicos, 'otro_fisico'] }
      })
    } else {
      setForm(f => {
        const tiene = f.sintomas_fisicos.includes(val)
        return { ...f, sintomas_fisicos: tiene ? f.sintomas_fisicos.filter(s => s !== val) : [...f.sintomas_fisicos, val] }
      })
    }
  }

  const agregarOtroFisico = () => {
    if (!otroFisicoInput.trim()) return
    setForm(f => ({
      ...f,
      sintomas_fisicos: [...f.sintomas_fisicos.filter(s => s !== 'otro_fisico'), otroFisicoInput.trim()]
    }))
    setOtroFisicoInput('')
  }

  const toggleSintomaEmocional = (val) => {
    if (val === 'otro_emocional') {
      setForm(f => {
        const tiene = f.sintomas_emocionales.includes('otro_emocional')
        return { ...f, sintomas_emocionales: tiene ? f.sintomas_emocionales.filter(s => s !== 'otro_emocional') : [...f.sintomas_emocionales, 'otro_emocional'] }
      })
    } else {
      setForm(f => {
        const tiene = f.sintomas_emocionales.includes(val)
        return { ...f, sintomas_emocionales: tiene ? f.sintomas_emocionales.filter(s => s !== val) : [...f.sintomas_emocionales, val] }
      })
    }
  }

  const agregarOtroEmocional = () => {
    if (!otroEmocionalInput.trim()) return
    setForm(f => ({
      ...f,
      sintomas_emocionales: [...f.sintomas_emocionales.filter(s => s !== 'otro_emocional'), otroEmocionalInput.trim()]
    }))
    setOtroEmocionalInput('')
  }

  const toggleEstrategia = (val) => {
    setForm(f => {
      if (val === 'nada') {
        const tiene = f.estrategias_aplicadas.includes('nada')
        return { ...f, estrategias_aplicadas: tiene ? [] : ['nada'] }
      }
      const tiene = f.estrategias_aplicadas.includes(val)
      const nuevas = tiene
        ? f.estrategias_aplicadas.filter(s => s !== val)
        : [...f.estrategias_aplicadas.filter(s => s !== 'nada'), val]
      return { ...f, estrategias_aplicadas: nuevas }
    })
  }

  const agregarOtraEstrategia = () => {
    if (!otraEstrategiaInput.trim()) return
    setForm(f => ({
      ...f,
      estrategias_aplicadas: [...f.estrategias_aplicadas.filter(s => s !== 'otra'), otraEstrategiaInput.trim()]
    }))
    setOtraEstrategiaInput('')
  }

  const handleGuardarBorrador = async () => {
    setGuardando(true)
    await autoGuardar({ completado: false })
    setGuardando(false)
    clearDraft()
    onClose()
  }

  const handleFinalizar = async () => {
    setGuardando(true)
    const ahora = new Date().toISOString()
    await autoGuardar({ completado: true, fecha_completado: ahora })
    clearDraft()
    setGuardando(false)
    setConfirmado(true)
  }

  const estrategiasDisponibles = esExperimental ? ESTRATEGIAS_EXP : ESTRATEGIAS_CTR
  const tieneEstrategiaReal = form.estrategias_aplicadas.length > 0 && !form.estrategias_aplicadas.every(s => s === 'nada')

  // Pantalla de confirmación
  if (confirmado) {
    return (
      <div className="fixed inset-0 z-50 bg-calm-50 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Episodio registrado</h2>
          <p className="text-sm text-gray-500">Tu episodio ha sido guardado. Registrar tus experiencias te ayuda a entender tus patrones de ansiedad.</p>
        </div>
        <button
          onClick={() => onClose({ completado: true, id: form.id })}
          className="w-full max-w-xs py-3.5 bg-indigo-600 text-white rounded-2xl font-semibold text-sm active:scale-95 transition-all"
        >
          Ver mis episodios
        </button>
      </div>
    )
  }

  // Modal confirmación cierre
  const ModalConfirmClose = () => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl mx-4">
        <h3 className="font-semibold text-gray-800 mb-2">¿Salir del registro?</h3>
        <p className="text-sm text-gray-500 mb-4">Los datos no guardados se perderán. ¿Deseas salir de todas formas?</p>
        <div className="flex gap-2">
          <button onClick={() => setConfirmandoClose(false)}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">
            Continuar
          </button>
          <button onClick={() => onClose()}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">
            Salir
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-calm-50 flex flex-col">
      {confirmandoClose && <ModalConfirmClose />}

      {/* Barra de progreso */}
      <div className="h-1 bg-calm-100">
        <div
          className="h-1 bg-indigo-500 transition-all duration-300"
          style={{ width: `${(form.paso / 5) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-calm-200 bg-white shrink-0">
        <button
          type="button"
          onClick={handleBack}
          className="text-gray-500 hover:text-gray-700 transition-colors p-1 -ml-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="font-semibold text-gray-800 text-sm">Registrar episodio</p>
        </div>
        <span className="text-xs text-gray-400 font-medium">{form.paso}/5</span>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">

        {/* PASO 1 — Lo básico */}
        {form.paso === 1 && (
          <>
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">¿Qué tipo de episodio fue?</h2>
              <p className="text-sm text-gray-500">Selecciona lo que mejor lo describe</p>
            </div>

            <div className="space-y-3">
              {[
                { value: 'ansiedad', title: 'Ansiedad', desc: 'Episodio de ansiedad, nerviosismo o preocupación intensa', icon: '😰' },
                { value: 'ataque_panico', title: 'Ataque de pánico', desc: 'Episodio intenso y repentino de miedo con síntomas físicos fuertes', icon: '😱' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField('tipo_evento', opt.value)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98]
                    ${form.tipo_evento === opt.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-calm-200 bg-white hover:border-indigo-200'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-800">{opt.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-3">¿Cuándo empezó?</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'ahora', label: 'Ahora mismo' },
                  { id: 'menos1h', label: 'Hace menos de 1 hora' },
                  { id: 'hoy', label: 'Hoy más temprano' },
                  { id: 'otro', label: 'Otro día' },
                ].map(op => (
                  <Chip
                    key={op.id}
                    active={timeMode === op.id}
                    onClick={() => handleFechaChip(op.id)}
                  >
                    {op.label}
                  </Chip>
                ))}
              </div>

              {timeMode === 'hoy' && (
                <div className="mt-3">
                  <input
                    type="time"
                    value={horaInput}
                    onChange={e => handleHoraInput(e.target.value)}
                    className="w-full rounded-xl border border-calm-200 bg-white px-3 py-2.5 text-sm text-gray-700
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                </div>
              )}
              {timeMode === 'otro' && (
                <div className="mt-3">
                  <input
                    type="datetime-local"
                    value={datetimeInput}
                    onChange={e => handleDatetimeInput(e.target.value)}
                    className="w-full rounded-xl border border-calm-200 bg-white px-3 py-2.5 text-sm text-gray-700
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!form.tipo_evento || !form.fecha_inicio}
              onClick={() => irPaso(2)}
              className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95
                ${form.tipo_evento && form.fecha_inicio
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              Siguiente
            </button>
          </>
        )}

        {/* PASO 2 — Intensidad y duración */}
        {form.paso === 2 && (
          <>
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">¿Qué tan intenso fue?</h2>
              <p className="text-sm text-gray-500">Ajusta el nivel de 1 a 10</p>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-calm-200 p-5 space-y-4">
                <div className="text-center">
                  <span className="text-4xl font-bold text-gray-800">{form.intensidad_numerica}</span>
                  <span className="text-gray-400 text-lg">/10</span>
                  <p className="text-sm text-gray-600 mt-1">{INTENSIDAD_LABEL(form.intensidad_numerica)}</p>
                </div>

                <input
                  type="range"
                  min={1}
                  max={10}
                  value={form.intensidad_numerica}
                  onChange={e => setField('intensidad_numerica', Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />

                {/* Marcas de color */}
                <div className="flex gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <div
                      key={n}
                      className="flex-1 h-1.5 rounded-full"
                      style={{
                        backgroundColor: n <= 3 ? '#22c55e' : n <= 6 ? '#f59e0b' : '#ef4444',
                        opacity: form.intensidad_numerica >= n ? 1 : 0.25,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span className="text-green-600">Leve</span>
                  <span className="text-amber-500">Moderada</span>
                  <span className="text-red-500">Severa</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-calm-200 p-5 space-y-3">
                <h3 className="font-semibold text-gray-700">Duración</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    placeholder="Minutos"
                    value={form.duracion_minutos ?? ''}
                    disabled={form.en_curso}
                    onChange={e => setField('duracion_minutos', e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 rounded-xl border border-calm-200 bg-calm-50 px-3 py-2.5
                               text-sm text-gray-700 placeholder-gray-400 disabled:opacity-40
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500 shrink-0">minutos</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.en_curso}
                    onChange={e => {
                      setField('en_curso', e.target.checked)
                      if (e.target.checked) setField('duracion_minutos', null)
                    }}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-sm text-gray-600">Aún en curso</span>
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={() => irPaso(3)}
              className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-semibold text-sm
                         shadow-md shadow-indigo-200 active:scale-95 transition-all"
            >
              Siguiente
            </button>
          </>
        )}

        {/* PASO 3 — Contexto */}
        {form.paso === 3 && (
          <>
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">¿Dónde estabas?</h2>
              <p className="text-sm text-gray-500">Contexto del episodio (opcional)</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {CONTEXTO_OPCIONES.map(op => (
                <Chip
                  key={op.value}
                  active={form.contexto === op.value}
                  onClick={() => setField('contexto', op.value)}
                >
                  {op.label}
                </Chip>
              ))}
            </div>

            {form.contexto === 'otro' && (
              <input
                type="text"
                value={form.contexto_otro}
                onChange={e => setField('contexto_otro', e.target.value)}
                placeholder="Describe el lugar..."
                className="w-full rounded-xl border border-calm-200 bg-white px-3 py-2.5 text-sm text-gray-700
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            )}

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">¿Qué lo desencadenó?</h3>
              <textarea
                value={form.desencadenante}
                onChange={e => setField('desencadenante', e.target.value)}
                placeholder="¿Qué crees que lo desencadenó? (opcional)"
                rows={3}
                className="w-full resize-none rounded-xl border border-calm-200 bg-white px-3 py-2.5
                           text-sm text-gray-700 placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => irPaso(4)}
                className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-sm active:scale-95 transition-all"
              >
                Saltar
              </button>
              <button
                type="button"
                onClick={() => irPaso(4)}
                className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-semibold text-sm
                           shadow-md shadow-indigo-200 active:scale-95 transition-all"
              >
                Siguiente
              </button>
            </div>
          </>
        )}

        {/* PASO 4 — Síntomas */}
        {form.paso === 4 && (
          <>
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">Síntomas</h2>
              <p className="text-sm text-gray-500">Marca los que experimentaste (opcional)</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Síntomas físicos</h3>
              <div className="flex flex-wrap gap-2">
                {SINTOMAS_FISICOS_OPCIONES.map(op => (
                  <Chip
                    key={op.value}
                    active={form.sintomas_fisicos.includes(op.value)}
                    onClick={() => toggleSintomaFisico(op.value)}
                  >
                    {op.label}
                  </Chip>
                ))}
              </div>
              {form.sintomas_fisicos.includes('otro_fisico') && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={otroFisicoInput}
                    onChange={e => setOtroFisicoInput(e.target.value)}
                    placeholder="Describe el síntoma..."
                    className="flex-1 rounded-xl border border-calm-200 bg-white px-3 py-2 text-sm text-gray-700
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                  <button type="button" onClick={agregarOtroFisico}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium">
                    +
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Síntomas emocionales</h3>
              <div className="flex flex-wrap gap-2">
                {SINTOMAS_EMOCIONALES_OPCIONES.map(op => (
                  <Chip
                    key={op.value}
                    active={form.sintomas_emocionales.includes(op.value)}
                    onClick={() => toggleSintomaEmocional(op.value)}
                  >
                    {op.label}
                  </Chip>
                ))}
              </div>
              {form.sintomas_emocionales.includes('otro_emocional') && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={otroEmocionalInput}
                    onChange={e => setOtroEmocionalInput(e.target.value)}
                    placeholder="Describe el síntoma..."
                    className="flex-1 rounded-xl border border-calm-200 bg-white px-3 py-2 text-sm text-gray-700
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                  <button type="button" onClick={agregarOtroEmocional}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium">
                    +
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => irPaso(5)}
                className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-sm active:scale-95 transition-all"
              >
                Saltar
              </button>
              <button
                type="button"
                onClick={() => irPaso(5)}
                className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-semibold text-sm
                           shadow-md shadow-indigo-200 active:scale-95 transition-all"
              >
                Siguiente
              </button>
            </div>
          </>
        )}

        {/* PASO 5 — Estrategias y cierre */}
        {form.paso === 5 && (
          <>
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">¿Qué hiciste?</h2>
              <p className="text-sm text-gray-500">Estrategias que aplicaste</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {estrategiasDisponibles.map(s => (
                <Chip
                  key={s}
                  active={form.estrategias_aplicadas.includes(s)}
                  onClick={() => toggleEstrategia(s)}
                >
                  {ESTRATEGIA_LABEL[s] ?? s}
                </Chip>
              ))}
            </div>

            {form.estrategias_aplicadas.includes('otra') && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={otraEstrategiaInput}
                  onChange={e => setOtraEstrategiaInput(e.target.value)}
                  placeholder="¿Cuál otra estrategia?"
                  className="flex-1 rounded-xl border border-calm-200 bg-white px-3 py-2 text-sm text-gray-700
                             focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
                <button type="button" onClick={agregarOtraEstrategia}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium">
                  +
                </button>
              </div>
            )}

            {tieneEstrategiaReal && (
              <div className="bg-white rounded-2xl border border-calm-200 p-5 space-y-3">
                <h3 className="font-semibold text-gray-700">¿Qué tan efectiva fue?</h3>
                <div className="flex justify-between text-xs text-gray-500">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={`font-medium ${form.efectividad_estrategia === n ? 'text-indigo-600' : ''}`}>
                      {EFECTIVIDAD_LABEL[n]}
                    </span>
                  ))}
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={form.efectividad_estrategia ?? 3}
                  onChange={e => setField('efectividad_estrategia', Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="text-center text-sm text-gray-600 font-medium">
                  {EFECTIVIDAD_LABEL[form.efectividad_estrategia ?? 3]}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Notas adicionales</h3>
              <textarea
                value={form.notas}
                onChange={e => setField('notas', e.target.value)}
                placeholder="¿Algo más que quieras recordar? (opcional)"
                rows={3}
                className="w-full resize-none rounded-xl border border-calm-200 bg-white px-3 py-2.5
                           text-sm text-gray-700 placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>

            <div className="space-y-2 pb-4">
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={guardando}
                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-semibold text-sm
                           shadow-md shadow-indigo-200 active:scale-95 transition-all disabled:opacity-60"
              >
                {guardando ? 'Guardando…' : 'Finalizar'}
              </button>
              <button
                type="button"
                onClick={handleGuardarBorrador}
                disabled={guardando}
                className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-sm
                           active:scale-95 transition-all disabled:opacity-60"
              >
                Guardar como borrador
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
