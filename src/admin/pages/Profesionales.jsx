import { useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { useAdminSession } from '../hooks/useAdminSession'
import { useAuditoria } from '../hooks/useAuditoria'
import RequiereRol from '../components/RequiereRol'

// ── Constantes ────────────────────────────────────────────────────────
const DIAS = [
  { key: 'lun', label: 'Lun' }, { key: 'mar', label: 'Mar' },
  { key: 'mie', label: 'Mié' }, { key: 'jue', label: 'Jue' },
  { key: 'vie', label: 'Vie' }, { key: 'sab', label: 'Sáb' },
  { key: 'dom', label: 'Dom' },
]

const CANALES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'llamada',  label: 'Llamada telefónica' },
  { value: 'email',    label: 'Email' },
]

const FORM_VACIO = {
  nombre_completo: '', rol_profesional: '',
  telefono: '', whatsapp: '', email: '',
  canal_preferido: 'whatsapp',
  horario_atencion: '', dias_disponibles: [],
  hora_inicio: '', hora_fin: '',
  notas_internas: '',
}

// ── Helpers ───────────────────────────────────────────────────────────
function formatHora(t) { return t ? t.slice(0, 5) : '—' }

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const BADGE_CANAL = {
  llamada:  'bg-blue-100 text-blue-700',
  whatsapp: 'bg-green-100 text-green-700',
  email:    'bg-violet-100 text-violet-700',
}

// ── Componente formulario (modal) ─────────────────────────────────────
function ModalFormulario({ inicial, onGuardar, onCerrar, guardando }) {
  const [form, setForm]     = useState(inicial ?? FORM_VACIO)
  const [errores, setErrores] = useState({})

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
    setErrores(e => ({ ...e, [campo]: undefined, contacto: undefined }))
  }

  function toggleDia(dia) {
    set('dias_disponibles',
      form.dias_disponibles.includes(dia)
        ? form.dias_disponibles.filter(d => d !== dia)
        : [...form.dias_disponibles, dia]
    )
  }

  function validar() {
    const err = {}
    if (!form.nombre_completo.trim()) err.nombre_completo = 'Requerido'
    if (!form.rol_profesional.trim()) err.rol_profesional = 'Requerido'
    if (!form.telefono && !form.whatsapp && !form.email)
      err.contacto = 'Ingresa al menos un canal de contacto (teléfono, WhatsApp o email)'
    if (form.hora_inicio && form.hora_fin && form.hora_fin <= form.hora_inicio)
      err.hora_fin = 'La hora de fin debe ser posterior al inicio'
    setErrores(err)
    return Object.keys(err).length === 0
  }

  function submit(e) {
    e.preventDefault()
    if (validar()) onGuardar(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <h2 className="font-bold text-slate-800">
            {inicial ? 'Editar profesional' : 'Agregar profesional'}
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        {/* Cuerpo scrollable */}
        <form onSubmit={submit} className="overflow-y-auto px-5 py-4 space-y-5 flex-1">

          {/* Datos básicos */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Datos básicos</p>
            <Field label="Nombre completo *" error={errores.nombre_completo}>
              <input
                value={form.nombre_completo}
                onChange={e => set('nombre_completo', e.target.value)}
                className={input(errores.nombre_completo)}
                placeholder="Ej. Dra. María García"
              />
            </Field>
            <Field label="Rol profesional *" error={errores.rol_profesional}>
              <input
                value={form.rol_profesional}
                onChange={e => set('rol_profesional', e.target.value)}
                className={input(errores.rol_profesional)}
                placeholder="Ej. Psicóloga clínica"
              />
            </Field>
          </section>

          {/* Contacto */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contacto</p>
            {errores.contacto && (
              <p className="text-xs text-rose-600">{errores.contacto}</p>
            )}
            <Field label="Teléfono">
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                className={input()} placeholder="+591 7X XXX XXX" type="tel" />
            </Field>
            <Field label="WhatsApp">
              <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
                className={input()} placeholder="+591 7X XXX XXX" type="tel" />
            </Field>
            <Field label="Email">
              <input value={form.email} onChange={e => set('email', e.target.value)}
                className={input()} placeholder="profesional@universidad.edu" type="email" />
            </Field>
            <Field label="Canal preferido">
              <select value={form.canal_preferido} onChange={e => set('canal_preferido', e.target.value)}
                className={input()}>
                {CANALES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
          </section>

          {/* Disponibilidad */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Disponibilidad</p>
            <Field label="Horario visible al participante">
              <input value={form.horario_atencion} onChange={e => set('horario_atencion', e.target.value)}
                className={input()} placeholder="Lunes a viernes, 8:00 a 17:00" />
            </Field>

            <Field label="Días disponibles">
              <div className="flex gap-1.5 flex-wrap mt-1">
                {DIAS.map(d => (
                  <button
                    key={d.key} type="button"
                    onClick={() => toggleDia(d.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                      form.dias_disponibles.includes(d.key)
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-400'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Hora inicio">
                <input value={form.hora_inicio} onChange={e => set('hora_inicio', e.target.value)}
                  className={input()} type="time" />
              </Field>
              <Field label="Hora fin" error={errores.hora_fin}>
                <input value={form.hora_fin} onChange={e => set('hora_fin', e.target.value)}
                  className={input(errores.hora_fin)} type="time" />
              </Field>
            </div>
          </section>

          {/* Notas internas */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notas internas</p>
            <textarea
              value={form.notas_internas}
              onChange={e => set('notas_internas', e.target.value)}
              rows={3}
              className={`${input()} resize-none`}
              placeholder="Solo visible en el panel de administración"
            />
          </section>
        </form>

        {/* Footer con acciones */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 shrink-0">
          <button type="button" onClick={onCerrar}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={(e) => { e.preventDefault(); if (validar()) onGuardar(form) }}
            disabled={guardando}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Utilidades de estilo formulario
function Field({ label, children, error }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}
function input(error) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
    error ? 'border-rose-400' : 'border-slate-300'
  }`
}

// ── Página principal ──────────────────────────────────────────────────
export default function Profesionales() {
  const { admin }         = useAdminSession()
  const { registrar }     = useAuditoria()
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState(null)
  const [modal, setModal]       = useState(null) // null | 'nuevo' | { ...prof }
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true); setError(null)
    const { data, error: err } = await supabaseAdmin
      .from('profesionales_apoyo')
      .select('*')
      .order('orden_visualizacion', { ascending: true })
      .order('fecha_creacion',      { ascending: true })
    if (err) setError('No se pudo cargar la lista.')
    else setLista(data ?? [])
    setCargando(false)
  }

  async function guardar(form) {
    setGuardando(true)
    const esEdicion = modal !== 'nuevo' && modal?.id

    const payload = {
      nombre_completo:    form.nombre_completo.trim(),
      rol_profesional:    form.rol_profesional.trim(),
      telefono:           form.telefono.trim()  || null,
      whatsapp:           form.whatsapp.trim()  || null,
      email:              form.email.trim()     || null,
      canal_preferido:    form.canal_preferido,
      horario_atencion:   form.horario_atencion.trim() || null,
      dias_disponibles:   form.dias_disponibles,
      hora_inicio:        form.hora_inicio || null,
      hora_fin:           form.hora_fin    || null,
      notas_internas:     form.notas_internas.trim() || null,
    }

    if (esEdicion) {
      const { error: err } = await supabaseAdmin
        .from('profesionales_apoyo').update(payload).eq('id', modal.id)
      if (!err) {
        await registrar('editar_profesional', 'profesionales_apoyo', modal.id, { nombre: payload.nombre_completo })
        setModal(null); cargar()
      }
    } else {
      // Calcular siguiente orden_visualizacion
      const maxOrden = lista.reduce((m, p) => Math.max(m, p.orden_visualizacion ?? 0), -1)
      const { error: err } = await supabaseAdmin
        .from('profesionales_apoyo')
        .insert({ ...payload, orden_visualizacion: maxOrden + 1, creado_por: admin?.id })
      if (!err) {
        await registrar('crear_profesional', 'profesionales_apoyo', null, { nombre: payload.nombre_completo })
        setModal(null); cargar()
      }
    }
    setGuardando(false)
  }

  async function desactivar(prof) {
    await supabaseAdmin.from('profesionales_apoyo').update({ activo: false }).eq('id', prof.id)
    await registrar('desactivar_profesional', 'profesionales_apoyo', prof.id, { nombre: prof.nombre_completo })
    cargar()
  }

  async function reactivar(prof) {
    await supabaseAdmin.from('profesionales_apoyo').update({ activo: true }).eq('id', prof.id)
    await registrar('reactivar_profesional', 'profesionales_apoyo', prof.id, { nombre: prof.nombre_completo })
    cargar()
  }

  async function mover(id, direccion) {
    const idx     = lista.findIndex(p => p.id === id)
    const swapIdx = direccion === 'arriba' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= lista.length) return

    const a = lista[idx]; const b = lista[swapIdx]
    await Promise.all([
      supabaseAdmin.from('profesionales_apoyo').update({ orden_visualizacion: b.orden_visualizacion }).eq('id', a.id),
      supabaseAdmin.from('profesionales_apoyo').update({ orden_visualizacion: a.orden_visualizacion }).eq('id', b.id),
    ])
    cargar()
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Profesionales de apoyo</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Se muestran a los participantes en la pantalla de crisis
          </p>
        </div>
        <RequiereRol roles={['investigador']}>
          <button
            onClick={() => setModal('nuevo')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            + Agregar profesional
          </button>
        </RequiereRol>
      </div>

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Tabla */}
      {cargando ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🏥</p>
          <p className="font-medium text-slate-600">Sin profesionales registrados</p>
          <p className="text-sm mt-1">Agrega el primero para que aparezca en la pantalla de crisis</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Orden</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Profesional</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Canal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Horario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map((prof, idx) => (
                <tr key={prof.id} className="hover:bg-slate-50 transition-colors">
                  {/* Flechas de reordenamiento */}
                  <td className="px-4 py-3">
                    <RequiereRol roles={['investigador']}>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => mover(prof.id, 'arriba')}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs leading-none"
                          title="Subir"
                        >▲</button>
                        <button
                          onClick={() => mover(prof.id, 'abajo')}
                          disabled={idx === lista.length - 1}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs leading-none"
                          title="Bajar"
                        >▼</button>
                      </div>
                    </RequiereRol>
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{prof.nombre_completo}</p>
                    <p className="text-xs text-slate-400">{prof.rol_profesional}</p>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${BADGE_CANAL[prof.canal_preferido]}`}>
                      {prof.canal_preferido}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {prof.horario_atencion
                      ? prof.horario_atencion
                      : prof.hora_inicio && prof.hora_fin
                        ? `${formatHora(prof.hora_inicio)}–${formatHora(prof.hora_fin)}`
                        : '—'}
                  </td>

                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${prof.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {prof.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <RequiereRol roles={['investigador']}>
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => setModal(prof)}
                          className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                        >
                          Editar
                        </button>
                        {prof.activo ? (
                          <button
                            onClick={() => desactivar(prof)}
                            className="text-xs text-rose-500 hover:text-rose-700 transition-colors"
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            onClick={() => reactivar(prof)}
                            className="text-xs text-emerald-500 hover:text-emerald-700 transition-colors"
                          >
                            Reactivar
                          </button>
                        )}
                      </div>
                    </RequiereRol>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal agregar/editar */}
      {modal && (
        <ModalFormulario
          inicial={modal === 'nuevo' ? null : modal}
          onGuardar={guardar}
          onCerrar={() => setModal(null)}
          guardando={guardando}
        />
      )}
    </div>
  )
}
