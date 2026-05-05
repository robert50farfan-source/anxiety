import { useState, useRef, useEffect } from 'react'

const INITIAL_MESSAGES = [
  {
    id: 1,
    from: 'bot',
    text: 'Hola, estoy aquí para escucharte. ¿Cómo te sientes en este momento?',
    time: 'Ahora',
  }
]

const RESPONSES = [
  '¿Puedes describir más cómo se siente esa emoción en tu cuerpo?',
  'Eso suena difícil. ¿Desde cuándo te sientes así?',
  'Gracias por compartir eso. Es valiente reconocer lo que sientes.',
  '¿Has probado alguna técnica de respiración hoy? Puede ayudar a bajar la intensidad.',
  'Recuerda que las sensaciones de ansiedad son temporales, aunque ahora se sientan muy intensas.',
  '¿Qué necesitas en este momento? ¿Quieres practicar un ejercicio de grounding?',
]

let responseIdx = 0

export default function Chat() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const send = () => {
    const text = input.trim()
    if (!text) return

    const userMsg = { id: Date.now(), from: 'user', text, time: 'Ahora' }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const botText = RESPONSES[responseIdx % RESPONSES.length]
      responseIdx++
      setIsTyping(false)
      setMessages(prev => [...prev, { id: Date.now() + 1, from: 'bot', text: botText, time: 'Ahora' }])
    }, 1200 + Math.random() * 800)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 border-b border-calm-100 bg-calm-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-calm-400 to-ocean-400 flex items-center justify-center text-xl">
            🤗
          </div>
          <div>
            <h1 className="font-bold text-gray-800">Apoyo emocional</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-400">Disponible ahora</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {msg.from === 'bot' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-calm-400 to-ocean-400 flex items-center justify-center text-sm mr-2 shrink-0 self-end mb-1">
                🤗
              </div>
            )}
            <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
              ${msg.from === 'user'
                ? 'bg-calm-600 text-white rounded-br-md'
                : 'bg-white text-gray-700 shadow-sm border border-calm-100 rounded-bl-md'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-calm-400 to-ocean-400 flex items-center justify-center text-sm mr-2 self-end mb-1">
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
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-safe pb-4 pt-2 border-t border-calm-100 bg-calm-50">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escribe cómo te sientes..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-calm-200 bg-white px-4 py-3
                       text-sm text-gray-800 placeholder-gray-400 focus:outline-none
                       focus:ring-2 focus:ring-calm-400 focus:border-transparent
                       max-h-28 overflow-y-auto"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="w-11 h-11 rounded-2xl bg-calm-600 text-white flex items-center justify-center
                       shadow-md active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed
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
  )
}
