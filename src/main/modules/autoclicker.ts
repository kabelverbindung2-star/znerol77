import { winHelper } from './winhelper'

export interface AutoClickerProfile {
  id: string
  name: string
  intervalMs: number
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

class ClickerEngine {
  private timer: ReturnType<typeof setTimeout> | null = null
  private status: AutoClickerStatus = { running: false, clicks: 0, profileId: null, error: null }
  private onStatus: (s: AutoClickerStatus) => void = () => {}
  private lastEmit = 0

  setStatusListener(cb: (s: AutoClickerStatus) => void): void {
    this.onStatus = cb
  }

  private emit(force = false): void {
    // at 50 clicks/s, repainting every window on every click would itself cause lag
    const now = Date.now()
    if (!force && now - this.lastEmit < 250) return
    this.lastEmit = now
    this.onStatus({ ...this.status })
  }

  async start(profile: AutoClickerProfile): Promise<void> {
    if (this.status.running) return
    try {
      await winHelper.request('ping', {}, 30000)
    } catch (err) {
      this.status = { running: false, clicks: 0, profileId: null, error: (err as Error).message }
      this.emit(true)
      throw err
    }
    this.status = { running: true, clicks: 0, profileId: profile.id, error: null }
    this.emit(true)

    const tick = (): void => {
      if (!this.status.running) return
      winHelper
        .send('click', {
          button: profile.button,
          move: profile.target === 'fixed',
          x: profile.x,
          y: profile.y,
          double: profile.mode === 'double'
        })
        .catch(() => this.stop())
      this.status.clicks += 1
      this.emit()
      if (profile.clickLimit > 0 && this.status.clicks >= profile.clickLimit) {
        this.stop()
        return
      }
      const jitter = profile.jitterMs > 0 ? Math.floor(Math.random() * profile.jitterMs) : 0
      this.timer = setTimeout(tick, Math.max(5, profile.intervalMs + jitter))
    }
    tick()
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.status = { ...this.status, running: false }
    this.emit(true)
  }

  getStatus(): AutoClickerStatus {
    return { ...this.status }
  }

  dispose(): void {
    this.stop()
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
