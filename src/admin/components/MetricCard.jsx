export default function MetricCard({ titulo, valor, subtitulo, icono, color = 'indigo' }) {
  const colores = {
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  ring: 'ring-indigo-100'  },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   ring: 'ring-amber-100'   },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',    ring: 'ring-rose-100'    },
  }
  const c = colores[color] ?? colores.indigo

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{titulo}</p>
        <div className={`w-9 h-9 rounded-lg ${c.bg} ring-1 ${c.ring} flex items-center justify-center text-lg`}>
          {icono}
        </div>
      </div>

      <p className={`text-3xl font-bold tracking-tight ${valor === null ? 'text-slate-300' : 'text-slate-800'}`}>
        {valor === null ? '—' : valor.toLocaleString('es-PE')}
      </p>

      {subtitulo && (
        <p className="text-xs text-slate-400">{subtitulo}</p>
      )}
    </div>
  )
}
