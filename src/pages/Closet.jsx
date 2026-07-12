import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GarmentThumb from '../components/GarmentThumb'
import { listGarments } from '../lib/data'
import { CATEGORIES, categoryById, LOCATIONS } from '../lib/constants'

export default function Closet() {
  const [garments, setGarments] = useState(null)
  const [err, setErr] = useState(null)
  const [loc, setLoc] = useState('all')
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    listGarments().then(setGarments).catch((e) => setErr(e.message))
  }, [])

  const shown = useMemo(() => {
    if (!garments) return []
    const needle = q.trim().toLowerCase()
    return garments.filter((g) => {
      if (loc !== 'all' && g.location !== loc) return false
      if (cat !== 'all' && g.category !== cat) return false
      if (needle) {
        const hay = `${g.name} ${g.brand || ''} ${g.color || ''} ${categoryById(g.category).label}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [garments, loc, cat, q])

  const usedCats = useMemo(
    () => CATEGORIES.filter((c) => garments?.some((g) => g.category === c.id)),
    [garments],
  )

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <div className="eyebrow">The catalog</div>
          <h1>Closet</h1>
        </div>
        <Link className="btn small" to="/closet/new">+ Add garment</Link>
      </div>

      <div className="row">
        <div className="seg" role="group" aria-label="Closet location">
          <button className={loc === 'all' ? 'active' : ''} onClick={() => setLoc('all')}>Both</button>
          {LOCATIONS.map((l) => (
            <button key={l.id} className={loc === l.id ? 'active' : ''} onClick={() => setLoc(l.id)}>
              {l.id === 'dc' ? 'D.C.' : 'Howell'}
            </button>
          ))}
        </div>
        <input
          type="search" placeholder="Search name, brand, color…"
          value={q} onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 170, padding: '9px 13px', borderRadius: 999, border: '1px solid var(--hairline)', background: 'var(--paper)', fontFamily: 'var(--body)', fontSize: '0.9rem' }}
          aria-label="Search garments"
        />
      </div>

      {usedCats.length > 1 && (
        <div className="row" style={{ gap: 6 }}>
          <button className={`chip ${cat === 'all' ? 'green' : ''}`} onClick={() => setCat('all')} style={{ cursor: 'pointer' }}>All</button>
          {usedCats.map((c) => (
            <button key={c.id} className={`chip ${cat === c.id ? 'green' : ''}`} onClick={() => setCat(cat === c.id ? 'all' : c.id)} style={{ cursor: 'pointer' }}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {err && <p className="form-msg">{err}</p>}
      {garments === null ? (
        <p className="muted">Opening the closet…</p>
      ) : shown.length === 0 ? (
        <div className="empty">
          <h3>{garments.length === 0 ? 'Nothing cataloged yet' : 'No matches'}</h3>
          <p>{garments.length === 0
            ? 'Photograph each piece as you put it away — the catalog builds itself.'
            : 'Try clearing the search or filters.'}</p>
          {garments.length === 0 && <Link className="btn" to="/closet/new">Add your first garment</Link>}
        </div>
      ) : (
        <div className="garment-grid">
          {shown.map((g) => (
            <Link key={g.id} to={`/closet/${g.id}`} className="garment-card fade-in">
              <GarmentThumb garment={g} />
              <div className="meta">
                <div className="name">{g.name}</div>
                <div className="sub">
                  {[g.brand, g.size, g.location === 'dc' ? 'D.C.' : 'Howell'].filter(Boolean).join(' · ')}
                </div>
                {g.status !== 'active' && (
                  <span className="chip brass" style={{ marginTop: 5 }}>
                    {g.status === 'laundry' ? 'At laundry' : g.status === 'tailor' ? 'At tailor' : 'Stored'}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
