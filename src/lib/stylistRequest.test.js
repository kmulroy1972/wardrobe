import { describe, expect, it } from 'vitest'
import { buildStylistQuestion, classifyStylistRequest, shouldShowCurrentOutfits, stylistPathForGarment } from './stylistRequest'

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

  it('plans distinct looks while respecting the available closet', () => {
    const result = buildStylistQuestion('Give me two business casual outfits.')

    expect(result).toContain('Never return the same complete outfit twice')
    expect(result).toContain('For separate looks without packing constraints, vary core pieces')
    expect(result).toContain('Compare all selected catalog IDs across days')
  })

  it('optimizes a multi-day conference capsule and carries its current plan into a revision', () => {
    const currentOutfits = [{
      name: 'Thursday evening',
      items: [{ slot: 'jacket', g: { id: 'mocha-1', name: 'Mocha Bedford jacket' } }],
    }]
    const result = buildStylistQuestion(
      'For my conference, change the Friday shirt but keep both blazers.',
      null,
      [],
      'revise',
      currentOutfits,
    )

    expect(result).toContain('Current outfit plan from this conversation')
    expect(result).toContain('"id":"mocha-1"')
    expect(result).toContain('This is a travel capsule')
    expect(result).toContain('reuse suitable jackets, trousers, shoes, and belts')
    expect(result).toContain('Return every complete current revised outfit')
    expect(buildStylistQuestion('Change the Friday shirt.', null, [], 'revise', currentOutfits)).toContain('This is a travel capsule')
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

  it('recognizes a request to see existing outfit photos', () => {
    const question = 'Please give me visuals or images of these outfits.'
    expect(classifyStylistRequest(question)).toBe('visual')
    expect(shouldShowCurrentOutfits(question, 3)).toBe(true)
    expect(shouldShowCurrentOutfits(question, 0)).toBe(false)
    expect(shouldShowCurrentOutfits('Show me images of new outfits.', 3)).toBe(false)
  })
})

describe('stylistPathForGarment', () => {
  it('builds a Stylist deep link for the selected garment', () => {
    expect(stylistPathForGarment('jacket 123')).toBe('/stylist?garment=jacket%20123')
  })
})
