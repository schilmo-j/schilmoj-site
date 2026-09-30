import { describe, expect, it } from 'vitest'
import { DENSITY_KEYS, densitiesAt, sample, sunElevation, type Keyframes } from './timeline'

describe('sample', () => {
  const keys: Keyframes = [
    [0, 0],
    [0.5, 1],
    [1, 0.2],
  ]

  it('hits keyframes exactly', () => {
    expect(sample(keys, 0)).toBe(0)
    expect(sample(keys, 0.5)).toBe(1)
    expect(sample(keys, 1)).toBe(0.2)
  })

  it('clamps outside the keyed range', () => {
    expect(sample(keys, -1)).toBe(0)
    expect(sample(keys, 2)).toBe(0.2)
  })

  it('eases between keys', () => {
    expect(sample(keys, 0.25)).toBeCloseTo(0.5)
    expect(sample(keys, 0.1)).toBeLessThan(0.2)
  })
})

describe('keyframes', () => {
  it('are sorted, span [0, 1], and stay within ink density bounds', () => {
    for (const inks of Object.values(DENSITY_KEYS)) {
      for (const keys of Object.values(inks)) {
        expect(keys[0]?.[0]).toBe(0)
        expect(keys[keys.length - 1]?.[0]).toBe(1)
        keys.forEach(([t, value], i) => {
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThanOrEqual(1)
          if (i > 0) expect(t).toBeGreaterThan(keys[i - 1]![0])
        })
      }
    }
  })

  it('make dusk blue-dominant and dawn warm, per the art direction', () => {
    const dawn = densitiesAt(0).sky
    const dusk = densitiesAt(1).sky
    expect((dawn.yellow ?? 0) + (dawn.pink ?? 0)).toBeGreaterThan(dawn.blue ?? 0)
    expect(dusk.blue ?? 0).toBeGreaterThan(Math.max(dusk.yellow ?? 0, dusk.pink ?? 0))
  })
})

describe('sun', () => {
  it('is up at t = 0, highest mid-scroll, and set by t = 1', () => {
    expect(sunElevation(0)).toBeGreaterThan(0)
    expect(sunElevation(0.45)).toBeGreaterThan(0.95)
    expect(sunElevation(1)).toBeLessThan(0)
  })
})
