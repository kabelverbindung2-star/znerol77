import { useEffect, useState } from 'react'
import type { PerfSample } from './types'

export interface PerfHistory {
  cpu: number[]
  gpu: number[]
  mem: number[]
  temp: number[]
  rx: number[]
  tx: number[]
}

const EMPTY: PerfHistory = { cpu: [], gpu: [], mem: [], temp: [], rx: [], tx: [] }

/** Live samples from the main process plus a rolling history for sparklines. */
export function usePerf(length = 40): { sample: PerfSample | null; history: PerfHistory } {
  const [state, setState] = useState<{ sample: PerfSample | null; history: PerfHistory }>({
    sample: null,
    history: EMPTY
  })

  useEffect(() => {
    const push = (arr: number[], v: number): number[] => [...arr, v].slice(-length)
    return window.znerol.perf.onUpdate((data) => {
      const s = data as PerfSample
      setState((prev) => ({
        sample: s,
        history: {
          cpu: push(prev.history.cpu, s.cpu.load),
          gpu: push(prev.history.gpu, s.gpu[0]?.loadPercent ?? 0),
          mem: push(prev.history.mem, s.mem.usedPercent),
          temp: push(prev.history.temp, s.cpu.temp ?? s.gpu[0]?.temp ?? 0),
          rx: push(prev.history.rx, s.net.rx),
          tx: push(prev.history.tx, s.net.tx)
        }
      }))
    })
  }, [length])

  return state
}
