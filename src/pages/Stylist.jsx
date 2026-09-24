import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import GarmentThumb from '../components/GarmentThumb'
import GarmentPreviewDialog from '../components/GarmentPreviewDialog'
import OutfitSuggestion from '../components/OutfitSuggestion'
import { useAuth } from '../App'
import { askStylist, getProfile, listGarments, listOutfits, listWishlist } from '../lib/data'
import { fetchForecast } from '../lib/weather'
import { categoryById } from '../lib/constants'
import { buildStylistQuestion, classifyStylistRequest, STYLIST_STARTERS } from '../lib/stylistRequest'
import {
  buildStylistConversationOutfits,
  collectRecentRecommendationUsage,
  loadStylistConversation,
  parseStylistResponse,
  saveStylistConversation,
} from '../lib/stylistResponse'

export default function Stylist() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [garments, setGarments] = useState(null)
  const [garmentLoadError, setGarmentLoadError] = useState(false)

  // AI chat state
  const [messages, setMessages] = useState(() => loadStylistConversation(
    typeof window === 'undefined' ? null : window.sessionStorage,
    user.id,
  ))
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [aiStatus, setAiStatus] = useState('idle') // idle | ready | no_key
  const [context, setContext] = useState(null) // outfits/wishlist/weather cache for the chat
  const [contextWarning, setContextWarning] = useState([])
  const [previewGarment, setPreviewGarment] = useState(null)
  const chatEnd = useRef(null)

  const loadGarments = useCallback(async () => {
    setGarments(null)
    setGarmentLoadError(false)
    try {
      setGarments(await listGarments())
    } catch {
      setGarmentLoadError(true)
    }
  }, [])

  async function loadContext() {
    if (context) return context
    const [outfitsResult, wishlistResult, dcResult, howellResult] = await Promise.allSettled([
      listOutfits(),
      listWishlist(),
      fetchForecast('dc'),
      fetchForecast('howell'),
    ])
    const unavailable = []
    if (outfitsResult.status === 'rejected') unavailable.push('saved outfits')
    if (wishlistResult.status === 'rejected') unavailable.push('shopping list')
    if (dcResult.status === 'rejected') unavailable.push('D.C. weather')
    if (howellResult.status === 'rejected') unavailable.push('Howell weather')
    const outfitsData = outfitsResult.status === 'fulfilled' ? outfitsResult.value : []
    const wishlistData = wishlistResult.status === 'fulfilled' ? wishlistResult.value : []
    const wxDc = dcResult.status === 'fulfilled' ? dcResult.value : null
    const wxHowell = howellResult.status === 'fulfilled' ? howellResult.value : null
    const ctx = {
      outfits: outfitsData.map((o) => ({
        name: o.name,
        occasion: o.occasion,
        location: o.location,
        items: (o.outfit_items || []).map((it) => it.garment?.name).filter(Boolean),
      })),
      wishlist: wishlistData.map((w) => ({
        name: w.name, category: w.category, priority: w.priority, status: w.status, location: w.location,
      })),
      weather: { dc: wxDc?.daily, howell: wxHowell?.daily },
      unavailable,
    }
    setContext(ctx)
    setContextWarning(unavailable)
    return ctx
  }

  useEffect(() => {
    loadGarments()
  }, [loadGarments])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, thinking])

  useEffect(() => {
    saveStylistConversation(
      typeof window === 'undefined' ? null : window.sessionStorage,
      user.id,
      messages,
    )
  }, [messages, user.id])

  async function ask(questionText) {
    const question = questionText.trim()
    if (!question || thinking) return
    const requestMode = classifyStylistRequest(question)
    setDraft('')
    const history = messages.map((m) => ({ role: m.role, content: m.text }))
    const nextMessages = [...messages, { role: 'user', text: question, requestMode }]
    setMessages(nextMessages)
    setThinking(true)
    setAiStatus('idle')
    try {
      const [profile, ctx] = await Promise.all([getProfile(user.id, { createIfMissing: false }), loadContext()])
      const wardrobe = (garments || []).map((g) => ({
        id: g.id, name: g.name, category: g.category, brand: g.brand, size: g.size, color: g.color,
        pattern: g.pattern, material: g.material, location: g.location,
        formality: g.formality, warmth: g.warmth, status: g.status,
        times_worn: g.times_worn, last_worn: g.last_worn, fit_notes: g.fit_notes,
      }))
      const recentRecommendations = collectRecentRecommendationUsage(messages, garments || [])
      const groundedQuestion = buildStylistQuestion(question, focusedGarment, recentRecommendations, requestMode)
      const requestQuestion = ctx.unavailable.length
        ? `Context unavailable: ${ctx.unavailable.join(', ')}. Do not infer those details.\n${groundedQuestion}`
        : groundedQuestion
      const res = await askStylist({
        question: requestQuestion, wardrobe,
        outfits: ctx.outfits, wishlist: ctx.wishlist, weather: ctx.weather,
        profile: { height: profile.height, fit_notes: profile.fit_notes, sizes: profile.sizes },
        history,
      })
      if (res?.error === 'no_key') {
        setAiStatus('no_key')
        setMessages((ms) => [...ms, { role: 'assistant', text: 'The AI stylist isn’t connected yet — an Anthropic API key needs to be added on the Profile page.' }])
      } else {
        setAiStatus('ready')
        setMessages((ms) => [...ms, { role: 'assistant', text: res?.text || 'No answer came back — try again.' }])
      }
    } catch (err) {
      let text = `Something went wrong: ${err.message}`
      setAiStatus('idle')
      try {
        const body = await err.context?.json()
        if (body?.error === 'anthropic_error') {
          const keyRejected = /authentication|invalid x-api-key|401/i.test(body.detail || '')
          text = keyRejected
            ? 'Your Anthropic API key was rejected — double-check it on the Profile page.'
            : 'The AI service returned an error — try again in a moment.'
          if (keyRejected) setAiStatus('no_key')
        }
      } catch { /* keep the generic message */ }
      setMessages((ms) => [...ms, { role: 'assistant', text }])
    } finally {
      setThinking(false)
    }
  }

  function send(e) {
    e.preventDefault()
    ask(draft)
  }

  const requestedGarmentId = searchParams.get('garment')
  const focusedGarment = garments?.find((g) => g.id === requestedGarmentId && g.status === 'active')
  const selectableGarments = useMemo(() => (
    (garments || [])
      .filter((g) => g.status === 'active')
      .sort((a, b) => categoryById(a.category).label.localeCompare(categoryById(b.category).label) || a.name.localeCompare(b.name))
  ), [garments])
  const visualRecommendations = useMemo(() => {
    if (!garments) return []
    return buildStylistConversationOutfits(messages, garments)
  }, [messages, garments])
  const visibleMessages = messages.slice(-4)

  function selectGarment(id) {
    setSearchParams(id ? { garment: id } : {}, { replace: true })
  }

  const closeGarmentPreview = useCallback(() => setPreviewGarment(null), [])

  function startOver() {
    setMessages([])
    setDraft('')
    setPreviewGarment(null)
    setAiStatus('idle')
  }

  function renderAiText(text) {
    const parsed = parseStylistResponse(text)
    return (
      <>
        <span>{parsed.text}</span>
        {parsed.truncated && (
          <span className="stylist-truncated">
            This answer stopped early.
            <button
              type="button"
              disabled={thinking}
              onClick={() => ask('Please continue the outfit recommendations from where you stopped.')}
            >
              Continue the answer
            </button>
          </span>
        )}
      </>
    )
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <div className="eyebrow">Your valet</div>
          <h1>Ask the stylist</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Ask naturally. I’ll use your actual wardrobe, fit notes, wear history, and the weather.
          </p>
        </div>
        {messages.length > 0 && (
          <button type="button" className="btn small ghost" onClick={startOver} disabled={thinking}>Start over</button>
        )}
      </div>

      <div className="card stylist-ask-card">
        <div className="spread" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="eyebrow">What do you need?</div>
            <h2 style={{ marginTop: 4 }}>Ask any wardrobe question</h2>
          </div>
          {aiStatus === 'ready' ? (
            <span className="chip green">Stylist connected</span>
          ) : aiStatus === 'no_key' ? (
            <span className="chip">Setup needed</span>
          ) : null}
        </div>

        <div className="field stylist-item-picker">
          <label htmlFor="stylist-garment">Ask about a specific item <span className="muted">(optional)</span></label>
          <select
            id="stylist-garment"
            value={focusedGarment?.id || ''}
            onChange={(e) => selectGarment(e.target.value)}
            disabled={garments === null || thinking}
          >
            <option value="">{garments === null ? 'Loading your wardrobe…' : 'No specific item'}</option>
            {selectableGarments.map((g) => (
              <option key={g.id} value={g.id}>
                {categoryById(g.category).label}: {g.name}{g.status !== 'active' ? ` · ${g.status}` : ''}
              </option>
            ))}
          </select>
        </div>

        {focusedGarment && (
          <div className="stylist-focus" aria-label={`Asking about ${focusedGarment.name}`}>
            <div className="stylist-focus-photo"><GarmentThumb garment={focusedGarment} /></div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="eyebrow">Asking about this item</div>
              <strong>{focusedGarment.name}</strong>
              <div className="muted" style={{ fontSize: '0.76rem' }}>
                {categoryById(focusedGarment.category).label} · {focusedGarment.location === 'dc' ? 'D.C.' : 'Howell'}
              </div>
            </div>
            <button type="button" className="btn small ghost" onClick={() => selectGarment('')} disabled={thinking}>Clear</button>
          </div>
        )}
        {requestedGarmentId && garments !== null && !focusedGarment && (
          <p className="form-msg" role="status">
            That item is not currently available in your closet. <button type="button" className="btn small ghost" onClick={() => selectGarment('')}>Choose another item</button>
          </p>
        )}

        <div className="eyebrow" style={{ margin: '16px 0 8px' }}>Try a question</div>
        <div className="prompt-starters" aria-label="Example questions">
          {STYLIST_STARTERS.filter((prompt) => focusedGarment || prompt !== 'What goes with this?').map((prompt) => (
            <button type="button" className="prompt-chip" key={prompt} onClick={() => setDraft(prompt)}>
              {prompt}
            </button>
          ))}
        </div>

        <div className="chat" aria-live="polite">
          {messages.length === 0 && (
            <p className="muted" style={{ margin: 0 }}>
              Your answer will name the exact pieces it is using. Nothing is saved or changed unless you choose a separate action.
            </p>
          )}
          {messages.length > visibleMessages.length && (
            <p className="muted stylist-earlier-note">Earlier questions are still remembered. Showing the latest conversation.</p>
          )}
          {visibleMessages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === 'user' ? 'me' : 'ai'}`}>
              {m.role === 'assistant' ? renderAiText(m.text) : m.text}
            </div>
          ))}
          {thinking && <div className="bubble ai">Consulting the closet…</div>}
          <div ref={chatEnd} />
        </div>
        {visualRecommendations.length > 0 && (
          <section className="stack stylist-visual-outfits" aria-label="Visual outfit recommendations">
            <div className="recommendation-head">
              <div className="eyebrow">Your outfits</div>
              <h2>
                {visualRecommendations.length}{' '}
                {visualRecommendations.length === 1 ? 'outfit' : 'outfits'} from your closet
              </h2>
              <p className="muted">These are the exact pieces named above. Click a photo to enlarge it, then choose “Back to outfit.”</p>
            </div>
            {visualRecommendations.map((outfit, index) => (
              <OutfitSuggestion
                key={`${outfit.name}-${index}`}
                outfit={outfit}
                onGarmentClick={setPreviewGarment}
                canSave={false}
              />
            ))}
            <div className="stylist-revise-help">
              <strong>Want a change?</strong>
              <span>Ask below—for example, “Use a different shirt in outfit 2” or “I wore that jacket today.”</span>
            </div>
          </section>
        )}
        {messages.length > 0 && <p className="muted stylist-saved-note">This conversation stays in this browser tab if you leave and come back.</p>}
        <form onSubmit={send} className="stylist-question-row">
          <input
            value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder={focusedGarment ? 'What goes with this?' : 'Try “Dinner with friends tomorrow”'}
            aria-label="Ask the stylist"
          />
          <button className="btn" disabled={thinking || !draft.trim() || garments === null || garmentLoadError}>Ask the stylist</button>
        </form>
        {garmentLoadError && (
          <p className="form-msg" role="alert">
            I couldn’t open your wardrobe, so I won’t guess. <button type="button" className="btn small ghost" onClick={loadGarments}>Try again</button>
          </p>
        )}
        {aiStatus === 'no_key' && (
          <p className="muted" style={{ marginTop: 8 }}>
            AI advice needs one-time setup on the <Link to="/profile">Profile page</Link>.
          </p>
        )}
        {contextWarning.length > 0 && (
          <p className="form-msg" role="status">
            I answered without {contextWarning.join(', ')} because that information could not be loaded. I did not guess it.
          </p>
        )}
      </div>

      <GarmentPreviewDialog garment={previewGarment} onClose={closeGarmentPreview} />
    </div>
  )
}
