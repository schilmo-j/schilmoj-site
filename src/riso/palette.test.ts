import { describe, expect, it } from 'vitest'
import { PAPER, treelineColor } from './palette'

function brightness(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255)
}

describe('treelineColor', () => {
  it('is a valid hex color and darker than paper', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(treelineColor(t)).toMatch(/^#[0-9a-f]{6}$/)
      expect(brightness(treelineColor(t))).toBeLessThan(brightness(PAPER))
    }
  })

  it('darkens toward dusk, following the forest plates', () => {
    expect(brightness(treelineColor(1))).toBeLessThan(brightness(treelineColor(0.5)))
  })
})
