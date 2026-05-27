import { useAdminSession } from '../hooks/useAdminSession'

const BADGE = {
  investigador: 'bg-indigo-100 text-indigo-700',
  tutora:       'bg-emerald-100 text-emerald-700',
}

function IconMenu() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export default function AdminHeader({ onMenuClick }) {
  const { admin, cerrarSesion } = useAdminSession()

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      {/* Hamburger — solo visible en móvil */}
      <button
        onClick={onMenuClick}
        className="md:hidden text-slate-500 hover:text-slate-800 transition-colors p-1 -ml-1"
        aria-label="Abrir menú"
      >
        <IconMenu />
      </button>

      {/* Espaciador en desktop */}
      <div className="hidden md:block" />

      <div className="flex items-center gap-3 md:gap-4">
        {admin && (
          <>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-800">{admin.nombre_completo}</p>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                  BADGE[admin.rol] ?? 'bg-slate-100 text-slate-600'
                }`}
              >
                {admin.rol}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold select-none shrink-0">
              {admin.nombre_completo.charAt(0).toUpperCase()}
            </div>

            <button
              onClick={() => cerrarSesion()}
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
            >
              <span className="hidden sm:inline">Cerrar sesión</span>
              <span>→</span>
            </button>
          </>
        )}
      </div>
    </header>
  )
}
