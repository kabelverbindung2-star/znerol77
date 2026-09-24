import { useEffect, useRef } from 'react'

/**
 * Runs `fn` now and then every `ms`, but only while the window is actually visible,
 * and never overlapping itself. Keeps background work (and fan noise) down.
 */
export function usePoll(fn: () => Promise<unknown> | void, ms: number, deps: unknown[] = []): void {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let busy = false
    let stopped = false
    const run = async (): Promise<void> => {
      if (busy || stopped || document.visibilityState !== 'visible') return
      busy = true
      try {
        await fnRef.current()
      } catch {
        // callers show their own errors
      } finally {
        busy = false
      }
    }
    run()
    const t = setInterval(run, ms)
    const onVis = (): void => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stopped = true
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps])
}
