import { BOX_COVERAGE_LEVELS, type PrintedBox } from './boxes'
import { fillPaperRows, fillThresholdRows, misregistration, screen, type ScreenSpec } from './grain'
import { INKS, INK_IDS, PAPER, SCREEN_ANGLE, hexToRgb, type InkId } from './palette'
import { deriveSeed } from './prng'
import { SKY_GRADIENTS, type DepthLayer, type Landscape, type Point, type Polygon } from './scene'
import { DENSITY_KEYS, type LayerId } from './timeline'

export type Plate = { image: ImageBitmap; y: number }

export type PlateSet = Partial<Record<InkId, Plate>>

export type Print = {
  width: number
  height: number
  paper: ImageBitmap

  landKnockout: Plate
  sky: PlateSet
  mountains: PlateSet
  forest: PlateSet
  sun: { radius: number; glow: PlateSet; disc: PlateSet }

  offsets: Record<InkId, Point>

  thresholds: Record<InkId, Uint8Array>
}

export type BoxPlates = {
  x: number
  y: number
  levels: Partial<Record<InkId, ImageBitmap[]>>
}

const CELL_SIZE = 4.5

const GLOW_REACH = 5

const SLICE_BUDGET_MS = 8

const ROWS_PER_CHUNK = 8

export async function buildPrint(
  landscape: Landscape,
  seed: number,
  scale: number,
  signal: AbortSignal,
): Promise<Print> {
  const width = Math.round(landscape.size.width * scale)
  const height = Math.round(landscape.size.height * scale)
  const cellSize = CELL_SIZE * scale
  const work = createScheduler(signal)

  const thresholds = {} as Record<InkId, Uint8Array>
  for (const ink of Object.keys(INKS) as InkId[]) {
    const spec = { cellSize, angleDegrees: SCREEN_ANGLE[ink], seed: deriveSeed(seed, `screen-${ink}`) }
    thresholds[ink] = await buildThresholds(width, height, spec, work)
  }
  const screenAt = (y: number): Screener => (coverage, ink) =>
    screenToBitmap(coverage, thresholds[ink], ink, work, { x: 0, y, thresholdWidth: width })

  const paperPixels = new ImageData(width, height)
  const paperSeed = deriveSeed(seed, 'paper')
  await work.rows(height, (from, to) =>
    fillPaperRows(paperPixels.data, width, hexToRgb(PAPER), paperSeed, scale, from, to),
  )
  const paper = await createImageBitmap(paperPixels)

  const land = [...landscape.mountains, ...landscape.forest]
  const landTop = Math.floor(topOf(land) * scale)
  const landKnockout = { image: await buildLandKnockout(paper, land, scale, landTop), y: landTop }
  await work.checkpoint()

  const skyHeight = Math.ceil(landscape.skyBottom * scale) + 2
  const sky = await screenLayer('sky', (ink) => drawSkyCoverage(landscape, ink, width, skyHeight, scale), 0, screenAt(0))

  const mountainsTop = Math.floor(topOf(landscape.mountains) * scale)
  const mountains = await screenLayer(
    'mountains',
    () => drawDepthCoverage(landscape.mountains, landscape.forest, width, height, mountainsTop, scale),
    mountainsTop,
    screenAt(mountainsTop),
  )

  const forestTop = Math.floor(topOf(landscape.forest) * scale)
  const forest = await screenLayer(
    'forest',
    () => drawDepthCoverage(landscape.forest, [], width, height, forestTop, scale),
    forestTop,
    screenAt(forestTop),
  )

  const sun = await buildSun(landscape.sunRadius * scale, cellSize, seed, work)
  const offsets = scaleOffsets(misregistration(deriveSeed(seed, 'registration')), scale)

  return { width, height, paper, landKnockout, sky, mountains, forest, sun, offsets, thresholds }
}

export async function buildBoxPlates(
  box: PrintedBox,
  print: Print,
  scale: number,
  signal: AbortSignal,
): Promise<BoxPlates> {
  const work = createScheduler(signal)
  const x = clampInt(box.x * scale, 0, print.width - 1)
  const y = clampInt(box.y * scale, 0, print.height - 1)
  const width = clampInt((box.x + box.width) * scale + 1, x + 1, print.width) - x
  const height = clampInt((box.y + box.height) * scale + 1, y + 1, print.height) - y
  const shape = new Path2D()
  shape.roundRect(box.x * scale - x, box.y * scale - y, box.width * scale, box.height * scale, box.radius * scale)

  const levels: BoxPlates['levels'] = {}
  for (const ink of INK_IDS) {
    if ((box.inks[ink] ?? 0) <= 0) continue
    const bitmaps: ImageBitmap[] = []
    for (let level = 1; level <= BOX_COVERAGE_LEVELS; level++) {
      const coverage = createCanvas(width, height)
      const ctx = context(coverage)
      ctx.fillStyle = `rgba(0,0,0,${level / BOX_COVERAGE_LEVELS})`
      ctx.fill(shape)
      bitmaps.push(await screenToBitmap(coverage, print.thresholds[ink], ink, work, { x, y, thresholdWidth: print.width }))
    }
    levels[ink] = bitmaps
  }
  return { x, y, levels }
}

type Scheduler = {

  checkpoint(): Promise<void>

  rows(height: number, fill: (fromY: number, toY: number) => void): Promise<void>
}

function createScheduler(signal: AbortSignal): Scheduler {
  let sliceStart = performance.now()
  const checkpoint = async () => {
    if (performance.now() - sliceStart < SLICE_BUDGET_MS) return
    await yieldToMain()
    signal.throwIfAborted()
    sliceStart = performance.now()
  }
  return {
    checkpoint,
    async rows(height, fill) {
      for (let from = 0; from < height; from += ROWS_PER_CHUNK) {
        fill(from, Math.min(height, from + ROWS_PER_CHUNK))
        await checkpoint()
      }
    },
  }
}

async function buildThresholds(width: number, height: number, spec: ScreenSpec, work: Scheduler): Promise<Uint8Array> {
  const map = new Uint8Array(width * height)
  await work.rows(height, (from, to) => fillThresholdRows(map, width, spec, from, to))
  return map
}

type Screener = (coverage: HTMLCanvasElement, ink: InkId) => Promise<ImageBitmap>

async function screenLayer(
  layer: LayerId,
  coverageFor: (ink: InkId) => HTMLCanvasElement,
  y: number,
  screenInk: Screener,
): Promise<PlateSet> {
  const plates: PlateSet = {}
  for (const ink of inksOf(layer)) {
    plates[ink] = { image: await screenInk(coverageFor(ink), ink), y }
  }
  return plates
}

function drawSkyCoverage(
  landscape: Landscape,
  ink: InkId,
  width: number,
  height: number,
  scale: number,
): HTMLCanvasElement {
  const canvas = createCanvas(width, height)
  const ctx = context(canvas)
  const gradient = ctx.createLinearGradient(0, 0, 0, landscape.horizonY * scale)
  for (const [position, coverage] of SKY_GRADIENTS[ink] ?? []) {
    gradient.addColorStop(position, `rgba(0,0,0,${coverage})`)
  }
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000'
  for (const star of landscape.stars) {
    ctx.beginPath()
    ctx.arc(star.x * scale, star.y * scale, Math.max(star.radius * scale, 0.75), 0, Math.PI * 2)
    ctx.fill()
  }
  return canvas
}

function drawDepthCoverage(
  layers: readonly DepthLayer[],
  occluders: readonly DepthLayer[],
  width: number,
  height: number,
  top: number,
  scale: number,
): HTMLCanvasElement {
  const canvas = createCanvas(width, height - top)
  const ctx = context(canvas)
  ctx.setTransform(scale, 0, 0, scale, 0, -top)

  for (const layer of layers) {
    const path = toPath(layer.polygons)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000'
    ctx.fill(path)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = `rgba(0,0,0,${layer.coverage})`
    ctx.fill(path)
  }

  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000'
  for (const layer of occluders) ctx.fill(toPath(layer.polygons))
  return canvas
}

function buildLandKnockout(
  paper: ImageBitmap,
  land: readonly DepthLayer[],
  scale: number,
  top: number,
): Promise<ImageBitmap> {
  const canvas = createCanvas(paper.width, paper.height - top)
  const ctx = context(canvas)
  ctx.setTransform(scale, 0, 0, scale, 0, -top)
  for (const layer of land) ctx.fill(toPath(layer.polygons))
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.drawImage(paper, 0, -top)
  return createImageBitmap(canvas)
}

async function buildSun(radius: number, cellSize: number, seed: number, work: Scheduler): Promise<Print['sun']> {
  const glowRadius = radius * GLOW_REACH
  const screenSprite: Screener = async (coverage, ink) => {
    const spec = { cellSize, angleDegrees: SCREEN_ANGLE[ink], seed: deriveSeed(seed, `sun-${ink}`) }
    const thresholds = await buildThresholds(coverage.width, coverage.height, spec, work)
    return screenToBitmap(coverage, thresholds, ink, work, { x: 0, y: 0, thresholdWidth: coverage.width })
  }

  const glow = await screenLayer(
    'sunGlow',
    () => {
      const size = Math.ceil(glowRadius * 2)
      const canvas = createCanvas(size, size)
      const ctx = context(canvas)
      const c = size / 2
      const gradient = ctx.createRadialGradient(c, c, radius * 0.8, c, c, glowRadius)
      gradient.addColorStop(0, 'rgba(0,0,0,0.85)')
      gradient.addColorStop(0.35, 'rgba(0,0,0,0.35)')
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
      return canvas
    },
    0,
    screenSprite,
  )

  const disc = await screenLayer(
    'sunDisc',
    () => {
      const size = Math.ceil(radius * 2) + 2
      const canvas = createCanvas(size, size)
      const ctx = context(canvas)
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2)
      ctx.fill()
      return canvas
    },
    0,
    screenSprite,
  )

  return { radius, glow, disc }
}

type ScreenPlacement = { x: number; y: number; thresholdWidth: number }

async function screenToBitmap(
  coverage: HTMLCanvasElement,
  thresholds: Uint8Array,
  ink: InkId,
  work: Scheduler,
  at: ScreenPlacement,
): Promise<ImageBitmap> {
  const { width, height } = coverage
  const image = context(coverage).getImageData(0, 0, width, height)
  const rgb = hexToRgb(INKS[ink].hex)
  await work.rows(height, (from, to) =>
    screen(image.data.subarray(from * width * 4, to * width * 4), width, thresholds, at.y + from, rgb, at.thresholdWidth, at.x),
  )
  return createImageBitmap(image)
}

function inksOf(layer: LayerId): InkId[] {
  return Object.keys(DENSITY_KEYS[layer]) as InkId[]
}

function toPath(polygons: readonly Polygon[]): Path2D {
  const path = new Path2D()
  for (const polygon of polygons) {
    polygon.forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)))
    path.closePath()
  }
  return path
}

function topOf(layers: readonly DepthLayer[]): number {
  let top = Infinity
  for (const layer of layers) {
    for (const polygon of layer.polygons) {
      for (const [, y] of polygon) top = Math.min(top, y)
    }
  }
  return Math.max(0, top)
}

function scaleOffsets(offsets: Record<InkId, Point>, scale: number): Record<InkId, Point> {
  const scaled = {} as Record<InkId, Point>
  for (const ink of Object.keys(offsets) as InkId[]) {
    const [x, y] = offsets[ink]
    scaled[ink] = [Math.round(x * scale), Math.round(y * scale)]
  }
  return scaled
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)))
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, width)
  canvas.height = Math.max(1, height)
  return canvas
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2D canvas context unavailable')
  return ctx
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
