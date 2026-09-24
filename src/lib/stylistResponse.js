import { categoryById } from './constants'

const STORAGE_PREFIX = 'wardrobe-stylist-conversation:'

export function parseStylistResponse(text) {
  const source = String(text || '')
  const lastMarkerStart = source.lastIndexOf('[[')
  const lastMarkerEnd = source.lastIndexOf(']]')
  const truncated = lastMarkerStart > lastMarkerEnd

  let cleanText = source.replace(/\[\[[0-9a-f-]{36}\]\]/gi, '')
  if (truncated) cleanText = cleanText.slice(0, cleanText.lastIndexOf('[['))
  cleanText = cleanText.replace(/\*\*/g, '').trimEnd()

  return { text: cleanText, truncated }
}

const OUTFIT_HEADING = /^(?:#{1,6}\s*)?(?:outfit|look)\s*(\d+)\s*(?:[—–:-]\s*(.*?))?\s*:?$/i
const BULLET_LINE = /^\s*(?:[-*•]|\d+[.)])\s+(.+)$/
const NON_DISTINCTIVE_WORDS = new Set([
  'a', 'an', 'and', 'by', 'for', 'from', 'in', 'of', 'or', 'the', 'to', 'with',
])

function normalizedWords(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/grey/g, 'gray')
    .match(/[a-z0-9]+/g)
    ?.filter((word) => word.length > 1 && !NON_DISTINCTIVE_WORDS.has(word)) || []
}

function garmentForBullet(text, garmentsById, garments) {
  const markerIds = [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1].trim())
  for (const id of markerIds) {
    if (garmentsById.has(id)) return garmentsById.get(id)
  }

  const clean = text.replace(/\[\[[^\]]+\]\]/g, '').replace(/\*\*/g, '').trim()
  const lower = clean.toLowerCase()
  const exactMatches = garments.filter((garment) => lower.includes(garment.name.toLowerCase()))
  if (exactMatches.length === 1) return exactMatches[0]

  const queryWords = new Set(normalizedWords(clean))
  const scored = garments.map((garment) => {
    const nameWords = new Set(normalizedWords(garment.name))
    const overlap = [...queryWords].filter((word) => nameWords.has(word)).length
    return { garment, overlap, coverage: overlap / Math.max(queryWords.size, 1) }
  }).filter(({ overlap, coverage }) => overlap >= 2 && coverage >= 0.5)
    .sort((a, b) => b.overlap - a.overlap || b.coverage - a.coverage)

  if (scored.length === 0) return null
  if (scored[1] && scored[0].overlap === scored[1].overlap && scored[0].coverage === scored[1].coverage) return null
  return scored[0].garment
}

function completeVisualOutfit(section) {
  const slotCount = new Set(section.items.map(({ slot }) => slot)).size
  return !section.hasUnavailableGarment && section.items.length >= 2 && slotCount >= 2
}

export function parseStylistOutfits(text, garments = []) {
  const catalogGarments = garments.filter((garment) => garment?.id && garment?.name)
  if (catalogGarments.length === 0) return []

  const garmentsById = new Map(catalogGarments.map((garment) => [String(garment.id), garment]))
  const sections = []
  let current = null

  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/\*\*/g, '').trim()
    const heading = line.match(OUTFIT_HEADING)
    if (heading) {
      current = { name: heading[2]?.trim() || `Outfit ${heading[1]}`, items: [], tips: [], hasUnavailableGarment: false }
      sections.push(current)
      continue
    }

    const bullet = rawLine.match(BULLET_LINE)
    if (!bullet) continue
    const garment = garmentForBullet(bullet[1], garmentsById, catalogGarments)
    if (!garment) continue
    if (!current) {
      current = { name: 'Suggested outfit', items: [], tips: [], hasUnavailableGarment: false }
      sections.push(current)
    }
    if (garment.status !== 'active') {
      current.hasUnavailableGarment = true
      continue
    }
    if (current.items.some(({ g }) => g.id === garment.id)) continue
    current.items.push({ slot: categoryById(garment.category).slot, g: garment })
  }

  return sections.filter(completeVisualOutfit).map(({ hasUnavailableGarment, ...outfit }) => outfit)
}

export function findLatestStylistOutfits(messages = [], garments = []) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role !== 'assistant') continue
    return parseStylistOutfits(messages[index].text, garments)
  }
  return []
}

export function collectRecentRecommendationUsage(messages = [], garments = [], answerLimit = 4) {
  const usage = new Map()
  let answersRead = 0

  for (let index = messages.length - 1; index >= 0 && answersRead < answerLimit; index -= 1) {
    if (messages[index]?.role !== 'assistant') continue
    answersRead += 1
    for (const outfit of parseStylistOutfits(messages[index].text, garments)) {
      for (const { g } of outfit.items) {
        const prior = usage.get(g.id)
        usage.set(g.id, {
          id: g.id,
          name: g.name,
          count: (prior?.count || 0) + 1,
        })
      }
    }
  }

  return [...usage.values()].sort((a, b) => b.count - a.count || String(a.id).localeCompare(String(b.id)))
}

export function loadStylistConversation(storage, userId) {
  if (!storage || !userId) return []
  try {
    const saved = JSON.parse(storage.getItem(`${STORAGE_PREFIX}${userId}`) || '[]')
    if (!Array.isArray(saved)) return []
    return saved.filter((message) => (
      (message?.role === 'user' || message?.role === 'assistant') && typeof message.text === 'string'
    ))
  } catch {
    return []
  }
}

export function saveStylistConversation(storage, userId, messages) {
  if (!storage || !userId) return
  try {
    storage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(messages))
  } catch {
    // Conversation persistence is a convenience; keep the live chat usable if storage is unavailable.
  }
}
