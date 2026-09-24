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
  'For any outfit recommendation or revision, end with the complete current outfits in this exact format:',
  'Outfit 1 — short name',
  '- Exact catalog garment name [[catalog id]]',
  'Use one bullet per garment. Use only garments from the catalog.',
  'After a follow-up, return every complete revised outfit, including the pieces that did not change.',
  'Do not abbreviate catalog names or omit the [[catalog id]] markers.',
].join('\n')

export function buildStylistQuestion(question, garment) {
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

  parts.push(`User question: ${text}`, VISUAL_RESPONSE_INSTRUCTIONS)
  return parts.join('\n\n')
}
