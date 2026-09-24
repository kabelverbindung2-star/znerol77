import { useEffect, useState } from 'react'

export const BOOST_KEY = 'znerol.boost.blocklist'
// Discord and Spotify are deliberately not on here: most people game with them open.
export const DEFAULT_BLOCKLIST = ['OneDrive', 'Teams', 'Skype']

export function boostList(): string[] {
  try {
    const saved = localStorage.getItem(BOOST_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // keep defaults
  }
  return DEFAULT_BLOCKLIST
}

export function BoostExplainer(): JSX.Element {
  const list = boostList()
  return (
    <>
      <b>Was Boost macht:</b>
      <br />1. Stellt den Windows-Energiesparplan auf „Höchstleistung“ – der Prozessor taktet nicht mehr herunter.
      <br />2. Beendet diese Programme im Hintergrund: {list.length ? list.join(', ') : 'keine'} (änderbar im Tab Spiele).
      <br />
      <b>Beim Ausschalten</b> kommt dein vorheriger Energiesparplan zurück. Beendete Programme startest du bei Bedarf selbst neu.
      Der PC wird dabei eher lauter und wärmer, nicht leiser.
    </>
  )
}

export function useBoost(): { on: boolean; busy: boolean; toggle: (on: boolean) => Promise<void> } {
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    window.znerol.games.boostState().then(setOn).catch(() => undefined)
    return window.znerol.games.onBoost(setOn)
  }, [])
  const toggle = async (next: boolean): Promise<void> => {
    setBusy(true)
    try {
      if (next) await window.znerol.games.boostOn(boostList())
      else await window.znerol.games.boostOff()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return { on, busy, toggle }
}
