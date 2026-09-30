import { describe, expect, it } from 'vitest'
import { densitiesAt, sunPosition, treelineColor } from '../riso'
import { contrast, parseHex } from './contrast'
import {
  EDGE_REVEAL_SCREENS,
  REDUCED_MOTION_T,
  STOPS,
  boxColor,
  boxInks,
  boxPlacement,
  boxText,
  WHITE,
  holdCenter,
  holdEnd,
  holdStart,
  isEdgeStop,
  navigationPath,
  nearestStop,
  progressAtTime,
  storyAt,
  storyLength,
} from './story'

const at = (screens: number) => storyAt(screens / storyLength())

describe('storyAt', () => {
  it('starts on the first stop and ends on the last', () => {
    expect(storyAt(0)).toEqual({ t: STOPS[0]!.t, active: 0 })
    expect(storyAt(1)).toEqual({ t: STOPS[STOPS.length - 1]!.t, active: STOPS.length - 1 })
  })

  it('puts the first and last stops exactly on the page edges, with no pause there', () => {
    const last = STOPS.length - 1
    expect(holdStart(0)).toBe(0)
    expect(holdEnd(0)).toBe(0)
    expect(holdStart(last)).toBe(holdEnd(last))
    expect(holdEnd(last)).toBe(storyLength())

    expect(at(0.01).t).toBeGreaterThan(STOPS[0]!.t)
    expect(at(storyLength() - 0.01).t).toBeLessThan(STOPS[last]!.t)
  })

  it('keeps an edge box up for a short reveal, then hides it', () => {
    const last = STOPS.length - 1

    expect(at(EDGE_REVEAL_SCREENS * 0.9).active).toBe(0)
    expect(at(EDGE_REVEAL_SCREENS * 1.1).active).toBeNull()
    expect(at(storyLength() - EDGE_REVEAL_SCREENS * 0.9).active).toBe(last)
    expect(at(storyLength() - EDGE_REVEAL_SCREENS * 1.1).active).toBeNull()
  })

  it('pauses time for the whole of each inner hold, with that stop active', () => {
    STOPS.forEach((stop, i) => {
      if (isEdgeStop(i)) return
      for (const f of [0, 0.25, 0.5, 0.75, 1]) {
        expect(at(holdStart(i) + f * (holdEnd(i) - holdStart(i)))).toEqual({ t: stop.t, active: i })
      }
    })
  })

  it('shows no box while traveling between stops', () => {
    for (let i = 0; i < STOPS.length - 1; i++) {
      const midTravel = (holdEnd(i) + holdStart(i + 1)) / 2
      const state = at(midTravel)
      expect(state.active).toBeNull()
      expect(state.t).toBeGreaterThan(STOPS[i]!.t)
      expect(state.t).toBeLessThan(STOPS[i + 1]!.t)
    }
  })

  it('never runs time backwards as the page scrolls down', () => {
    let previous = -Infinity
    for (let p = 0; p <= 1; p += 0.001) {
      const { t } = storyAt(p)
      expect(t).toBeGreaterThanOrEqual(previous)
      previous = t
    }
  })

  it('clamps progress outside [0, 1]', () => {
    expect(storyAt(-0.5)).toEqual(storyAt(0))
    expect(storyAt(1.5)).toEqual(storyAt(1))
  })

  it('centers snap targets inside their holds', () => {
    STOPS.forEach((_, i) => expect(at(holdCenter(i)).active).toBe(i))
  })
})

describe('navigation', () => {
  it('lands on each pause: the very top for the first stop, the very bottom for the last', () => {
    expect(navigationPath(1, 0)(1)).toBe(0)
    expect(navigationPath(0, STOPS.length - 1)(1)).toBe(1)
    STOPS.forEach((_, i) => expect(storyAt(navigationPath(0.5, i)(1)).active).toBe(i))
  })

  it('inverts the story: the time shown at progressAtTime(t) is t', () => {
    for (let t = STOPS[0]!.t; t <= 1; t += 0.013) {
      expect(storyAt(progressAtTime(t, true)).t).toBeCloseTo(t, 6)
    }
  })

  it('moves time evenly and never dwells in a pause between the start and the destination', () => {
    const last = STOPS.length - 1
    for (const [from, to] of [[0, last], [last, 0], [0, 2], [3, 1]] as const) {
      const path = navigationPath(holdCenter(from) / storyLength(), to)
      const fromT = STOPS[from]!.t
      const toT = STOPS[to]!.t
      for (let f = 0.01; f < 1; f += 0.01) {
        const state = storyAt(path(f))
        expect(state.t).toBeCloseTo(fromT + (toT - fromT) * f, 6)

        if (state.active !== null) expect([from, to]).toContain(state.active)
      }
    }
  })

  it('reports the nearest stop, switching halfway between pauses', () => {
    STOPS.forEach((_, i) => expect(nearestStop(holdCenter(i) / storyLength())).toBe(i))
    const midway = (holdCenter(0) + holdCenter(1)) / 2
    expect(nearestStop((midway - 0.01) / storyLength())).toBe(0)
    expect(nearestStop((midway + 0.01) / storyLength())).toBe(1)
  })
})

describe('boxPlacement', () => {
  it('keeps every box on the side of the sky away from the sun', () => {
    for (const stop of STOPS) {
      const { side } = boxPlacement(stop)
      const [sunX] = sunPosition(stop.t)
      if (side === 'left') expect(sunX).toBeGreaterThan(0.5)
      if (side === 'right') expect(sunX).toBeLessThan(0.5)
    }
  })

  it('centers boxes marked centered, and every box once the sun has set', () => {
    for (const stop of STOPS) {
      if (stop.centered || stop.t === 1) expect(boxPlacement(stop).side).toBe('center')
    }
  })
})

describe('box colors', () => {
  const ts = (t: number) => [t, REDUCED_MOTION_T]

  it('keep box text at WCAG AA for every stop and the reduced-motion frame', () => {
    for (const stop of STOPS) {
      for (const t of ts(stop.t)) {
        expect(contrast(boxText(stop), boxColor(stop, t))).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('print in the forest inks, raising only Federal Blue where contrast needs it', () => {
    for (const stop of STOPS) {
      for (const t of ts(stop.t)) {
        const forest = densitiesAt(t).forest
        const inks = boxInks(stop, t)
        expect(inks.yellow).toBe(forest.yellow)
        expect(inks.blue).toBe(forest.blue)
        expect(inks.federal).toBeGreaterThanOrEqual(forest.federal ?? 0)
        if (contrast(boxText(stop), treelineColor(t)) >= 4.5) expect(boxColor(stop, t)).toBe(treelineColor(t))
      }
    }
  })

  it('print the hero box as the dawn treeline, #5A6B6A to within 2 per channel, with white text', () => {
    const hero = STOPS[0]!
    expect(boxText(hero)).toBe(WHITE)
    const [r, g, b] = parseHex(boxColor(hero))
    const [tr, tg, tb] = parseHex('#5a6b6a')
    expect(Math.max(Math.abs(r - tr), Math.abs(g - tg), Math.abs(b - tb))).toBeLessThanOrEqual(2)
  })
})
