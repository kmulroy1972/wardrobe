import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../App'
import { deleteWishlistItem, getGarment, saveGarment, uploadPhoto } from '../lib/data'
import { CATEGORIES, categoryById, COLORS, FORMALITY, LOCATIONS, STATUSES, WARMTH } from '../lib/constants'

const BLANK = {
  name: '', category: 'casual_shirt', brand: '', size: '', color: '', pattern: '',
  material: '', location: 'dc', formality: 'casual', warmth: 'all', status: 'active',
  notes: '', fit_notes: '',
}

export default function GarmentEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const { user } = useAuth()
  const [g, setG] = useState(() => {
    if (id) return null
    const prefill = state?.prefill || {}
    const meta = prefill.category ? categoryById(prefill.category) : null
    return { ...BLANK, ...(meta ? { formality: meta.formality, warmth: meta.warmth } : {}), ...prefill }
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    if (id) getGarment(id).then(setG).catch((e) => setErr(e.message))
  }, [id])

  function set(k, v) {
    setG((cur) => ({ ...cur, [k]: v }))
  }

  function pickCategory(catId) {
    const meta = categoryById(catId)
    setG((cur) => ({ ...cur, category: catId, formality: meta.formality, warmth: meta.warmth }))
  }

  function onPhoto(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      let photo_url = g.photo_url
      if (photoFile) photo_url = await uploadPhoto(user.id, photoFile)
      const fields = {
        name: g.name.trim(), category: g.category, brand: g.brand || null, size: g.size || null,
        color: g.color || null, pattern: g.pattern || null, material: g.material || null,
        location: g.location, formality: g.formality, warmth: g.warmth, status: g.status,
        notes: g.notes || null, fit_notes: g.fit_notes || null, photo_url: photo_url || null,
      }
      const saved = await saveGarment(fields, id)
      // Arrived here from a purchased shopping-list item — clear it off the list
      if (state?.wishlistId) await deleteWishlistItem(state.wishlistId).catch(() => {})
      navigate(`/closet/${saved.id}`, { replace: true })
    } catch (e2) {
      setErr(e2.message)
      setBusy(false)
    }
  }

  if (!g) return <p className="muted">{err || 'Fetching the garment…'}</p>

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">{id ? 'Edit entry' : 'New entry'}</div>
          <h1>{id ? g.name || 'Edit garment' : 'Catalog a garment'}</h1>
        </div>
      </div>

      <form onSubmit={submit} className="card">
        <div className="field">
          <label>Photo</label>
          {(preview || g.photo_url) && (
            <img src={preview || g.photo_url} alt="Garment preview"
              style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--hairline)', marginBottom: 8 }} />
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onPhoto} />
          <span className="muted">On your phone this opens the camera — lay the garment flat on a plain surface.</span>
        </div>

        <div className="field">
          <label htmlFor="gname">Name</label>
          <input id="gname" required value={g.name} placeholder="Navy chalk-stripe suit"
            onChange={(e) => set('name', e.target.value)} />
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="gcat">Category</label>
            <select id="gcat" value={g.category} onChange={(e) => pickCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="gloc">Lives in</label>
            <select id="gloc" value={g.location} onChange={(e) => set('location', e.target.value)}>
              {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="gbrand">Brand</label>
            <input id="gbrand" value={g.brand || ''} onChange={(e) => set('brand', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="gsize">Size</label>
            <input id="gsize" value={g.size || ''} placeholder="e.g. Boys 14, 36S" onChange={(e) => set('size', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="gcolor">Main color</label>
            <select id="gcolor" value={g.color || ''} onChange={(e) => set('color', e.target.value)}>
              <option value="">—</option>
              {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="gpat">Pattern</label>
            <input id="gpat" value={g.pattern || ''} placeholder="Solid, stripe, check…" onChange={(e) => set('pattern', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="gmat">Material</label>
            <input id="gmat" value={g.material || ''} placeholder="Wool, cotton…" onChange={(e) => set('material', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="gstat">Status</label>
            <select id="gstat" value={g.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Dress code</label>
          <div className="seg">
            {FORMALITY.map((f) => (
              <button type="button" key={f.id} className={g.formality === f.id ? 'active' : ''}
                onClick={() => set('formality', f.id)}>{f.label}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Weight</label>
          <div className="seg">
            {WARMTH.map((w) => (
              <button type="button" key={w.id} className={g.warmth === w.id ? 'active' : ''}
                onClick={() => set('warmth', w.id)}>{w.label}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="gnotes">Notes</label>
          <textarea id="gnotes" value={g.notes || ''} placeholder="Where you bought it, what it pairs with…"
            onChange={(e) => set('notes', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="gfit">Fit & tailoring notes</label>
          <textarea id="gfit" value={g.fit_notes || ''} placeholder="Hemmed for seated length, sleeves shortened 2 in…"
            onChange={(e) => set('fit_notes', e.target.value)} />
        </div>

        {err && <p className="form-msg">{err}</p>}
        <div className="row">
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Add to closet'}</button>
          <button type="button" className="btn ghost" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
