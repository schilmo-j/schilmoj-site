import { valueNoise2 } from './noise'
import { createRng, hash2 } from './prng'
import { INK_IDS, type InkId } from './palette'
import type { Point } from './scene'

const STARVED = 255

export type ScreenSpec = {

  cellSize: number
  angleDegrees: number
  seed: number
}

export function buildThresholdMap(width: number, height: number, spec: ScreenSpec): Uint8Array {
  const map = new Uint8Array(width * height)
  fillThresholdRows(map, width, spec, 0, height)
  return map
}

export function fillThresholdRows(map: Uint8Array, width: number, spec: ScreenSpec, fromY: number, toY: number): void {
  const angle = (spec.angleDegrees * Math.PI) / 180
  const cos = Math.cos(angle) / spec.cellSize
  const sin = Math.sin(angle) / spec.cellSize
  const mottleScale = 1 / (spec.cellSize * 9)

  for (let y = fromY; y < toY; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const noise = hash2(x, y, spec.seed)
      if (noise < 0.012) {
        map[i] = STARVED
        continue
      }
      const u = x * cos - y * sin
      const v = x * sin + y * cos

      const dot = 0.5 - 0.25 * (Math.cos(2 * Math.PI * u) + Math.cos(2 * Math.PI * v))
      const mottle = (valueNoise2(x * mottleScale, y * mottleScale, spec.seed + 1) - 0.5) * 0.13
      const jitter = (noise - 0.5) * 0.08
      const threshold = clamp(0.03 + 0.88 * dot + mottle + jitter, 0.02, 0.94)
      map[i] = Math.round(threshold * 254)
    }
  }
}

const DOT_SHARPNESS = 10

export function screen(
  rgba: Uint8ClampedArray,
  width: number,
  thresholds: Uint8Array,
  rowOffset: number,
  [r, g, b]: readonly [number, number, number],
  thresholdWidth = width,
  columnOffset = 0,
): void {
  const rows = rgba.length / 4 / width
  for (let row = 0; row < rows; row++) {
    const base = (rowOffset + row) * thresholdWidth + columnOffset
    for (let col = 0; col < width; col++) {
      const i = (row * width + col) * 4
      const inside = col + columnOffset < thresholdWidth
      const alpha = inkAlpha(rgba[i + 3]! / 255, inside ? (thresholds[base + col] ?? STARVED) : STARVED)
      rgba[i] = r
      rgba[i + 1] = g
      rgba[i + 2] = b
      rgba[i + 3] = Math.round(alpha * 255)
    }
  }
}

function inkAlpha(coverage: number, threshold: number): number {
  return threshold === STARVED ? 0 : clamp((coverage - threshold / 254) * DOT_SHARPNESS, 0, 1)
}

export function fillPaperRows(
  rgba: Uint8ClampedArray,
  width: number,
  [r, g, b]: readonly [number, number, number],
  seed: number,
  scale: number,
  fromY: number,
  toY: number,
): void {
  const cloudScale = 1 / (70 * scale)
  for (let y = fromY; y < toY; y++) {
    for (let x = 0; x < width; x++) {
      const cloud = (valueNoise2(x * cloudScale, y * cloudScale, seed) - 0.5) * 0.05
      const fiber = (hash2(x, y, seed + 1) - 0.5) * 0.03
      const shade = 1 + cloud + fiber
      const i = (y * width + x) * 4
      rgba[i] = r * shade
      rgba[i + 1] = g * shade
      rgba[i + 2] = b * shade
      rgba[i + 3] = 255
    }
  }
}

export function misregistration(seed: number): Record<InkId, Point> {
  const rng = createRng(seed)
  const offsets = {} as Record<InkId, Point>
  for (const ink of INK_IDS) {
    offsets[ink] = [rng.range(-1.5, 1.5), rng.range(-1.5, 1.5)]
  }
  return offsets
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
