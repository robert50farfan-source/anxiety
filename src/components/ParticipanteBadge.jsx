import { useState } from 'react'
import { useParticipante } from '../context/ParticipanteContext'

export default function ParticipanteBadge() {
  const { codigo, grupo, fechaInicio } = useParticipante()
  const [open, setOpen] = useState(false)
  if (!codigo) return null

  const fechaStr = fechaInicio
    ? new Date(fechaInicio).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Pendiente de inicio'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute top-3 right-3 z-40 bg-calm-600/90 backdrop-blur-sm
          text-white text-xs font-mono px-2.5 py-1 rounded-full shadow-md
          hover:bg-calm-700 active:scale-95 transition"
        aria-label="Ver información de participación"
      >
        {codigo}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40"
          onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-calm-800">Tu participación</h3>
              <button onClick={() => setOpen(false)}
                className="text-calm-400 hover:text-calm-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-calm-100">
                <span className="text-sm text-calm-600">Tu código</span>
                <span className="font-mono font-semibold text-calm-800">{codigo}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-calm-100">
                <span className="text-sm text-calm-600">Tu grupo</span>
                <span className="font-semibold text-calm-800">Has sido asignado al Grupo {grupo}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-calm-600">Inicio del estudio</span>
                <span className="text-sm text-calm-700">{fechaStr}</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-calm-600 text-white font-medium text-sm hover:bg-calm-700 transition">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
