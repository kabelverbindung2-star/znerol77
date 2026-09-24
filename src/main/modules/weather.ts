import { net } from 'electron'

// Open-Meteo: free, no API key, no account.
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const CACHE_MS = 10 * 60 * 1000

export interface Place {
  name: string
  region: string
  country: string
  lat: number
  lon: number
}

export interface Weather {
  temp: number
  feelsLike: number
  code: number
  isDay: boolean
  wind: number
  humidity: number
  min: number
  max: number
  fetchedAt: number
}

let cache: { key: string; data: Weather } | null = null

async function getJson(url: string): Promise<any> {
  const res = await net.fetch(url)
  if (!res.ok) throw new Error(`Wetterdienst antwortet mit ${res.status}`)
  return res.json()
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const data = await getJson(`${GEO_URL}?name=${encodeURIComponent(q)}&count=6&language=de&format=json`)
  return (data.results ?? []).map((r: any) => ({
    name: r.name,
    region: r.admin1 ?? '',
    country: r.country ?? '',
    lat: r.latitude,
    lon: r.longitude
  }))
}

export async function getWeather(lat: number, lon: number): Promise<Weather> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`
  if (cache && cache.key === key && Date.now() - cache.data.fetchedAt < CACHE_MS) return cache.data
  const url =
    `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m' +
    '&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto'
  const d = await getJson(url)
  const data: Weather = {
    temp: d.current.temperature_2m,
    feelsLike: d.current.apparent_temperature,
    code: d.current.weather_code,
    isDay: d.current.is_day === 1,
    wind: d.current.wind_speed_10m,
    humidity: d.current.relative_humidity_2m,
    min: d.daily?.temperature_2m_min?.[0] ?? d.current.temperature_2m,
    max: d.daily?.temperature_2m_max?.[0] ?? d.current.temperature_2m,
    fetchedAt: Date.now()
  }
  cache = { key, data }
  return data
}
