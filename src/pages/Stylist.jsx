import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import OutfitSuggestion from '../components/OutfitSuggestion'
import { useAuth } from '../App'
import { addWishlistItem, askStylist, getProfile, listGarments } from '../lib/data'
import { fetchForecast, dayName } from '../lib/weather'
import { recommendOutfits } from '../lib/outfitEngine'
import { FORMALITY, SLOT_LABELS } from '../lib/constants'

// A sensible category to shop for when an outfit slot has nothing in it
const GAP_CATEGORY = {
  formal: { suit: 'suit', jacket: 'blazer', top: 'dress_shirt', bottom: 'dress_pants', shoes: 'dress_shoes' },
  business_casual: { top: 'dress_shirt', bottom: 'chinos', shoes: 'dress_shoes' },
  casual: { top: 'casual_shirt', bottom: 'jeans', shoes: 'casual_shoes' },
}

function GapList({ missing, occasion, city }) {
  const [added, setAdded] = useState({})
  async function add(slot) {
    const category = GAP_CATEGORY[occasion]?.[slot] || 'accessory'
    try {
      await addWishlistItem({
        name: `${SLOT_LABELS[slot] || slot} (${occasion.replace('_', ' ')})`,
        category,
        priority: 'soon',
        location: city,
        notes: 'Added from a stylist gap',
      })
      setAdded((a) => ({ ...a, [slot]: true }))
    } catch {
      // leave the button active so it can be retried
    }
  }
  return (
    <div className="row" style={{ gap: 6 }}>
      <span className="muted">Missing for {occasion.replace('_', ' ')}:</span>
      {missing.map((slot) => (
        <button key={slot} className="chip brass" style={{ cursor: 'pointer' }}
          onClick={() => add(slot)} disabled={added[slot]}>
          {added[slot] ? `${SLOT_LABELS[slot]} ✓ on the list` : `+ To Buy: ${SLOT_LABELS[slot] || slot}`}
        </button>
      ))}
    </div>
  )
}

export default function Stylist() {
  const { user } = useAuth()
  const [garments, setGarments] = useState(null)
  const [wx, setWx] = useState(null)
  const [occasion, setOccasion] = useState('business_casual')
  const [city, setCity] = useState('dc')
  const [dayIdx, setDayIdx] = useState(0)
  const [rec, setRec] = useState(null)
  const [shuffle, setShuffle] = useState(0)

  // AI chat state
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [aiStatus, setAiStatus] = useState('unknown') // unknown | ready | no_key
  const chatEnd = useRef(null)

  useEffect(() => {
    listGarments().then(setGarments).catch(() => setGarments([]))
  }, [])

  useEffect(() => {
    setWx(null)
    fetchForecast(city).then(setWx).catch(() => setWx(undefined))
  }, [city])

  useEffect(() => {
    if (!garments || !wx) return
    const pool = garments.filter((g) => g.location === city)
    setRec(recommendOutfits({ garments: pool, occasion, weather: wx.daily[dayIdx], count: 3 }))
  }, [garments, wx, occasion, city, dayIdx, shuffle])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, thinking])

  async function send(e) {
    e.preventDefault()
    const question = draft.trim()
    if (!question || thinking) return
    setDraft('')
    const history = messages.map((m) => ({ role: m.role, content: m.text }))
    setMessages((ms) => [...ms, { role: 'user', text: question }])
    setThinking(true)
    try {
      const profile = await getProfile(user.id)
      const wardrobe = (garments || []).filter((g) => g.status === 'active').map((g) => ({
        id: g.id, name: g.name, category: g.category, brand: g.brand, color: g.color,
        pattern: g.pattern, material: g.material, location: g.location,
        formality: g.formality, warmth: g.warmth, fit_notes: g.fit_notes,
      }))
      const weather = wx ? { city, today: wx.daily[0], week: wx.daily } : null
      const res = await askStylist({ question, wardrobe, weather, profile: { height: profile.height, fit_notes: profile.fit_notes, sizes: profile.sizes }, history })
      if (res?.error === 'no_key') {
        setAiStatus('no_key')
        setMessages((ms) => [...ms, { role: 'assistant', text: 'The AI stylist isn’t connected yet — an Anthropic API key needs to be added (see Profile page for the one-time setup). The outfit suggestions above work without it.' }])
      } else {
        setAiStatus('ready')
        setMessages((ms) => [...ms, { role: 'assistant', text: res?.text || 'No answer came back — try again.' }])
      }
    } catch (err) {
      setMessages((ms) => [...ms, { role: 'assistant', text: `Something went wrong: ${err.message}` }])
    } finally {
      setThinking(false)
    }
  }

  const garmentById = (id) => garments?.find((g) => g.id === id)

  function renderAiText(text) {
    // Turn [[garment-id]] references into linked chips with the photo
    const parts = text.split(/(\[\[[0-9a-f-]{36}\]\])/g)
    return parts.map((p, i) => {
      const m = p.match(/^\[\[([0-9a-f-]{36})\]\]$/)
      if (!m) return <span key={i}>{p}</span>
      const g = garmentById(m[1])
      if (!g) return null
      return (
        <Link key={i} to={`/closet/${g.id}`} className="garment-chip">
          {g.photo_url && <img src={g.photo_url} alt="" />}
          {g.name}
        </Link>
      )
    })
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <div className="eyebrow">Your valet</div>
          <h1>Stylist</h1>
        </div>
      </div>

      <div className="card">
        <div className="stack" style={{ gap: 10 }}>
          <div className="seg" role="group" aria-label="Occasion">
            {FORMALITY.map((f) => (
              <button key={f.id} className={occasion === f.id ? 'active' : ''} onClick={() => setOccasion(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="row">
            <div className="seg" role="group" aria-label="City">
              <button className={city === 'dc' ? 'active' : ''} onClick={() => setCity('dc')}>D.C.</button>
              <button className={city === 'howell' ? 'active' : ''} onClick={() => setCity('howell')}>Howell</button>
            </div>
            {wx && (
              <div className="seg" role="group" aria-label="Day">
                {wx.daily.slice(0, 5).map((d, i) => (
                  <button key={d.date} className={dayIdx === i ? 'active' : ''} onClick={() => setDayIdx(i)}>
                    {dayName(d.date, i)} {d.hi}°
                  </button>
                ))}
              </div>
            )}
            <button className="btn small ghost" onClick={() => setShuffle((s) => s + 1)}>Shuffle ↻</button>
          </div>
          {wx && (
            <p className="muted" style={{ margin: 0 }}>
              {wx.daily[dayIdx].icon} {wx.daily[dayIdx].label}, high {wx.daily[dayIdx].hi}° / low {wx.daily[dayIdx].lo}°
              {wx.daily[dayIdx].precip >= 40 ? ` — ${wx.daily[dayIdx].precip}% chance of rain` : ''}
            </p>
          )}
        </div>
      </div>

      {garments === null ? (
        <p className="muted">Opening the closet…</p>
      ) : rec === null ? (
        <p className="muted">Waiting on the forecast…</p>
      ) : rec.outfits.length === 0 ? (
        <div className="empty">
          <h3>Not enough pieces in this closet</h3>
          <p>
            For a {occasion.replace('_', ' ')} outfit in {city === 'dc' ? 'D.C.' : 'Howell'} I still need:{' '}
            {rec.missing.map((m) => m.replace('_', ' ')).join(', ')}.
          </p>
          <div className="row" style={{ justifyContent: 'center', marginBottom: 10 }}>
            <GapList missing={rec.missing} occasion={occasion} city={city} />
          </div>
          <Link className="btn" to="/closet/new">Add garments</Link>
        </div>
      ) : (
        <div className="stack">
          {rec.outfits.map((o, i) => (
            <OutfitSuggestion key={o.name + i + shuffle} outfit={o} occasion={occasion} location={city} />
          ))}
          {rec.missing.length > 0 && (
            <GapList missing={rec.missing} occasion={occasion} city={city} />
          )}
        </div>
      )}

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 8 }}>Ask the stylist anything</div>
        <div className="chat" aria-live="polite">
          {messages.length === 0 && (
            <p className="muted" style={{ margin: 0 }}>
              Try: “What should I wear to a client dinner in Howell on Friday?” or
              “Which of my shirts go with the navy blazer?”
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === 'user' ? 'me' : 'ai'}`}>
              {m.role === 'assistant' ? renderAiText(m.text) : m.text}
            </div>
          ))}
          {thinking && <div className="bubble ai">Consulting the closet…</div>}
          <div ref={chatEnd} />
        </div>
        <form onSubmit={send} className="row" style={{ marginTop: 12 }}>
          <input
            value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about an outfit…" aria-label="Ask the stylist"
            style={{ flex: 1, minWidth: 160, padding: '10px 14px', borderRadius: 999, border: '1px solid var(--hairline)', background: 'var(--paper)', fontFamily: 'var(--body)', fontSize: '0.92rem' }}
          />
          <button className="btn" disabled={thinking || !draft.trim()}>Ask</button>
        </form>
        {aiStatus === 'no_key' && (
          <p className="muted" style={{ marginTop: 8 }}>
            One-time setup: add an <code>ANTHROPIC_API_KEY</code> secret to the “stylist” edge function in Supabase to turn on free-form chat.
          </p>
        )}
      </div>
    </div>
  )
}
