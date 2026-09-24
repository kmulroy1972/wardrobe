import { describe, expect, it } from 'vitest'
import { buildStylistQuestion, stylistPathForGarment } from './stylistRequest'

describe('buildStylistQuestion', () => {
  it('passes through an ordinary question when no garment is selected', () => {
    const result = buildStylistQuestion('  Dinner with friends tomorrow  ')

    expect(result).toContain('User question: Dinner with friends tomorrow')
    expect(result).toContain('return every complete revised outfit')
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
    expect(result).toContain('After a follow-up, return every complete revised outfit')
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
    expect(result).toContain('For a new request, favor suitable active alternatives')
    expect(result).toContain('For a follow-up, preserve every piece the user did not ask to change')
  })
})

describe('stylistPathForGarment', () => {
  it('builds a Stylist deep link for the selected garment', () => {
    expect(stylistPathForGarment('jacket 123')).toBe('/stylist?garment=jacket%20123')
  })
})
