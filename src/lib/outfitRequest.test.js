import { describe, expect, it } from 'vitest'
import { parseOutfitRequest } from './outfitRequest'

describe('parseOutfitRequest', () => {
  it('recognizes a two-night blazer request and excludes ties', () => {
    expect(parseOutfitRequest('Dinner with friends two nights in a row. Blazer, no tie.')).toEqual({
      isOutfitRequest: true,
      isRevision: false,
      count: 2,
      requiredSlots: ['jacket'],
      excludedSlots: ['tie'],
      replaceSlots: [],
      distinctSlots: [],
      targetOutfitIndex: null,
      mentionsWornToday: false,
    })
  })

  it('treats different blazers in an original request as a constraint, not a revision', () => {
    const parsed = parseOutfitRequest('Two dinners with different blazers and no tie')

    expect(parsed.isRevision).toBe(false)
    expect(parsed.distinctSlots).toEqual(['jacket'])
  })

  it('understands a request to revise only the second outfit shirt', () => {
    expect(parseOutfitRequest('Different shirt in outfit 2.')).toMatchObject({
      isOutfitRequest: true,
      isRevision: true,
      replaceSlots: [],
      distinctSlots: ['top'],
      targetOutfitIndex: 1,
    })
  })

  it('recognizes a conversational change request with a numbered outfit', () => {
    expect(parseOutfitRequest('Can you change the shirt in outfit 2?')).toMatchObject({
      isRevision: true,
      replaceSlots: ['top'],
      targetOutfitIndex: 1,
    })
  })

  it('changes the jacket while preserving a shirt explicitly described as the same', () => {
    expect(parseOutfitRequest('Change the jacket but keep the same shirt.')).toMatchObject({
      isRevision: true,
      replaceSlots: ['jacket'],
      distinctSlots: [],
    })
  })

  it('does not treat days in a new packing request as revisions', () => {
    expect(parseOutfitRequest('Pack outfits for the first and second day.')).toMatchObject({
      isOutfitRequest: true,
      isRevision: false,
    })
  })

  it('understands a named jacket was already worn today', () => {
    expect(parseOutfitRequest('Replace the Reda jacket because I wore it today.')).toMatchObject({
      isOutfitRequest: true,
      isRevision: true,
      replaceSlots: ['jacket'],
      mentionsWornToday: true,
    })
  })

  it('recognizes a question about what to wear with a selected garment', () => {
    expect(parseOutfitRequest('What goes with this jacket?').isOutfitRequest).toBe(true)
  })

  it('does not turn a general wardrobe question into outfit cards', () => {
    expect(parseOutfitRequest('What is the biggest gap in my closet?').isOutfitRequest).toBe(false)
  })
})
