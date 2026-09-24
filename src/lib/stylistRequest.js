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
  'For any outfit recommendation or revision, end with the complete current outfits in this exact format:',
  'Outfit 1 — short name',
  '- Exact catalog garment name [[catalog id]]',
  'Use one bullet per garment. Use only garments from the catalog.',
  'After a follow-up, return every complete revised outfit, including the pieces that did not change.',
  'Do not abbreviate catalog names or omit the [[catalog id]] markers.',
].join('\n')

export function buildStylistQuestion(question, garment, recentRecommendations = []) {
  const text = (question || '').trim()
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
      'For a new request, favor suitable active alternatives with lower or zero recommendation counts so the wardrobe rotates.',
      'For a follow-up, preserve every piece the user did not ask to change. Do not treat a follow-up as a new rotation.',
    ].join('\n'))
  }

  parts.push(`User question: ${text}`, VISUAL_RESPONSE_INSTRUCTIONS)
  return parts.join('\n\n')
}
