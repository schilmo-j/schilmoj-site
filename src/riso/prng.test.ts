import { describe, expect, it } from 'vitest'
import { createRng, deriveSeed, hash2 } from './prng'

describe('createRng', () => {
  it('repeats the same stream for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    const streamA = Array.from({ length: 100 }, () => a.next())
    const streamB = Array.from({ length: 100 }, () => b.next())
    expect(streamA).toEqual(streamB)
  })

  it('stays in [0, 1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 10_000; i++) {
      const n = rng.next()
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
    }
  })

  it('differs between seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next())
  })
})

describe('hash2', () => {
  it('is a pure function of its inputs', () => {
    expect(hash2(12, 34, 5)).toBe(hash2(12, 34, 5))
    expect(hash2(12, 34, 5)).not.toBe(hash2(34, 12, 5))
  })
})

describe('deriveSeed', () => {
  it('gives independent seeds per label', () => {
    expect(deriveSeed(1, 'forest0')).not.toBe(deriveSeed(1, 'forest1'))
    expect(deriveSeed(1, 'stars')).toBe(deriveSeed(1, 'stars'))
  })
})
