import { useCallback, useEffect, useRef, useState } from 'react'

export function useHighscore(key: string): [number, (score: number) => boolean] {
  const storageKey = `znerol.highscore.${key}`
  const [best, setBest] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(storageKey)) || 0
    } catch {
      return 0
    }
  })
  const submit = useCallback(
    (score: number): boolean => {
      if (score <= best) return false
      setBest(score)
      try {
        localStorage.setItem(storageKey, String(score))
      } catch {
        // ignore
      }
      return true
    },
    [best, storageKey]
  )
  return [best, submit]
}

/** Reads a CSS variable from the app root (canvas can't use var()). */
export function cssVar(name: string, fallback: string): string {
  const el = document.querySelector('.app') ?? document.documentElement
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  return v || fallback
}

/** requestAnimationFrame loop with delta time in seconds; stops on unmount. */
export function useFrame(cb: (dt: number) => void, running: boolean): void {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    const loop = (t: number): void => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      ref.current(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running])
}

/** Keyboard handler bound to the window while the game is mounted. */
export function useKeys(handler: (e: KeyboardEvent) => void): void {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const on = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      ref.current(e)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])
}

/** Sets up a crisp canvas of logical size w×h and returns its 2D context getter. */
export function setupCanvas(canvas: HTMLCanvasElement | null, w: number, h: number): CanvasRenderingContext2D | null {
  if (!canvas) return null
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  if (canvas.width !== w * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
  }
  const ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
