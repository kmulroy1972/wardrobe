import { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { getProfile, saveProfile } from '../lib/data'

const SIZE_FIELDS = [
  ['chest', 'Chest'], ['waist', 'Waist'], ['inseam', 'Inseam (seated-checked)'],
  ['neck', 'Neck'], ['sleeve', 'Sleeve'], ['shoe', 'Shoe'],
]

export default function Profile() {
  const { user } = useAuth()
  const [p, setP] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getProfile(user.id).then(setP).catch((e) => setMsg({ ok: false, text: e.message }))
  }, [user.id])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const saved = await saveProfile(user.id, {
        display_name: p.display_name, height: p.height, fit_notes: p.fit_notes, sizes: p.sizes,
      })
      setP(saved)
      setMsg({ ok: true, text: 'Saved.' })
    } catch (e2) {
      setMsg({ ok: false, text: e2.message })
    } finally {
      setBusy(false)
    }
  }

  if (!p) return <p className="muted">{msg?.text || 'Fetching your profile…'}</p>

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Measurements & fit</div>
          <h1>Profile</h1>
        </div>
        <button className="btn small ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>

      <form onSubmit={submit} className="card">
        <div className="form-row">
          <div className="field">
            <label htmlFor="pname">Name</label>
            <input id="pname" value={p.display_name || ''} onChange={(e) => setP({ ...p, display_name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="pheight">Height</label>
            <input id="pheight" value={p.height || ''} onChange={(e) => setP({ ...p, height: e.target.value })} />
          </div>
        </div>

        <div className="eyebrow" style={{ margin: '6px 0 10px' }}>Sizes</div>
        <div className="form-row">
          {SIZE_FIELDS.map(([key, label]) => (
            <div className="field" key={key}>
              <label htmlFor={`sz-${key}`}>{label}</label>
              <input id={`sz-${key}`} value={p.sizes?.[key] || ''}
                onChange={(e) => setP({ ...p, sizes: { ...p.sizes, [key]: e.target.value } })} />
            </div>
          ))}
        </div>

        <div className="field">
          <label htmlFor="pfit">Fit notes — the stylist reads these on every recommendation</label>
          <textarea id="pfit" rows={9} value={p.fit_notes || ''}
            onChange={(e) => setP({ ...p, fit_notes: e.target.value })} />
        </div>

        {msg && <p className={`form-msg ${msg.ok ? 'ok' : ''}`}>{msg.text}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
      </form>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 6 }}>AI stylist chat — one-time setup</div>
        <p style={{ fontSize: '0.88rem', margin: 0 }}>
          The outfit recommendations work out of the box. Free-form chat (“what should I wear to…”) uses Claude and
          needs an Anthropic API key: in the Supabase dashboard open <strong>Edge Functions → stylist → Secrets</strong> and
          add <code>ANTHROPIC_API_KEY</code>. Keys are created at console.anthropic.com.
        </p>
      </div>

      <p className="muted">
        Signed in as {user.email}. This app is private — your catalog, photos, and outfits are visible only to this account.
      </p>
    </div>
  )
}
