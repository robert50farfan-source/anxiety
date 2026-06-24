import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

export function useChatVoice({ onTranscript, lang = 'es-ES' } = {}) {
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [listening, setListening]       = useState(false)
  const [speaking, setSpeaking]         = useState(false)
  const [sttSupported]                  = useState(!!SpeechRecognition)

  const recognitionRef = useRef(null)
  const audioRef       = useRef(null)
  const synthRef       = useRef(typeof speechSynthesis !== 'undefined' ? speechSynthesis : null)

  // ── STT ──────────────────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!SpeechRecognition || listening) return

    // Stop any active audio before listening
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setSpeaking(false)
    }
    synthRef.current?.cancel()

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

  // ── TTS (ElevenLabs via Edge Function, fallback to native) ───────────────────

  const speakNative = useCallback((text) => {
    if (!synthRef.current || !text) return
    synthRef.current.cancel()

    const utter  = new SpeechSynthesisUtterance(text)
    utter.lang   = lang
    utter.rate   = 0.85
    utter.pitch  = 1.0
    utter.volume = 1.0
    const voices = synthRef.current.getVoices()
    const v = voices.find(v => v.lang.startsWith('es'))
    if (v) utter.voice = v

    utter.onend   = () => setSpeaking(false)
    utter.onerror  = () => setSpeaking(false)

    synthRef.current.speak(utter)
    setSpeaking(true)
  }, [lang])

  const speakText = useCallback(async (text) => {
    if (!text) return
    setSpeaking(true)

    try {
      if (!supabase) throw new Error('no-supabase')

      const { data, error } = await supabase.functions.invoke('tts-proxy', {
        body: { text },
        responseType: 'blob',
      })

      if (error) throw error

      const blob = data instanceof Blob ? data : new Blob([data], { type: 'audio/mpeg' })
      const url  = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        URL.revokeObjectURL(url)
        audioRef.current = null
        setSpeaking(false)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        audioRef.current = null
        setSpeaking(false)
      }

      await audio.play()
    } catch {
      // Fallback to native SpeechSynthesis
      speakNative(text)
    }
  }, [speakNative])

  const cancelSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    synthRef.current?.cancel()
    setSpeaking(false)
  }, [])

  // ── Toggle ───────────────────────────────────────────────────────────────────

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => {
      if (prev) {
        recognitionRef.current?.abort()
        setListening(false)
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current = null
        }
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
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
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
