import { describe, expect, it } from 'vitest'
import { TREELINE, buildLandscape, describeFrame } from './scene'

const SIZES = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]
const CHECK_TS = [0, 0.25, 0.5, 0.75, 1]

describe('buildLandscape', () => {
  it('is deterministic for a fixed seed and size', () => {
    for (const size of SIZES) {
      expect(buildLandscape(7, size)).toEqual(buildLandscape(7, size))
    }
  })

  it('changes with the seed', () => {
    expect(buildLandscape(1, SIZES[0]!)).not.toEqual(buildLandscape(2, SIZES[0]!))
  })

  it('keeps every tree below the treeline so the sky stays clear', () => {
    for (const size of SIZES) {
      const { forest } = buildLandscape(7, size)
      for (const layer of forest) {
        for (const polygon of layer.polygons) {
          for (const [, y] of polygon) {
            expect(y).toBeGreaterThanOrEqual(size.height * TREELINE - 1e-9)
          }
        }
      }
    }
  })

  it('orders forest layers far to near: lighter behind, darker in front', () => {
    const { forest } = buildLandscape(7, SIZES[1]!)
    const coverages = forest.map((layer) => layer.coverage)
    expect(coverages).toEqual([...coverages].sort((a, b) => a - b))
  })

  it('keeps stars in the sky', () => {
    for (const size of SIZES) {
      const { stars, skyBottom } = buildLandscape(7, size)
      expect(stars.length).toBeGreaterThan(0)
      for (const star of stars) expect(star.y).toBeLessThan(skyBottom)
    }
  })
})

describe('describeFrame', () => {
  const landscape = buildLandscape(7, SIZES[1]!)

  it('is a pure function of t', () => {
    for (const t of CHECK_TS) {
      expect(describeFrame(landscape, t)).toEqual(describeFrame(landscape, t))
    }
  })

  it('matches the recorded frames', () => {
    expect(CHECK_TS.map((t) => describeFrame(landscape, t))).toMatchSnapshot()
  })

  it('moves the sun left to right and sets it behind the land', () => {
    const [x0] = describeFrame(landscape, 0).sun
    const [x1, y1] = describeFrame(landscape, 1).sun
    expect(x1).toBeGreaterThan(x0)
    expect(y1).toBeGreaterThan(landscape.horizonY)
  })
})
