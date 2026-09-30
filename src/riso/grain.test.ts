import { describe, expect, it } from 'vitest'
import { buildThresholdMap, fillThresholdRows, misregistration, screen } from './grain'

const SPEC = { cellSize: 4.5, angleDegrees: 15, seed: 3 }

function coverageBuffer(pixels: number, coverage: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(pixels * 4)
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = Math.round(coverage * 255)
  return rgba
}

function inkedFraction(rgba: Uint8ClampedArray): number {
  let sum = 0
  for (let i = 3; i < rgba.length; i += 4) sum += rgba[i]! / 255
  return sum / (rgba.length / 4)
}

describe('buildThresholdMap', () => {
  it('is deterministic', () => {
    expect(buildThresholdMap(64, 64, SPEC)).toEqual(buildThresholdMap(64, 64, SPEC))
  })

  it('gives the same result when filled in row chunks', () => {
    const chunked = new Uint8Array(64 * 64)
    for (let y = 0; y < 64; y += 5) fillThresholdRows(chunked, 64, SPEC, y, Math.min(64, y + 5))
    expect(chunked).toEqual(buildThresholdMap(64, 64, SPEC))
  })

  it('differs by angle, so inks do not share a screen', () => {
    expect(buildThresholdMap(64, 64, SPEC)).not.toEqual(buildThresholdMap(64, 64, { ...SPEC, angleDegrees: 45 }))
  })
})

describe('screen', () => {
  const size = 128
  const thresholds = buildThresholdMap(size, size, SPEC)
  const inkAt = (coverage: number) => {
    const rgba = coverageBuffer(size * size, coverage)
    screen(rgba, size, thresholds, 0, [0, 120, 191])
    return inkedFraction(rgba)
  }

  it('prints nothing at zero coverage', () => {
    expect(inkAt(0)).toBe(0)
  })

  it('prints more ink as coverage rises', () => {
    expect(inkAt(0.25)).toBeLessThan(inkAt(0.5))
    expect(inkAt(0.5)).toBeLessThan(inkAt(0.9))
  })

  it('leaves starved flecks even at full coverage', () => {
    const full = inkAt(1)
    expect(full).toBeGreaterThan(0.9)
    expect(full).toBeLessThan(1)
  })

  it('screens a block cut from inside the map exactly like the same region of the whole', () => {
    const whole = coverageBuffer(size * size, 0.6)
    screen(whole, size, thresholds, 0, [0, 120, 191])
    const [x0, y0, w, h] = [37, 21, 50, 40]
    const block = coverageBuffer(w * h, 0.6)
    screen(block, w, thresholds, y0, [0, 120, 191], size, x0)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        expect(block[(y * w + x) * 4 + 3]).toBe(whole[((y0 + y) * size + x0 + x) * 4 + 3])
      }
    }
  })

  it('writes the ink color', () => {
    const rgba = coverageBuffer(4, 1)
    screen(rgba, 2, thresholds, 0, [0, 120, 191])
    expect([...rgba.slice(0, 3)]).toEqual([0, 120, 191])
  })
})

describe('misregistration', () => {
  it('is fixed per seed and small', () => {
    const offsets = misregistration(9)
    expect(offsets).toEqual(misregistration(9))
    for (const [x, y] of Object.values(offsets)) {
      expect(Math.abs(x)).toBeLessThanOrEqual(1.5)
      expect(Math.abs(y)).toBeLessThanOrEqual(1.5)
    }
  })
})
