import { useState, useRef, useCallback, useEffect } from 'react'

const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

export function useChatVoice({ onTranscript, lang = 'es-ES' } = {}) {
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [listening, setListening]       = useState(false)
  const [speaking, setSpeaking]         = useState(false)
  const [sttSupported]                  = useState(!!SpeechRecognition)

  const recognitionRef = useRef(null)
  const synthRef       = useRef(typeof speechSynthesis !== 'undefined' ? speechSynthesis : null)

  const getVoice = useCallback(() => {
    const voices = synthRef.current?.getVoices() ?? []
    return voices.find(v => v.lang.startsWith('es')) ?? null
  }, [])

  // ── STT ──────────────────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!SpeechRecognition || listening) return

    if (synthRef.current?.speaking) {
      synthRef.current.cancel()
      setSpeaking(false)
    }

    const recognition = new SpeechRecognition()
    recognition.lang            = lang
    recognition.continuous      = false
    recognition.interimResults  = true

    recognition.onresult = (e) => {
      const last       = e.results[e.results.length - 1]
      const transcript = last[0].transcript
      onTranscript?.(transcript, last.isFinal)
    }

    recognition.onend   = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [listening, lang, onTranscript])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  // ── TTS ──────────────────────────────────────────────────────────────────────

  const speakText = useCallback((text) => {
    if (!synthRef.current || !text) return
    synthRef.current.cancel()

    const utter  = new SpeechSynthesisUtterance(text)
    utter.lang   = lang
    utter.rate   = 0.85
    utter.pitch  = 1.0
    utter.volume = 1.0
    const v = getVoice()
    if (v) utter.voice = v

    utter.onend  = () => setSpeaking(false)
    utter.onerror = () => setSpeaking(false)

    synthRef.current.speak(utter)
    setSpeaking(true)
  }, [lang, getVoice])

  const cancelSpeaking = useCallback(() => {
    synthRef.current?.cancel()
    setSpeaking(false)
  }, [])

  // ── Toggle ───────────────────────────────────────────────────────────────────

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => {
      if (prev) {
        recognitionRef.current?.abort()
        setListening(false)
        synthRef.current?.cancel()
        setSpeaking(false)
      }
      return !prev
    })
  }, [])

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      synthRef.current?.cancel()
    }
  }, [])

  return {
    voiceEnabled,
    listening,
    speaking,
    sttSupported,
    toggleVoice,
    startListening,
    stopListening,
    speakText,
    cancelSpeaking,
  }
}
