const STORAGE_PREFIX = 'wardrobe-stylist-conversation:'

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function parseStylistResponse(text, garments = []) {
  const source = String(text || '')
  const lastMarkerStart = source.lastIndexOf('[[')
  const lastMarkerEnd = source.lastIndexOf(']]')
  const truncated = lastMarkerStart > lastMarkerEnd

  let cleanText = source.replace(/\[\[[0-9a-f-]{36}\]\]/gi, '')
  if (truncated) cleanText = cleanText.slice(0, cleanText.lastIndexOf('[['))
  cleanText = cleanText.replace(/\*\*/g, '').trimEnd()

  const namedGarments = garments
    .filter((garment) => garment?.id && garment?.name)
    .sort((a, b) => b.name.length - a.name.length)
  if (namedGarments.length === 0) {
    return { segments: cleanText ? [{ type: 'text', text: cleanText }] : [], truncated }
  }

  const garmentByName = new Map(namedGarments.map((garment) => [garment.name.toLowerCase(), garment]))
  const namePattern = namedGarments.map((garment) => escapeRegExp(garment.name)).join('|')
  const parts = cleanText.split(new RegExp(`(${namePattern})`, 'gi')).filter(Boolean)
  const segments = parts.map((part) => {
    const garment = garmentByName.get(part.toLowerCase())
    return garment ? { type: 'garment', garment } : { type: 'text', text: part }
  })

  return { segments, truncated }
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
