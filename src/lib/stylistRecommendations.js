import { nameOutfit, recommendOutfits } from './outfitEngine'
import { parseOutfitRequest } from './outfitRequest'

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
      distinctSlots: parsed.distinctSlots,
      anchorGarmentId: selectedGarment?.id,
    },
  })
}

const GENERIC_WORDS = new Set([
  'another', 'because', 'blazer', 'blazers', 'change', 'different', 'everything',
  'first', 'jacket', 'jackets', 'night', 'outfit', 'replace', 'second', 'shirt',
  'shirts', 'today', 'tonight', 'trousers', 'pants', 'slacks', 'wore', 'with',
])

function mentionedGarment(text, garments) {
  const normalized = text.toLowerCase()
  const exact = garments.filter((garment) => (
    garment.name?.length > 3 && normalized.includes(garment.name.toLowerCase())
  ))
  if (exact.length === 1) return exact[0]

  const words = new Set((normalized.match(/[a-z0-9]+/g) || []).filter((word) => (
    word.length >= 4 && !GENERIC_WORDS.has(word)
  )))
  const partial = garments.filter((garment) => {
    const nameWords = garment.name?.toLowerCase().match(/[a-z0-9]+/g) || []
    return nameWords.some((word) => words.has(word))
  })
  return partial.length === 1 ? partial[0] : null
}

function cloneOutfits(outfits) {
  return outfits.map((outfit) => ({
    ...outfit,
    items: outfit.items.map((item) => ({ ...item })),
    tips: [...outfit.tips],
  }))
}

function slotLabel(slot) {
  return { jacket: 'jacket', top: 'shirt', bottom: 'trousers', shoes: 'shoes' }[slot] || slot
}

function outfitIndexesContaining(outfits, garmentId) {
  return outfits.flatMap((outfit, index) => (
    outfit.items.some(({ g }) => g.id === garmentId) ? [index] : []
  ))
}

function duplicateIndexes(outfits, slot) {
  const seen = new Set()
  const duplicates = []
  outfits.forEach((outfit, index) => {
    const id = outfit.items.find((item) => item.slot === slot)?.g.id
    if (!id) return
    if (seen.has(id)) duplicates.push(index)
    seen.add(id)
  })
  return duplicates
}

function revisionCandidates({ garments, occasion, weather, request, excludedGarmentIds }) {
  const result = recommendOutfits({
    garments,
    occasion,
    weather,
    count: 20,
    constraints: {
      requiredSlots: request.requiredSlots,
      excludedSlots: request.excludedSlots,
      excludedGarmentIds: [...excludedGarmentIds],
    },
  })
  return result.outfits.flatMap((outfit) => outfit.items)
}

function applyRevision({ result, text, parsed }, context, state) {
  const { garments, occasion, weather, baseRequest, selectedGarment } = context
  const { excludedGarmentIds, distinctSlots } = state
  const outfits = cloneOutfits(result.outfits)
  const visibleGarments = outfits.flatMap((outfit) => outfit.items.map(({ g }) => g))
  const namedGarment = mentionedGarment(text, garments)
  const requestsNamedGarment = Boolean(namedGarment) && /\b(?:to|with)\b/i.test(text)
  let excludedGarment = requestsNamedGarment ? null : mentionedGarment(text, visibleGarments)
  const requestedGarments = new Map()
  const replaceSlots = new Set(parsed.replaceSlots)

  if (requestsNamedGarment) {
    const requestedItem = outfits.flatMap((outfit) => outfit.items).find(({ g }) => g.id === namedGarment.id)
    const requestedSlot = requestedItem?.slot || replaceSlots.values().next().value
    if (requestedSlot) {
      requestedGarments.set(requestedSlot, namedGarment)
      replaceSlots.add(requestedSlot)
    }
  }

  if (!excludedGarment && parsed.mentionsWornToday && selectedGarment) {
    excludedGarment = visibleGarments.find((garment) => garment.id === selectedGarment.id) || null
  }

  let targetIndexes = parsed.targetOutfitIndex === null ? [] : [parsed.targetOutfitIndex]
  if (excludedGarment) {
    excludedGarmentIds.add(excludedGarment.id)
    targetIndexes = outfitIndexesContaining(outfits, excludedGarment.id)
    const excludedItem = outfits[targetIndexes[0]]?.items.find(({ g }) => g.id === excludedGarment.id)
    if (excludedItem) replaceSlots.add(excludedItem.slot)
  } else if (parsed.mentionsWornToday && targetIndexes.length === 1 && replaceSlots.size === 1) {
    const slot = [...replaceSlots][0]
    excludedGarment = outfits[targetIndexes[0]]?.items.find((item) => item.slot === slot)?.g || null
    if (excludedGarment) excludedGarmentIds.add(excludedGarment.id)
  }

  if (parsed.mentionsWornToday && !excludedGarment) {
    const noun = replaceSlots.size === 1 ? slotLabel([...replaceSlots][0]) : 'garment'
    return {
      ...result,
      needsClarification: `I kept your ${result.outfits.length} ${result.outfits.length === 1 ? 'outfit' : 'outfits'} intact. Tell me which ${noun} you wore today—use its name or say “outfit 1” or “outfit 2”—and I’ll replace only that piece.`,
    }
  }

  parsed.distinctSlots.forEach((slot) => distinctSlots.add(slot))
  if (targetIndexes.length === 0) {
    for (const slot of distinctSlots) targetIndexes.push(...duplicateIndexes(outfits, slot))
  }
  targetIndexes = [...new Set(targetIndexes)].filter((index) => index >= 0 && index < outfits.length)

  if (targetIndexes.length === 0 && replaceSlots.size > 0) {
    if (outfits.length === 1) targetIndexes = [0]
    else {
      const noun = slotLabel([...replaceSlots][0])
      return {
        ...result,
        needsClarification: `I kept your ${result.outfits.length} outfits intact. Tell me which ${noun} to change—say “outfit 1” or “outfit 2”—and I’ll change only that piece.`,
      }
    }
  }

  const candidates = revisionCandidates({
    garments,
    occasion,
    weather,
    request: baseRequest,
    excludedGarmentIds,
  })
  const changed = []
  const slotsToReplace = replaceSlots.size > 0 ? replaceSlots : new Set(parsed.distinctSlots)
  for (const index of targetIndexes) {
    for (const slot of slotsToReplace) {
      const currentItem = outfits[index].items.find((item) => item.slot === slot)
      if (!currentItem) continue
      const usedByOtherOutfits = new Set(outfits.flatMap((outfit, outfitIndex) => (
        outfitIndex === index || !distinctSlots.has(slot)
          ? []
          : [outfit.items.find((item) => item.slot === slot)?.g.id].filter(Boolean)
      )))
      const requestedGarment = requestedGarments.get(slot)
      if (requestedGarment && usedByOtherOutfits.has(requestedGarment.id)) {
        return {
          ...result,
          needsClarification: `${requestedGarment.name} is already in another outfit. I kept the outfits intact so you can choose whether to repeat it or change the other outfit first.`,
        }
      }
      const replacement = requestedGarment
        ? { slot, g: requestedGarment }
        : candidates.find((item) => (
        item.slot === slot
        && item.g.id !== currentItem.g.id
        && !excludedGarmentIds.has(item.g.id)
        && !usedByOtherOutfits.has(item.g.id)
        ))
      if (!replacement) {
        return {
          ...result,
          needsClarification: `I kept the outfits intact because I couldn’t find another available ${slotLabel(slot)} that satisfies the request.`,
        }
      }
      currentItem.g = replacement.g
      changed.push(`outfit ${index + 1} ${slotLabel(slot)}`)
    }
    outfits[index].name = nameOutfit(outfits[index].items)
  }

  return changed.length > 0
    ? { ...result, outfits, revisionSummary: `Updated ${changed.join(' and ')}. Everything else stayed the same.`, needsClarification: null }
    : result
}

export function buildStylistConversationRecommendations({
  messages = [],
  garments = [],
  occasion,
  location,
  weather,
  selectedGarment,
}) {
  const resolvedLocation = selectedGarment?.location || location
  const localGarments = garments.filter((garment) => garment.location === resolvedLocation)
  let result = null
  let context = null
  let revisionState = null
  let pendingRevisionText = null
  for (const message of messages) {
    if (message?.role !== 'user') continue
    const messageRequest = parseOutfitRequest(message.text)
    const isClarification = pendingRevisionText
      && isLikelyClarificationReply(message.text, result?.outfits || [])
    if (messageRequest.isOutfitRequest && !messageRequest.isRevision && !isClarification) {
      result = buildStylistRecommendations({
        question: message.text,
        garments: localGarments,
        occasion,
        location: resolvedLocation,
        weather,
        selectedGarment,
      })
      context = {
        garments: localGarments,
        occasion,
        weather,
        baseRequest: messageRequest,
        selectedGarment,
      }
      revisionState = {
        excludedGarmentIds: new Set(),
        distinctSlots: new Set(messageRequest.distinctSlots),
      }
      pendingRevisionText = null
      continue
    }
    if (!result || (!messageRequest.isRevision && !isClarification)) continue
    const revisionText = isClarification ? `${pendingRevisionText} ${message.text}` : message.text
    const parsed = parseOutfitRequest(revisionText)
    if (!parsed.isRevision) continue
    result = applyRevision({ result, text: revisionText, parsed }, context, revisionState)
    pendingRevisionText = result.needsClarification ? revisionText : null
  }
  return result
}

export function buildLocalRevisionTurn({ question, messages = [], ...recommendationContext }) {
  const nextMessages = [...messages, { role: 'user', text: question }]
  const recommendation = buildStylistConversationRecommendations({
    messages: nextMessages,
    ...recommendationContext,
  })
  const response = recommendation?.needsClarification
    || recommendation?.revisionSummary
    || 'I kept the current outfits intact because I could not safely apply that change.'
  return {
    recommendation,
    messages: [...nextMessages, { role: 'assistant', text: response }],
  }
}

function isLikelyClarificationReply(text, outfits) {
  const words = text.trim().split(/\s+/)
  if (words.length > 8) return false
  if (parseOutfitRequest(text).isRevision || /\b(?:what goes|what should|give me|dinner|pack|wear)\b/i.test(text)) return false
  const visibleGarments = outfits.flatMap((outfit) => outfit.items.map(({ g }) => g))
  return /\b(?:outfit|look)\s*[12]\b|\b(?:first|second)\s+one\b/i.test(text)
    || Boolean(mentionedGarment(text, visibleGarments))
}
