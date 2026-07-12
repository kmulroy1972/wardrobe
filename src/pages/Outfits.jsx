import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FlatLay from '../components/FlatLay'
import { deleteOutfit, listOutfits } from '../lib/data'
import { FORMALITY } from '../lib/constants'

export default function Outfits() {
  const [outfits, setOutfits] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    listOutfits().then(setOutfits).catch((e) => setErr(e.message))
  }

  async function remove(o) {
    if (!window.confirm(`Delete the outfit “${o.name}”? The garments stay in your closet.`)) return
    try {
      await deleteOutfit(o.id)
      load()
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <div className="eyebrow">The lookbook</div>
          <h1>Outfits</h1>
        </div>
        <Link className="btn small" to="/outfits/new">+ Build an outfit</Link>
      </div>

      {err && <p className="form-msg">{err}</p>}
      {outfits === null ? (
        <p className="muted">Opening the lookbook…</p>
      ) : outfits.length === 0 ? (
        <div className="empty">
          <h3>No saved outfits yet</h3>
          <p>Build one by hand, or save a stylist suggestion you like.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn" to="/outfits/new">Build an outfit</Link>
            <Link className="btn ghost" to="/stylist">Ask the stylist</Link>
          </div>
        </div>
      ) : (
        <div className="stack">
          {outfits.map((o) => {
            const items = (o.outfit_items || [])
              .sort((a, b) => a.position - b.position)
              .filter((it) => it.garment)
              .map((it) => ({ slot: it.slot, g: it.garment }))
            return (
              <div key={o.id} className="card fade-in">
                <div className="spread">
                  <div>
                    <h3>{o.name}</h3>
                    <div className="row" style={{ gap: 6, marginTop: 4 }}>
                      {o.occasion && <span className="chip green">{FORMALITY.find((f) => f.id === o.occasion)?.label}</span>}
                      {o.location && <span className="chip">{o.location === 'dc' ? 'D.C.' : 'Howell'}</span>}
                    </div>
                  </div>
                  <button className="btn small danger" onClick={() => remove(o)}>Delete</button>
                </div>
                {items.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <FlatLay items={items} />
                  </div>
                )}
                {o.notes && <p className="muted" style={{ marginTop: 8 }}>{o.notes}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
