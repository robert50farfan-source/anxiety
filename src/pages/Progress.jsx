const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const weekData  = [3, 5, 2, 4, 3, 0, 1]   // anxiety level 0-10
const streakDays = [true, true, true, true, true, false, false]

const achievements = [
  { icon: '🌱', title: 'Primer ejercicio', desc: 'Completaste tu primer ejercicio', earned: true },
  { icon: '🔥', title: 'Racha de 5 días',  desc: '5 días consecutivos practicando', earned: true },
  { icon: '🧘', title: 'Maestro de la calma', desc: '20 ejercicios completados', earned: false },
  { icon: '🌊', title: 'Respiración experta', desc: '10 sesiones 4-7-8', earned: false },
]

const recentActivity = [
  { icon: '🫁', title: 'Respiración 4-7-8', date: 'Hoy, 10:30', duration: '8 min', mood: '😌' },
  { icon: '🌿', title: 'Grounding 5-4-3-2-1', date: 'Ayer, 20:15', duration: '4 min', mood: '🙂' },
  { icon: '🫁', title: 'Respiración 4-7-8', date: 'Hace 2 días', duration: '10 min', mood: '😐' },
]

function MoodBar({ value, max = 10 }) {
  const pct = (value / max) * 100
  const color = value <= 3 ? 'bg-green-400' : value <= 6 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div className="w-full h-20 bg-calm-100 rounded-xl relative overflow-hidden flex items-end">
        <div
          className={`w-full ${color} rounded-xl transition-all duration-700`}
          style={{ height: `${Math.max(pct, 4)}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">{value}</span>
    </div>
  )
}

export default function Progress() {
  return (
    <div className="px-5 pt-8 pb-4 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Mi progreso</h1>
        <p className="text-sm text-gray-500 mt-1">Semana del 27 abril - 3 mayo</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <span className="text-3xl font-bold text-calm-600">5</span>
          <p className="text-xs text-gray-400 mt-1">Días activos</p>
        </div>
        <div className="card text-center py-4">
          <span className="text-3xl font-bold text-ocean-500">12</span>
          <p className="text-xs text-gray-400 mt-1">Ejercicios</p>
        </div>
        <div className="card text-center py-4">
          <span className="text-3xl font-bold text-purple-500">48</span>
          <p className="text-xs text-gray-400 mt-1">Minutos</p>
        </div>
      </div>

      {/* Weekly mood chart */}
      <div className="card">
        <h2 className="section-title mb-4">Nivel de ansiedad semanal</h2>
        <div className="flex items-end gap-2">
          {weekDays.map((day, i) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <MoodBar value={weekData[i]} />
              <span className="text-xs text-gray-500 font-medium">{day}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-calm-100">
          {[['bg-green-400','Bajo (0-3)'],['bg-yellow-400','Medio (4-6)'],['bg-red-400','Alto (7+)']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${c}`} />
              <span className="text-xs text-gray-400">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Streak */}
      <div className="card">
        <h2 className="section-title mb-3">Racha actual</h2>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-4xl font-bold text-calm-600">5</span>
          <div>
            <p className="text-gray-700 font-medium">días consecutivos</p>
            <p className="text-xs text-gray-400">¡Sigue así!</p>
          </div>
          <span className="text-3xl ml-auto">🔥</span>
        </div>
        <div className="flex gap-2">
          {weekDays.map((day, i) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full aspect-square rounded-xl flex items-center justify-center
                ${streakDays[i] ? 'bg-calm-500 text-white' : 'bg-calm-100 text-gray-400'}`}>
                {streakDays[i] ? '✓' : ''}
              </div>
              <span className="text-xs text-gray-400">{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <h2 className="section-title mb-3">Logros</h2>
        <div className="grid grid-cols-2 gap-2">
          {achievements.map((a, i) => (
            <div
              key={i}
              className={`p-3 rounded-2xl flex flex-col gap-1 transition-all
                ${a.earned ? 'bg-calm-50 border border-calm-200' : 'bg-gray-50 opacity-50'}`}
            >
              <span className="text-2xl">{a.icon}</span>
              <p className="text-xs font-semibold text-gray-700">{a.title}</p>
              <p className="text-xs text-gray-400 leading-tight">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="section-title mb-3">Actividad reciente</h2>
        <div className="space-y-2">
          {recentActivity.map((act, i) => (
            <div key={i} className="card flex items-center gap-3">
              <span className="text-2xl w-10 h-10 bg-calm-50 rounded-xl flex items-center justify-center shrink-0">
                {act.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800">{act.title}</p>
                <p className="text-xs text-gray-400">{act.date} · {act.duration}</p>
              </div>
              <span className="text-xl">{act.mood}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
