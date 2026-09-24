import { describe, expect, it, vi } from 'vitest'
import { loadStylistConversation, parseStylistResponse, saveStylistConversation } from './stylistResponse'

const garments = [
  {
    id: 'e13f2eec-58b2-4eb3-be07-076d49cc507c',
    name: 'Reda grey wool hopsack Bedford jacket',
  },
  {
    id: '7088ff8a-4759-4ca0-902e-7f202eb7c739',
    name: 'Light blue Mayfair wrinkle-resistant twill dress shirt',
  },
]

describe('parseStylistResponse', () => {
  it('turns exact garment names into stable catalog references without exposing AI markers', () => {
    const result = parseStylistResponse(
      '**Tomorrow:** Reda grey wool hopsack Bedford jacket [[e13f2eec-58b2-4eb3-be07-076d49cc507c]] with the Light blue Mayfair wrinkle-resistant twill dress shirt.',
      garments,
    )

    expect(result.truncated).toBe(false)
    expect(result.segments).toContainEqual({ type: 'garment', garment: garments[0] })
    expect(result.segments).toContainEqual({ type: 'garment', garment: garments[1] })
    expect(result.segments.filter((segment) => segment.type === 'text').map((segment) => segment.text).join('')).not.toMatch(/\[\[|\*\*/)
  })

  it('recovers the named garment and flags a response that stopped inside an id marker', () => {
    const result = parseStylistResponse(
      'Reda grey wool hopsack Bedford jacket [[e13f2eec-58',
      garments,
    )

    expect(result.truncated).toBe(true)
    expect(result.segments).toContainEqual({ type: 'garment', garment: garments[0] })
    expect(result.segments.filter((segment) => segment.type === 'text').map((segment) => segment.text).join('')).not.toContain('[[')
  })

  it('keeps ordinary prose when no garment is named', () => {
    expect(parseStylistResponse('Dinner is business casual.', garments)).toEqual({
      segments: [{ type: 'text', text: 'Dinner is business casual.' }],
      truncated: false,
    })
  })
})

describe('Stylist conversation session storage', () => {
  it('round-trips messages in the current browser tab', () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    }
    const messages = [{ role: 'user', text: 'Dinner with friends' }]

    saveStylistConversation(storage, 'user-1', messages)
    const saved = storage.setItem.mock.calls[0][1]
    storage.getItem.mockReturnValue(saved)

    expect(loadStylistConversation(storage, 'user-1')).toEqual(messages)
  })

  it('ignores corrupt saved state', () => {
    const storage = { getItem: vi.fn().mockReturnValue('{not-json') }
    expect(loadStylistConversation(storage, 'user-1')).toEqual([])
  })
})
