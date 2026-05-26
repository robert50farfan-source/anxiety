import { useState } from 'react'
import BreathingGuide from '../components/BreathingGuide'
import GroundingGuide from '../components/GroundingGuide'
import MuscleGuide from '../components/MuscleGuide'
import MindfulnessGuide from '../components/MindfulnessGuide'
import EpisodioWizard from '../components/EpisodioWizard'
import { useStats } from '../hooks/useStats'
import { useEmergencyContact, contactUrl } from '../hooks/useEmergencyContact'
import { useEpisodios } from '../hooks/useEpisodios'
import { useParticipante } from '../context/ParticipanteContext'

const MOODS = [
  { emoji: '😨', label: 'Muy mal',  level: 1 },
  { emoji: '😔', label: 'Mal',      level: 2 },
  { emoji: '😐', label: 'Regular',  level: 3 },
  { emoji: '🙂', label: 'Bien',     level: 4 },
  { emoji: '😊', label: 'Muy bien', level: 5 },
]

const quickTips = [
  { id: 'grounding',    icon: '🌊', title: 'Grounding 5-4-3-2-1', desc: 'Nombra 5 cosas que ves, 4 que tocas...' },
  { id: 'muscle',       icon: '💪', title: 'Relajación muscular',  desc: 'Tensa y relaja grupos musculares' },
  { id: 'mindfulness',  icon: '🧘', title: 'Mindfulness',          desc: 'Observa tus pensamientos sin juzgarlos' },
]

function BreathingIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width="52"
      height="52"
      fill="none"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Outer circle arc (270°, leaving a gap at top-right for the arrowhead) */}
      <circle cx="32" cy="32" r="24" strokeOpacity="0.35" />
      <path
        d="M 32 8 A 24 24 0 1 1 53.97 44"
        strokeOpacity="1"
      />
      {/* Arrowhead at the end of the arc */}
      <polyline points="47,38 54,44 60,38" />
      {/* Inner breath wave */}
      <path
        d="M 18 32 Q 22 24 27 32 Q 32 40 37 32 Q 42 24 46 32"
        strokeOpacity="0.9"
        strokeWidth="2.5"
      />
    </svg>
  )
}

export default function Home() {
  const [showBreathing,   setShowBreathing]   = useState(false)
  const [showGrounding,   setShowGrounding]   = useState(false)
  const [showMuscle,      setShowMuscle]      = useState(false)
  const [showMindfulness, setShowMindfulness] = useState(false)
  const [selectedMood, setSelectedMood]       = useState(null)
  const [moodNote, setMoodNote]           = useState('')
  const [noteSaved, setNoteSaved]         = useState(false)
  const [showEpisodioWizard, setShowEpisodioWizard] = useState(false)
  const [wizardPrefilledEstrategia, setWizardPrefilledEstrategia] = useState(null)
  const [showPromptEpisodio, setShowPromptEpisodio] = useState(false)
  const [promptEstrategia, setPromptEstrategia] = useState(null)

  const { todayExercises, streak, logMood } = useStats()
  const { contact } = useEmergencyContact()
  const { guardarEpisodio } = useEpisodios()
  const { esExperimental } = useParticipante() ?? {}

  const maybeShowPostExercisePrompt = (estrategia) => {
    const key = 'episodio_prompt_date'
    const hoy = new Date().toDateString()
    if (localStorage.getItem(key) === hoy) return
    localStorage.setItem(key, hoy)
    setPromptEstrategia(estrategia)
    setShowPromptEpisodio(true)
  }

  const guardarBorradorRapido = async (estrategia) => {
    const ahora = new Date()
    const fechaInicio = new Date(ahora - 30 * 60000).toISOString()
    await guardarEpisodio({
      id: crypto.randomUUID(),
      tipo_evento: 'ansiedad',
      fecha_inicio: fechaInicio,
      intensidad_numerica: 5,
      intensidad: 'moderada',
      duracion_minutos: null,
      en_curso: false,
      contexto: 'no_especifica',
      contexto_otro: '',
      desencadenante: null,
      sintomas_fisicos: [],
      sintomas_emocionales: [],
      estrategias_aplicadas: estrategia ? [estrategia] : [],
      efectividad_estrategia: null,
      notas: null,
      completado: false,
      paso_actual: 1,
    })
  }

  const handleMoodSelect = (mood) => {
    setSelectedMood(mood)
    setNoteSaved(false)
  }

  const handleSaveMood = () => {
    if (!selectedMood) return
    logMood(selectedMood.level, moodNote.trim())
    setNoteSaved(true)
  }

  // Auto-save when note loses focus (if mood already selected)
  const handleNoteBlur = () => {
    if (selectedMood && !noteSaved) handleSaveMood()
  }

  return (
    <>
      <div className="px-5 pt-8 pb-4 space-y-6 animate-fade-in">
        {/* Greeting */}
        <div>
          <p className="text-calm-600 text-sm font-medium">Buenos días</p>
          <h1 className="text-2xl font-bold text-gray-800 mt-0.5">¿Cómo te sientes hoy?</h1>
        </div>

        {/* Mood selector */}
        <div className="card space-y-4">
          <p className="text-sm text-gray-500 font-medium">Estado emocional</p>

          <div className="flex justify-between gap-1">
            {MOODS.map((mood) => {
              const active = selectedMood?.level === mood.level
              return (
                <button
                  key={mood.level}
                  onClick={() => handleMoodSelect(mood)}
                  aria-label={mood.label}
                  className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-2xl
                              transition-all duration-150 active:scale-90
                              ${active
                                ? 'bg-calm-100 ring-2 ring-calm-400 scale-105'
                                : 'bg-calm-50 hover:bg-calm-100'
                              }`}
                >
                  <span className="text-2xl leading-none">{mood.emoji}</span>
                  <span className={`text-[10px] font-medium leading-tight text-center
                                   ${active ? 'text-calm-700' : 'text-gray-400'}`}>
                    {mood.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Trigger note */}
          <div className="relative">
            <textarea
              value={moodNote}
              onChange={e => { setMoodNote(e.target.value); setNoteSaved(false) }}
              onBlur={handleNoteBlur}
              placeholder="¿Qué está pasando? (opcional)"
              rows={2}
              maxLength={280}
              className="w-full resize-none rounded-xl border border-calm-200 bg-calm-50
                         px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-calm-400 focus:border-transparent
                         transition-colors"
            />
            {selectedMood && !noteSaved && (
              <button
                onClick={handleSaveMood}
                className="absolute right-2 bottom-2 text-xs bg-calm-500 text-white
                           px-2.5 py-1 rounded-lg font-medium active:scale-95 transition-transform"
              >
                Guardar
              </button>
            )}
            {noteSaved && (
              <span className="absolute right-3 bottom-2.5 text-xs text-calm-600 font-medium animate-fade-in">
                ✓ Guardado
              </span>
            )}
          </div>
        </div>

        {/* CRISIS BUTTON */}
        <div className="space-y-2">
          <button
            onClick={() => setShowBreathing(true)}
            className="w-full py-6 rounded-3xl relative overflow-hidden
                       bg-gradient-to-br from-calm-500 to-ocean-500
                       text-white font-bold
                       shadow-xl shadow-calm-300/60
                       active:scale-95 transition-all duration-200
                       animate-pulse-ring"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <div className="relative flex flex-col items-center gap-2">
              <BreathingIcon />
              <span className="text-2xl tracking-wide">Estoy en crisis</span>
              <span className="text-sm font-normal text-white/80">Toca para la guía de respiración</span>
            </div>
          </button>
          {contact && (
            <a
              href={contactUrl(contact)}
              target={contact.via === 'whatsapp' ? '_blank' : undefined}
              rel={contact.via === 'whatsapp' ? 'noopener noreferrer' : undefined}
              className={`w-full py-3.5 rounded-2xl text-white font-semibold
                         flex items-center justify-center gap-2
                         active:scale-95 transition-transform shadow-md
                         ${contact.via === 'whatsapp'
                           ? 'bg-green-500 shadow-green-200'
                           : 'bg-red-500 shadow-red-200'}`}
            >
              <span className="text-lg leading-none">
                {contact.via === 'whatsapp' ? '💬' : '📞'}
              </span>
              {contact.via === 'whatsapp' ? 'WhatsApp a' : 'Llamar a'} {contact.name}
            </a>
          )}
        </div>

        {/* Registrar episodio */}
        <button
          onClick={() => { setWizardPrefilledEstrategia(null); setShowEpisodioWizard(true) }}
          className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-semibold
                     flex items-center justify-center gap-3
                     active:scale-95 transition-all duration-200 shadow-md shadow-indigo-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Registrar episodio
        </button>

        {/* Daily stats — from localStorage */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card flex flex-col gap-1">
            <span className="text-2xl font-bold text-calm-600">{todayExercises}</span>
            <span className="text-xs text-gray-500">Ejercicios hoy</span>
          </div>
          <div className="card flex flex-col gap-1">
            <span className="text-2xl font-bold text-ocean-500">{streak}</span>
            <span className="text-xs text-gray-500">Días de racha</span>
          </div>
        </div>

        {/* Quick tips */}
        <div>
          <h2 className="section-title mb-3">Técnicas rápidas</h2>
          <div className="space-y-2">
            {quickTips.map((tip, i) => (
              <button
                key={i}
                onClick={() => {
                  if (tip.id === 'grounding')   setShowGrounding(true)
                  if (tip.id === 'muscle')      setShowMuscle(true)
                  if (tip.id === 'mindfulness') setShowMindfulness(true)
                }}
                className="card w-full text-left flex items-center gap-4
                           active:scale-[0.98] hover:border-calm-200 transition-all"
              >
                <span className="text-2xl w-10 h-10 bg-calm-50 rounded-xl flex items-center justify-center shrink-0">
                  {tip.icon}
                </span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{tip.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{tip.desc}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 ml-auto shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showBreathing && (
        <BreathingGuide
          onClose={() => setShowBreathing(false)}
          currentMood={selectedMood}
          moodNote={moodNote}
        />
      )}
      {showGrounding && (
        <GroundingGuide
          onClose={() => { setShowGrounding(false); maybeShowPostExercisePrompt('grounding_54321') }}
          currentMood={selectedMood}
          moodNote={moodNote}
        />
      )}
      {showMuscle && (
        <MuscleGuide
          onClose={() => { setShowMuscle(false); maybeShowPostExercisePrompt('relajacion_muscular') }}
          currentMood={selectedMood}
          moodNote={moodNote}
        />
      )}
      {showMindfulness && (
        <MindfulnessGuide
          onClose={() => { setShowMindfulness(false); maybeShowPostExercisePrompt('mindfulness') }}
          currentMood={selectedMood}
          moodNote={moodNote}
        />
      )}

      {showEpisodioWizard && (
        <EpisodioWizard
          onClose={() => { setShowEpisodioWizard(false); setWizardPrefilledEstrategia(null) }}
          prefilledEstrategia={wizardPrefilledEstrategia}
          esExperimental={esExperimental ?? false}
        />
      )}

      {showPromptEpisodio && esExperimental && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowPromptEpisodio(false)} />
          <div className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl">
            <p className="font-semibold text-gray-800 mb-1">¿Acabas de atravesar un episodio?</p>
            <p className="text-sm text-gray-500 mb-4">Registrarlo te ayuda a entender tus patrones de ansiedad.</p>
            <div className="space-y-2">
              <button onClick={() => {
                setShowPromptEpisodio(false)
                setWizardPrefilledEstrategia(promptEstrategia)
                setShowEpisodioWizard(true)
              }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm">
                Sí, registrarlo
              </button>
              <button onClick={() => {
                setShowPromptEpisodio(false)
                guardarBorradorRapido(promptEstrategia)
              }} className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm">
                Más tarde
              </button>
              <button onClick={() => setShowPromptEpisodio(false)}
                className="w-full py-2 text-gray-400 text-sm">
                No, gracias
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
