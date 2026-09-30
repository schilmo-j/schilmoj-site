import { coverageLevel, revealStages, type PrintedBox } from './boxes'
import type { BoxPlates, Plate, PlateSet, Print } from './layers'
import { INKS, INK_IDS, type InkId } from './palette'
import type { SceneFrame } from './scene'
import type { InkDensities } from './timeline'

export type BoxLayer = { box: PrintedBox; plates: BoxPlates | null; reveal: number }

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  print: Print,
  frame: SceneFrame,
  scale: number,
  visibleInks: ReadonlySet<InkId>,
  boxes: readonly BoxLayer[] = [],
): void {
  const { densities } = frame
  const sunX = frame.sun[0] * scale
  const sunY = frame.sun[1] * scale

  const printPlates = (plates: PlateSet, inkDensities: InkDensities, center?: readonly [number, number]) => {
    ctx.globalCompositeOperation = 'multiply'
    for (const [ink, plate] of Object.entries(plates) as [InkId, Plate][]) {
      const density = inkDensities[ink] ?? 0
      if (density <= 0 || !visibleInks.has(ink)) continue
      const [dx, dy] = print.offsets[ink]
      const x = center ? Math.round(center[0] - plate.image.width / 2) : 0
      const y = center ? Math.round(center[1] - plate.image.height / 2) : plate.y
      ctx.globalAlpha = Math.min(1, density)
      ctx.drawImage(plate.image, x + dx, y + dy)
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.drawImage(print.paper, 0, 0)

  printPlates(print.sky, densities.sky)

  ctx.save()
  ctx.beginPath()
  ctx.arc(sunX, sunY, print.sun.radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(print.paper, 0, 0)
  ctx.restore()
  printPlates(print.sun.glow, densities.sunGlow, [sunX, sunY])
  printPlates(print.sun.disc, densities.sunDisc, [sunX, sunY])

  ctx.drawImage(print.landKnockout.image, 0, print.landKnockout.y)
  printPlates(print.mountains, densities.mountains)
  printPlates(print.forest, densities.forest)

  for (const layer of boxes) {
    if (layer.reveal > 0) drawBox(ctx, print, layer, scale, visibleInks)
  }
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  print: Print,
  { box, plates, reveal }: BoxLayer,
  scale: number,
  visibleInks: ReadonlySet<InkId>,
): void {
  const shape = new Path2D()
  shape.roundRect(box.x * scale, box.y * scale, box.width * scale, box.height * scale, box.radius * scale)
  const inks = INK_IDS.filter((ink) => (box.inks[ink] ?? 0) > 0)
  const stages = revealStages(reveal, inks.length)

  ctx.save()
  ctx.clip(shape)
  ctx.globalAlpha = stages.knockout
  ctx.drawImage(print.paper, 0, 0)
  ctx.restore()

  ctx.globalCompositeOperation = 'multiply'
  inks.forEach((ink, i) => {
    const grown = stages.plates[i] ?? 0
    if (grown <= 0 || !visibleInks.has(ink)) return
    const density = Math.min(1, box.inks[ink] ?? 0)
    const bitmap = plates?.levels[ink]?.[coverageLevel(grown) - 1]
    if (bitmap && plates) {
      const [dx, dy] = print.offsets[ink]
      ctx.globalAlpha = density
      ctx.drawImage(bitmap, plates.x + dx, plates.y + dy)
    } else {

      ctx.globalAlpha = density * grown
      ctx.fillStyle = INKS[ink].hex
      ctx.fill(shape)
    }
  })
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}
