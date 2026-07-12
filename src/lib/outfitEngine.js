import { categoryById, NEUTRALS } from './constants'

// Rule-based outfit recommender. Given the garments available at one
// location, an occasion, and the day's weather, it assembles and scores
// outfit combinations, returning the top few with fit tips.

const HOT = 78
const MILD = 65
const COOL = 48

function band(tempHi) {
  if (tempHi >= HOT) return 'hot'
  if (tempHi >= MILD) return 'mild'
  if (tempHi >= COOL) return 'cool'
  return 'cold'
}

const OCCASION_FORMALITY = {
  formal: { formal: 0, business_casual: -14 },
  business_casual: { business_casual: 0, formal: -4, casual: -10 },
  casual: { casual: 0, business_casual: -3 },
}

const OCCASION_CATEGORIES = {
  formal: {
    suit: ['suit'],
    jacket: ['blazer'],
    top: ['dress_shirt'],
    bottom: ['dress_pants'],
    shoes: ['dress_shoes'],
    tie: ['tie'],
    belt: ['belt'],
  },
  business_casual: {
    jacket: ['blazer'],
    top: ['dress_shirt', 'casual_shirt', 'polo'],
    layer: ['sweater'],
    bottom: ['dress_pants', 'chinos'],
    shoes: ['dress_shoes', 'casual_shoes', 'boots'],
    belt: ['belt'],
  },
  casual: {
    top: ['casual_shirt', 'polo', 't_shirt'],
    layer: ['sweater'],
    bottom: ['jeans', 'chinos', 'shorts'],
    shoes: ['casual_shoes', 'boots'],
    belt: ['belt'],
  },
}

function colorKey(c) {
  return (c || '').toLowerCase().replace('light blue', 'blue-light')
}

function isNeutral(c) {
  const k = colorKey(c)
  return !c || NEUTRALS.has(k) || k === 'blue-light'
}

function garmentScore(g, occasion, wBand) {
  let s = 40
  const fPenalty = OCCASION_FORMALITY[occasion][g.formality]
  if (fPenalty === undefined) return -1 // formality not acceptable for this occasion
  s += fPenalty

  // Weather suitability by garment weight
  const w = g.warmth || 'all'
  if (wBand === 'hot') {
    if (w === 'warm') return -1
    if (w === 'mid') s -= 6
  } else if (wBand === 'mild') {
    if (w === 'warm') s -= 8
  } else if (wBand === 'cool') {
    if (w === 'light') s -= 4
  } else if (wBand === 'cold') {
    if (w === 'light') s -= 8
    if (w === 'warm') s += 6
  }
  if (g.category === 'shorts' && wBand !== 'hot') return -1

  // Rotation freshness: favor pieces you haven't worn lately
  if (g.last_worn) {
    const days = (Date.now() - new Date(g.last_worn + 'T12:00:00').getTime()) / 86400000
    if (days < 2) s -= 10
    else if (days < 5) s -= 4
    else if (days > 14) s += 3
  } else {
    s += 2
  }
  return s
}

function pairScore(outfit) {
  let s = 0
  const bySlot = {}
  for (const { slot, g } of outfit) bySlot[slot] = g

  const jacket = bySlot.suit || bySlot.jacket
  const bottom = bySlot.suit || bySlot.bottom
  const nonNeutrals = new Set(
    outfit.filter(({ g }) => !isNeutral(g.color)).map(({ g }) => colorKey(g.color)),
  )
  if (nonNeutrals.size > 2) s -= 15
  else if (nonNeutrals.size === 2) s -= 5

  if (jacket && bottom && jacket !== bottom) {
    const jc = colorKey(jacket.color)
    const bc = colorKey(bottom.color)
    if (jc && jc === bc) s -= 8 // matching separates read as a mismatched suit
    if (jc === 'navy' && (bc === 'gray' || bc === 'charcoal' || bc === 'tan' || bc === 'khaki')) s += 8
    if ((jc === 'navy' && bc === 'black') || (jc === 'black' && bc === 'navy')) s -= 6
  }
  if (bySlot.shoes && bySlot.belt) {
    const sc = colorKey(bySlot.shoes.color)
    const bc = colorKey(bySlot.belt.color)
    if ((sc === 'black' && bc === 'brown') || (sc === 'brown' && bc === 'black')) s -= 10
    if (sc && sc === bc) s += 5
  }
  if (bySlot.top && isNeutral(bySlot.top.color) === false && jacket && isNeutral(jacket.color)) s += 3
  return s
}

function buildTips({ outfit, occasion, wBand, rain }) {
  const tips = []
  const slots = new Set(outfit.map((o) => o.slot))
  if (slots.has('bottom') || slots.has('suit')) {
    tips.push('Seated hem check: trousers rise 1–2 inches on the scooter — make sure the hem still covers your socks while seated.')
  }
  if (slots.has('suit') || slots.has('jacket')) {
    tips.push('Unbutton the jacket when riding so the front quarters sit clean and nothing pulls at the shoulders.')
  }
  if (slots.has('outer')) {
    tips.push('Keep outerwear hip-length or shorter — long coats catch on the scooter wheels.')
  }
  if (wBand === 'hot') tips.push('High heat today — favor the lightest fabrics and skip unnecessary layers.')
  if (wBand === 'cold') tips.push('Cold day — a warm layer matters more when seated and less active; consider a lap blanket for long outdoor stretches.')
  if (rain) tips.push('Rain likely — dark, weather-tolerant shoes and a water-resistant layer will hold up best.')
  return tips.slice(0, 3)
}

function nameOutfit(outfit) {
  const bySlot = {}
  for (const { slot, g } of outfit) bySlot[slot] = g
  const anchor = bySlot.suit || bySlot.jacket || bySlot.top
  const bottom = bySlot.bottom
  if (bySlot.suit) return `The ${bySlot.suit.color || ''} suit`.replace(/\s+/g, ' ').trim()
  if (anchor && bottom) return `${cap(anchor.color)} ${shortName(anchor)} & ${(bottom.color || '').toLowerCase()} ${shortName(bottom)}`
  return anchor ? `${cap(anchor.color)} ${shortName(anchor)}` : 'Suggested outfit'
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '')
const SHORT_NAMES = {
  suit: 'suit', blazer: 'blazer', dress_shirt: 'shirt', casual_shirt: 'shirt',
  polo: 'polo', t_shirt: 'tee', sweater: 'knit', dress_pants: 'trousers',
  chinos: 'chinos', jeans: 'jeans', shorts: 'shorts',
}
const shortName = (g) => SHORT_NAMES[g.category] || categoryById(g.category).label.toLowerCase()

export function recommendOutfits({ garments, occasion, weather, count = 3 }) {
  const wBand = band(weather?.hi ?? 68)
  const rain = (weather?.precip ?? 0) >= 50
  const pool = garments.filter((g) => g.status === 'active')

  const catMap = OCCASION_CATEGORIES[occasion]
  const bySlot = {}
  for (const [slot, cats] of Object.entries(catMap)) {
    bySlot[slot] = pool
      .filter((g) => cats.includes(g.category))
      .map((g) => ({ g, s: garmentScore(g, occasion, wBand) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
  }
  const outers = pool
    .filter((g) => g.category === 'outerwear')
    .map((g) => ({ g, s: garmentScore(g, occasion, wBand) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)

  // Formal prefers a full suit; separates are the fallback
  const useSuit = occasion === 'formal' && (bySlot.suit || []).length > 0

  const combos = []
  const tops = bySlot.top || []
  const bottoms = useSuit ? [null] : bySlot.bottom || []
  const shoes = bySlot.shoes || []
  const jackets = useSuit ? bySlot.suit : bySlot.jacket && bySlot.jacket.length ? bySlot.jacket : [null]
  const wantJacket = occasion === 'formal' || (occasion === 'business_casual' && (wBand === 'cool' || wBand === 'cold'))
  const jacketOptions = occasion === 'formal' ? jackets : wantJacket && jackets[0] ? jackets : [null, ...jackets.filter(Boolean)]

  for (const j of jacketOptions.slice(0, 4)) {
    for (const t of tops.slice(0, 4)) {
      for (const b of bottoms.slice(0, 4)) {
        for (const sh of shoes.slice(0, 3)) {
          const outfit = []
          if (j) outfit.push({ slot: useSuit ? 'suit' : 'jacket', g: j.g })
          outfit.push({ slot: 'top', g: t.g })
          if (b) outfit.push({ slot: 'bottom', g: b.g })
          outfit.push({ slot: 'shoes', g: sh.g })

          // Cold-weather knit layer when available (not over a formal suit)
          if ((wBand === 'cool' || wBand === 'cold') && bySlot.layer?.length && !useSuit) {
            outfit.push({ slot: 'layer', g: bySlot.layer[0].g })
          }
          if (occasion === 'formal' && bySlot.tie?.length) outfit.push({ slot: 'tie', g: bySlot.tie[0].g })
          if (bySlot.belt?.length && (b || j)) outfit.push({ slot: 'belt', g: bySlot.belt[0].g })
          if ((wBand === 'cold' || (wBand === 'cool' && rain)) && outers.length) {
            outfit.push({ slot: 'outer', g: outers[0].g })
          }

          let score = outfit.reduce((acc, { g }) => acc + garmentScore(g, occasion, wBand), 0) / outfit.length
          score += pairScore(outfit)
          if (rain && outfit.some(({ g }) => g.category === 'boots')) score += 6
          combos.push({ outfit, score })
        }
      }
    }
  }

  combos.sort((a, b) => b.score - a.score)

  // Pick top outfits that differ meaningfully (distinct anchor pieces)
  const picked = []
  const usedAnchors = new Set()
  for (const c of combos) {
    const anchor = c.outfit.find((o) => ['suit', 'jacket', 'top'].includes(o.slot))
    const bottomItem = c.outfit.find((o) => o.slot === 'bottom')
    const key = `${anchor?.g.id}|${bottomItem?.g.id}`
    if (picked.some((p) => p.key === key)) continue
    const anchorId = anchor?.g.id
    if (usedAnchors.has(anchorId) && picked.length < combos.length - 1) continue
    usedAnchors.add(anchorId)
    picked.push({ key, ...c })
    if (picked.length >= count) break
  }
  // Backfill if the diversity rule left us short
  for (const c of combos) {
    if (picked.length >= count) break
    const anchor = c.outfit.find((o) => ['suit', 'jacket', 'top'].includes(o.slot))
    const bottomItem = c.outfit.find((o) => o.slot === 'bottom')
    const key = `${anchor?.g.id}|${bottomItem?.g.id}`
    if (!picked.some((p) => p.key === key)) picked.push({ key, ...c })
  }

  return {
    band: wBand,
    rain,
    outfits: picked.map((p) => ({
      name: nameOutfit(p.outfit),
      items: p.outfit,
      tips: buildTips({ outfit: p.outfit, occasion, wBand, rain }),
    })),
    missing: missingSlots(bySlot, occasion, useSuit),
  }
}

function missingSlots(bySlot, occasion, useSuit) {
  const need = occasion === 'formal'
    ? useSuit ? ['top', 'shoes'] : ['jacket', 'top', 'bottom', 'shoes']
    : ['top', 'bottom', 'shoes']
  return need.filter((slot) => !(bySlot[slot] || []).length)
}
