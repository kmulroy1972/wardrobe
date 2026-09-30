import { categoryById } from './constants'
import { nameOutfit, recommendOutfits } from './outfitEngine'
import { classifyStylistRequest } from './stylistRequest'

const MAX_OUTFITS = 5
const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const WORD_COUNTS = { one: 1, two: 2, three: 3, four: 4, five: 5 }
const SLOT_CATEGORIES = {
  jacket: ['blazer'],
  top: ['dress_shirt', 'casual_shirt', 'polo', 't_shirt'],
  bottom: ['dress_pants', 'chinos', 'jeans', 'shorts'],
  shoes: ['dress_shoes', 'casual_shoes', 'boots'],
}
const SLOT_WORDS = {
  jacket: /\b(?:blazers?|jackets?|sports? coats?|sports? jackets?)\b/i,
  top: /\b(?:shirts?|tops?|polos?)\b/i,
  bottom: /\b(?:trousers?|slacks?|pants?|chinos?|jeans?|shorts?)\b/i,
  shoes: /\b(?:shoes?|sneakers?|boots?|loafers?|oxfords?)\b/i,
}
const COLORS = [
  'light blue', 'dark blue', 'navy', 'blue', 'gray', 'grey', 'charcoal', 'black',
  'white', 'cream', 'ivory', 'brown', 'mocha', 'tan', 'khaki', 'beige', 'burgundy',
  'green', 'olive', 'red', 'pink', 'purple', 'orange', 'yellow',
]
const COLOR_SOURCE = COLORS.sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\bgrey\b/g, 'gray')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function includesNormalizedPhrase(value, phrase) {
  return ` ${normalize(value)} `.includes(` ${normalize(phrase)} `)
}

function isNegatedMention(normalizedText, index) {
  const prefix = normalizedText.slice(Math.max(0, index - 90), index).trimEnd()
  return /(?:^|\s)(?:no|without|skip|exclude|avoid|not|do not|don t|dont|do not want|don t want|dont want|not wearing|cannot wear|can t wear|cannot use|can t use)(?:\s+(?:a|an|the|any|my|that|those|want|wear|use|include|wearing|using|to)){0,3}\s*$/.test(prefix)
}

function isNegatedPrefix(normalizedPrefix) {
  return isNegatedMention(normalizedPrefix, normalizedPrefix.length)
}

function phraseMentions(text, phrase) {
  const normalizedText = normalize(text)
  const normalizedPhrase = normalize(phrase)
  const matches = []
  let start = 0
  while (normalizedPhrase && start < normalizedText.length) {
    const index = normalizedText.indexOf(normalizedPhrase, start)
    if (index < 0) break
    const before = normalizedText[index - 1]
    const after = normalizedText[index + normalizedPhrase.length]
    if ((!before || before === ' ') && (!after || after === ' ')) {
      matches.push({ index, negated: isNegatedMention(normalizedText, index) })
    }
    start = index + normalizedPhrase.length
  }
  return matches
}

function garmentSlot(garment) {
  try {
    return categoryById(garment?.category).slot || null
  } catch {
    return null
  }
}

function dayLabels(text) {
  const labels = []
  const pattern = new RegExp(`\\b(${DAY_NAMES.join('|')})(?:\\s+(morning|afternoon|evening|night))?\\b`, 'gi')
  for (const match of text.matchAll(pattern)) {
    const label = `${match[1]}${match[2] ? ` ${match[2]}` : ''}`
    labels.push(label[0].toUpperCase() + label.slice(1).toLowerCase())
  }
  return [...new Set(labels)]
}

function requestedCount(text, days) {
  const match = normalize(text).match(/\b(\d+|one|two|three|four|five)\s+(?:(?:different|distinct|business\s+casual|casual|formal|conference|work|travel)\s+){0,3}(?:outfits?|looks?|days?|nights?)\b/)
  if (match) {
    const raw = match[1]
    return Math.min(MAX_OUTFITS, Math.max(1, Number(raw) || WORD_COUNTS[raw] || 1))
  }
  if (/\b(?:a couple|couple of)\s+(?:outfits?|looks?|days?|nights?)\b/i.test(text)) return 2
  if (days.length > 0) return Math.min(MAX_OUTFITS, days.length)
  if (/\b(?:outfits|looks|meetings|days|nights)\b/i.test(text)) return 2
  return 1
}

export function isStylistVisualFollowUp(text) {
  return /\b(?:visuals?|images?|photos?|pictures?)\b/i.test(text)
    && /\b(?:show|give|display|see|view|these|the)\b/i.test(text)
}

function parseOutfitQuestion(text, selectedGarment = null) {
  const days = dayLabels(text)
  const outfitRequest = /\b(?:outfits?|looks?|what should i wear|what can i wear|what goes with|put together|dress me|pack me|wear to|dinner|conference|meeting|interview|wedding|date)\b/i.test(text)
  if (!outfitRequest) return null

  const explicitOccasion = /\bbusiness[ -]+casual\b/i.test(text)
    ? 'business_casual'
    : /\b(?:formal|black[ -]?tie|gala)\b/i.test(text)
      ? 'formal'
      : /\b(?:casual|dinner|date)\b/i.test(text)
        ? 'casual'
        : null
  const inferredOccasion = ['formal', 'business_casual', 'casual'].includes(selectedGarment?.formality)
    ? selectedGarment.formality
    : null
  const occasion = explicitOccasion || inferredOccasion || 'business_casual'
  const requiredSlots = []
  const excludedSlots = []
  const mentionedSlots = Object.entries(SLOT_WORDS)
    .filter(([, pattern]) => pattern.test(text))
    .map(([slot]) => slot)

  if (mentionedSlots.includes('jacket') && !/\b(?:no|without|skip)\s+(?:a\s+)?(?:blazer|jacket|coat)\b/i.test(text)) {
    requiredSlots.push('jacket')
  }
  if (/\b(?:no|without|skip)\s+(?:a\s+)?ties?\b|\btie[- ]free\b/i.test(text)) excludedSlots.push('tie')
  if (/\b(?:no|without|skip)\s+(?:a\s+)?(?:blazers?|jackets?|sports? coats?)\b/i.test(text)) excludedSlots.push('jacket')

  const distinctSlots = requestedCount(text, days) > 1 ? ['top', 'bottom'] : []
  if (/\b(?:different|distinct|no repeat(?:s)?)\b.{0,24}\b(?:blazers?|jackets?)\b/i.test(text)) {
    distinctSlots.push('jacket')
  }
  return {
    sourceQuestion: text,
    occasion,
    count: requestedCount(text, days),
    days,
    requiredSlots,
    excludedSlots,
    distinctSlots: [...new Set(distinctSlots)],
    mentionedSlots,
  }
}

function requestedGarments(text, garments, selectedGarment) {
  const active = garments.filter((garment) => garment.status === 'active')
  const bySlot = {}
  const missing = []
  const missingSlots = []
  const excludedGarmentIds = new Set()

  for (const garment of active) {
    if (garment.name?.length <= 4) continue
    const mentions = phraseMentions(text, garment.name)
    if (mentions.length === 0) continue
    if (!mentions.some((mention) => !mention.negated)) {
      excludedGarmentIds.add(garment.id)
      continue
    }
    const slot = garmentSlot(garment)
    if (slot) bySlot[slot] = [...new Map([...(bySlot[slot] || []), garment].map((item) => [item.id, item])).values()]
  }

  const itemWords = [
    ['jacket', /(?:blazers?|jackets?|sports? coats?|sports? jackets?)/i],
    ['top', /(?:shirts?|tops?|polos?)/i],
    ['bottom', /(?:trousers?|slacks?|pants?|chinos?|jeans?|shorts?)/i],
    ['shoes', /(?:shoes?|sneakers?|boots?|loafers?|oxfords?)/i],
  ]
  const phrasePattern = new RegExp(`\\b(${COLOR_SOURCE})\\s+([a-z -]+?)\\b`, 'gi')
  for (const match of text.matchAll(phrasePattern)) {
    const color = normalize(match[1])
    const following = match[2]
    const slot = itemWords.find(([, pattern]) => pattern.test(following))?.[0]
    if (!slot || !SLOT_CATEGORIES[slot]) continue
    const normalizedPrefix = normalize(text.slice(0, match.index || 0))
    const negated = isNegatedPrefix(normalizedPrefix)
    const found = active.filter((garment) => {
      if (garmentSlot(garment) !== slot && !SLOT_CATEGORIES[slot].includes(garment.category)) return false
      const details = normalize([garment.name, garment.brand, garment.color, garment.category].filter(Boolean).join(' '))
      return includesNormalizedPhrase(details, color)
    })
    if (negated) {
      found.forEach((garment) => excludedGarmentIds.add(garment.id))
      continue
    }
    if (found.length > 0) {
      bySlot[slot] = [...new Map([...(bySlot[slot] || []), ...found].map((item) => [item.id, item])).values()]
    } else {
      missing.push(`${match[1]} ${following.trim()}`.trim())
      missingSlots.push(slot)
    }
  }

  if (selectedGarment?.id
    && active.some((garment) => garment.id === selectedGarment.id)
    && !excludedGarmentIds.has(selectedGarment.id)) {
    const slot = garmentSlot(selectedGarment)
    if (slot && !bySlot[slot]) bySlot[slot] = [selectedGarment]
  }

  return {
    bySlot,
    missing: [...new Set(missing)],
    missingSlots: [...new Set(missingSlots)],
    excludedGarmentIds: [...excludedGarmentIds],
  }
}

function outfitSignature(outfit) {
  return outfit.items.map(({ slot, g }) => `${slot}:${g.id}`).sort().join('|')
}

function isCompleteOutfit(outfit, occasion) {
  const slots = new Set(outfit.items.map(({ slot }) => slot))
  if (!slots.has('top') || !slots.has('shoes')) return false
  if (occasion === 'formal') return slots.has('suit') || (slots.has('jacket') && slots.has('bottom'))
  return slots.has('bottom')
}

function satisfiesDistinctSlots(candidate, existing, slots) {
  return slots.every((slot) => {
    const candidateGarment = candidate.items.find((item) => item.slot === slot)?.g
    if (!candidateGarment) return existing.every((outfit) => !outfit.items.some((item) => item.slot === slot))
    return existing.every((outfit) => outfit.items.find((item) => item.slot === slot)?.g.id !== candidateGarment.id)
  })
}

function requestedReplacementGarments(text, slot, garments) {
  const clauses = []
  const commandClause = text.match(/\b(?:to|with|for|use|choose|pick)\s+(?:the|a|an)?\s*(.*?)(?=,|[.!?]|\b(?:in|for)\s+(?:outfit|look)\b|$)/i)?.[1]
  if (commandClause) clauses.push(commandClause)
  const slotWords = {
    jacket: '(?:blazers?|jackets?|sports? coats?|sports? jackets?)',
    top: '(?:shirts?|tops?|polos?)',
    bottom: '(?:trousers?|slacks?|pants?|chinos?|jeans?|shorts?)',
    shoes: '(?:shoes?|sneakers?|boots?|loafers?|oxfords?)',
  }
  const changedPiece = text.match(new RegExp(`\\b(?:different|another|new)\\b[^.!?,]{0,40}?\\b${slotWords[slot]}\\b`, 'i'))?.[0]
  if (changedPiece) clauses.push(changedPiece)
  if (clauses.length === 0) return { garments: [], missing: false }

  const normalized = clauses.map(normalize).join(' ')
  const exact = garments.filter((garment) => (
    garmentSlot(garment) === slot
    && garment.name?.length > 4
    && normalized.includes(normalize(garment.name))
  ))
  if (exact.length > 0) return { garments: exact, missing: false }

  const colors = [...clauses.join(' ').matchAll(new RegExp(`\\b(${COLOR_SOURCE})\\b`, 'gi'))]
    .map((match) => normalize(match[1]))
  if (colors.length === 0) return { garments: [], missing: false }
  const matches = garments.filter((garment) => {
    if (garmentSlot(garment) !== slot) return false
    const details = normalize([garment.name, garment.brand, garment.color, garment.category].filter(Boolean).join(' '))
    return colors.some((color) => includesNormalizedPhrase(details, color))
  })
  return { garments: matches, missing: matches.length === 0 }
}

function planOneRequest(intent, garments, selectedGarment, weather, excludedGarmentIds = []) {
  const active = garments.filter((garment) => garment.status === 'active')
  const requested = requestedGarments(intent.sourceQuestion, active, selectedGarment)
  const explicitSlots = Object.keys(requested.bySlot)
  const requiredSlots = [...new Set([...intent.requiredSlots, ...explicitSlots])]
  const missingRequiredNames = requested.missing
  const outfits = []
  const signatures = new Set()
  let missingSlots = []

  const explicitSlotList = explicitSlots.filter((slot) => (requested.bySlot[slot] || []).length > 0)
  const blockedNamedSlots = requested.missingSlots
  const planCount = blockedNamedSlots.length
    ? Math.min(intent.count, ...blockedNamedSlots.map((slot) => requested.bySlot[slot]?.length || 0))
    : intent.count
  const distinctSlots = intent.distinctSlots.filter((slot) => (requested.bySlot[slot] || []).length !== 1)
  for (let index = 0; index < planCount; index += 1) {
    const blockedGarmentIds = new Set([...requested.excludedGarmentIds, ...excludedGarmentIds])
    const pool = active.filter((garment) => !blockedGarmentIds.has(garment.id) && (
      Object.entries(requested.bySlot).every(([slot, choices]) => {
        if (!choices.length) return true
        const chosen = choices[index % choices.length]
        return garmentSlot(garment) !== slot || garment.id === chosen.id
      })
    ))
    const anchorSlot = explicitSlotList.find((slot) => (requested.bySlot[slot] || []).length > 1)
      || explicitSlotList[0]
    const anchor = anchorSlot ? requested.bySlot[anchorSlot][index % requested.bySlot[anchorSlot].length] : null
    const constraints = {
      requiredSlots,
      excludedSlots: intent.excludedSlots,
      excludedGarmentIds: [...blockedGarmentIds],
      ...(anchor ? { anchorGarmentId: anchor.id } : {}),
    }
    const recommendation = recommendOutfits({
      garments: pool,
      occasion: intent.occasion,
      weather,
      count: 20,
      constraints,
    })
    missingSlots = recommendation.missing || missingSlots
    const next = recommendation.outfits.find((outfit) => (
      isCompleteOutfit(outfit, intent.occasion)
      && !signatures.has(outfitSignature(outfit))
      && satisfiesDistinctSlots(outfit, outfits, distinctSlots)
    ))
    if (!next) break
    signatures.add(outfitSignature(next))
    const dayLabel = intent.days[index]
    outfits.push({
      ...next,
      name: dayLabel ? `${dayLabel} · ${next.name}` : (planCount > 1 ? `Outfit ${index + 1} · ${next.name}` : next.name),
    })
  }

  return {
    isLocalPlan: true,
    sourceQuestion: intent.sourceQuestion,
    occasion: intent.occasion,
    requestedCount: intent.count,
    days: intent.days,
    outfits,
    missingSlots,
    missingRequiredNames,
    unsupportedSlots: explicitSlots.filter((slot) => slot === 'accessory'),
    distinctSlots,
    weather,
  }
}

function requestedReplacementSlot(text) {
  const patterns = [
    ['jacket', /\b(?:different|another|change|replace|swap|new)\b.{0,28}\b(?:blazers?|jackets?|sports? coats?)\b|\b(?:blazers?|jackets?)\b.{0,28}\b(?:different|another|change|replace|swap)\b/i],
    ['top', /\b(?:different|another|change|replace|swap|new)\b.{0,28}\b(?:shirts?|tops?|polos?)\b|\b(?:shirts?|tops?|polos?)\b.{0,28}\b(?:different|another|change|replace|swap)\b/i],
    ['bottom', /\b(?:different|another|change|replace|swap|new)\b.{0,28}\b(?:trousers?|slacks?|pants?|chinos?|jeans?)\b|\b(?:trousers?|pants?|chinos?)\b.{0,28}\b(?:different|another|change|replace|swap)\b/i],
    ['shoes', /\b(?:different|another|change|replace|swap|new)\b.{0,28}\b(?:shoes?|sneakers?|boots?|loafers?)\b|\b(?:shoes?|sneakers?|boots?)\b.{0,28}\b(?:different|another|change|replace|swap)\b/i],
  ]
  const explicit = patterns.find(([, pattern]) => pattern.test(text))?.[0]
  if (explicit) return explicit
  if (/\b(?:wore|had|am wearing)\b/i.test(text)) {
    return Object.entries(SLOT_WORDS).find(([, pattern]) => pattern.test(text))?.[0] || null
  }
  return null
}

function targetIndexes(text, outfits) {
  if (/\b(?:all|each|every|both)\b/i.test(text)) return outfits.map((_, index) => index)
  const numeric = text.match(/\b(?:outfit|look)\s*(\d+)\b/i)
  const ordinal = text.match(/\b(first|second|third|fourth|fifth)\s+(?:outfit|look|one)\b/i)
  const ordinalIndexes = { first: 0, second: 1, third: 2, fourth: 3, fifth: 4 }
  const index = numeric ? Number(numeric[1]) - 1 : ordinal ? ordinalIndexes[ordinal[1].toLowerCase()] : null
  if (index !== null) return index >= 0 && index < outfits.length ? [index] : []
  return outfits.length === 1 ? [0] : []
}

function isRevisionQuestion(text) {
  return Boolean(requestedReplacementSlot(text))
    || /\b(?:wore|had)\b.{0,35}\b(?:today|tonight)\b/i.test(text)
}

function compatibleReplacement(candidate, slot, outfit, plan, garments, currentId, usedIds) {
  if (!SLOT_CATEGORIES[slot]?.includes(candidate.category) && garmentSlot(candidate) !== slot) return false
  if (candidate.id === currentId || usedIds.has(candidate.id)) return false
  const check = recommendOutfits({
    garments,
    occasion: plan.occasion,
    weather: plan.weather,
    count: 20,
    constraints: {
      anchorGarmentId: candidate.id,
      excludedGarmentIds: [currentId],
      excludedSlots: [],
    },
  })
  return check.outfits.some((suggestion) => {
    const ids = new Set(suggestion.items.map(({ g }) => g.id))
    return outfit.items.filter((item) => item.slot !== slot).every(({ g }) => ids.has(g.id))
  })
}

function revisePlan(plan, text, garments) {
  const slot = requestedReplacementSlot(text)
  const targets = targetIndexes(text, plan.outfits)
  if (!slot) {
    return { ...plan, reply: 'I kept the outfit cards intact. Tell me which piece you want changed and which outfit number.' }
  }
  if (targets.length === 0) {
    return { ...plan, reply: `Which outfit should I change the ${slot}? Say “outfit 1” or “outfit 2,” and I’ll keep the other pieces in place.` }
  }

  const outfits = plan.outfits.map((outfit) => ({ ...outfit, items: outfit.items.map((item) => ({ ...item })), tips: [...outfit.tips] }))
  const active = garments.filter((garment) => garment.status === 'active')
  const named = requestedReplacementGarments(text, slot, active)
  if (named.missing) return { ...plan, reply: 'I couldn’t find the requested replacement in your active closet, so I left the outfit unchanged.' }
  const updated = []
  for (const index of targets) {
    const outfit = outfits[index]
    const current = outfit.items.find((item) => item.slot === slot)
    if (!current) continue
    const usedIds = new Set(plan.distinctSlots.includes(slot)
      ? outfits.flatMap((other, otherIndex) => otherIndex === index ? [] : other.items.filter((item) => item.slot === slot).map((item) => item.g.id))
      : [])
    const candidates = named.garments.length ? named.garments : active
    const replacement = candidates.find((candidate) => compatibleReplacement(candidate, slot, outfit, plan, active, current.g.id, usedIds))
    if (!replacement) {
      return { ...plan, reply: `I couldn't find another active closet ${slot} that works with the rest of outfit ${index + 1}, so I left it unchanged.` }
    }
    current.g = replacement
    const label = plan.days?.[index] || (plan.requestedCount > 1 ? `Outfit ${index + 1}` : '')
    outfit.name = `${label ? `${label} · ` : ''}${nameOutfit(outfit.items)}`
    updated.push(index + 1)
  }

  if (updated.length === 0) return { ...plan, outfits, reply: `I couldn't find a ${slot} in the selected outfit to change.` }
  const reply = `Updated the ${slot} in ${updated.map((index) => `outfit ${index}`).join(' and ')}. The other pieces stayed the same.`
  return { ...plan, outfits, reply }
}

function isRetryQuestion(text) {
  return /\b(?:try again|recheck the closet|review the closet|carefully review)\b/i.test(text)
}

function formatPlanReply(plan) {
  if (plan.outfits.length === 0) {
    const named = plan.missingRequiredNames.length
      ? ` I couldn't match ${plan.missingRequiredNames.join(' or ')} to an active closet item, so I did not substitute another piece.`
      : ''
    const slots = plan.missingSlots.length ? ` Missing categories: ${plan.missingSlots.join(', ')}.` : ''
    return `I couldn't build a complete outfit from the active items in your closet.${named}${slots}`
  }
  const amount = plan.outfits.length
  const requested = plan.requestedCount
  const occasion = plan.occasion.replace('_', ' ')
  let reply = `I built ${amount} ${occasion} ${amount === 1 ? 'look' : 'looks'} from active items in your closet. The cards show the exact catalog pieces and photos.`
  if (amount < requested) reply += ` You asked for ${requested}; I found only ${amount} complete combination${amount === 1 ? '' : 's'} that meet the closet constraints.`
  if (plan.missingRequiredNames.length) reply += ` I couldn't match ${plan.missingRequiredNames.join(' or ')} to an active closet item, so I didn't substitute for it.`
  return `${reply}\n\n${formatPlanOutfits(plan)}`
}

function formatPlanOutfits(plan) {
  return plan.outfits.map((outfit, index) => [
    `Outfit ${index + 1} — ${outfit.name}`,
    ...outfit.items.map(({ slot, g }) => (
      `- ${categoryById(g.category).label}: ${g.name}${g.brand ? ` — ${g.brand}` : ''} [[${g.id}]]`
    )),
  ].join('\n')).join('\n\n')
}

export function buildStylistConversationPlan(messages, garments, selectedGarment = null) {
  let plan = null
  let baseIntent = null
  for (const message of messages) {
    if (message?.role !== 'user') continue
    const mode = message.requestMode || classifyStylistRequest(message.text)
    if (mode === 'visual' || mode === 'add' || mode === 'continue') continue
    if (isRetryQuestion(message.text) && plan && baseIntent) {
      plan = planOneRequest(baseIntent, garments, selectedGarment, plan.weather)
      continue
    }
    if (plan && isRevisionQuestion(message.text)) {
      plan = revisePlan(plan, message.text, garments)
      continue
    }
    const intent = parseOutfitQuestion(message.text, selectedGarment)
    if (!intent) continue
    baseIntent = intent
    plan = planOneRequest(intent, garments, selectedGarment)
  }
  return plan
}

export function buildStylistLocalTurn({ question, messages, garments, selectedGarment = null }) {
  const existingPlan = buildStylistConversationPlan(messages, garments, selectedGarment)
  const requestMode = classifyStylistRequest(question)
  if (requestMode === 'add' || requestMode === 'continue') return { handled: false }
  if (isStylistVisualFollowUp(question)) {
    if (!existingPlan || existingPlan.unsupportedSlots?.length) return { handled: false }
    return {
      handled: true,
      showVisuals: existingPlan.outfits.length > 0,
      text: existingPlan.outfits.length
        ? 'The outfit cards below show the real photos for each closet item. Click a photo to enlarge it.'
        : formatPlanReply(existingPlan),
    }
  }

  if (isRetryQuestion(question) && existingPlan) {
    const retry = planOneRequest(parseOutfitQuestion(existingPlan.sourceQuestion, selectedGarment) || {}, garments, selectedGarment)
    return { handled: true, showVisuals: retry.outfits.length > 0, text: formatPlanReply(retry) }
  }
  if (existingPlan && isRevisionQuestion(question)) {
    const revised = revisePlan(existingPlan, question, garments.filter((garment) => garment.status === 'active'))
    return {
      handled: true,
      showVisuals: revised.outfits.length > 0,
      text: revised.outfits === existingPlan.outfits
        ? revised.reply || formatPlanReply(revised)
        : `${revised.reply || ''}\n\n${formatPlanOutfits(revised)}`.trim(),
    }
  }

  const intent = parseOutfitQuestion(question, selectedGarment)
  if (!intent) return { handled: false }
  const plan = planOneRequest(intent, garments, selectedGarment)
  if (plan.outfits.length === 0 && plan.unsupportedSlots.length > 0) return { handled: false }
  return { handled: true, showVisuals: plan.outfits.length > 0, text: formatPlanReply(plan) }
}
