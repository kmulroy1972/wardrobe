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
  'Diversity requirements:',
  '- Never return the same complete outfit twice.',
  '- When the user requests multiple outfits, use a different jacket or suit, shirt or top, and trousers or bottom in each outfit whenever the active catalog in that closet has enough suitable choices. Apply the same rule to shoes when alternatives exist.',
  '- Before answering, compare the catalog IDs across every outfit and replace repeated core garments. Repeat a core garment only if the user explicitly anchors it or no suitable active alternative exists; if no alternative exists, say so briefly.',
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

export function buildStylistQuestion(question, garment, recentRecommendations = [], requestMode) {
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
      mode === 'revise'
        ? 'Preserve every piece the user did not ask to change. Do not treat this revision as a new rotation.'
        : 'Favor suitable active alternatives with lower or zero recommendation counts so the wardrobe rotates.',
    ].join('\n'))
  }

  parts.push(`User question: ${text}`, `Response behavior: ${MODE_INSTRUCTIONS[mode]}`, VISUAL_RESPONSE_INSTRUCTIONS)
  return parts.join('\n\n')
}
