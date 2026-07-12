import { CITIES } from '../lib/config'
import { dayName } from '../lib/weather'

export default function WeatherCard({ cityKey, forecast, error }) {
  const city = CITIES[cityKey]
  if (error) {
    return (
      <div className="card">
        <div className="eyebrow">{city.label}</div>
        <p className="muted">Weather is unavailable right now — {error}</p>
      </div>
    )
  }
  if (!forecast) {
    return (
      <div className="card">
        <div className="eyebrow">{city.label}</div>
        <p className="muted">Checking the sky…</p>
      </div>
    )
  }
  const { current, daily } = forecast
  return (
    <div className="card fade-in">
      <div className="eyebrow">{city.label}</div>
      <div className="wx-now">
        <span className="temp">{current.temp}°</span>
        <span className="cond">
          {current.icon} {current.label} · feels {current.feels}°
        </span>
      </div>
      <div className="muted">
        High {daily[0].hi}° / Low {daily[0].lo}°
        {daily[0].precip >= 30 ? ` · ${daily[0].precip}% chance of rain` : ''}
      </div>
      <div className="wx-week">
        {daily.map((d, i) => (
          <div key={d.date} className="wx-day">
            <div className="d">{dayName(d.date, i)}</div>
            <div className="i">{d.icon}</div>
            <div className="hi">{d.hi}°</div>
            <div className="lo">{d.lo}°</div>
            {d.precip >= 40 ? <div className="rain">{d.precip}%</div> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
