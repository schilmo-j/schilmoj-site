import { describe, expect, it } from 'vitest'
import { BOX_COVERAGE_LEVELS, coverageLevel, revealStages } from './boxes'

describe('revealStages', () => {
  it('shows nothing at 0 and everything at 1', () => {
    expect(revealStages(0, 3)).toEqual({ knockout: 0, plates: [0, 0, 0] })
    expect(revealStages(1, 3)).toEqual({ knockout: 1, plates: [1, 1, 1] })
  })

  it('overprints before restoring paper: the knockout never runs ahead of the first plate', () => {
    for (let r = 0; r <= 1; r += 0.01) {
      const { knockout, plates } = revealStages(r, 3)
      expect(knockout).toBeLessThanOrEqual(plates[0]!)
    }

    const early = revealStages(0.3, 3)
    expect(early.plates[0]).toBeGreaterThan(0.5)
    expect(early.knockout).toBe(0)
  })

  it('prints plates in sequence: each is never ahead of the one before it', () => {
    for (let r = 0; r <= 1; r += 0.01) {
      const { plates } = revealStages(r, 3)
      expect(plates[0]).toBeGreaterThanOrEqual(plates[1]!)
      expect(plates[1]).toBeGreaterThanOrEqual(plates[2]!)
    }
  })

  it('only ever grows as the reveal runs forward', () => {
    let previous = revealStages(0, 3)
    for (let r = 0.01; r <= 1; r += 0.01) {
      const next = revealStages(r, 3)
      expect(next.knockout).toBeGreaterThanOrEqual(previous.knockout)
      next.plates.forEach((p, i) => expect(p).toBeGreaterThanOrEqual(previous.plates[i]!))
      previous = next
    }
  })
})

describe('coverageLevel', () => {
  it('maps growth to a pre-screened level, 0 meaning nothing printed', () => {
    expect(coverageLevel(0)).toBe(0)
    expect(coverageLevel(0.01)).toBe(1)
    expect(coverageLevel(1)).toBe(BOX_COVERAGE_LEVELS)
  })
})
