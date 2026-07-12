import { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { aiKeyIsSet, clearAiKey, getProfile, saveAiKey, saveProfile } from '../lib/data'

const SIZE_FIELDS = [
  ['chest', 'Chest'], ['waist', 'Waist'], ['inseam', 'Inseam (seated-checked)'],
  ['neck', 'Neck'], ['sleeve', 'Sleeve'], ['shoe', 'Shoe'],
]

export default function Profile() {
  const { user } = useAuth()
  const [p, setP] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [keySet, setKeySet] = useState(null)
  const [keyDraft, setKeyDraft] = useState('')
  const [keyMsg, setKeyMsg] = useState(null)
  const [keyBusy, setKeyBusy] = useState(false)

  useEffect(() => {
    getProfile(user.id).then(setP).catch((e) => setMsg({ ok: false, text: e.message }))
    aiKeyIsSet(user.id).then(setKeySet).catch(() => setKeySet(false))
  }, [user.id])

  async function submitKey(e) {
    e.preventDefault()
    const key = keyDraft.trim()
    if (!key) return
    setKeyBusy(true)
    setKeyMsg(null)
    try {
      await saveAiKey(user.id, key)
      setKeyDraft('')
      setKeySet(true)
      setKeyMsg({ ok: true, text: 'Key saved — the AI stylist and photo auto-fill are now on.' })
    } catch (e2) {
      setKeyMsg({ ok: false, text: e2.message })
    } finally {
      setKeyBusy(false)
    }
  }

  async function removeKey() {
    setKeyBusy(true)
    setKeyMsg(null)
    try {
      await clearAiKey(user.id)
      setKeySet(false)
      setKeyMsg({ ok: true, text: 'Key removed. AI features are off; everything else keeps working.' })
    } catch (e2) {
      setKeyMsg({ ok: false, text: e2.message })
    } finally {
      setKeyBusy(false)
    }
  }

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
        <div className="spread">
          <div className="eyebrow">AI features</div>
          {keySet === null ? null : keySet ? (
            <span className="chip green">On — key saved</span>
          ) : (
            <span className="chip">Off — no key yet</span>
          )}
        </div>
        <p style={{ fontSize: '0.88rem', margin: '8px 0' }}>
          The stylist chat and photo auto-fill run on Claude. Create an API key at{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a>{' '}
          and paste it here once. It's stored in your private database — visible only to your
          account and the app's own server functions. Everything else works without it.
        </p>
        <form onSubmit={submitKey} className="row">
          <input
            type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)}
            placeholder={keySet ? 'Paste a new key to replace the saved one' : 'sk-ant-…'}
            aria-label="Anthropic API key" autoComplete="off"
            style={{ flex: 1, minWidth: 180, padding: '9px 13px', borderRadius: 999, border: '1px solid var(--hairline)', background: 'var(--paper)', fontFamily: 'var(--body)', fontSize: '0.9rem' }}
          />
          <button className="btn small" disabled={keyBusy || !keyDraft.trim()}>
            {keyBusy ? 'Saving…' : 'Save key'}
          </button>
          {keySet && (
            <button type="button" className="btn small danger" onClick={removeKey} disabled={keyBusy}>
              Remove key
            </button>
          )}
        </form>
        {keyMsg && <p className={`form-msg ${keyMsg.ok ? 'ok' : ''}`}>{keyMsg.text}</p>}
      </div>

      <p className="muted">
        Signed in as {user.email}. This app is private — your catalog, photos, and outfits are visible only to this account.
      </p>
    </div>
  )
}
