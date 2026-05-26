import { useParticipante } from '../context/ParticipanteContext'

const tabs = [
  {
    id: 'home',
    label: 'Inicio',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z" />
      </svg>
    )
  },
  {
    id: 'exercises',
    label: 'Ejercicios',
    restricted: true,
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 3a9 9 0 100 18A9 9 0 0012 3zm0 0v9m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
  },
  {
    id: 'chat',
    label: 'Chat',
    restricted: true,
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    )
  },
  {
    id: 'progress',
    label: 'Mi progreso',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    )
  }
]

export default function BottomNav({ current, onChange }) {
  const { esExperimental } = useParticipante()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md
                    bg-white/90 backdrop-blur-md border-t border-calm-100
                    flex items-stretch safe-bottom z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      {tabs.map(tab => {
        const active = current === tab.id
        const bloqueado = tab.restricted && !esExperimental
        return (
          <button
            key={tab.id}
            onClick={() => { if (!bloqueado) onChange(tab.id) }}
            className={`nav-btn flex-1 ${active ? 'active' : ''} ${bloqueado ? 'opacity-40 cursor-default' : ''}`}
            aria-label={tab.label}
            aria-disabled={bloqueado}
          >
            <span className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
              {tab.icon(active)}
            </span>
            <span className={`transition-all duration-200 ${active ? 'text-calm-600 font-semibold' : ''}`}>
              {tab.label}
            </span>
            {active && !bloqueado && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-calm-500 rounded-full" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
