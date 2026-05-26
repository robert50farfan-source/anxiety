import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStats } from '../hooks/useStats'
import { useEmergencyContact, contactUrl } from '../hooks/useEmergencyContact'
import { useCrisisLogger } from '../hooks/useCrisisLogger'
import BreathingGuide from '../components/BreathingGuide'
import ProfesionalesApoyo from '../components/ProfesionalesApoyo'
import {
  loadChatHistory,
  saveMessage,
  callChatProxy,
  buildContext,
  buildSystemPrompt,
} from '../lib/chatApi'

// ─── Constants ────────────────────────────────────────────────────────────────

const MOODS = [
  { emoji: '😨', label: 'Muy mal',  level: 1 },
  { emoji: '😔', label: 'Mal',      level: 2 },
  { emoji: '😐', label: 'Regular',  level: 3 },
  { emoji: '🙂', label: 'Bien',     level: 4 },
  { emoji: '😊', label: 'Muy bien', level: 5 },
]

const WELCOME_MSG = {
  id: 'welcome',
  rol: 'assistant',
  contenido: 'Hola, estoy aquí para escucharte. ¿Cómo te sientes hoy?',
  fecha: new Date().toISOString(),
  hasCrisis: false,
}

const FALLBACK_ERROR = {
  id: null,
  rol: 'assistant',
  contenido: 'En este momento no puedo conectarme. Mientras tanto, prueba la Respiración 4-7-8 en Ejercicios.',
  fecha: null,
  hasCrisis: false,
}

function uid() {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayHasMood() {
  try {
    const stats = JSON.parse(localStorage.getItem('anxietyapp_stats') || '{}')
    const today = new Date().toISOString().slice(0, 10)
    return (stats[today]?.moods?.length ?? 0) > 0
  } catch { return false }
}

function formatSeparator(dateStr) {
  const d    = new Date(dateStr)
  const now  = new Date()
  const prev = new Date(); prev.setDate(prev.getDate() - 1)
  if (d.toDateString() === now.toDateString())  return 'Hoy'
  if (d.toDateString() === prev.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

function differentDay(a, b) {
  if (!b) return false
  return (a.fecha ?? '').slice(0, 10) !== (b.fecha ?? '').slice(0, 10)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhoneButton({ href, label, primary = false, external = false, onClick }) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={onClick}
      className={`w-full py-2.5 rounded-xl text-sm font-semibold
                  active:scale-95 transition-transform flex items-center justify-center gap-1.5
                  ${primary
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-100 text-red-700'}`}
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.338c0 1.64.435 3.174 1.2 4.497m16.55 4.347c.765 1.323 1.2 2.857 1.2 4.497M2.25 6.338C2.25 5.23 3.16 4.5 4.248 4.5h1.5c.893 0 1.658.587 1.9 1.45l.823 2.878a2.25 2.25 0 01-.81 2.462l-.91.7c1.074 1.945 2.624 3.56 4.49 4.693l.7-.91a2.25 2.25 0 012.462-.81l2.878.823c.863.242 1.45 1.007 1.45 1.9v1.5c0 1.088-.73 1.998-1.838 1.998C6.75 21 2.25 12.585 2.25 6.338z" />
      </svg>
      {label}
    </a>
  )
}

function CrisisCard({ onBreathing }) {
  const { contact }   = useEmergencyContact()
  const { userId }    = useAuth()
  const { registrar } = useCrisisLogger(userId)

  return (
    <div className="mt-2 rounded-2xl bg-red-50 border border-red-200 p-4 space-y-3 animate-fade-in">
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none">🆘</span>
        <p className="text-sm font-semibold text-red-800 leading-snug">
          Parece que estás pasando por algo muy difícil.
        </p>
      </div>
      <div className="space-y-2">
        <button
          onClick={() => { onBreathing(); registrar('apertura_pantalla') }}
          className="w-full py-2.5 rounded-xl bg-calm-600 text-white text-sm font-semibold
                     active:scale-95 transition-transform shadow-sm"
        >
          Ejercicio de respiración ahora
        </button>
        {contact && (
          <PhoneButton
            href={contactUrl(contact)}
            label={`${contact.via === 'whatsapp' ? 'WhatsApp a' : 'Llamar a'} ${contact.name}`}
            primary
            external={contact.via === 'whatsapp'}
            onClick={() => registrar('contacto_personal')}
          />
        )}
        <ProfesionalesApoyo />
        <PhoneButton
          href="tel:800104100"
          label="Línea de apoyo Bolivia: 800-10-4100"
          onClick={() => registrar('contacto_linea_nacional')}
        />
      </div>
      <p className="text-xs text-red-500 text-center">
        Hablar con alguien de confianza también ayuda.
      </p>
    </div>
  )
}

function MoodBanner({ onSelect }) {
  return (
    <div className="bg-ocean-50 border-b border-ocean-100 px-4 py-3 shrink-0 animate-fade-in">
      <p className="text-xs font-medium text-gray-500 mb-2">
        Antes de chatear, ¿cómo estás?
      </p>
      <div className="flex gap-2">
        {MOODS.map(m => (
          <button
            key={m.level}
            onClick={() => onSelect(m)}
            className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl
                       bg-white border border-calm-100 hover:bg-calm-50
                       active:scale-90 transition-transform"
          >
            <span className="text-xl leading-none">{m.emoji}</span>
            <span className="text-[9px] text-gray-400 leading-none">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Bubble({ msg, onBreathing }) {
  const isUser = msg.rol === 'user'
  const time   = msg.fecha
    ? new Date(msg.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in mb-1`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-calm-400 to-ocean-400
                        flex items-center justify-center text-sm mr-2 self-end mb-5 shrink-0">
          🤗
        </div>
      )}
      <div className={`max-w-[78%] ${isUser ? '' : 'flex-1 max-w-[82%]'}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-calm-600 text-white rounded-br-md'
            : 'bg-white text-gray-700 shadow-sm border border-calm-100 rounded-bl-md'
          }`}
        >
          {msg.contenido}
        </div>
        {time && (
          <p className={`text-[10px] text-gray-400 mt-0.5 ${isUser ? 'text-right' : 'ml-1'}`}>
            {time}
          </p>
        )}
        {msg.hasCrisis && <CrisisCard onBreathing={onBreathing} />}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in mb-1">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-calm-400 to-ocean-400
                      flex items-center justify-center text-sm mr-2 self-end shrink-0">
        🤗
      </div>
      <div className="bg-white border border-calm-100 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 bg-calm-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Chat() {
  const { userId }        = useAuth()
  const { logMood }       = useStats()
  const [msgs, setMsgs]   = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping]   = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showMoodBanner, setShowMoodBanner] = useState(false)
  const [showBreathing, setShowBreathing]   = useState(false)
  const bottomRef = useRef(null)

  // Load history once userId is ready
  useEffect(() => {
    if (!userId) return
    setIsLoading(true)
    loadChatHistory(userId)
      .then(history => setMsgs(history.length ? history : [WELCOME_MSG]))
      .catch(() => setMsgs([WELCOME_MSG]))
      .finally(() => setIsLoading(false))

    setShowMoodBanner(!getTodayHasMood())
  }, [userId])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, isTyping])

  const handleQuickMood = (mood) => {
    logMood(mood.level, '')
    setShowMoodBanner(false)
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isTyping) return
    setInput('')

    const userMsg = {
      id:        uid(),
      rol:       'user',
      contenido: text,
      fecha:     new Date().toISOString(),
      hasCrisis: false,
    }

    // Capture current conversation for context BEFORE state update
    const history   = msgs.filter(m => m.id !== 'welcome')
    const forClaude = [...history, userMsg]
      .slice(-10)
      .map(m => ({ role: m.rol === 'user' ? 'user' : 'assistant', content: m.contenido }))

    setMsgs(prev => [...prev.filter(m => m.id !== 'welcome'), userMsg])
    setIsTyping(true)
    saveMessage(userId, 'user', text)

    try {
      const { userContext, recentEpisodes } = await buildContext(userId)
      const systemPrompt = buildSystemPrompt(userContext, recentEpisodes)
      const raw          = await callChatProxy(forClaude, systemPrompt)

      const hasCrisis = raw.includes('[CRISIS_BLOCK]')
      const contenido = raw.replace('[CRISIS_BLOCK]', '').trim()
      const fecha     = new Date().toISOString()

      setMsgs(prev => [...prev, { id: uid(), rol: 'assistant', contenido, fecha, hasCrisis }])
      saveMessage(userId, 'assistant', raw) // store with tag for future history parsing
    } catch {
      setMsgs(prev => [...prev, { ...FALLBACK_ERROR, id: uid(), fecha: new Date().toISOString() }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // Build message list with date separators
  const renderedMsgs = msgs.flatMap((msg, i) => {
    const items = []
    if (differentDay(msg, msgs[i - 1])) {
      items.push(
        <div key={`sep_${i}`} className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium px-1">
            {formatSeparator(msg.fecha)}
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )
    }
    items.push(
      <Bubble key={msg.id} msg={msg} onBreathing={() => setShowBreathing(true)} />
    )
    return items
  })

  return (
    <>
      <div className="flex flex-col h-full animate-fade-in">

        {/* Header */}
        <div className="px-5 pt-8 pb-4 border-b border-calm-100 bg-calm-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-calm-400 to-ocean-400
                            flex items-center justify-center text-xl shrink-0">
              🤗
            </div>
            <div>
              <h1 className="font-bold text-gray-800">Apoyo emocional</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-gray-400">Calma · Asistente de bienestar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mood banner — shown only if no mood logged today */}
        {showMoodBanner && <MoodBanner onSelect={handleQuickMood} />}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-2.5 h-2.5 bg-calm-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : (
            <>
              {renderedMsgs}
              {isTyping && <TypingIndicator />}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="px-4 pb-safe pb-4 pt-2 border-t border-calm-100 bg-calm-50 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escribe cómo te sientes..."
              rows={1}
              disabled={isTyping}
              className="flex-1 resize-none rounded-2xl border border-calm-200 bg-white px-4 py-3
                         text-sm text-gray-800 placeholder-gray-400 focus:outline-none
                         focus:ring-2 focus:ring-calm-400 focus:border-transparent
                         max-h-28 overflow-y-auto disabled:opacity-50 transition-opacity"
              style={{ lineHeight: '1.5' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="w-11 h-11 rounded-2xl bg-calm-600 text-white flex items-center justify-center
                         shadow-md active:scale-90 transition-all disabled:opacity-40
                         hover:bg-calm-700 shrink-0"
              aria-label="Enviar"
            >
              <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            Apoyo de bienestar · No reemplaza atención profesional
          </p>
        </div>
      </div>

      {showBreathing && (
        <BreathingGuide onClose={() => setShowBreathing(false)} />
      )}
    </>
  )
}
