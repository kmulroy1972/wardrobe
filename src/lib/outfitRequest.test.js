import { describe, expect, it } from 'vitest'
import { parseOutfitRequest } from './outfitRequest'

describe('parseOutfitRequest', () => {
  it('recognizes a two-night blazer request and excludes ties', () => {
    expect(parseOutfitRequest('Dinner with friends two nights in a row. Blazer, no tie.')).toEqual({
      isOutfitRequest: true,
      count: 2,
      requiredSlots: ['jacket'],
      excludedSlots: ['tie'],
    })
  })

  it('recognizes a question about what to wear with a selected garment', () => {
    expect(parseOutfitRequest('What goes with this jacket?').isOutfitRequest).toBe(true)
  })

  it('does not turn a general wardrobe question into outfit cards', () => {
    expect(parseOutfitRequest('What is the biggest gap in my closet?').isOutfitRequest).toBe(false)
  })
})
