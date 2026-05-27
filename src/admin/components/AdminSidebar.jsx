import { NavLink, useLocation } from 'react-router-dom'
import { useAdminSession } from '../hooks/useAdminSession'

const NAV = [
  { to: '/admin/dashboard',      label: 'Dashboard',          icono: '📊', activo: true  },
  { to: '/admin/participantes',  label: 'Participantes',       icono: '👥', activo: true  },
  { to: '/admin/profesionales',  label: 'Profesionales',       icono: '🏥', activo: true  },
  { to: '/admin/mediciones',     label: 'Mediciones',          icono: '📋', activo: true  },
  { to: '/admin/episodios',      label: 'Episodios',           icono: '📅', activo: true  },
  { to: '/admin/crisis',         label: 'Eventos de crisis',   icono: '🚨', activo: true  },
]

const CONFIG = [
  { to: '/admin/configuracion/administradores', label: 'Administradores', rolesRequeridos: ['investigador', 'tutora'] },
  { to: '/admin/configuracion/auditoria',       label: 'Auditoría',       rolesRequeridos: ['investigador']           },
]

export default function AdminSidebar({ open, onClose }) {
  const location = useLocation()
  const { esInvestigador } = useAdminSession()

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-56 bg-slate-800 flex flex-col
        transform transition-transform duration-200 ease-in-out
        md:static md:translate-x-0 md:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Brand + botón cerrar (solo móvil) */}
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            AnxietyApp
          </p>
          <p className="text-white font-semibold text-sm mt-0.5">Panel de Investigación</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-slate-400 hover:text-white transition-colors p-1"
          aria-label="Cerrar menú"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(item =>
          item.activo ? (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={linkClass}
            >
              <span>{item.icono}</span>
              {item.label}
            </NavLink>
          ) : (
            <div
              key={item.to}
              title="Próximamente"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-600 cursor-not-allowed select-none"
            >
              <span>{item.icono}</span>
              {item.label}
            </div>
          )
        )}

        {/* Configuración */}
        <div className="pt-4">
          <p className="px-3 pb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Configuración
          </p>
          {CONFIG.filter(c =>
            c.rolesRequeridos.includes(esInvestigador ? 'investigador' : 'tutora')
          ).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={linkClass}
            >
              ⚙️ {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  )
}
