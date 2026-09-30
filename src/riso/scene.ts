import { fbm1, ridged1 } from './noise'
import type { InkId } from './palette'
import { createRng, deriveSeed, type Rng } from './prng'
import { densitiesAt, sunElevation, sunX, type InkDensities, type LayerId } from './timeline'

export type Size = { width: number; height: number }
export type Point = readonly [x: number, y: number]
export type Polygon = readonly Point[]

export type DepthLayer = {
  polygons: readonly Polygon[]

  coverage: number
}

export type Landscape = {
  size: Size

  horizonY: number

  skyBottom: number
  sunRadius: number

  mountains: readonly DepthLayer[]

  forest: readonly DepthLayer[]

  stars: readonly Star[]
}

export type Star = { x: number; y: number; radius: number }

export type SceneFrame = {
  t: number
  densities: Record<LayerId, InkDensities>
  sun: Point
}

export const SKY_GRADIENTS: Partial<Record<InkId, readonly (readonly [number, number])[]>> = {
  yellow: [[0, 0.04], [0.5, 0.3], [1, 1]],
  pink: [[0, 0], [0.45, 0.1], [1, 0.9]],
  blue: [[0, 1], [0.6, 0.6], [1, 0.35]],
}

export const TREELINE = 0.62

const PROFILE_STEP = 6

const OVERSCAN = 40

type ForestSpec = {
  baseline: number
  baselineAmplitude: number
  treeHeight: readonly [min: number, max: number]
  coverage: number
}

const FOREST_SPECS: readonly ForestSpec[] = [
  { baseline: 0.7, baselineAmplitude: 0.02, treeHeight: [0.025, 0.045], coverage: 0.5 },
  { baseline: 0.79, baselineAmplitude: 0.025, treeHeight: [0.05, 0.08], coverage: 0.8 },
  { baseline: 0.92, baselineAmplitude: 0.03, treeHeight: [0.1, 0.16], coverage: 1 },
]

const TREE_SPACING = 0.27

const HORIZON = 0.68
const ZENITH = 0.12

export function sunPosition(t: number): Point {
  return [sunX(t), HORIZON - sunElevation(t) * (HORIZON - ZENITH)]
}

export function buildLandscape(seed: number, size: Size): Landscape {
  const { width, height } = size
  const [farRidge, nearRidge] = buildRidges(deriveSeed(seed, 'mountains'), size)
  return {
    size,
    horizonY: height * HORIZON,

    skyBottom: Math.max(...farRidge.map(([, y]) => y)),
    sunRadius: clamp(Math.max(width, height) * 0.04, 18, 42),
    mountains: [
      { polygons: [closeToBottom(farRidge, height)], coverage: 0.5 },
      { polygons: [closeToBottom(nearRidge, height)], coverage: 0.75 },
    ],
    forest: FOREST_SPECS.map((spec, i) => buildForestLayer(deriveSeed(seed, `forest${i}`), size, spec)),
    stars: buildStars(deriveSeed(seed, 'stars'), size),
  }
}

export function describeFrame(landscape: Landscape, t: number): SceneFrame {
  const { width, height } = landscape.size
  const [x, y] = sunPosition(t)
  return { t, densities: densitiesAt(t), sun: [x * width, y * height] }
}

function buildRidges(seed: number, { width, height }: Size): [far: Point[], near: Point[]] {
  const far = profile(width, (x) => height * (0.65 - 0.14 * ridged1(x / 260, seed) ** 1.6))
  const near = profile(width, (x) => height * (0.7 - 0.07 * fbm1(x / 180, seed + 101)))
  return [far, near]
}

function buildForestLayer(seed: number, { width, height }: Size, spec: ForestSpec): DepthLayer {
  const rng = createRng(seed)
  const baselineAt = (x: number) =>
    height * (spec.baseline + spec.baselineAmplitude * (fbm1(x / 220, seed) * 2 - 1))

  const ground = closeToBottom(profile(width, baselineAt), height)
  const trees: Polygon[] = []
  const treelineY = height * TREELINE

  let x = -OVERSCAN
  while (x < width + OVERSCAN) {
    const treeHeight = height * rng.range(spec.treeHeight[0], spec.treeHeight[1])
    const baseY = baselineAt(x)

    const clampedHeight = Math.min(treeHeight, baseY - treelineY)
    trees.push(pineOutline(x, baseY, clampedHeight, rng))
    x += treeHeight * TREE_SPACING * rng.range(0.7, 1.3)
  }

  return { polygons: [ground, ...trees], coverage: spec.coverage }
}

export function pineOutline(x: number, baseY: number, height: number, rng: Rng): Polygon {
  const tiers = 4 + Math.floor(rng.next() * 3)
  const halfWidth = height * rng.range(0.18, 0.24)
  const tierStep = (height * 0.9) / tiers
  const apexY = baseY - height

  const left: Point[] = []
  for (let i = 0; i < tiers; i++) {
    const tipY = baseY - i * tierStep
    const reach = halfWidth * (1 - i / tiers) * rng.range(0.85, 1.1)
    left.push([x - reach, tipY])
    left.push([x - reach * 0.35, tipY - tierStep * 0.6])
  }

  const right = left.map(([px, py]): Point => [2 * x - px, py]).reverse()

  return [[x - halfWidth * 0.3, baseY + 4], ...left, [x, apexY], ...right, [x + halfWidth * 0.3, baseY + 4]]
}

function buildStars(seed: number, { width, height }: Size): Star[] {
  const rng = createRng(seed)
  const count = Math.min(160, Math.round((width * height) / 9000))
  return Array.from({ length: count }, () => ({
    x: rng.range(0, width),

    y: height * 0.5 * rng.next() ** 1.5,
    radius: rng.range(0.6, 1.4),
  }))
}

function profile(width: number, yAt: (x: number) => number): Point[] {
  const points: Point[] = []
  for (let x = -OVERSCAN; x <= width + OVERSCAN; x += PROFILE_STEP) {
    points.push([x, yAt(x)])
  }
  return points
}

function closeToBottom(ridge: Point[], height: number): Polygon {
  const first = ridge[0]
  const last = ridge[ridge.length - 1]
  if (!first || !last) return ridge
  return [...ridge, [last[0], height + OVERSCAN], [first[0], height + OVERSCAN]]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
