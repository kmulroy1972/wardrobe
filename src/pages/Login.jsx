import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMsg({ ok: true, text: 'Account created. If a confirmation email arrives, tap the link, then sign in here.' })
        setMode('signin')
      }
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Something went wrong — try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card fade-in">
        <div className="monogram">W</div>
        <h1 style={{ textAlign: 'center' }}>Wardrobe</h1>
        <p className="muted" style={{ textAlign: 'center', marginTop: 4 }}>
          Your private closet, valet, and forecast.
        </p>
        <hr className="divider" />
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={8}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {msg && <p className={`form-msg ${msg.ok ? 'ok' : ''}`}>{msg.text}</p>}
          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="muted" style={{ textAlign: 'center', marginTop: 14 }}>
          {mode === 'signin' ? (
            <>First visit?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); setMsg(null) }}>
                Create your account
              </a>
            </>
          ) : (
            <>Already set up?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('signin'); setMsg(null) }}>
                Sign in
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
