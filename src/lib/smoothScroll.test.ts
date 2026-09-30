import { describe, expect, it } from 'vitest'
import { SCROLL_MS, easeInOut, scrollDuration } from './smoothScroll'

describe('scrollDuration', () => {
  it('takes longer for longer jumps, within bounds', () => {
    expect(scrollDuration(1)).toBeLessThan(scrollDuration(3))
    expect(scrollDuration(0)).toBe(SCROLL_MS.min)
    expect(scrollDuration(50)).toBe(SCROLL_MS.max)
  })
})

describe('easeInOut', () => {
  it('starts and ends in place, and never runs backwards', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(1)).toBe(1)
    expect(easeInOut(0.5)).toBeCloseTo(0.5)
    for (let f = 0.01; f <= 1; f += 0.01) expect(easeInOut(f)).toBeGreaterThanOrEqual(easeInOut(f - 0.01))
  })
})
