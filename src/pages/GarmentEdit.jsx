import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../App'
import { analyzePhoto, deleteWishlistItem, getGarment, removePhotos, saveGarment, uploadPhoto } from '../lib/data'
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
  const [newPhotos, setNewPhotos] = useState([]) // { file, preview }
  const [removed, setRemoved] = useState([]) // existing gallery URLs marked for removal
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiNote, setAiNote] = useState(null)
  // Fields the user (or a prefill) has already set — AI suggestions never overwrite these
  const touched = useRef(new Set(Object.keys(state?.prefill || {})))

  useEffect(() => {
    if (id) getGarment(id).then(setG).catch((e) => setErr(e.message))
  }, [id])

  function set(k, v) {
    touched.current.add(k)
    setG((cur) => ({ ...cur, [k]: v }))
  }

  function pickCategory(catId) {
    const meta = categoryById(catId)
    touched.current.add('category').add('formality').add('warmth')
    setG((cur) => ({ ...cur, category: catId, formality: meta.formality, warmth: meta.warmth }))
  }

  function onPhotos(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const firstBatch = newPhotos.length === 0
    setNewPhotos((cur) => [
      ...cur,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ])
    e.target.value = '' // allow picking the same files again later
    if (!id && firstBatch) autoFill(files[0])
  }

  // Ask Claude vision to read the photo and fill whatever the user hasn't set
  async function autoFill(file) {
    setAnalyzing(true)
    setAiNote(null)
    try {
      const res = await analyzePhoto(file)
      if (res?.error === 'no_key') {
        setAiNote('Tip: add your Anthropic key on the Profile page and photos will fill this form in automatically.')
        return
      }
      if (!res?.fields) return
      setG((cur) => {
        const merged = { ...cur }
        for (const k of ['name', 'category', 'brand', 'color', 'pattern', 'material', 'formality', 'warmth']) {
          if (res.fields[k] && !touched.current.has(k) && !(k === 'name' && cur.name.trim())) {
            merged[k] = res.fields[k]
          }
        }
        return merged
      })
    } catch {
      // analysis is best-effort; the form still works by hand
    } finally {
      setAnalyzing(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const uploaded = []
      for (const p of newPhotos) uploaded.push(await uploadPhoto(user.id, p.file))
      let photo_url = g.photo_url || null
      const gallery = (g.photos || []).filter((u) => !removed.includes(u))
      if (!photo_url && uploaded.length) {
        photo_url = uploaded.shift()
      }
      gallery.push(...uploaded)
      const fields = {
        name: g.name.trim(), category: g.category, brand: g.brand || null, size: g.size || null,
        color: g.color || null, pattern: g.pattern || null, material: g.material || null,
        location: g.location, formality: g.formality, warmth: g.warmth, status: g.status,
        notes: g.notes || null, fit_notes: g.fit_notes || null,
        photo_url, photos: gallery,
      }
      const saved = await saveGarment(fields, id)
      if (removed.length) await removePhotos(removed).catch(() => {})
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
          <label>Photos</label>
          {(g.photo_url || (g.photos || []).some((u) => !removed.includes(u)) || newPhotos.length > 0) && (
            <div className="photo-thumbs" style={{ marginBottom: 8 }}>
              {g.photo_url && (
                <div className="pt">
                  <img src={g.photo_url} alt="Cover" />
                  <span className="tag">Cover</span>
                </div>
              )}
              {(g.photos || []).filter((u) => !removed.includes(u)).map((u) => (
                <div className="pt" key={u}>
                  <img src={u} alt="Garment" />
                  <button type="button" className="x" aria-label="Remove this photo"
                    onClick={() => setRemoved((r) => [...r, u])}>×</button>
                </div>
              ))}
              {newPhotos.map((p, i) => (
                <div className="pt" key={p.preview}>
                  <img src={p.preview} alt="New upload" />
                  {!g.photo_url && i === 0 && <span className="tag">Cover</span>}
                  <button type="button" className="x" aria-label="Remove this photo"
                    onClick={() => setNewPhotos((cur) => cur.filter((x) => x !== p))}>×</button>
                </div>
              ))}
            </div>
          )}
          <label className="btn ghost file-label">
            Upload from this device
            <input type="file" accept="image/*" multiple onChange={onPhotos} style={{ display: 'none' }} />
          </label>
          <span className="muted">
            Pick several at once — the first becomes the cover photo. On your phone this opens your photo library (or camera).
          </span>
          {analyzing && <span className="muted">✨ Reading the photo to fill in the details…</span>}
          {aiNote && <span className="muted">{aiNote}</span>}
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
