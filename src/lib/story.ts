import { PAPER, densitiesAt, printedColor, sunElevation, sunPosition, type InkDensities } from '../riso'
import { contrast } from './contrast'

export type StopId = 'hero' | 'projects' | 'experience' | 'contact'

export type Stop = { id: StopId; t: number; centered?: boolean; text?: string }

export const WHITE = '#ffffff'

export const STOPS: readonly Stop[] = [
  { id: 'hero', t: 0.02, centered: true, text: WHITE },
  { id: 'projects', t: 0.35 },
  { id: 'experience', t: 0.68 },
  { id: 'contact', t: 1 },
]

export const HOLD_SCREENS = 0.8

export const TRAVEL_SCREENS = 1.5

export const EDGE_REVEAL_SCREENS = 0.25

export const REDUCED_MOTION_T = 0.3

export type StoryState = {
  t: number

  active: number | null
}

export function isEdgeStop(i: number): boolean {
  return i === 0 || i === STOPS.length - 1
}

export function holdLength(i: number): number {
  return isEdgeStop(i) ? 0 : HOLD_SCREENS
}

export function holdStart(i: number): number {
  let offset = 0
  for (let j = 0; j < i; j++) offset += holdLength(j) + TRAVEL_SCREENS
  return offset
}

export function holdEnd(i: number): number {
  return holdStart(i) + holdLength(i)
}

export function holdCenter(i: number): number {
  return holdStart(i) + holdLength(i) / 2
}

export function nearestStop(progress: number): number {
  const s = Math.min(1, Math.max(0, progress)) * storyLength()
  let nearest = 0
  STOPS.forEach((_, i) => {
    if (Math.abs(holdCenter(i) - s) < Math.abs(holdCenter(nearest) - s)) nearest = i
  })
  return nearest
}

export function storyLength(): number {
  return holdEnd(STOPS.length - 1)
}

export function storyAt(progress: number): StoryState {
  const s = Math.min(1, Math.max(0, progress)) * storyLength()
  return { t: timeAt(s), active: activeAt(s) }
}

export function progressAtTime(t: number, forward: boolean): number {
  const length = storyLength()
  for (let i = 0; i < STOPS.length; i++) {
    const stop = STOPS[i]!
    if (t === stop.t) return (forward ? holdEnd(i) : holdStart(i)) / length
    if (t < stop.t) {
      if (i === 0) return 0
      const from = STOPS[i - 1]!

      const eased = (t - from.t) / (stop.t - from.t)
      const f = 0.5 - Math.sin(Math.asin(1 - 2 * eased) / 3)
      return (holdEnd(i - 1) + f * TRAVEL_SCREENS) / length
    }
  }
  return 1
}

export function navigationPath(fromProgress: number, to: number): (f: number) => number {
  const target = holdCenter(to) / storyLength()
  const fromT = storyAt(fromProgress).t
  const toT = STOPS[to]!.t
  if (fromT === toT) return (f) => fromProgress + (target - fromProgress) * f
  const forward = toT > fromT
  return (f) => (f >= 1 ? target : progressAtTime(fromT + (toT - fromT) * f, forward))
}

function timeAt(s: number): number {
  for (let i = 0; i < STOPS.length; i++) {
    const stop = STOPS[i]!
    if (s > holdEnd(i)) continue
    if (s >= holdStart(i)) return stop.t

    const from = STOPS[i - 1]!
    const f = (s - holdEnd(i - 1)) / TRAVEL_SCREENS
    return from.t + (stop.t - from.t) * f * f * (3 - 2 * f)
  }
  return STOPS[STOPS.length - 1]!.t
}

function activeAt(s: number): number | null {
  for (let i = 0; i < STOPS.length; i++) {
    const reveal = isEdgeStop(i) ? EDGE_REVEAL_SCREENS : 0
    if (s >= holdStart(i) - reveal && s <= holdEnd(i) + reveal) return i
  }
  return null
}

export type BoxPlacement = {

  side: 'left' | 'right' | 'center'

  vertical: 'above-sun' | 'below-sun'

  sunY: number

  sunRoom: number
}

export function boxPlacement(stop: Stop): BoxPlacement {
  const [sunX, sunY] = sunPosition(stop.t)
  const hasSet = sunElevation(stop.t) <= 0
  const side = hasSet || stop.centered ? 'center' : sunX < 0.5 ? 'right' : 'left'
  return {
    side,

    vertical: !hasSet && sunY > 0.4 ? 'above-sun' : 'below-sun',
    sunY: hasSet ? 0 : sunY,
    sunRoom: side === 'left' ? sunX : side === 'right' ? 1 - sunX : 0,
  }
}

export const BOX_MIN_CONTRAST = 4.5

export function boxText(stop: Stop): string {
  return stop.text ?? PAPER
}

export function boxInks(stop: Stop, t = stop.t): InkDensities {
  const passes = (inks: InkDensities) => contrast(boxText(stop), printedColor(inks)) >= BOX_MIN_CONTRAST
  const inks = { ...densitiesAt(t).forest }
  while (!passes(inks) && (inks.federal ?? 0) < 1) inks.federal = Math.min(1, (inks.federal ?? 0) + 0.01)
  return inks
}

export function boxColor(stop: Stop, t = stop.t): string {
  return printedColor(boxInks(stop, t))
}
