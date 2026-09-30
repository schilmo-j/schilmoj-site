import type { PrintedBox } from './boxes'
import { drawFrame, type BoxLayer } from './compositor'
import { buildBoxPlates, buildPrint, type BoxPlates, type Print } from './layers'
import { INK_IDS, type InkId } from './palette'
import { buildLandscape, describeFrame, type Landscape } from './scene'

export type RendererStats = {
  t: number

  frameMs: number
  ready: boolean
}

export type Renderer = {

  seek(t: number): void

  setBoxes(boxes: readonly (PrintedBox | null)[]): void

  revealBox(index: number, amount: number): void

  resize(cssWidth: number, cssHeight: number): void
  dispose(): void

  setInkVisible(ink: InkId, visible: boolean): void
  stats(): RendererStats
}

const MAX_SCALE = 1

const MAX_PIXELS = 1_200_000

export function renderScale(cssWidth: number, cssHeight: number): number {
  return Math.min(MAX_SCALE, Math.sqrt(MAX_PIXELS / Math.max(1, cssWidth * cssHeight)))
}

export type RendererOptions = {

  onReadyChange?: (ready: boolean) => void
}

export function createRenderer(canvas: HTMLCanvasElement, seed: number, options: RendererOptions = {}): Renderer {

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  const visibleInks = new Set<InkId>(INK_IDS)
  let landscape: Landscape | null = null
  let print: Print | null = null
  let scale = 1
  let build: AbortController | null = null
  let t = 0
  let drawnT = NaN
  let frameMs = 0

  let boxes: readonly (PrintedBox | null)[] = []
  let boxPlates: (BoxPlates | null)[] = []
  let reveals: number[] = []
  let boxBuild: AbortController | null = null

  const draw = () => {
    if (!landscape || !print) return
    const start = performance.now()
    const boxLayers: BoxLayer[] = []
    boxes.forEach((box, i) => {
      if (box) boxLayers.push({ box, plates: boxPlates[i] ?? null, reveal: reveals[i] ?? 0 })
    })
    drawFrame(ctx, print, describeFrame(landscape, t), scale, visibleInks, boxLayers)
    frameMs = performance.now() - start
    drawnT = t
  }

  let drawQueued = false
  const requestDraw = () => {
    if (drawQueued) return
    drawQueued = true
    queueMicrotask(() => {
      drawQueued = false
      draw()
    })
  }

  const buildBoxes = (): Promise<void> => {
    boxBuild?.abort()
    boxPlates = boxes.map(() => null)
    if (!print) return Promise.resolve()
    const controller = new AbortController()
    boxBuild = controller
    const forPrint = print
    const builds = boxes.map((box, i) =>
      box
        ? buildBoxPlates(box, forPrint, scale, controller.signal).then((plates) => {
            if (controller.signal.aborted) return
            boxPlates[i] = plates
            requestDraw()
          })
        : Promise.resolve(),
    )
    const superseded = new Promise<void>(() => {})
    return Promise.all(builds).then(
      () => (controller.signal.aborted ? superseded : undefined),
      (error: unknown) => {
        if (!controller.signal.aborted) throw error
        return superseded
      },
    )
  }

  const resize = (cssWidth: number, cssHeight: number) => {
    const width = Math.round(cssWidth)
    const height = Math.round(cssHeight)
    if (width === 0 || height === 0) return
    if (landscape && landscape.size.width === width && landscape.size.height === height) return

    build?.abort()
    boxBuild?.abort()
    const controller = new AbortController()
    build = controller

    landscape = buildLandscape(seed, { width, height })
    scale = renderScale(width, height)
    print = null
    options.onReadyChange?.(false)
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)

    buildPrint(landscape, seed, scale, controller.signal).then(
      (built) => {
        if (controller.signal.aborted) return
        print = built
        draw()

        return buildBoxes().then(() => {
          if (!controller.signal.aborted) options.onReadyChange?.(true)
        })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) throw error
      },
    )
  }

  return {
    seek(next) {
      t = Math.min(1, Math.max(0, next))
      if (t !== drawnT) requestDraw()
    },
    setBoxes(next) {
      if (JSON.stringify(next) === JSON.stringify(boxes)) return
      boxes = next
      reveals = next.map((_, i) => reveals[i] ?? 0)
      buildBoxes()
      requestDraw()
    },
    revealBox(index, amount) {
      if (reveals[index] === amount) return
      reveals[index] = amount
      requestDraw()
    },
    resize,
    dispose() {
      build?.abort()
      boxBuild?.abort()
      landscape = null
      print = null
    },
    setInkVisible(ink, visible) {
      if (visible) visibleInks.add(ink)
      else visibleInks.delete(ink)
      requestDraw()
    },
    stats: () => ({ t, frameMs, ready: print !== null }),
  }
}
