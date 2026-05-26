import { useState, useRef, useCallback, useEffect } from 'react'

// Tone frequency and duration per phase
const TONES = {
  inhale: { freq: 528, dur: 0.7 },
  holdIn: { freq: 396, dur: 0.5 },
  exhale:  { freq: 285, dur: 0.9 },
}

// Voice text per phase
const SPEECH = {
  inhale: 'Inhala',
  holdIn: 'Retén',
  exhale:  'Exhala',
}

export function useBreathingAudio() {
  const [muted, setMuted]   = useState(false)
  const ctxRef  = useRef(null)
  const synthRef = useRef(typeof speechSynthesis !== 'undefined' ? speechSynthesis : null)

  // Lazy AudioContext — created after first user gesture
  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }

  const playTone = useCallback((phaseKey) => {
    if (muted) return
    const cfg = TONES[phaseKey]
    if (!cfg) return
    try {
      const ctx  = getCtx()
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(cfg.freq, ctx.currentTime)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.06)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.dur)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + cfg.dur)
    } catch { /* ignore in environments without AudioContext */ }
  }, [muted])

  const speak = useCallback((phaseKey) => {
    if (muted || !synthRef.current) return
    const text = SPEECH[phaseKey]
    if (!text) return
    synthRef.current.cancel()
    const utter   = new SpeechSynthesisUtterance(text)
    utter.lang    = 'es-ES'
    utter.rate    = 0.8
    utter.pitch   = 1.0
    utter.volume  = 1.0
    // Prefer a Spanish voice if available
    const voices  = synthRef.current.getVoices()
    const esVoice = voices.find(v => v.lang.startsWith('es'))
    if (esVoice) utter.voice = esVoice
    synthRef.current.speak(utter)
  }, [muted])

  // Play tone + speak together at phase start
  const cue = useCallback((phaseKey) => {
    playTone(phaseKey)
    // Small delay so tone plays first, then voice
    setTimeout(() => speak(phaseKey), 300)
  }, [playTone, speak])

  const toggleMute = () => {
    if (!muted && synthRef.current) synthRef.current.cancel()
    setMuted(m => !m)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      synthRef.current?.cancel()
      ctxRef.current?.close()
    }
  }, [])

  return { muted, toggleMute, cue }
}
