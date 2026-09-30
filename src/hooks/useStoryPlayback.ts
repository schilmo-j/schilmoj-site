import { useEffect, type RefObject } from 'react'
import { navigation } from '../lib/navigation'
import { printedBoxes } from '../lib/printedBoxes'
import { createRevealAnimator } from '../lib/revealAnimator'
import { onScrollProgress } from '../lib/scrollProgress'
import { STOPS, boxInks, storyAt } from '../lib/story'

export const PRINT_IN_MS = 450
const PRINT_OUT_MS = 250

const PRINT_WAIT_LIMIT_MS = 5000

type Playback = {

  root: RefObject<HTMLElement | null>

  boxes: RefObject<(HTMLElement | null)[]>

  goToStop: (i: number) => void

  enabled: boolean
}

export function useStoryPlayback({ root, boxes, goToStop, enabled }: Playback) {
  useEffect(() => {
    if (!enabled) return

    const measure = () => {
      printedBoxes.setBoxes(
        STOPS.map((stop, i) => {
          const box = boxes.current[i]
          if (!box) return null
          const rect = box.getBoundingClientRect()
          const radius = parseFloat(getComputedStyle(box).borderTopLeftRadius) || 0
          return { x: rect.left, y: rect.top, width: rect.width, height: rect.height, radius, inks: boxInks(stop) }
        }),
      )
    }
    let measureFrame = 0
    const scheduleMeasure = () => {
      cancelAnimationFrame(measureFrame)
      measureFrame = requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(scheduleMeasure)
    boxes.current.forEach((box) => box && observer.observe(box))
    window.addEventListener('resize', scheduleMeasure)
    measure()

    const reveal = createRevealAnimator(STOPS.length, { inMs: PRINT_IN_MS, outMs: PRINT_OUT_MS }, (i, value) =>
      printedBoxes.setReveal(i, value),
    )
    let active: number | null | undefined
    let ready = false

    const aimReveals = () => {
      if (ready) STOPS.forEach((_, i) => reveal.aim(i, i === active ? 1 : 0))
    }
    const show = (next: number | null) => {
      if (next === active) return
      active = next
      boxes.current.forEach((box, i) => box?.toggleAttribute('data-active', i === next))
      aimReveals()
    }

    const startShowing = () => root.current?.setAttribute('data-print-started', '')
    const waitLimit = window.setTimeout(startShowing, PRINT_WAIT_LIMIT_MS)
    const unready = printedBoxes.subscribe((event) => {
      if (event.type !== 'ready') return
      ready = event.ready
      root.current?.toggleAttribute('data-printed', ready)
      if (!ready) return
      window.clearTimeout(waitLimit)
      startShowing()
      aimReveals()
    })

    const unsubscribe = onScrollProgress((progress) => {
      const { active } = storyAt(progress)
      const heading = navigation.target
      show(heading === null || active === heading ? active : null)
    })

    const onFocusIn = (event: FocusEvent) => {
      const i = boxes.current.findIndex((box) => box?.contains(event.target as Node))
      if (i < 0 || i === active || event.target === boxes.current[i]) return
      goToStop(i)
    }
    document.addEventListener('focusin', onFocusIn)

    return () => {
      unsubscribe()
      unready()
      window.clearTimeout(waitLimit)
      reveal.dispose()
      observer.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
      cancelAnimationFrame(measureFrame)
      document.removeEventListener('focusin', onFocusIn)
      STOPS.forEach((_, i) => printedBoxes.setReveal(i, 0))
      printedBoxes.setBoxes([])
    }
  }, [root, boxes, goToStop, enabled])
}
