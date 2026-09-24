import { describe, expect, it } from 'vitest'
import { buildStylistQuestion, stylistPathForGarment } from './stylistRequest'

describe('buildStylistQuestion', () => {
  it('passes through an ordinary question when no garment is selected', () => {
    expect(buildStylistQuestion('  Dinner with friends tomorrow  ')).toBe('Dinner with friends tomorrow')
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
    expect(buildStylistQuestion('What goes with this?', { id: 'jacket-123' })).toBe('What goes with this?')
  })
})

describe('stylistPathForGarment', () => {
  it('builds a Stylist deep link for the selected garment', () => {
    expect(stylistPathForGarment('jacket 123')).toBe('/stylist?garment=jacket%20123')
  })
})
