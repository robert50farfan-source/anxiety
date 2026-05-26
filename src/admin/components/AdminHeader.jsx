import { useAdminSession } from '../hooks/useAdminSession'

const BADGE = {
  investigador: 'bg-indigo-100 text-indigo-700',
  tutora:       'bg-emerald-100 text-emerald-700',
}

export default function AdminHeader() {
  const { admin, cerrarSesion } = useAdminSession()

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div /> {/* espaciador izquierdo */}

      <div className="flex items-center gap-4">
        {admin && (
          <>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{admin.nombre_completo}</p>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                  BADGE[admin.rol] ?? 'bg-slate-100 text-slate-600'
                }`}
              >
                {admin.rol}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold select-none">
              {admin.nombre_completo.charAt(0).toUpperCase()}
            </div>

            <button
              onClick={() => cerrarSesion()}
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
            >
              <span>Cerrar sesión</span>
              <span>→</span>
            </button>
          </>
        )}
      </div>
    </header>
  )
}
