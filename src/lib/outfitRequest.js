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
  const isContinuation = /\bcontinue\b.*\b(?:answer|recommendations?)\b/.test(text)

  if (/\b(?:sports? jackets?|sports? coats?|blazers?)\b/.test(text)) requiredSlots.push('jacket')
  if (/\b(?:no|without(?: a)?|skip(?: the)?)\s+ties?\b|\btie[- ]free\b/.test(text)) excludedSlots.push('tie')

  return {
    isOutfitRequest: !isContinuation && /\b(?:outfits?|looks?|wear|wore|dinners?|meetings?|pack|goes? with|what with|blazers?|jackets?|shirts?|trousers?|slacks?)\b/.test(text),
    count: requestedCount(text),
    requiredSlots,
    excludedSlots,
  }
}
