import { useState, useRef, useCallback, useEffect } from 'react'

const STEP_TONES = [
  { freq: 396, dur: 0.6 },  // ver      — Do
  { freq: 440, dur: 0.6 },  // tocar    — La
  { freq: 528, dur: 0.6 },  // escuchar — Mi
  { freq: 396, dur: 0.6 },  // oler
  { freq: 528, dur: 0.6 },  // saborear
]

export function useGroundingAudio() {
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

  const getVoice = () => {
    const voices = synthRef.current?.getVoices() ?? []
    return voices.find(v => v.lang.startsWith('es')) ?? null
  }

  const playTone = useCallback((stepIdx) => {
    if (muted) return
    const cfg = STEP_TONES[stepIdx] ?? STEP_TONES[0]
    try {
      const ctx  = getCtx()
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(cfg.freq, ctx.currentTime)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.10, ctx.currentTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.dur)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + cfg.dur)
    } catch { /* ignore */ }
  }, [muted])

  const speak = useCallback((text) => {
    if (!synthRef.current || muted) return
    synthRef.current.cancel()
    const utter   = new SpeechSynthesisUtterance(text)
    utter.lang    = 'es-ES'
    utter.rate    = 0.80
    utter.pitch   = 1.0
    utter.volume  = 1.0
    const v = getVoice()
    if (v) utter.voice = v
    synthRef.current.speak(utter)
  }, [muted])

  // Cue on each step: tone + instruction + hint
  const cueStep = useCallback((stepIdx, instruction, hint) => {
    playTone(stepIdx)
    setTimeout(() => speak(`${instruction}. ${hint}`), 350)
  }, [playTone, speak])

  const cueComplete = useCallback(() => {
    playTone(0)
    setTimeout(() => speak('¡Lo lograste! Has conectado con el presente a través de tus cinco sentidos.'), 350)
  }, [playTone, speak])

  const cancel = useCallback(() => {
    synthRef.current?.cancel()
  }, [])

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

  return { muted, toggleMute, cueStep, cueComplete, cancel }
}
