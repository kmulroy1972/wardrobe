import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addWishlistItem, deleteWishlistItem, listWishlist, updateWishlistItem } from '../lib/data'
import { CATEGORIES, categoryById, WISHLIST_PRIORITIES } from '../lib/constants'

const BLANK = { name: '', category: '', brand: '', size: '', priority: 'soon', location: 'dc', url: '' }

const NEXT_STATUS = { to_buy: 'ordered', ordered: 'purchased' }
const STATUS_ACTION = { to_buy: 'Mark ordered', ordered: 'Mark purchased' }

export default function ToBuy() {
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [showPurchased, setShowPurchased] = useState(false)

  useEffect(() => {
    listWishlist().then(setItems).catch((e) => setErr(e.message))
  }, [])

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function add(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setBusy(true)
    setErr(null)
    try {
      const saved = await addWishlistItem({
        name: form.name.trim(),
        category: form.category || null,
        brand: form.brand || null,
        size: form.size || null,
        priority: form.priority,
        location: form.location,
        url: form.url || null,
      })
      setItems((cur) => [saved, ...(cur || [])])
      setForm(BLANK)
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  async function advance(item) {
    const status = NEXT_STATUS[item.status]
    if (!status) return
    try {
      const saved = await updateWishlistItem(item.id, { status })
      setItems((cur) => cur.map((i) => (i.id === item.id ? saved : i)))
    } catch (e) {
      setErr(e.message)
    }
  }

  async function remove(item) {
    if (!window.confirm(`Remove “${item.name}” from the list?`)) return
    try {
      await deleteWishlistItem(item.id)
      setItems((cur) => cur.filter((i) => i.id !== item.id))
    } catch (e) {
      setErr(e.message)
    }
  }

  function addToCloset(item) {
    navigate('/closet/new', {
      state: {
        wishlistId: item.id,
        prefill: {
          name: item.name,
          category: item.category || 'accessory',
          brand: item.brand || '',
          size: item.size || '',
          location: item.location || 'dc',
        },
      },
    })
  }

  const shopUrl = (item) =>
    item.url ||
    `https://www.google.com/search?tbm=shop&q=${encodeURIComponent([item.brand, item.name, item.size].filter(Boolean).join(' '))}`

  const open = (items || []).filter((i) => i.status !== 'purchased')
  const purchased = (items || []).filter((i) => i.status === 'purchased')
  const groups = [
    ['Need soon', open.filter((i) => i.priority === 'soon')],
    ['Someday', open.filter((i) => i.priority === 'someday')],
  ]

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <div className="eyebrow">The shopping list</div>
          <h1>To Buy</h1>
        </div>
      </div>

      <form onSubmit={add} className="card">
        <div className="field">
          <label htmlFor="wname">What do you need?</label>
          <input id="wname" required value={form.name} placeholder="Charcoal dress trousers"
            onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="wcat">Category</label>
            <select id="wcat" value={form.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">—</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="wloc">For which closet</label>
            <select id="wloc" value={form.location} onChange={(e) => set('location', e.target.value)}>
              <option value="dc">Washington, D.C.</option>
              <option value="howell">Howell, NJ</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="wbrand">Brand (optional)</label>
            <input id="wbrand" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="wsize">Size (optional)</label>
            <input id="wsize" value={form.size} placeholder="e.g. Boys 14, 6D" onChange={(e) => set('size', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="wurl">Product link (optional)</label>
          <input id="wurl" type="url" value={form.url} placeholder="https://…" onChange={(e) => set('url', e.target.value)} />
        </div>
        <div className="row">
          <div className="seg" role="group" aria-label="Priority">
            {WISHLIST_PRIORITIES.map((p) => (
              <button type="button" key={p.id} className={form.priority === p.id ? 'active' : ''}
                onClick={() => set('priority', p.id)}>{p.label}</button>
            ))}
          </div>
          <button className="btn" disabled={busy || !form.name.trim()}>
            {busy ? 'Adding…' : '+ Add to list'}
          </button>
        </div>
        {err && <p className="form-msg">{err}</p>}
      </form>

      {items === null ? (
        <p className="muted">Fetching the list…</p>
      ) : open.length === 0 && purchased.length === 0 ? (
        <div className="empty">
          <h3>Nothing on the list</h3>
          <p>Add gaps you spot — the stylist will also suggest pieces your closets are missing.</p>
        </div>
      ) : (
        <>
          {groups.map(([title, group]) =>
            group.length === 0 ? null : (
              <div key={title} className="stack" style={{ gap: 10 }}>
                <div className="eyebrow">{title} · {group.length}</div>
                {group.map((item) => (
                  <div key={item.id} className="card fade-in">
                    <div className="spread">
                      <div>
                        <h3>{item.name}</h3>
                        <div className="muted" style={{ marginTop: 2 }}>
                          {[item.category ? categoryById(item.category).label : null, item.brand, item.size,
                            item.location === 'howell' ? 'Howell' : 'D.C.'].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      {item.status === 'ordered' && <span className="chip brass">Ordered</span>}
                    </div>
                    <div className="row" style={{ marginTop: 10 }}>
                      <a className="btn small ghost" href={shopUrl(item)} target="_blank" rel="noreferrer">
                        {item.url ? 'Open link ↗' : 'Shop for it ↗'}
                      </a>
                      <button className="btn small" onClick={() => advance(item)}>{STATUS_ACTION[item.status]}</button>
                      <button className="btn small danger" onClick={() => remove(item)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            ),
          )}

          {purchased.length > 0 && (
            <div className="stack" style={{ gap: 10 }}>
              <button className="chip" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}
                onClick={() => setShowPurchased((s) => !s)}>
                Purchased · {purchased.length} {showPurchased ? '▾' : '▸'}
              </button>
              {showPurchased && purchased.map((item) => (
                <div key={item.id} className="card">
                  <div className="spread">
                    <div>
                      <h3>{item.name}</h3>
                      <div className="muted">{[item.brand, item.size].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div className="row">
                      <button className="btn small" onClick={() => addToCloset(item)}>Add to closet →</button>
                      <button className="btn small danger" onClick={() => remove(item)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
