import { describe, expect, it } from 'vitest'
import { recommendOutfits } from './outfitEngine'

const garment = (id, category, overrides = {}) => ({
  id,
  name: id,
  category,
  color: 'Navy',
  formality: 'casual',
  warmth: 'all',
  status: 'active',
  ...overrides,
})

describe('recommendOutfits', () => {
  it('builds a complete casual outfit from active garments', () => {
    const result = recommendOutfits({
      garments: [
        garment('shirt', 'casual_shirt'),
        garment('jeans', 'jeans'),
        garment('shoes', 'casual_shoes'),
      ],
      occasion: 'casual',
      weather: { hi: 72, precip: 10 },
      count: 1,
    })

    expect(result.missing).toEqual([])
    expect(result.outfits).toHaveLength(1)
    expect(result.outfits[0].items.map(({ slot }) => slot)).toEqual(['top', 'bottom', 'shoes'])
    expect(result.outfits[0].tips).toContain(
      'Seated hem check: trousers rise 1–2 inches on the scooter — make sure the hem still covers your socks while seated.',
    )
  })

  it('reports required slots when a closet is incomplete', () => {
    const result = recommendOutfits({
      garments: [garment('shirt', 'casual_shirt')],
      occasion: 'casual',
      weather: { hi: 72, precip: 0 },
    })

    expect(result.outfits).toEqual([])
    expect(result.missing).toEqual(['bottom', 'shoes'])
  })

  it('does not recommend garments that are unavailable', () => {
    const result = recommendOutfits({
      garments: [
        garment('shirt', 'casual_shirt'),
        garment('jeans', 'jeans', { status: 'laundry' }),
        garment('shoes', 'casual_shoes'),
      ],
      occasion: 'casual',
      weather: { hi: 72, precip: 0 },
    })

    expect(result.outfits).toEqual([])
    expect(result.missing).toEqual(['bottom'])
  })

  it('uses a suit as the formal anchor without requiring separate trousers', () => {
    const result = recommendOutfits({
      garments: [
        garment('suit', 'suit', { formality: 'formal' }),
        garment('shirt', 'dress_shirt', { formality: 'formal' }),
        garment('shoes', 'dress_shoes', { formality: 'formal' }),
      ],
      occasion: 'formal',
      weather: { hi: 60, precip: 0 },
      count: 1,
    })

    expect(result.missing).toEqual([])
    expect(result.outfits[0].items.map(({ slot }) => slot)).toEqual(['suit', 'top', 'shoes'])
  })

  it('adds rain guidance when precipitation is likely', () => {
    const result = recommendOutfits({
      garments: [
        garment('shirt', 'casual_shirt'),
        garment('jeans', 'jeans'),
        garment('boots', 'boots'),
      ],
      occasion: 'casual',
      weather: { hi: 72, precip: 70 },
      count: 1,
    })

    expect(result.rain).toBe(true)
    expect(result.outfits[0].tips).toContain(
      'Rain likely — dark, weather-tolerant shoes and a water-resistant layer will hold up best.',
    )
  })

  it('can vary the shirt when only one suitable jacket is available', () => {
    const result = recommendOutfits({
      garments: [
        garment('navy-jacket', 'blazer', { formality: 'business_casual' }),
        garment('blue-shirt', 'dress_shirt', { color: 'Light blue', formality: 'business_casual' }),
        garment('white-shirt', 'dress_shirt', { color: 'White', formality: 'business_casual' }),
        garment('trousers', 'dress_pants', { color: 'Gray', formality: 'business_casual' }),
        garment('shoes', 'dress_shoes', { color: 'Brown', formality: 'formal' }),
      ],
      occasion: 'business_casual',
      weather: { hi: 55, precip: 0 },
      count: 2,
    })

    expect(result.outfits).toHaveLength(2)
    expect(new Set(result.outfits.map((outfit) => outfit.items.find(({ slot }) => slot === 'top').g.id)).size).toBe(2)
  })

})
