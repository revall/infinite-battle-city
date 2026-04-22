// Retro "piw" shoot sound — synthesised with Web Audio so no assets needed.
// AudioContext must be created/resumed after a user gesture (browser autoplay policy);
// the first space-bar press from the player satisfies that.

import startUrl from '../assets/start.mp3'
import gameOverUrl from '../assets/game-over.mp3'

let ctx: AudioContext | null = null

function playSample(url: string): void {
  const a = new Audio(url)
  a.volume = 0.8
  void a.play().catch(() => {})
}

export function playStart(): void {
  playSample(startUrl)
}

export function playGameOver(): void {
  playSample(gameOverUrl)
}

function getCtx(): AudioContext | null {
  if (ctx) return ctx
  try {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    return ctx
  } catch {
    return null
  }
}

export function playPiw(): void {
  const ac = getCtx()
  if (!ac) return
  if (ac.state === 'suspended') ac.resume().catch(() => {})

  const now = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = 'square'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.09)

  gain.gain.setValueAtTime(0.12, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

  osc.connect(gain).connect(ac.destination)
  osc.start(now)
  osc.stop(now + 0.11)
}

function makeNoiseBuffer(ac: AudioContext, durationSec: number): AudioBuffer {
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * durationSec), ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buf
}

/** Low, rumbly explosion for tank deaths. */
export function playBoom(): void {
  const ac = getCtx()
  if (!ac) return
  if (ac.state === 'suspended') ac.resume().catch(() => {})

  const now = ac.currentTime
  const DUR = 0.35

  const noise = ac.createBufferSource()
  noise.buffer = makeNoiseBuffer(ac, DUR)

  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(700, now)
  lp.frequency.exponentialRampToValueAtTime(80, now + DUR)

  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.35, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + DUR)

  noise.connect(lp).connect(gain).connect(ac.destination)
  noise.start(now)
  noise.stop(now + DUR)
}

/** Short bright crack for brick destruction. */
export function playBash(): void {
  const ac = getCtx()
  if (!ac) return
  if (ac.state === 'suspended') ac.resume().catch(() => {})

  const now = ac.currentTime
  const DUR = 0.08

  const noise = ac.createBufferSource()
  noise.buffer = makeNoiseBuffer(ac, DUR)

  const hp = ac.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 900

  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.18, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + DUR)

  noise.connect(hp).connect(gain).connect(ac.destination)
  noise.start(now)
  noise.stop(now + DUR)
}
