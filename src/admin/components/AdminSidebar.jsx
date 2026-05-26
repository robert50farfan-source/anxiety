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

export default function AdminSidebar() {
  const location = useLocation()
  const { esInvestigador } = useAdminSession()
  const enConfig = location.pathname.startsWith('/admin/configuracion')

  return (
    <aside className="w-56 min-h-screen bg-slate-800 flex flex-col">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          AnxietyApp
        </p>
        <p className="text-white font-semibold text-sm mt-0.5">Panel de Investigación</p>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(item =>
          item.activo ? (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
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
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              ⚙️ {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  )
}
