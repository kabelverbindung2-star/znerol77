import { useEffect, useState, useSyncExternalStore } from 'react'

/**
 * Stopwatch and countdown live outside React (localStorage-backed stores), so they keep
 * running when you switch tabs and even survive restarting the app.
 */

function createStore<T>(key: string, initial: T): {
  get: () => T
  set: (next: T) => void
  subscribe: (cb: () => void) => () => void
} {
  let value: T = initial
  try {
    const raw = localStorage.getItem(key)
    if (raw) value = { ...initial, ...JSON.parse(raw) }
  } catch {
    // start fresh
  }
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set: (next) => {
      value = next
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // storage full or blocked: keep working in memory
      }
      listeners.forEach((l) => l())
    },
    subscribe: (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    }
  }
}

/** Re-render every `ms` while `active`. */
export function useTicker(active: boolean, ms = 50): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [active, ms])
  return now
}

// ---------- Stopwatch ----------
interface SwState {
  running: boolean
  startedAt: number
  base: number // ms accumulated before the current run
  laps: number[]
}

const sw = createStore<SwState>('znerol.stopwatch', { running: false, startedAt: 0, base: 0, laps: [] })

export function useStopwatch(): {
  elapsed: number
  running: boolean
  laps: number[]
  toggle: () => void
  reset: () => void
  lap: () => void
} {
  const s = useSyncExternalStore(sw.subscribe, sw.get)
  const now = useTicker(s.running, 31)
  const elapsed = s.running ? s.base + (now - s.startedAt) : s.base
  return {
    elapsed,
    running: s.running,
    laps: s.laps,
    toggle: () => {
      const cur = sw.get()
      if (cur.running) sw.set({ ...cur, running: false, base: cur.base + (Date.now() - cur.startedAt) })
      else sw.set({ ...cur, running: true, startedAt: Date.now() })
    },
    reset: () => sw.set({ running: false, startedAt: 0, base: 0, laps: [] }),
    lap: () => {
      const cur = sw.get()
      const total = cur.running ? cur.base + (Date.now() - cur.startedAt) : cur.base
      if (total > 0) sw.set({ ...cur, laps: [total, ...cur.laps].slice(0, 50) })
    }
  }
}

// ---------- Countdown ----------
interface TimerState {
  running: boolean
  endAt: number
  duration: number
  remaining: number // while paused
  rang: boolean
}

const timer = createStore<TimerState>('znerol.timer', { running: false, endAt: 0, duration: 5 * 60_000, remaining: 5 * 60_000, rang: true })

export function useCountdown(): {
  remaining: number
  duration: number
  running: boolean
  finished: boolean
  start: () => void
  pause: () => void
  reset: () => void
  setDuration: (ms: number) => void
} {
  const s = useSyncExternalStore(timer.subscribe, timer.get)
  const now = useTicker(s.running, 200)
  const remaining = s.running ? Math.max(0, s.endAt - now) : s.remaining
  return {
    remaining,
    duration: s.duration,
    running: s.running,
    finished: !s.running && s.remaining === 0,
    start: () => {
      const cur = timer.get()
      const left = cur.remaining > 0 ? cur.remaining : cur.duration
      timer.set({ ...cur, running: true, endAt: Date.now() + left, remaining: left, rang: false })
    },
    pause: () => {
      const cur = timer.get()
      timer.set({ ...cur, running: false, remaining: Math.max(0, cur.endAt - Date.now()) })
    },
    reset: () => {
      const cur = timer.get()
      timer.set({ ...cur, running: false, remaining: cur.duration, rang: true })
    },
    setDuration: (ms) => timer.set({ running: false, endAt: 0, duration: ms, remaining: ms, rang: true })
  }
}

function beep(): void {
  try {
    const ctx = new AudioContext()
    const t0 = ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.35)
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + i * 0.35 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.35 + 0.25)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0 + i * 0.35)
      osc.stop(t0 + i * 0.35 + 0.3)
    }
    setTimeout(() => ctx.close(), 1500)
  } catch {
    // no audio device
  }
}

/** Mounted once in the app: rings when a countdown ends, wherever you are in the app. */
export function useTimerAlarm(): boolean {
  const s = useSyncExternalStore(timer.subscribe, timer.get)
  const now = useTicker(s.running, 500)
  const [ringing, setRinging] = useState(false)
  useEffect(() => {
    if (s.running && now >= s.endAt && !s.rang) {
      timer.set({ ...s, running: false, remaining: 0, rang: true })
      beep()
      setRinging(true)
      try {
        new Notification('Timer abgelaufen', { body: 'ZnerolMonitor' })
      } catch {
        // notifications not allowed
      }
      setTimeout(() => setRinging(false), 6000)
    }
  }, [now, s])
  return ringing
}

export function formatDuration(ms: number, withHundredths = true): string {
  const total = Math.max(0, ms)
  const h = Math.floor(total / 3_600_000)
  const m = Math.floor((total % 3_600_000) / 60_000)
  const sec = Math.floor((total % 60_000) / 1000)
  const cs = Math.floor((total % 1000) / 10)
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  const base = h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
  return withHundredths ? `${base},${String(cs).padStart(2, '0')}` : base
}
