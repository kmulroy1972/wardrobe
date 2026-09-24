import { describe, expect, it, vi } from 'vitest'
import {
  findLatestStylistOutfits,
  loadStylistConversation,
  parseStylistOutfits,
  parseStylistResponse,
  saveStylistConversation,
} from './stylistResponse'

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

const outfitGarments = [
  { id: 'e13f2eec-58b2-4eb3-be07-076d49cc507c', name: 'Reda grey wool hopsack Bedford jacket', category: 'blazer' },
  { id: 'shirt-1', name: 'Light blue Mayfair wrinkle-resistant houndstooth dress shirt', category: 'dress_shirt' },
  { id: 'pants-1', name: 'Tessuti Di Sondrio oat lightweight stretch chino', category: 'chinos' },
  { id: 'jacket-2', name: 'di Fabio barley wool and linen hopsack Bedford jacket', category: 'blazer' },
  { id: 'shirt-2', name: 'Blue and lavender tattersall performance dress shirt', category: 'dress_shirt' },
  { id: 'pants-2', name: 'di Sondrio khaki lightweight cotton chino', category: 'chinos' },
  { id: 'wrong-shirt', name: 'Lilac and light blue Mayfair multi-check dress shirt', category: 'dress_shirt' },
].map((garment) => ({ ...garment, status: 'active' }))

describe('parseStylistResponse', () => {
  it('keeps the explanation readable without exposing AI markers', () => {
    const result = parseStylistResponse(
      '**Tomorrow:** Reda grey wool hopsack Bedford jacket [[e13f2eec-58b2-4eb3-be07-076d49cc507c]] with the Light blue Mayfair wrinkle-resistant twill dress shirt.',
      garments,
    )

    expect(result.truncated).toBe(false)
    expect(result.text).toContain(garments[0].name)
    expect(result.text).toContain(garments[1].name)
    expect(result.text).not.toMatch(/\[\[|\*\*/)
  })

  it('recovers the named garment and flags a response that stopped inside an id marker', () => {
    const result = parseStylistResponse(
      'Reda grey wool hopsack Bedford jacket [[e13f2eec-58',
      garments,
    )

    expect(result.truncated).toBe(true)
    expect(result.text).toContain(garments[0].name)
    expect(result.text).not.toContain('[[')
  })

  it('keeps ordinary prose when no garment is named', () => {
    expect(parseStylistResponse('Dinner is business casual.', garments)).toEqual({
      text: 'Dinner is business casual.',
      truncated: false,
    })
  })
})

describe('parseStylistOutfits', () => {
  it('builds the visual outfits from the garments named by the stylist answer', () => {
    const response = `Here are two business-casual, no-tie looks from your DC closet:

Outfit 1 — Grey/Blue
- Reda grey wool hopsack Bedford jacket [[e13f2eec-58b2-4eb3-be07-076d49cc507c]]
- Light blue houndstooth dress shirt
- Oat lightweight stretch chino

Outfit 2 — Tan/Blue
- di Fabio tan wool-linen hopsack Bedford jacket
- Blue/lavender tattersall performance shirt
- Khaki lightweight chino`

    const result = parseStylistOutfits(response, outfitGarments)

    expect(result).toHaveLength(2)
    expect(result[0].items.map(({ g }) => g.id)).toEqual([
      'e13f2eec-58b2-4eb3-be07-076d49cc507c',
      'shirt-1',
      'pants-1',
    ])
    expect(result[1].items.map(({ g }) => g.id)).toEqual([
      'jacket-2',
      'shirt-2',
      'pants-2',
    ])
    expect(result.flatMap((outfit) => outfit.items).some(({ g }) => g.id === 'wrong-shirt')).toBe(false)
  })

  it('uses the latest complete assistant answer and ignores user prose', () => {
    const complete = 'Outfit 1 — Updated\n- Reda grey wool hopsack Bedford jacket\n- Blue/lavender tattersall performance shirt\n- Khaki lightweight chino'
    const messages = [
      { role: 'assistant', text: 'Outfit 1 — Earlier\n- Reda grey wool hopsack Bedford jacket\n- Light blue houndstooth dress shirt\n- Oat lightweight stretch chino' },
      { role: 'user', text: 'Use the blue and lavender shirt instead.' },
      { role: 'assistant', text: complete },
    ]

    expect(findLatestStylistOutfits(messages, outfitGarments)[0].items.map(({ g }) => g.id)).toEqual([
      'e13f2eec-58b2-4eb3-be07-076d49cc507c',
      'shirt-2',
      'pants-2',
    ])
  })

  it('does not fabricate a visual outfit from an ambiguous or incomplete answer', () => {
    expect(parseStylistOutfits('A blue shirt would work well.', outfitGarments)).toEqual([])
  })

  it('does not picture garments that are at the laundry or tailor', () => {
    const unavailable = outfitGarments.map((garment) => (
      garment.id === 'shirt-1' ? { ...garment, status: 'laundry' } : garment
    ))
    const response = 'Outfit 1 — Not available\n- Reda grey wool hopsack Bedford jacket\n- Light blue houndstooth dress shirt\n- Oat lightweight stretch chino'

    expect(parseStylistOutfits(response, unavailable)).toEqual([])
  })

  it('does not label an older outfit as the latest answer when a follow-up is incomplete', () => {
    const messages = [
      { role: 'assistant', text: 'Outfit 1 — Earlier\n- Reda grey wool hopsack Bedford jacket\n- Light blue houndstooth dress shirt\n- Oat lightweight stretch chino' },
      { role: 'user', text: 'Change the shirt.' },
      { role: 'assistant', text: 'Which shirt would you like me to use?' },
    ]

    expect(findLatestStylistOutfits(messages, outfitGarments)).toEqual([])
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
