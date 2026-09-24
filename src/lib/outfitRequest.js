const DEFAULT_COUNT = 2
const MAX_COUNT = 5

const WORD_COUNTS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
}

function requestedCount(text) {
  const numeric = text.match(/\b(\d+)\s+(?:outfits?|looks?)\b/)
  if (numeric) return Math.min(MAX_COUNT, Math.max(1, Number(numeric[1])))

  const written = text.match(/\b(one|two|three|four|five)\s+(?:outfits?|looks?|nights?|days?)\b/)
  if (written) return WORD_COUNTS[written[1]]

  if (/\b(?:a couple|couple of)\s+(?:outfits?|looks?|nights?|days?)\b/.test(text)) return 2
  return DEFAULT_COUNT
}

export function parseOutfitRequest(request) {
  const text = (request || '').trim().toLowerCase()
  const requiredSlots = []
  const excludedSlots = []
  const replaceSlots = []
  const distinctSlots = []
  const isContinuation = /\bcontinue\b.*\b(?:answer|recommendations?)\b/.test(text)
  const mentionsWornToday = /\b(?:wore|had)\b.{0,35}\b(?:today|tonight)\b/.test(text)

  if (/\b(?:sports? jackets?|sports? coats?|blazers?)\b/.test(text)) requiredSlots.push('jacket')
  if (/\b(?:no|without(?: a)?|skip(?: the)?)\s+ties?\b|\btie[- ]free\b/.test(text)) excludedSlots.push('tie')

  const slotRules = [
    ['jacket', '(?:jackets?|blazers?|sports? (?:jackets?|coats?))'],
    ['top', '(?:shirts?|tops?)'],
    ['bottom', '(?:trousers?|slacks?|pants?|chinos?)'],
    ['shoes', '(?:shoes?|sneakers?|boots?|loafers?)'],
  ]
  for (const [slot, terms] of slotRules) {
    const different = new RegExp(`\\b(?:different|another)\\s+${terms}\\b`).test(text)
    const explicitChange = new RegExp(`\\b(?:change|replace|swap)(?:\\s+\\w+){0,5}\\s+${terms}\\b`).test(text)
    const useDifferent = new RegExp(`\\b(?:use|choose|pick)\\s+(?:a\\s+)?(?:different|another)\\s+${terms}\\b`).test(text)
    const repeated = new RegExp(`\\bsame\\s+${terms}(?:\\s+\\w+){0,4}\\s+\\b(?:both|twice|again|two)\\b`).test(text)
    if (different || repeated) distinctSlots.push(slot)
    if (explicitChange || useDifferent || repeated || (mentionsWornToday && explicitChange)) replaceSlots.push(slot)
  }

  const hasExplicitTarget = /\b(?:first|second|1st|2nd)\s+(?:outfit|look|night|day)\b|\b(?:outfit|look)\s*[12]\b/.test(text)
  const isRevision = replaceSlots.length > 0
    || (hasExplicitTarget && distinctSlots.length > 0)
    || /\bkeep (?:everything|the rest)\b/.test(text)
    || mentionsWornToday

  let targetOutfitIndex = null
  if (/\b(?:second|2nd|outfit\s*2|look\s*2)\b/.test(text)) {
    targetOutfitIndex = 1
  } else if (/\b(?:first|1st|outfit\s*1|look\s*1)\b/.test(text)) {
    targetOutfitIndex = 0
  }

  return {
    isOutfitRequest: !isContinuation && /\b(?:outfits?|looks?|wear|wore|dinners?|meetings?|pack|goes? with|what with|blazers?|jackets?|shirts?|trousers?|slacks?)\b/.test(text),
    isRevision,
    count: requestedCount(text),
    requiredSlots,
    excludedSlots,
    replaceSlots,
    distinctSlots,
    targetOutfitIndex,
    mentionsWornToday,
  }
}
