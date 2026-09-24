import { describe, expect, it } from 'vitest'
import {
  buildLocalRevisionTurn,
  buildStylistConversationRecommendations,
  buildStylistRecommendations,
} from './stylistRecommendations'

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

  it('changes only the second shirt and keeps the two shirts distinct', () => {
    const garments = [
      garment('grey-jacket', 'blazer', { name: 'Reda grey jacket' }),
      garment('navy-jacket', 'blazer', { name: 'Navy jacket' }),
      garment('blue-shirt', 'dress_shirt', { color: 'Light blue' }),
      garment('white-shirt', 'dress_shirt', { color: 'White' }),
      garment('lilac-shirt', 'dress_shirt', { color: 'Lilac' }),
      garment('grey-trousers', 'dress_pants', { color: 'Gray' }),
      garment('khaki-chinos', 'chinos', { color: 'Khaki' }),
    ]
    const base = buildStylistConversationRecommendations({
      messages: [{ role: 'user', text: 'Two dinners with different blazers and no tie' }],
      garments,
      occasion: 'business_casual',
      location: 'dc',
      weather: { hi: 55, precip: 0 },
    })
    const revised = buildStylistConversationRecommendations({
      messages: [
        { role: 'user', text: 'Two dinners with different blazers and no tie' },
        { role: 'assistant', text: 'Here are two looks.' },
        { role: 'user', text: 'Different shirt in outfit 2.' },
      ],
      garments,
      occasion: 'business_casual',
      location: 'dc',
      weather: { hi: 55, precip: 0 },
    })

    expect(revised.outfits[0]).toEqual(base.outfits[0])
    expect(revised.outfits[1].items.find(({ slot }) => slot === 'jacket')).toEqual(
      base.outfits[1].items.find(({ slot }) => slot === 'jacket'),
    )
    expect(revised.outfits[1].items.find(({ slot }) => slot === 'bottom')).toEqual(
      base.outfits[1].items.find(({ slot }) => slot === 'bottom'),
    )
    expect(revised.outfits[1].items.find(({ slot }) => slot === 'top').g.id).not.toBe(
      base.outfits[1].items.find(({ slot }) => slot === 'top').g.id,
    )
    expect(new Set(revised.outfits.map((outfit) => outfit.items.find(({ slot }) => slot === 'top').g.id)).size).toBe(2)
  })

  it('replaces a named jacket that was worn today without changing the rest of either outfit', () => {
    const garments = [
      garment('reda-jacket', 'blazer', { name: 'Reda grey wool hopsack Bedford jacket', color: 'Brown' }),
      garment('navy-jacket', 'blazer', { name: 'Navy jacket' }),
      garment('tan-jacket', 'blazer', { name: 'Tan jacket', color: 'Tan' }),
      garment('blue-shirt', 'dress_shirt', { color: 'Light blue' }),
      garment('white-shirt', 'dress_shirt', { color: 'White' }),
      garment('trousers', 'dress_pants', { color: 'Gray' }),
    ]
    const baseMessages = [{ role: 'user', text: 'Two dinners with different blazers and no tie' }]
    const shared = { garments, occasion: 'business_casual', location: 'dc', weather: { hi: 55, precip: 0 } }
    const base = buildStylistConversationRecommendations({ messages: baseMessages, ...shared })
    const revised = buildStylistConversationRecommendations({
      messages: [...baseMessages, { role: 'user', text: 'Replace the Reda jacket because I wore it today.' }],
      ...shared,
    })
    const changedIndex = base.outfits.findIndex((outfit) => outfit.items.some(({ g }) => g.id === 'reda-jacket'))
    const unchangedIndex = changedIndex === 0 ? 1 : 0

    expect(changedIndex).toBeGreaterThanOrEqual(0)
    expect(revised.outfits[unchangedIndex]).toEqual(base.outfits[unchangedIndex])
    expect(revised.outfits[changedIndex].items.find(({ slot }) => slot === 'top')).toEqual(
      base.outfits[changedIndex].items.find(({ slot }) => slot === 'top'),
    )
    expect(revised.outfits[changedIndex].items.find(({ slot }) => slot === 'bottom')).toEqual(
      base.outfits[changedIndex].items.find(({ slot }) => slot === 'bottom'),
    )
    expect(revised.outfits.flatMap((outfit) => outfit.items).some(({ g }) => g.id === 'reda-jacket')).toBe(false)
  })

  it('keeps the cards intact and asks which garment when wore-it-today is ambiguous', () => {
    const shared = {
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
    }
    const base = buildStylistConversationRecommendations({
      ...shared,
      messages: [{ role: 'user', text: 'Two dinners with different blazers and no tie' }],
    })
    const revised = buildStylistConversationRecommendations({
      ...shared,
      messages: [
        { role: 'user', text: 'Two dinners with different blazers and no tie' },
        { role: 'user', text: 'Change one of the jackets because I wore it today.' },
      ],
    })

    expect(revised.outfits).toEqual(base.outfits)
    expect(revised.needsClarification).toMatch(/which jacket/i)
  })

  it('applies a short numbered-outfit answer to the pending clarification', () => {
    const shared = {
      garments: [
        garment('grey-jacket', 'blazer'),
        garment('navy-jacket', 'blazer'),
        garment('tan-jacket', 'blazer', { color: 'Tan' }),
        garment('blue-shirt', 'dress_shirt', { color: 'Light blue' }),
        garment('white-shirt', 'dress_shirt', { color: 'White' }),
        garment('trousers', 'dress_pants', { color: 'Gray' }),
      ],
      occasion: 'business_casual',
      location: 'dc',
      weather: { hi: 55, precip: 0 },
    }
    const base = buildStylistConversationRecommendations({
      ...shared,
      messages: [{ role: 'user', text: 'Two dinners with different blazers and no tie' }],
    })
    const revised = buildStylistConversationRecommendations({
      ...shared,
      messages: [
        { role: 'user', text: 'Two dinners with different blazers and no tie' },
        { role: 'user', text: 'Change one of the jackets because I wore it today.' },
        { role: 'assistant', text: 'Which jacket?' },
        { role: 'user', text: 'Outfit 1.' },
      ],
    })

    expect(revised.needsClarification).toBeNull()
    expect(revised.outfits[1]).toEqual(base.outfits[1])
    expect(revised.outfits[0].items.find(({ slot }) => slot === 'jacket').g.id).not.toBe(
      base.outfits[0].items.find(({ slot }) => slot === 'jacket').g.id,
    )
  })

  it('corrects the same shirt twice complaint without changing jackets or trousers', () => {
    const shared = {
      garments: [
        garment('grey-jacket', 'blazer'),
        garment('navy-jacket', 'blazer'),
        garment('blue-shirt', 'dress_shirt', { color: 'Light blue' }),
        garment('white-shirt', 'dress_shirt', { color: 'White' }),
        garment('trousers', 'dress_pants', { color: 'Gray' }),
      ],
      occasion: 'business_casual', location: 'dc', weather: { hi: 55, precip: 0 },
    }
    const baseMessages = [{ role: 'user', text: 'Two dinners with different blazers and no tie' }]
    const base = buildStylistConversationRecommendations({ ...shared, messages: baseMessages })
    const revised = buildStylistConversationRecommendations({
      ...shared,
      messages: [...baseMessages, { role: 'user', text: 'It chose the same shirt two nights in a row.' }],
    })

    expect(base.outfits[0].items.find(({ slot }) => slot === 'top').g.id).toBe(
      base.outfits[1].items.find(({ slot }) => slot === 'top').g.id,
    )
    expect(revised.outfits[0]).toEqual(base.outfits[0])
    expect(revised.outfits[1].items.find(({ slot }) => slot === 'jacket')).toEqual(base.outfits[1].items.find(({ slot }) => slot === 'jacket'))
    expect(revised.outfits[1].items.find(({ slot }) => slot === 'bottom')).toEqual(base.outfits[1].items.find(({ slot }) => slot === 'bottom'))
    expect(revised.outfits[1].items.find(({ slot }) => slot === 'top').g.id).not.toBe(base.outfits[0].items.find(({ slot }) => slot === 'top').g.id)
  })

  it('starts a fresh recommendation after a completed revision', () => {
    const shared = {
      garments: [
        garment('grey-jacket', 'blazer'), garment('navy-jacket', 'blazer'),
        garment('blue-shirt', 'dress_shirt', { color: 'Light blue' }),
        garment('white-shirt', 'dress_shirt', { color: 'White' }),
        garment('trousers', 'dress_pants', { color: 'Gray' }),
      ],
      occasion: 'business_casual', location: 'dc', weather: { hi: 55, precip: 0 },
    }
    const expected = buildStylistConversationRecommendations({
      ...shared,
      messages: [{ role: 'user', text: 'What goes with this jacket?' }],
    })
    const actual = buildStylistConversationRecommendations({
      ...shared,
      messages: [
        { role: 'user', text: 'Two dinners with different blazers and no tie' },
        { role: 'user', text: 'Different shirt in outfit 2.' },
        { role: 'user', text: 'What goes with this jacket?' },
      ],
    })

    expect(actual).toEqual(expected)
  })

  it('does not interpret a requested named jacket as a garment to remove', () => {
    const shared = {
      garments: [
        garment('grey-jacket', 'blazer', { name: 'Grey jacket' }),
        garment('navy-jacket', 'blazer', { name: 'Navy jacket' }),
        garment('tan-jacket', 'blazer', { name: 'Tan jacket', color: 'Tan' }),
        garment('blue-shirt', 'dress_shirt', { color: 'Light blue' }),
        garment('trousers', 'dress_pants', { color: 'Gray' }),
      ],
      occasion: 'business_casual', location: 'dc', weather: { hi: 55, precip: 0 },
    }
    const baseMessages = [{ role: 'user', text: 'Two dinners with different blazers and no tie' }]
    const base = buildStylistConversationRecommendations({ ...shared, messages: baseMessages })
    const revised = buildStylistConversationRecommendations({
      ...shared,
      messages: [...baseMessages, { role: 'user', text: 'Change outfit 1 to the Navy jacket.' }],
    })

    expect(revised.outfits).toEqual(base.outfits)
    expect(revised.needsClarification).toMatch(/already in another outfit/i)
  })

  it('lets a new explicit revision replace an unresolved one', () => {
    const shared = {
      garments: [
        garment('grey-jacket', 'blazer'), garment('navy-jacket', 'blazer'),
        garment('blue-shirt', 'dress_shirt', { color: 'Light blue' }),
        garment('white-shirt', 'dress_shirt', { color: 'White' }),
        garment('trousers', 'dress_pants', { color: 'Gray' }),
      ],
      occasion: 'business_casual', location: 'dc', weather: { hi: 55, precip: 0 },
    }
    const revised = buildStylistConversationRecommendations({
      ...shared,
      messages: [
        { role: 'user', text: 'Two dinners with different blazers and no tie' },
        { role: 'user', text: 'Change one of the jackets because I wore it today.' },
        { role: 'user', text: 'Change the shirt in outfit 2.' },
      ],
    })

    expect(revised.needsClarification).toBeNull()
    expect(revised.revisionSummary).toMatch(/outfit 2 shirt/i)
  })

  it('resolves a pending clarification from a unique one-word garment name', () => {
    const shared = {
      garments: [
        garment('reda-jacket', 'blazer', { name: 'Reda jacket', color: 'Brown' }),
        garment('navy-jacket', 'blazer', { name: 'Navy jacket' }),
        garment('tan-jacket', 'blazer', { name: 'Tan jacket', color: 'Tan' }),
        garment('blue-shirt', 'dress_shirt', { color: 'Light blue' }),
        garment('trousers', 'dress_pants', { color: 'Gray' }),
      ],
      occasion: 'business_casual', location: 'dc', weather: { hi: 55, precip: 0 },
    }
    const revised = buildStylistConversationRecommendations({
      ...shared,
      messages: [
        { role: 'user', text: 'Two dinners with different blazers and no tie' },
        { role: 'user', text: 'Change one of the jackets because I wore it today.' },
        { role: 'user', text: 'Reda' },
      ],
    })

    expect(revised.needsClarification).toBeNull()
    expect(revised.outfits.flatMap((outfit) => outfit.items).some(({ g }) => g.id === 'reda-jacket')).toBe(false)
  })

  it('builds a local revision turn from the same recommendation state as the cards', () => {
    const shared = {
      garments: [
        garment('grey-jacket', 'blazer'), garment('navy-jacket', 'blazer'),
        garment('blue-shirt', 'dress_shirt', { color: 'Light blue' }),
        garment('white-shirt', 'dress_shirt', { color: 'White' }),
        garment('trousers', 'dress_pants', { color: 'Gray' }),
      ],
      occasion: 'business_casual', location: 'dc', weather: { hi: 55, precip: 0 },
    }
    const turn = buildLocalRevisionTurn({
      ...shared,
      messages: [{ role: 'user', text: 'Two dinners with different blazers and no tie' }],
      question: 'Different shirt in outfit 2.',
    })

    expect(turn.messages.at(-2)).toEqual({ role: 'user', text: 'Different shirt in outfit 2.' })
    expect(turn.messages.at(-1)).toEqual({ role: 'assistant', text: turn.recommendation.revisionSummary })
    expect(turn.recommendation.outfits).toHaveLength(2)
  })
})
