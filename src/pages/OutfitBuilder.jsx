import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FlatLay from '../components/FlatLay'
import GarmentThumb from '../components/GarmentThumb'
import OutfitSuggestion from '../components/OutfitSuggestion'
import { listGarments, saveOutfit } from '../lib/data'
import { categoryById, FORMALITY, SLOT_LABELS } from '../lib/constants'
import { recommendOutfits } from '../lib/outfitEngine'
import { parseOutfitRequest } from '../lib/outfitRequest'

const SLOTS = ['suit', 'jacket', 'top', 'layer', 'bottom', 'shoes', 'outer', 'tie', 'belt', 'accessory']

export default function OutfitBuilder() {
  const navigate = useNavigate()
  const [garments, setGarments] = useState(null)
  const [request, setRequest] = useState('')
  const [recommendations, setRecommendations] = useState(null)
  const [recommendErr, setRecommendErr] = useState(null)
  const [name, setName] = useState('')
  const [occasion, setOccasion] = useState('business_casual')
  const [location, setLocation] = useState('dc')
  const [notes, setNotes] = useState('')
  const [picked, setPicked] = useState({}) // slot -> garment
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    listGarments().then(setGarments).catch((e) => setErr(e.message))
  }, [])

  const bySlot = useMemo(() => {
    const map = {}
    for (const slot of SLOTS) map[slot] = []
    for (const g of garments || []) {
      if (g.location !== location || g.status === 'archived') continue
      map[categoryById(g.category).slot]?.push(g)
    }
    return map
  }, [garments, location])

  function toggle(slot, g) {
    setPicked((cur) => ({ ...cur, [slot]: cur[slot]?.id === g.id ? undefined : g }))
  }

  const items = SLOTS.filter((s) => picked[s]).map((s) => ({ slot: s, g: picked[s] }))

  function clearRecommendations() {
    setRecommendations(null)
    setRecommendErr(null)
  }

  function recommend() {
    if (!garments) return
    const parsed = parseOutfitRequest(request)
    const result = recommendOutfits({
      garments: garments.filter((g) => g.location === location),
      occasion,
      count: parsed.count,
      constraints: parsed,
    })
    setRecommendations(result)

    const missing = result.unmet.length > 0 ? result.unmet : result.missing
    if (result.outfits.length === 0) {
      const labels = missing.map((slot) => SLOT_LABELS[slot] || slot).join(', ')
      setRecommendErr(labels
        ? `I can’t complete this request from the ${location === 'dc' ? 'D.C.' : 'Howell'} closet. Missing: ${labels}.`
        : 'I can’t make a complete outfit from the available garments in this closet.')
    } else if (result.outfits.length < parsed.count) {
      setRecommendErr(`I found ${result.outfits.length} complete ${result.outfits.length === 1 ? 'outfit' : 'outfits'} instead of ${parsed.count} from this closet.`)
    } else {
      setRecommendErr(null)
    }
  }

  function editRecommendation(outfit) {
    setPicked(Object.fromEntries(outfit.items.map(({ slot, g }) => [slot, g])))
    setName(outfit.name)
    setErr(null)
  }

  async function submit(e) {
    e.preventDefault()
    if (items.length === 0) {
      setErr('Pick at least one garment.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await saveOutfit({ name: name.trim() || 'Untitled outfit', occasion, location, notes, items })
      navigate('/outfits', { replace: true })
    } catch (e2) {
      setErr(e2.message)
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <div className="eyebrow">The workbench</div>
          <h1>Build an outfit</h1>
        </div>
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="outfit-request">Ask for recommendations</label>
          <div className="request-row">
            <input
              id="outfit-request"
              value={request}
              placeholder="Two dinners, sports jacket, no tie…"
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  recommend()
                }
              }}
            />
            <button type="button" className="btn" onClick={recommend} disabled={garments === null}>
              Recommend outfits
            </button>
          </div>
        </div>
        <div className="row">
          <div className="seg" role="group" aria-label="Occasion">
            {FORMALITY.map((f) => (
              <button type="button" key={f.id} className={occasion === f.id ? 'active' : ''} onClick={() => { setOccasion(f.id); clearRecommendations() }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Closet">
            <button type="button" className={location === 'dc' ? 'active' : ''} onClick={() => { setLocation('dc'); setPicked({}); clearRecommendations() }}>D.C.</button>
            <button type="button" className={location === 'howell' ? 'active' : ''} onClick={() => { setLocation('howell'); setPicked({}); clearRecommendations() }}>Howell</button>
          </div>
        </div>
        {recommendErr && <p className="form-msg" role="alert">{recommendErr}</p>}
      </div>

      {recommendations?.outfits.length > 0 && (
        <section className="stack" aria-live="polite" aria-label="Recommended outfits">
          <div className="spread recommendation-head">
            <div>
              <div className="eyebrow">From your closet</div>
              <h2>{recommendations.outfits.length} recommended {recommendations.outfits.length === 1 ? 'outfit' : 'outfits'}</h2>
            </div>
            <span className="muted">Save one now, or edit its pieces below.</span>
          </div>
          {recommendations.outfits.map((outfit, index) => (
            <OutfitSuggestion
              key={`${outfit.name}-${index}`}
              outfit={outfit}
              occasion={occasion}
              location={location}
              onEdit={editRecommendation}
            />
          ))}
        </section>
      )}

      <form onSubmit={submit} className="stack">

        {items.length > 0 && (
          <div className="card ticket">
            <div className="spread" style={{ marginBottom: 8 }}>
              <div className="eyebrow">Editable preview</div>
              <button className="btn small" disabled={busy}>{busy ? 'Saving…' : 'Save outfit'}</button>
            </div>
            <FlatLay items={items} />
          </div>
        )}

        {garments === null ? (
          <p className="muted">Opening the closet…</p>
        ) : (
          SLOTS.filter((s) => bySlot[s].length > 0).map((slot) => (
            <div key={slot} className="card">
              <div className="eyebrow" style={{ marginBottom: 8 }}>{SLOT_LABELS[slot]}</div>
              <div className="slot-scroller">
                {bySlot[slot].map((g) => (
                  <button
                    type="button" key={g.id}
                    className={`slot-pick ${picked[slot]?.id === g.id ? 'selected' : ''}`}
                    onClick={() => toggle(slot, g)}
                    aria-pressed={picked[slot]?.id === g.id}
                  >
                    <GarmentThumb garment={g} />
                    <span className="nm">{g.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}

        <div className="card">
          <div className="field">
            <label htmlFor="oname">Outfit name</label>
            <input id="oname" value={name} placeholder="Dinner with friends" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="onotes">Notes</label>
            <textarea id="onotes" value={notes} placeholder="Where you'd wear this…" onChange={(e) => setNotes(e.target.value)} />
          </div>
          {err && <p className="form-msg">{err}</p>}
          <div className="row">
            <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save outfit'}</button>
            <button type="button" className="btn ghost" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </div>
      </form>
    </div>
  )
}
