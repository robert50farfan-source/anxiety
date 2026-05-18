import { useState, useRef, useCallback, useEffect } from 'react'

const BREATH_TONES = {
  inhale: { freq: 528, dur: 0.5 },
  exhale: { freq: 285, dur: 0.7 },
}

export function useMindfulnessAudio() {
  const [muted, setMuted] = useState(false)
  const ctxRef   = useRef(null)
  const synthRef = useRef(typeof speechSynthesis !== 'undefined' ? speechSynthesis : null)

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }

  const playTone = useCallback((freq, dur, volume = 0.09) => {
    if (muted) return
    try {
      const ctx  = getCtx()
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + dur)
    } catch { /* ignore */ }
  }, [muted])

  const playBell = useCallback(() => {
    if (muted) return
    try {
      const ctx = getCtx()
      ;[880, 1320].forEach((freq, i) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime)
        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(i === 0 ? 0.08 : 0.04, ctx.currentTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 2.0)
      })
    } catch { /* ignore */ }
  }, [muted])

  const getVoice = () => {
    const voices = synthRef.current?.getVoices() ?? []
    return voices.find(v => v.lang.startsWith('es')) ?? null
  }

  // HIGH PRIORITY: cancels whatever is playing and speaks the prompt
  const speakPrompt = useCallback((text) => {
    if (!synthRef.current || muted) return
    synthRef.current.cancel()
    const utter  = new SpeechSynthesisUtterance(text)
    utter.lang   = 'es-ES'
    utter.rate   = 0.74
    utter.pitch  = 1.0
    utter.volume = 1.0
    const v = getVoice()
    if (v) utter.voice = v
    synthRef.current.speak(utter)
  }, [muted])

  // LOW PRIORITY: only speaks if nothing is currently playing
  const speakBreath = useCallback((word) => {
    if (!synthRef.current || muted) return
    if (synthRef.current.speaking || synthRef.current.pending) return
    const utter  = new SpeechSynthesisUtterance(word)
    utter.lang   = 'es-ES'
    utter.rate   = 0.82
    utter.pitch  = 1.0
    utter.volume = 1.0
    const v = getVoice()
    if (v) utter.voice = v
    synthRef.current.speak(utter)
  }, [muted])

  // Prompt cue: bell → pause → speak (high priority)
  const cuePrompt = useCallback((text) => {
    playBell()
    setTimeout(() => speakPrompt(text), 1200)
  }, [playBell, speakPrompt])

  // Session-end cue: bell → pause → speak completion message
  const cueComplete = useCallback(() => {
    playBell()
    setTimeout(() => speakPrompt('Sesión completada. Has entrenado tu mente para estar presente. Bien hecho.'), 1200)
  }, [playBell, speakPrompt])

  // Breath cue: tone → pause → speak only if nothing is playing
  const cueBreathe = useCallback((breathPhase) => {
    const cfg = BREATH_TONES[breathPhase]
    if (!cfg) return
    playTone(cfg.freq, cfg.dur)
    setTimeout(() => speakBreath(breathPhase === 'inhale' ? 'Inhala' : 'Exhala'), 250)
  }, [playTone, speakBreath])

  const toggleMute = () => {
    if (!muted) synthRef.current?.cancel()
    setMuted(m => !m)
  }

  useEffect(() => {
    return () => {
      synthRef.current?.cancel()
      ctxRef.current?.close()
    }
  }, [])

  return { muted, toggleMute, cueBreathe, cuePrompt, cueComplete }
}
