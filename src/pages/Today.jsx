import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import WeatherCard from '../components/WeatherCard'
import OutfitSuggestion from '../components/OutfitSuggestion'
import { fetchForecast } from '../lib/weather'
import { listGarments, listWishlist } from '../lib/data'
import { recommendOutfits } from '../lib/outfitEngine'
import { CITIES } from '../lib/config'

export default function Today() {
  const [wx, setWx] = useState({})
  const [wxErr, setWxErr] = useState({})
  const [garments, setGarments] = useState(null)
  const [toBuyCount, setToBuyCount] = useState(0)
  const [city, setCity] = useState('dc')

  useEffect(() => {
    for (const key of Object.keys(CITIES)) {
      fetchForecast(key)
        .then((f) => setWx((w) => ({ ...w, [key]: f })))
        .catch((e) => setWxErr((w) => ({ ...w, [key]: e.message })))
    }
    listGarments().then(setGarments).catch(() => setGarments([]))
    listWishlist()
      .then((items) => setToBuyCount(items.filter((i) => i.status !== 'purchased').length))
      .catch(() => {})
  }, [])

  const today = new Date()
  const isWeekend = today.getDay() === 0 || today.getDay() === 6
  const occasion = isWeekend ? 'casual' : 'business_casual'
  const cityGarments = garments?.filter((g) => g.location === city) ?? []
  const rec =
    garments && wx[city]
      ? recommendOutfits({ garments: cityGarments, occasion, weather: wx[city].daily[0], count: 1 })
      : null

  const dcCount = garments?.filter((g) => g.location === 'dc').length ?? 0
  const hwCount = garments?.filter((g) => g.location === 'howell').length ?? 0

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h1>Good {today.getHours() < 12 ? 'morning' : today.getHours() < 17 ? 'afternoon' : 'evening'}.</h1>
        </div>
        <Link className="btn small" to="/closet/new">+ Add garment</Link>
      </div>

      <div className="weather-cards">
        <WeatherCard cityKey="dc" forecast={wx.dc} error={wxErr.dc} />
        <WeatherCard cityKey="howell" forecast={wx.howell} error={wxErr.howell} />
      </div>

      <div className="card ticket">
        <div className="spread">
          <div>
            <div className="eyebrow">Today's ticket · {isWeekend ? 'casual' : 'business casual'}</div>
            <h2>What to wear</h2>
          </div>
          <div className="seg" role="group" aria-label="Which closet">
            <button className={city === 'dc' ? 'active' : ''} onClick={() => setCity('dc')}>D.C.</button>
            <button className={city === 'howell' ? 'active' : ''} onClick={() => setCity('howell')}>Howell</button>
          </div>
        </div>

        {garments === null ? (
          <p className="muted">Opening the closet…</p>
        ) : cityGarments.length === 0 ? (
          <div className="empty" style={{ marginTop: 12 }}>
            <h3>This closet is empty</h3>
            <p>Add a few garments and the morning suggestion appears here.</p>
            <Link className="btn" to="/closet/new">Catalog your first garment</Link>
          </div>
        ) : rec && rec.outfits.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <OutfitSuggestion outfit={rec.outfits[0]} occasion={occasion} location={city} />
            <p className="muted" style={{ marginTop: 8 }}>
              Want something different? <Link to="/stylist">Open the stylist</Link> for more options and occasions.
            </p>
          </div>
        ) : rec ? (
          <p className="muted" style={{ marginTop: 10 }}>
            Not enough pieces here yet for a full {occasion.replace('_', ' ')} outfit — missing: {rec.missing.join(', ')}.{' '}
            <Link to="/closet/new">Add garments</Link> or <Link to="/stylist">try another occasion</Link>.
          </p>
        ) : (
          <p className="muted">Waiting on the forecast…</p>
        )}
      </div>

      <div className="row">
        <Link to="/closet" className="chip green">D.C. closet · {dcCount} pieces</Link>
        <Link to="/closet" className="chip green">Howell closet · {hwCount} pieces</Link>
        <Link to="/outfits" className="chip brass">Saved outfits</Link>
        {toBuyCount > 0 && <Link to="/tobuy" className="chip brass">To buy · {toBuyCount}</Link>}
      </div>
    </div>
  )
}
