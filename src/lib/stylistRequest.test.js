import { describe, expect, it } from 'vitest'
import { buildStylistQuestion, classifyStylistRequest, stylistPathForGarment } from './stylistRequest'

describe('buildStylistQuestion', () => {
  it('passes through an ordinary question when no garment is selected', () => {
    const result = buildStylistQuestion('  Dinner with friends tomorrow  ')

    expect(result).toContain('User question: Dinner with friends tomorrow')
    expect(result).toContain('Return the complete requested outfit')
    expect(result).toContain('[[catalog id]]')
  })

  it('identifies the exact selected garment for ordinary references such as “this”', () => {
    const result = buildStylistQuestion('What goes with this?', {
      id: 'jacket-123',
      name: 'Reda grey wool hopsack Bedford jacket',
      category: 'blazer',
      brand: 'Proper Cloth',
      color: 'Gray',
      location: 'dc',
    })

    expect(result).toContain('"id":"jacket-123"')
    expect(result).toContain('"name":"Reda grey wool hopsack Bedford jacket"')
    expect(result).toContain('Treat “this,” “it,” or the garment type')
    expect(result).toContain('User question: What goes with this?')
  })

  it('does not claim exact garment context when identity is incomplete', () => {
    expect(buildStylistQuestion('What goes with this?', { id: 'jacket-123' })).not.toContain('Selected catalog garment')
  })

  it('requires a complete visual response after a follow-up', () => {
    const result = buildStylistQuestion('Make the second one warmer.')

    expect(result).toContain('User question: Make the second one warmer.')
    expect(result).toContain('Return every complete current revised outfit')
  })

  it('requires distinct core pieces when multiple outfits are requested', () => {
    const result = buildStylistQuestion('Give me two business casual outfits.')

    expect(result).toContain('Never return the same complete outfit twice')
    expect(result).toContain('different jacket or suit, shirt or top, and trousers or bottom')
    expect(result).toContain('compare the catalog IDs across every outfit')
  })

  it('tells a fresh request to rotate away from recently recommended garments', () => {
    const result = buildStylistQuestion('Dinner with friends tomorrow.', null, [
      { id: 'jacket-1', name: 'Gray jacket', count: 3 },
      { id: 'shirt-1', name: 'Blue shirt', count: 2 },
    ])

    expect(result).toContain('Recently recommended garments')
    expect(result).toContain('Gray jacket')
    expect(result).toContain('"count":3')
    expect(result).toContain('Favor suitable active alternatives')
  })

  it('asks for only the new outfit after an additive follow-up', () => {
    const result = buildStylistQuestion('Give me one more outfit.')

    expect(result).toContain('Return only the new additional outfit')
    expect(result).toContain('Do not repeat earlier outfits')
    expect(result).not.toContain('Return every complete current revised outfit')
  })

  it('asks a continuation to finish only the missing content', () => {
    const result = buildStylistQuestion('Please continue the outfit recommendations from where you stopped.')

    expect(result).toContain('Return the complete outfit that was cut off')
    expect(result).toContain('Do not repeat any complete outfit')
  })
})

describe('classifyStylistRequest', () => {
  it.each([
    'Give me one more outfit.',
    'Give me another outfit.',
    'Please add one additional look.',
  ])('classifies an additive request: %s', (question) => {
    expect(classifyStylistRequest(question)).toBe('add')
  })

  it.each([
    'Change the shirt in outfit 2.',
    'Make the second one warmer.',
    'I wore that jacket today.',
  ])('classifies a revision request: %s', (question) => {
    expect(classifyStylistRequest(question)).toBe('revise')
  })

  it('keeps a new multi-outfit request separate from an additive follow-up', () => {
    expect(classifyStylistRequest('Give me two different looks without a tie.')).toBe('new')
  })

  it('recognizes a continuation after an answer is cut off', () => {
    expect(classifyStylistRequest('Please continue the outfit recommendations from where you stopped.')).toBe('continue')
  })
})

describe('stylistPathForGarment', () => {
  it('builds a Stylist deep link for the selected garment', () => {
    expect(stylistPathForGarment('jacket 123')).toBe('/stylist?garment=jacket%20123')
  })
})
