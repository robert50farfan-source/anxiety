import { useAuth } from '../context/AuthContext'
import { useProfesionales } from '../hooks/useProfesionales'
import { useCrisisLogger } from '../hooks/useCrisisLogger'

const DIAS_MAP = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']

const CANAL = {
  llamada:  { label: 'Llamar a',    icono: '📞', clase: 'bg-blue-500 text-white shadow-blue-200' },
  whatsapp: { label: 'WhatsApp a',  icono: '💬', clase: 'bg-green-500 text-white shadow-green-200' },
  email:    { label: 'Email a',     icono: '✉️', clase: 'bg-violet-500 text-white shadow-violet-200' },
}

function formatHora(t) {
  return t ? t.slice(0, 5) : ''
}

function estaEnHorario(prof) {
  const { hora_inicio, hora_fin, dias_disponibles } = prof
  if (!hora_inicio || !hora_fin || !dias_disponibles?.length) return true

  const now     = new Date()
  const hoy     = DIAS_MAP[now.getDay()]
  if (!dias_disponibles.includes(hoy)) return false

  const [h1, m1] = hora_inicio.split(':').map(Number)
  const [h2, m2] = hora_fin.split(':').map(Number)
  const minActual = now.getHours() * 60 + now.getMinutes()
  return minActual >= h1 * 60 + m1 && minActual <= h2 * 60 + m2
}

function buildUrl(prof) {
  const msg = encodeURIComponent(
    'Hola, soy un participante de la investigación de ansiedad y necesito apoyo.'
  )
  switch (prof.canal_preferido) {
    case 'llamada':
      return `tel:${prof.telefono?.replace(/\D/g, '')}`
    case 'whatsapp':
      return `https://wa.me/${prof.whatsapp?.replace(/\D/g, '')}?text=${msg}`
    case 'email':
      return `mailto:${prof.email}?subject=${encodeURIComponent('Apoyo — investigación de ansiedad')}`
    default:
      return '#'
  }
}

export default function ProfesionalesApoyo() {
  const { userId }            = useAuth()
  const { profesionales, cargando } = useProfesionales()
  const { registrar }         = useCrisisLogger(userId)

  if (cargando || profesionales.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-0.5">
        Profesionales de apoyo
      </p>

      {profesionales.map(prof => {
        const enHorario = estaEnHorario(prof)
        const canal     = CANAL[prof.canal_preferido] ?? CANAL.llamada
        const url       = buildUrl(prof)
        const externo   = prof.canal_preferido !== 'llamada'

        return (
          <div
            key={prof.id}
            className={`rounded-2xl border p-3 space-y-2 transition-opacity ${
              enHorario
                ? 'bg-white border-calm-200'
                : 'bg-gray-50 border-gray-200 opacity-70'
            }`}
          >
            <div>
              <p className="font-semibold text-gray-800 text-sm leading-snug">
                {prof.nombre_completo}
              </p>
              <p className="text-xs text-gray-500">{prof.rol_profesional}</p>

              {prof.horario_atencion && (
                <p className="text-xs text-gray-400 mt-0.5">🕐 {prof.horario_atencion}</p>
              )}

              {!enHorario && (
                <p className="text-xs text-amber-600 font-medium mt-1">
                  Fuera de horario
                  {prof.horario_atencion
                    ? ` — disponible: ${prof.horario_atencion}`
                    : prof.hora_inicio && prof.hora_fin
                      ? ` — disponible: ${formatHora(prof.hora_inicio)}–${formatHora(prof.hora_fin)}`
                      : ''}
                </p>
              )}
            </div>

            <a
              href={url}
              target={externo ? '_blank' : undefined}
              rel={externo ? 'noopener noreferrer' : undefined}
              onClick={() =>
                registrar('contacto_profesional_apoyo', prof.id, {
                  canal: prof.canal_preferido,
                })
              }
              className={`w-full py-2.5 rounded-xl text-sm font-semibold
                         flex items-center justify-center gap-1.5
                         active:scale-95 transition-transform shadow-md
                         ${canal.clase}`}
            >
              <span className="text-base leading-none">{canal.icono}</span>
              {canal.label} {prof.nombre_completo}
            </a>
          </div>
        )
      })}
    </div>
  )
}
