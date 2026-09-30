import type { InkDensities } from './timeline'

export type PrintedBox = {
  x: number
  y: number
  width: number
  height: number
  radius: number

  inks: InkDensities
}

export const BOX_COVERAGE_LEVELS = 4

export type RevealStages = {

  knockout: number

  plates: number[]
}

const PLATE_SPAN = 0.5

const KNOCKOUT_START = 0.45

export function revealStages(reveal: number, plateCount: number): RevealStages {
  const r = clamp01(reveal)
  const stagger = plateCount > 1 ? (1 - PLATE_SPAN) / (plateCount - 1) : 0
  const plates = Array.from({ length: plateCount }, (_, i) =>
    smoothstep(clamp01((r - i * stagger) / PLATE_SPAN)),
  )
  return { knockout: smoothstep(clamp01((r - KNOCKOUT_START) / (1 - KNOCKOUT_START))), plates }
}

export function coverageLevel(amount: number): number {
  return Math.ceil(clamp01(amount) * BOX_COVERAGE_LEVELS)
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(f: number): number {
  return f * f * (3 - 2 * f)
}
