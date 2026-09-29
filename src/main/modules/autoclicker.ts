import { winHelper } from './winhelper'

/** Everything the autoclicker can do; one profile = one set of these settings. */
export interface AutoClickerProfile {
  id: string
  name: string
  cps: number // clicks per second, 1-500
  input: 'mouse' | 'keyboard'
  button: 'left' | 'right' | 'middle'
  mods: number // held during each click: 1 Ctrl, 2 Alt, 4 Shift, 8 Win
  key: string // keyboard mode: key to press (name from the key list)
  keyVk: number
  hotkeyMods: number
  hotkeyKey: string // e.g. "K", "F8"
  hotkeyVk: number
  hotkeyMode: 'toggle' | 'hold' // hold = clicks only while the hotkey is held down
  limitOn: boolean
  limit: number
  timeOn: boolean
  time: number
  timeUnit: 's' | 'min'
  cornerStop: boolean // stop when the mouse goes into a screen corner
  edgeStop: boolean // stop when the mouse reaches a screen edge
  doubleOn: boolean
  doubleGap: number // ms between the two clicks
  jitterOn: boolean
  jitterPct: number // +/- % around the interval, looks more human
  fixedOn: boolean
  positions: { x: number; y: number }[] // physical screen pixels, clicked in turn
  markers: boolean
}

export interface AutoClickerStatus {
  running: boolean
  waiting: boolean // hold mode: armed, waiting for the key
  clicks: number
  profileId: string | null
  error: string | null
  stoppedBy: '' | 'limit' | 'time' | 'corner' | 'edge'
}

export const MIN_INTERVAL_MS = 2

export const defaultProfiles: AutoClickerProfile[] = [
  {
    id: 'default',
    name: 'Standard',
    cps: 10,
    input: 'mouse',
    button: 'left',
    mods: 0,
    key: 'Space',
    keyVk: 0x20,
    hotkeyMods: 0,
    hotkeyKey: 'F8',
    hotkeyVk: 0x77,
    hotkeyMode: 'toggle',
    limitOn: false,
    limit: 1000,
    timeOn: false,
    time: 60,
    timeUnit: 's',
    cornerStop: true,
    edgeStop: false,
    doubleOn: false,
    doubleGap: 30,
    jitterOn: true,
    jitterPct: 15,
    fixedOn: false,
    positions: [],
    markers: true
  }
]

/** Profiles saved by older versions (intervalMs, target/x/y …) become complete new ones. */
export function upgradeProfile(p: any): AutoClickerProfile {
  const d = defaultProfiles[0]
  const out: AutoClickerProfile = { ...d, ...p }
  if (typeof p.intervalMs === 'number' && typeof p.cps !== 'number') out.cps = Math.round(1000 / Math.max(2, p.intervalMs))
  if (p.mode === 'double' && p.doubleOn === undefined) out.doubleOn = true
  if (p.target === 'fixed' && p.fixedOn === undefined) {
    out.fixedOn = true
    out.positions = [{ x: p.x ?? 0, y: p.y ?? 0 }]
  }
  if (typeof p.hotkey === 'string' && p.hotkeyKey === undefined && p.hotkey) out.hotkeyKey = p.hotkey.split('+').pop() || 'F8'
  if (typeof p.clickLimit === 'number' && p.limitOn === undefined && p.clickLimit > 0) {
    out.limitOn = true
    out.limit = p.clickLimit
  }
  out.cps = Math.max(1, Math.min(500, Math.round(out.cps)))
  return out
}

/**
 * The clicking itself runs on a thread inside the Windows helper (C#, 1 ms timer,
 * SendInput); Node only starts/stops it and polls the counter a few times a second.
 */
class ClickerEngine {
  private poll: ReturnType<typeof setInterval> | null = null
  private status: AutoClickerStatus = { running: false, waiting: false, clicks: 0, profileId: null, error: null, stoppedBy: '' }
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

  async start(raw: AutoClickerProfile): Promise<void> {
    if (this.status.running) return
    const p = upgradeProfile(raw)
    const timeMs = p.timeOn ? Math.max(1, p.time) * (p.timeUnit === 'min' ? 60_000 : 1000) : 0
    try {
      await winHelper.request(
        'clickRun',
        {
          button: p.button,
          key: p.input === 'keyboard' ? p.keyVk : 0,
          mods: p.mods,
          double: p.doubleOn,
          gap: p.doubleGap,
          interval: Math.max(MIN_INTERVAL_MS, 1000 / p.cps),
          jitterPct: p.jitterOn ? p.jitterPct : 0,
          limit: p.limitOn ? Math.max(1, p.limit) : 0,
          time: timeMs,
          corner: p.cornerStop,
          edge: p.edgeStop,
          positions: p.fixedOn ? p.positions.map((q) => `${Math.round(q.x)},${Math.round(q.y)}`).join(';') : '',
          holdKey: p.hotkeyMode === 'hold' ? p.hotkeyVk : 0,
          holdMods: p.hotkeyMode === 'hold' ? p.hotkeyMods : 0
        },
        30000
      )
    } catch (err) {
      this.status = { running: false, waiting: false, clicks: 0, profileId: null, error: (err as Error).message, stoppedBy: '' }
      this.emit()
      throw err
    }
    this.status = { running: true, waiting: p.hotkeyMode === 'hold', clicks: 0, profileId: p.id, error: null, stoppedBy: '' }
    this.emit()
    this.onRunning(true)
    this.poll = setInterval(async () => {
      try {
        const s = await winHelper.request<{ running: boolean; clicks: number; state: string; reason: string }>('clickStatus')
        this.status = {
          ...this.status,
          clicks: s.clicks,
          running: s.running,
          waiting: s.state === 'waiting',
          stoppedBy: (s.reason as AutoClickerStatus['stoppedBy']) || ''
        }
        this.emit()
        if (!s.running) this.finish() // a limit stopped it
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
    this.status = { ...this.status, running: false, waiting: false }
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

/** Mouse position in physical pixels (what SetCursorPos uses). */
export async function cursorPosition(): Promise<{ x: number; y: number }> {
  return winHelper.request<{ x: number; y: number }>('cursorPos', {}, 5000)
}
