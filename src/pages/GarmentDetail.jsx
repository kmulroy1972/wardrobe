import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import GarmentThumb from '../components/GarmentThumb'
import { deleteGarment, getGarment, markWorn } from '../lib/data'
import { categoryById, FORMALITY, LOCATIONS, STATUSES, WARMTH } from '../lib/constants'

const label = (list, id) => list.find((x) => x.id === id)?.label || id

export default function GarmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [g, setG] = useState(null)
  const [err, setErr] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [activePhoto, setActivePhoto] = useState(null)

  useEffect(() => {
    getGarment(id).then(setG).catch((e) => setErr(e.message))
  }, [id])

  async function wearToday() {
    try {
      setG(await markWorn(g))
    } catch (e) {
      setErr(e.message)
    }
  }

  async function remove() {
    try {
      await deleteGarment(g)
      navigate('/closet', { replace: true })
    } catch (e) {
      setErr(e.message)
      setConfirming(false)
    }
  }

  if (err && !g) return <p className="form-msg">{err}</p>
  if (!g) return <p className="muted">Fetching the garment…</p>

  const shopQuery = encodeURIComponent([g.brand, g.name, g.size].filter(Boolean).join(' '))

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">{categoryById(g.category).label} · {g.location === 'dc' ? 'Washington, D.C.' : 'Howell, NJ'}</div>
          <h1>{g.name}</h1>
        </div>
        <Link className="btn small ghost" to={`/closet/${g.id}/edit`}>Edit</Link>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ aspectRatio: '4 / 3' }}>
          <GarmentThumb garment={activePhoto ? { ...g, photo_url: activePhoto } : g} />
        </div>
      </div>

      {(() => {
        const allPhotos = [g.photo_url, ...(g.photos || [])].filter(Boolean)
        if (allPhotos.length < 2) return null
        const shown = activePhoto || allPhotos[0]
        return (
          <div className="photo-thumbs">
            {allPhotos.map((u) => (
              <button key={u} type="button" className={`pt ${shown === u ? 'active' : ''}`}
                onClick={() => setActivePhoto(u)} aria-label="Show this photo">
                <img src={u} alt="" />
              </button>
            ))}
          </div>
        )
      })()}

      <div className="card">
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 18px', margin: 0, fontSize: '0.92rem' }}>
          {[
            ['Brand', g.brand], ['Size', g.size], ['Color', g.color], ['Pattern', g.pattern],
            ['Material', g.material],
            ['Dress code', label(FORMALITY, g.formality)],
            ['Weight', label(WARMTH, g.warmth)],
            ['Status', label(STATUSES, g.status)],
            ['Times worn', g.times_worn || 0],
            ['Last worn', g.last_worn || 'Not yet recorded'],
          ].filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt className="eyebrow" style={{ alignSelf: 'center' }}>{k}</dt>
              <dd style={{ margin: 0 }}>{v}</dd>
            </div>
          ))}
        </dl>
        {g.notes && (<><hr className="divider" /><p style={{ margin: 0, fontSize: '0.9rem' }}>{g.notes}</p></>)}
        {g.fit_notes && (
          <>
            <hr className="divider" />
            <div className="eyebrow" style={{ marginBottom: 4 }}>Fit & tailoring</div>
            <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{g.fit_notes}</p>
          </>
        )}
      </div>

      <div className="row">
        <button className="btn" onClick={wearToday}>Wore this today</button>
        <a className="btn ghost" target="_blank" rel="noreferrer"
          href={`https://www.google.com/search?tbm=shop&q=${shopQuery}`}>
          Find online ↗
        </a>
        <a className="btn ghost" target="_blank" rel="noreferrer"
          href={`https://www.ebay.com/sch/i.html?_nkw=${shopQuery}`}>
          eBay ↗
        </a>
      </div>

      <div className="card" style={{ borderColor: 'color-mix(in srgb, var(--claret) 30%, var(--hairline))' }}>
        {confirming ? (
          <div className="spread">
            <span style={{ fontSize: '0.9rem' }}>Remove <strong>{g.name}</strong> and its photo for good?</span>
            <span className="row">
              <button className="btn small danger" onClick={remove}>Yes, remove</button>
              <button className="btn small ghost" onClick={() => setConfirming(false)}>Keep it</button>
            </span>
          </div>
        ) : (
          <div className="spread">
            <span className="muted">Donated it or wore it out?</span>
            <button className="btn small danger" onClick={() => setConfirming(true)}>Remove from catalog</button>
          </div>
        )}
        {err && <p className="form-msg">{err}</p>}
      </div>
    </div>
  )
}
