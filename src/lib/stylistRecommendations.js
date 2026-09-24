import { recommendOutfits } from './outfitEngine'
import { parseOutfitRequest } from './outfitRequest'

export function findLatestOutfitQuestion(messages = []) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role === 'user' && parseOutfitRequest(message.text).isOutfitRequest) {
      return message.text
    }
  }
  return null
}

export function buildStylistRecommendations({
  question,
  garments = [],
  occasion,
  location,
  weather,
  selectedGarment,
}) {
  const parsed = parseOutfitRequest(question)
  if (!parsed.isOutfitRequest) return null

  const resolvedLocation = selectedGarment?.location || location
  return recommendOutfits({
    garments: garments.filter((garment) => garment.location === resolvedLocation),
    occasion,
    weather,
    count: parsed.count,
    constraints: {
      requiredSlots: parsed.requiredSlots,
      excludedSlots: parsed.excludedSlots,
      anchorGarmentId: selectedGarment?.id,
    },
  })
}
