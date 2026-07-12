import { useState } from 'react'
import FlatLay from './FlatLay'
import { categoryById, SLOT_LABELS } from '../lib/constants'
import { saveOutfit } from '../lib/data'

export default function OutfitSuggestion({ outfit, occasion, location }) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function save() {
    setSaving(true)
    setErr(null)
    try {
      await saveOutfit({
        name: outfit.name,
        occasion,
        location,
        notes: 'Saved from a stylist suggestion',
        items: outfit.items,
      })
      setSaved(true)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card fade-in">
      <div className="spread">
        <h3>{outfit.name}</h3>
        <button className="btn small ghost" onClick={save} disabled={saving || saved}>
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save outfit'}
        </button>
      </div>
      <div style={{ margin: '10px 0' }}>
        <FlatLay items={outfit.items} />
      </div>
      <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: '0.88rem' }}>
        {outfit.items.map(({ slot, g }) => (
          <li key={g.id + slot}>
            <strong>{SLOT_LABELS[slot] || categoryById(g.category).label}:</strong>{' '}
            {g.name}{g.brand ? ` — ${g.brand}` : ''}
          </li>
        ))}
      </ul>
      <div className="stack" style={{ gap: 6 }}>
        {outfit.tips.map((t, i) => (
          <div className="tip" key={i}>{t}</div>
        ))}
      </div>
      {err && <p className="form-msg">{err}</p>}
    </div>
  )
}
