export const STYLIST_STARTERS = [
  'Dinner with friends tomorrow',
  'What goes with this?',
  'Give me two different looks without a tie',
  'Pack me for two days of meetings',
]

export function stylistPathForGarment(id) {
  return id ? `/stylist?garment=${encodeURIComponent(id)}` : '/stylist'
}

export function buildStylistQuestion(question, garment) {
  const text = (question || '').trim()
  if (!garment?.id || !garment?.name) return text

  const selectedGarment = {
    id: garment.id,
    name: garment.name,
    category: garment.category,
    brand: garment.brand || null,
    color: garment.color || null,
    location: garment.location || null,
  }

  return [
    `Selected catalog garment: ${JSON.stringify(selectedGarment)}`,
    'Treat “this,” “it,” or the garment type in the question as referring to that exact item.',
    `User question: ${text}`,
  ].join('\n')
}
