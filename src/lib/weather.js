import { CITIES } from './config'

const WMO = [
  [[0], 'Clear', '☀️'],
  [[1], 'Mostly clear', '🌤️'],
  [[2], 'Partly cloudy', '⛅'],
  [[3], 'Overcast', '☁️'],
  [[45, 48], 'Fog', '🌫️'],
  [[51, 53, 55, 56, 57], 'Drizzle', '🌦️'],
  [[61, 63, 65, 66, 67], 'Rain', '🌧️'],
  [[71, 73, 75, 77, 85, 86], 'Snow', '❄️'],
  [[80, 81, 82], 'Showers', '🌦️'],
  [[95, 96, 99], 'Thunderstorms', '⛈️'],
]

export function describeCode(code) {
  for (const [codes, label, icon] of WMO) {
    if (codes.includes(code)) return { label, icon }
  }
  return { label: 'Weather', icon: '🌡️' }
}

const cache = {}

export async function fetchForecast(cityKey) {
  if (cache[cityKey] && Date.now() - cache[cityKey].at < 15 * 60 * 1000) return cache[cityKey].data
  const { lat, lon } = CITIES[cityKey]
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=7`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`)
  const raw = await res.json()
  const data = {
    current: {
      temp: Math.round(raw.current.temperature_2m),
      feels: Math.round(raw.current.apparent_temperature),
      ...describeCode(raw.current.weather_code),
    },
    daily: raw.daily.time.map((date, i) => ({
      date,
      hi: Math.round(raw.daily.temperature_2m_max[i]),
      lo: Math.round(raw.daily.temperature_2m_min[i]),
      precip: raw.daily.precipitation_probability_max[i] ?? 0,
      ...describeCode(raw.daily.weather_code[i]),
    })),
  }
  cache[cityKey] = { at: Date.now(), data }
  return data
}

export function dayName(dateStr, index) {
  if (index === 0) return 'Today'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}
