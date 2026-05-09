import { useProgressData, TECNICA } from '../hooks/useProgressData'

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return <div className={`bg-gray-200 rounded-xl animate-pulse ${className}`} />
}

function StatCard({ value, label, color }) {
  return (
    <div className="card text-center py-4">
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  )
}

// Mood bar: height and color based on avg mood (1–5)
// Higher mood → taller green bar; null → empty placeholder
function MoodBar({ moodAvg, dayLabel }) {
  const pct   = moodAvg ? (moodAvg / 5) * 100 : 0
  const color = !moodAvg        ? 'bg-gray-200'
              : moodAvg >= 4    ? 'bg-calm-400'
              : moodAvg >= 2.5  ? 'bg-yellow-400'
              :                   'bg-red-400'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-full h-20 bg-calm-50 rounded-xl overflow-hidden flex items-end">
        {pct > 0 && (
          <div
            className={`w-full ${color} rounded-xl transition-all duration-700`}
            style={{ height: `${Math.max(pct, 6)}%` }}
          />
        )}
      </div>
      <span className="text-[10px] text-gray-400 font-medium">
        {moodAvg ? moodAvg.toFixed(1) : '—'}
      </span>
      <span className="text-xs text-gray-500 font-semibold">{dayLabel}</span>
    </div>
  )
}

function AchievementCard({ icon, title, desc, earned, progress, total }) {
  return (
    <div className={`p-3 rounded-2xl flex flex-col gap-1.5 transition-all
                     ${earned ? 'bg-calm-50 border border-calm-200' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-2xl ${earned ? '' : 'grayscale opacity-40'}`}>{icon}</span>
        {earned && (
          <span className="text-[10px] font-bold text-calm-600 bg-calm-100 px-1.5 py-0.5 rounded-full">
            ✓
          </span>
        )}
      </div>
      <p className={`text-xs font-semibold ${earned ? 'text-gray-700' : 'text-gray-400'}`}>
        {title}
      </p>
      <p className="text-[10px] text-gray-400 leading-tight">{desc}</p>
      {!earned && total && (
        <div className="mt-1">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-calm-400 rounded-full transition-all duration-700"
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{progress}/{total}</p>
        </div>
      )}
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="px-5 pt-8 pb-4 space-y-6 animate-pulse">
      <div>
        <Skeleton className="h-7 w-40 mb-1" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0,1,2].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-52 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />
      <div className="grid grid-cols-2 gap-2">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="space-y-2">
        {[0,1,2].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyWeek() {
  return (
    <div className="py-6 text-center text-gray-400 text-sm">
      Sin ejercicios esta semana todavía.
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Progress() {
  const { data, loading, error } = useProgressData()

  if (loading) return <LoadingSkeleton />

  if (error || !data) {
    return (
      <div className="px-5 pt-8 flex flex-col items-center gap-3 text-center animate-fade-in">
        <span className="text-4xl">📡</span>
        <p className="text-gray-500 text-sm">No se pudo cargar el progreso.<br/>Verifica tu conexión.</p>
      </div>
    )
  }

  const {
    activeDays, totalExercises, totalMinutes,
    weekChart, streak, streakDays,
    achievements, recentActivity, weekLabel,
  } = data

  const hasWeekActivity = weekChart.some(d => d.moodAvg !== null)

  return (
    <div className="px-5 pt-8 pb-4 space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Mi progreso</h1>
        <p className="text-sm text-gray-500 mt-1">{weekLabel}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={activeDays}      label="Días activos"   color="text-calm-600" />
        <StatCard value={totalExercises}  label="Ejercicios"     color="text-ocean-500" />
        <StatCard value={totalMinutes}    label="Minutos"        color="text-purple-500" />
      </div>

      {/* Weekly mood chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Estado emocional</h2>
          <span className="text-xs text-gray-400">escala 1–5</span>
        </div>
        {hasWeekActivity ? (
          <>
            <div className="flex items-end gap-2">
              {weekChart.map((d, i) => (
                <div key={i} className="flex-1">
                  <MoodBar moodAvg={d.moodAvg} dayLabel={d.dayLabel} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-calm-100 flex-wrap">
              {[
                ['bg-calm-400',   'Bien (4–5)'],
                ['bg-yellow-400', 'Regular (3)'],
                ['bg-red-400',    'Mal (1–2)'],
              ].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${c}`} />
                  <span className="text-xs text-gray-400">{l}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyWeek />
        )}
      </div>

      {/* Streak */}
      <div className="card">
        <h2 className="section-title mb-3">Racha actual</h2>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl font-bold text-calm-600">{streak}</span>
          <div>
            <p className="text-gray-700 font-medium">
              {streak === 1 ? 'día consecutivo' : 'días consecutivos'}
            </p>
            <p className="text-xs text-gray-400">
              {streak === 0 ? 'Haz tu primer ejercicio hoy' :
               streak < 3   ? 'Buen comienzo 💪' :
               streak < 7   ? '¡Sigue así! 🌿' : '¡Increíble racha! 🔥'}
            </p>
          </div>
          <span className="text-3xl ml-auto">
            {streak === 0 ? '🌱' : streak < 5 ? '💪' : '🔥'}
          </span>
        </div>
        <div className="flex gap-2">
          {streakDays.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold
                               transition-all duration-300
                               ${d.hasActivity
                                 ? 'bg-calm-500 text-white shadow-sm shadow-calm-200'
                                 : 'bg-calm-50 text-gray-300'
                               }`}>
                {d.hasActivity ? '✓' : ''}
              </div>
              <span className="text-xs text-gray-400">{d.dayLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <h2 className="section-title mb-3">Logros</h2>
        <div className="grid grid-cols-2 gap-2">
          {achievements.map((a, i) => (
            <AchievementCard key={i} {...a} />
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="section-title mb-3">Actividad reciente</h2>
        {recentActivity.length === 0 ? (
          <div className="card text-center text-gray-400 text-sm py-6">
            Aún no hay ejercicios esta semana.
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivity.map(act => (
              <div key={act.id} className="card flex items-center gap-3">
                <span className="text-2xl w-10 h-10 bg-calm-50 rounded-xl
                                 flex items-center justify-center shrink-0">
                  {act.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800">{act.name}</p>
                  <p className="text-xs text-gray-400">
                    {act.date}{act.duration ? ` · ${act.duration}` : ''}
                  </p>
                </div>
                {act.moodEmoji && (
                  <span className="text-xl shrink-0">{act.moodEmoji}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
