import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FlatLay from '../components/FlatLay'
import GarmentThumb from '../components/GarmentThumb'
import { listGarments, saveOutfit } from '../lib/data'
import { categoryById, FORMALITY, SLOT_LABELS } from '../lib/constants'

const SLOTS = ['suit', 'jacket', 'top', 'layer', 'bottom', 'shoes', 'outer', 'tie', 'belt', 'accessory']

export default function OutfitBuilder() {
  const navigate = useNavigate()
  const [garments, setGarments] = useState(null)
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

      <div className="card stylist-callout">
        <div>
          <div className="eyebrow">Need ideas first?</div>
          <h2 style={{ margin: '4px 0 6px' }}>Ask the stylist in ordinary language</h2>
          <p className="muted" style={{ margin: 0 }}>
            Try “Dinner with friends,” “Give me two looks without a tie,” or ask what goes with a specific garment.
          </p>
        </div>
        <Link className="btn" to="/stylist">Ask the stylist</Link>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 8 }}>Build manually</div>
        <div className="row">
          <div className="seg" role="group" aria-label="Occasion">
            {FORMALITY.map((f) => (
              <button type="button" key={f.id} className={occasion === f.id ? 'active' : ''} onClick={() => setOccasion(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Closet">
            <button type="button" className={location === 'dc' ? 'active' : ''} onClick={() => { setLocation('dc'); setPicked({}) }}>D.C.</button>
            <button type="button" className={location === 'howell' ? 'active' : ''} onClick={() => { setLocation('howell'); setPicked({}) }}>Howell</button>
          </div>
        </div>
      </div>

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
