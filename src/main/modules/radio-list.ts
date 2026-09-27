// Radio stations offered in the app. They are looked up by name in the free Radio Browser
// directory (radio-browser.info) when the app runs, so changed stream addresses do not break
// them. Checked with scripts/probe-radio.mjs.

export interface StationPick {
  name: string // shown in the app
  search: string // name in the directory
  genre: string
}

export const STATIONS: StationPick[] = [
  { name: '1LIVE', search: '1LIVE', genre: 'Charts' },
  { name: 'bigFM', search: 'bigFM', genre: 'Charts' },
  { name: 'ENERGY', search: 'ENERGY Berlin', genre: 'Charts' },
  { name: 'Kiss FM', search: '98.8 KISS FM', genre: 'Hip-Hop' },
  { name: 'JAM FM', search: 'JAM FM', genre: 'Hip-Hop' },
  { name: 'bigFM Deutschrap', search: 'bigFM Deutschrap', genre: 'Deutschrap' },
  { name: 'I Love Hip Hop', search: 'I LOVE HIP HOP', genre: 'Hip-Hop' },
  { name: 'I Love Deutschrap', search: 'I LOVE DEUTSCHRAP', genre: 'Deutschrap' },
  { name: 'I Love Radio', search: 'I LOVE RADIO', genre: 'Charts' },
  { name: 'I Love 2 Dance', search: 'I LOVE 2 DANCE', genre: 'Dance' },
  { name: 'SWR3', search: 'SWR3', genre: 'Pop' },
  { name: 'Bayern 3', search: 'BAYERN 3', genre: 'Pop' },
  { name: 'Antenne Bayern', search: 'ANTENNE BAYERN', genre: 'Pop' },
  { name: 'N-JOY', search: 'N-JOY', genre: 'Charts' },
  { name: 'Deutschlandfunk Nova', search: 'Deutschlandfunk Nova', genre: 'Pop' },
  { name: 'Radio Hamburg', search: 'Radio Hamburg', genre: 'Pop' },
  { name: 'Lofi Hip Hop', search: 'lofi hip hop', genre: 'Chill' },
  { name: 'Chillout Lounge', search: 'Chillout Lounge', genre: 'Chill' },
  { name: 'Sunshine Live', search: 'sunshine live', genre: 'Dance' },
  { name: 'Rock Antenne', search: 'ROCK ANTENNE', genre: 'Rock' }
]

/** Genre buttons: search the directory by tag. */
export const GENRES = [
  { label: 'Charts', tag: 'top 40' },
  { label: 'Hip-Hop', tag: 'hip hop' },
  { label: 'Deutschrap', tag: 'deutschrap' },
  { label: 'Pop', tag: 'pop' },
  { label: 'Dance', tag: 'dance' },
  { label: 'Chill', tag: 'chillout' },
  { label: 'Rock', tag: 'rock' },
  { label: 'Lofi', tag: 'lofi' }
]
