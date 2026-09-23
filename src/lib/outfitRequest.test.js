import { describe, expect, it } from 'vitest'
import { parseOutfitRequest } from './outfitRequest'

describe('parseOutfitRequest', () => {
  it('extracts an outfit count written as a word', () => {
    expect(parseOutfitRequest('Please give me two outfits').count).toBe(2)
  })

  it('extracts a numeric outfit count and clamps it to the supported maximum', () => {
    expect(parseOutfitRequest('Give me 3 looks').count).toBe(3)
    expect(parseOutfitRequest('Give me 20 outfits').count).toBe(5)
  })

  it.each([
    'sports jacket',
    'sport jacket',
    'sport coat',
    'blazer',
  ])('treats %s as a required jacket', (request) => {
    expect(parseOutfitRequest(request).requiredSlots).toContain('jacket')
  })

  it.each([
    'no tie',
    'without a tie',
    'skip the tie',
    'tie-free',
  ])('treats %s as a tie exclusion', (request) => {
    expect(parseOutfitRequest(request).excludedSlots).toContain('tie')
  })

  it('uses safe defaults for an empty request', () => {
    expect(parseOutfitRequest('')).toEqual({
      count: 2,
      requiredSlots: [],
      excludedSlots: [],
    })
  })
})
