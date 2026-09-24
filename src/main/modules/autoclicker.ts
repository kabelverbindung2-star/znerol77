import { winHelper } from './winhelper'

export interface AutoClickerProfile {
  id: string
  name: string
  intervalMs: number // 2 ms = 500 clicks per second
  jitterMs: number
  button: 'left' | 'right' | 'middle'
  mode: 'single' | 'double'
  target: 'current' | 'fixed'
  x: number
  y: number
  clickLimit: number // 0 = unendlich
  hotkey: string // Accelerator string, z.B. "F8"
}

export interface AutoClickerStatus {
  running: boolean
  clicks: number
  profileId: string | null
  error: string | null
}

export const MIN_INTERVAL_MS = 2

/**
 * The clicking itself runs on a thread inside the Windows helper (C#, 1 ms timer,
 * SendInput); Node only starts/stops it and polls the counter a few times a second.
 */
class ClickerEngine {
  private poll: ReturnType<typeof setInterval> | null = null
  private status: AutoClickerStatus = { running: false, clicks: 0, profileId: null, error: null }
  private onStatus: (s: AutoClickerStatus) => void = () => {}
  private onRunning: (running: boolean) => void = () => {}

  setStatusListener(cb: (s: AutoClickerStatus) => void): void {
    this.onStatus = cb
  }

  /** Lets main register an emergency-stop key only while clicking. */
  setRunningListener(cb: (running: boolean) => void): void {
    this.onRunning = cb
  }

  private emit(): void {
    this.onStatus({ ...this.status })
  }

  async start(profile: AutoClickerProfile): Promise<void> {
    if (this.status.running) return
    try {
      await winHelper.request(
        'clickStart',
        {
          button: profile.button,
          double: profile.mode === 'double',
          move: profile.target === 'fixed',
          x: profile.x,
          y: profile.y,
          interval: Math.max(MIN_INTERVAL_MS, profile.intervalMs),
          jitter: Math.max(0, profile.jitterMs),
          limit: Math.max(0, profile.clickLimit)
        },
        30000
      )
    } catch (err) {
      this.status = { running: false, clicks: 0, profileId: null, error: (err as Error).message }
      this.emit()
      throw err
    }
    this.status = { running: true, clicks: 0, profileId: profile.id, error: null }
    this.emit()
    this.onRunning(true)
    this.poll = setInterval(async () => {
      try {
        const s = await winHelper.request<{ running: boolean; clicks: number }>('clickStatus')
        this.status = { ...this.status, clicks: s.clicks, running: s.running }
        this.emit()
        if (!s.running) this.finish() // click limit reached
      } catch {
        this.finish()
      }
    }, 250)
  }

  private finish(): void {
    if (this.poll) {
      clearInterval(this.poll)
      this.poll = null
    }
    this.status = { ...this.status, running: false }
    this.emit()
    this.onRunning(false)
  }

  stop(): void {
    winHelper.request('clickStop').catch(() => undefined)
    this.finish()
  }

  getStatus(): AutoClickerStatus {
    return { ...this.status }
  }

  dispose(): void {
    if (this.status.running) this.stop()
  }
}

export const clickerEngine = new ClickerEngine()

export const defaultProfiles: AutoClickerProfile[] = [
  {
    id: 'default',
    name: 'Standard',
    intervalMs: 100,
    jitterMs: 15,
    button: 'left',
    mode: 'single',
    target: 'current',
    x: 0,
    y: 0,
    clickLimit: 0,
    hotkey: 'F8'
  }
]
