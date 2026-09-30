export const STYLIST_STARTERS = [
  'Dinner with friends tomorrow',
  'What goes with this?',
  'Give me two different looks without a tie',
  'Pack me for two days of meetings',
]

export function stylistPathForGarment(id) {
  return id ? `/stylist?garment=${encodeURIComponent(id)}` : '/stylist'
}

const VISUAL_RESPONSE_INSTRUCTIONS = [
  'Before recommending, check each selected item against its catalog status, closet location, dress code, weather suitability, and fit notes. Catalog presence does not prove that a piece is physically clean or available today.',
  'Outfit planning requirements:',
  '- Never return the same complete outfit twice.',
  '- Give each requested day or occasion its own labeled outfit. Honor every garment the user says they will bring or wear. If a named item could refer to multiple catalog entries, ask which one instead of guessing.',
  '- Give each day a fresh shirt or top unless the user explicitly asks to repeat one. For a trip or packing request, reuse suitable jackets, trousers, shoes, and belts when that reduces luggage. For separate looks without packing constraints, vary core pieces when the closet has good alternatives.',
  '- Compare all selected catalog IDs across days. Explain intentional repeats briefly; do not add a second pair of shoes merely for variety.',
  'Keep explanatory prose to no more than two short sentences before the formatted outfit lines.',
  'Use this exact format for every outfit you return:',
  'Outfit 1 — short name',
  '- Exact catalog garment name [[catalog id]]',
  'Use one bullet per garment. Use only garments from the catalog.',
  'Do not abbreviate catalog names or omit the [[catalog id]] markers.',
].join('\n')

const MODE_INSTRUCTIONS = {
  new: 'Return the complete requested outfit or outfits. Do not include unrelated prior outfits.',
  add: 'Return only the new additional outfit or outfits. Do not repeat earlier outfits in prose or formatted outfit blocks; the app will append the new visual outfit to the existing ones.',
  revise: 'Return every complete current revised outfit, including pieces that did not change. The app will replace the current visual set with this complete revision.',
  continue: 'Return the complete outfit that was cut off, but no other earlier outfit. Do not repeat any complete outfit already returned; the app will append the completed visual outfit.',
}

export function classifyStylistRequest(question) {
  const text = String(question || '').trim().toLowerCase()

  if (/\b(?:visuals?|images?|photos?|pictures?)\b/.test(text) && /\b(?:show|see|give|display|view|illustrat)/.test(text)) return 'visual'
  if (/\b(?:continue|finish)\b.*\b(?:answer|outfit|recommendation|stopped|left off)\b/.test(text)) return 'continue'
  if (
    /\b(?:one|1)\s+(?:more|additional|extra)\s+(?:outfit|look)\b/.test(text)
    || /\b(?:another|additional|extra)\s+(?:outfit|look)\b/.test(text)
    || /\badd\s+(?:one\s+)?(?:(?:more|additional|extra)\s+)?(?:outfit|look)\b/.test(text)
  ) return 'add'
  if (
    /\b(?:change|swap|replace|revise|update)\b/.test(text)
    || /\b(?:use|try)\s+(?:a\s+)?different\b/.test(text)
    || /\bi\s+(?:wore|am wearing|don't want|do not want)\b/.test(text)
    || /\bmake\s+(?:the\s+)?(?:first|second|third|\d+(?:st|nd|rd|th)?|outfit|look|one)\b/.test(text)
    || /\b(?:instead|without that)\b/.test(text)
  ) return 'revise'
  return 'new'
}

export function shouldShowCurrentOutfits(question, outfitCount) {
  return outfitCount > 0
    && classifyStylistRequest(question) === 'visual'
    && !/\b(?:new|another|different|more|change|replace|create|build|plan)\b/i.test(question)
}

export function buildStylistQuestion(question, garment, recentRecommendations = [], requestMode, currentOutfits = []) {
  const text = (question || '').trim()
  const mode = requestMode || classifyStylistRequest(text)
  const parts = []

  if (garment?.id && garment?.name) {
    const selectedGarment = {
      id: garment.id,
      name: garment.name,
      category: garment.category,
      brand: garment.brand || null,
      color: garment.color || null,
      location: garment.location || null,
    }
    parts.push(
      `Selected catalog garment: ${JSON.stringify(selectedGarment)}`,
      'Treat “this,” “it,” or the garment type in the question as referring to that exact item.',
    )
  }

  if (recentRecommendations.length > 0) {
    parts.push([
      `Recently recommended garments (recommendation counts, not wear counts): ${JSON.stringify(recentRecommendations.slice(0, 12))}`,
      mode === 'revise' || mode === 'visual'
        ? 'Preserve every piece the user did not ask to change. Do not treat this revision as a new rotation.'
        : 'Favor suitable active alternatives with lower or zero recommendation counts so the wardrobe rotates.',
    ].join('\n'))
  }

  if (currentOutfits.length > 0) {
    const plan = currentOutfits.map((outfit) => ({
      name: outfit.name,
      items: outfit.items.map(({ slot, g }) => ({ slot, id: g.id, name: g.name })),
    }))
    parts.push(`Current outfit plan from this conversation (catalog IDs are authoritative): ${JSON.stringify(plan)}`)
  }

  if (/\b(?:pack|packing|trip|travel|conference|multi.?day)\b/i.test(text)
    || currentOutfits.some((outfit) => /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(outfit.name))) {
    parts.push('This is a travel capsule: cover every requested day, give each day a fresh shirt, and minimize the total distinct trousers, shoes, belts, and layers while respecting named garments and the dress code. Distinct outfits do not require distinct shoes or trousers.')
  }

  parts.push(`User question: ${text}`, `Response behavior: ${MODE_INSTRUCTIONS[mode === 'visual' ? 'new' : mode]}`, VISUAL_RESPONSE_INSTRUCTIONS)
  return parts.join('\n\n')
}
