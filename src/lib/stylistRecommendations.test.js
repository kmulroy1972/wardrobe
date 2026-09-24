import { describe, expect, it } from 'vitest'
import { buildStylistRecommendations, findLatestOutfitQuestion } from './stylistRecommendations'

const garment = (id, category, overrides = {}) => ({
  id,
  name: id,
  category,
  color: 'Navy',
  formality: 'business_casual',
  warmth: 'all',
  status: 'active',
  location: 'dc',
  ...overrides,
})

describe('visual stylist recommendations', () => {
  it('finds the latest outfit request even after a continuation message', () => {
    expect(findLatestOutfitQuestion([
      { role: 'user', text: 'Two dinners with different blazers and no tie' },
      { role: 'assistant', text: 'The answer stopped.' },
      { role: 'user', text: 'Please continue the outfit recommendations from where you stopped.' },
    ])).toBe('Two dinners with different blazers and no tie')
  })

  it('builds visual cards from the catalog without depending on the AI prose response', () => {
    const result = buildStylistRecommendations({
      question: 'Two dinners with different blazers and no tie',
      garments: [
        garment('grey-jacket', 'blazer'),
        garment('navy-jacket', 'blazer'),
        garment('blue-shirt', 'dress_shirt', { color: 'Light blue' }),
        garment('white-shirt', 'dress_shirt', { color: 'White' }),
        garment('trousers', 'dress_pants', { color: 'Gray' }),
      ],
      occasion: 'business_casual',
      location: 'dc',
      weather: { hi: 55, precip: 0 },
    })

    expect(result.outfits).toHaveLength(2)
    expect(result.outfits[0].items.map(({ slot }) => slot)).toEqual(['jacket', 'top', 'bottom'])
  })
})
