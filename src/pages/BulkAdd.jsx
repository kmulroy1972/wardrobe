import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { saveGarment, uploadPhoto } from '../lib/data'
import { CATEGORIES, categoryById } from '../lib/constants'

// Bulk cataloging: pick a batch of photos, each becomes its own garment.
export default function BulkAdd() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [location, setLocation] = useState('dc')
  const [rows, setRows] = useState([]) // { file, preview, name, category }
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(0)
  const [err, setErr] = useState(null)

  function onPick(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setRows((cur) => [
      ...cur,
      ...files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        name: '',
        category: 'casual_shirt',
      })),
    ])
    e.target.value = ''
  }

  const set = (i, k, v) => setRows((cur) => cur.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const drop = (i) => setRows((cur) => cur.filter((_, j) => j !== i))

  async function saveAll() {
    setBusy(true)
    setErr(null)
    setDone(0)
    try {
      let n = 0
      for (const row of rows) {
        const meta = categoryById(row.category)
        const photo_url = await uploadPhoto(user.id, row.file)
        await saveGarment({
          name: row.name.trim() || meta.label,
          category: row.category,
          location,
          formality: meta.formality,
          warmth: meta.warmth,
          status: 'active',
          photo_url,
          photos: [],
        })
        setDone(++n)
      }
      navigate('/closet', { replace: true })
    } catch (e) {
      setErr(`${e.message} — ${done} of ${rows.length} saved so far.`)
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <div className="eyebrow">Quick cataloging</div>
          <h1>Add several at once</h1>
        </div>
      </div>

      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          Photograph a batch of garments, pick them all here, then give each a name and category.
          Every photo becomes its own entry. You can fill in brand, size, and color later from the closet.
        </p>
        <div className="row">
          <div className="seg" role="group" aria-label="Which closet">
            <button type="button" className={location === 'dc' ? 'active' : ''} onClick={() => setLocation('dc')}>D.C.</button>
            <button type="button" className={location === 'howell' ? 'active' : ''} onClick={() => setLocation('howell')}>Howell</button>
          </div>
          <label className="btn ghost file-label">
            Upload from this device
            <input type="file" accept="image/*" multiple onChange={onPick} style={{ display: 'none' }} />
          </label>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          On your phone this opens your photo library — select as many as you like.
        </p>
      </div>

      {rows.length > 0 && (
        <>
          <div className="stack" style={{ gap: 10 }}>
            {rows.map((row, i) => (
              <div key={row.preview} className="card bulk-row fade-in">
                <div className="pt">
                  <img src={row.preview} alt={`Photo ${i + 1}`} />
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  <input
                    value={row.name}
                    placeholder={`Name (blank = “${categoryById(row.category).label}”)`}
                    aria-label={`Name for photo ${i + 1}`}
                    onChange={(e) => set(i, 'name', e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--paper)', fontFamily: 'var(--body)', fontSize: '0.92rem' }}
                  />
                  <select
                    value={row.category}
                    aria-label={`Category for photo ${i + 1}`}
                    onChange={(e) => set(i, 'category', e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--paper)', fontFamily: 'var(--body)', fontSize: '0.92rem' }}
                  >
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <button type="button" className="btn small danger" onClick={() => drop(i)} disabled={busy}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          {err && <p className="form-msg">{err}</p>}
          <div className="row">
            <button className="btn" onClick={saveAll} disabled={busy}>
              {busy ? `Saving ${done + 1} of ${rows.length}…` : `Add ${rows.length} garment${rows.length === 1 ? '' : 's'} to the closet`}
            </button>
            <button type="button" className="btn ghost" onClick={() => navigate(-1)} disabled={busy}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
