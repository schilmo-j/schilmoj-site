import { useEffect, useRef } from 'react'
import { createRenderer } from '../riso'
import { printedBoxes } from '../lib/printedBoxes'
import { onScrollProgress } from '../lib/scrollProgress'
import { REDUCED_MOTION_T, storyAt } from '../lib/story'

const SEED = 1993

const RESIZE_DEBOUNCE_MS = 150

export function RisoBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = createRenderer(canvas, SEED, { onReadyChange: (ready) => printedBoxes.setReady(ready) })
    const cleanups: (() => void)[] = [
      () => renderer.dispose(),
      () => printedBoxes.setReady(false),
      printedBoxes.subscribe((event) => {
        if (event.type === 'boxes') renderer.setBoxes(event.boxes)
        if (event.type === 'reveal') renderer.revealBox(event.index, event.amount)
      }),
    ]

    let resizeTimer = 0
    let sized = false
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => renderer.resize(width, height), sized ? RESIZE_DEBOUNCE_MS : 0)
      sized = true
    })
    observer.observe(canvas)
    cleanups.push(() => {
      observer.disconnect()
      window.clearTimeout(resizeTimer)
    })

    const params = new URLSearchParams(window.location.search)
    const pinnedT = parseT(params.get('t'))
    if (pinnedT !== null) {
      renderer.seek(pinnedT)
    } else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      renderer.seek(REDUCED_MOTION_T)
    } else {
      cleanups.push(onScrollProgress((progress) => renderer.seek(storyAt(progress).t)))
    }

    let disposed = false
    if (params.has('debug')) {
      void import('../debug/mountDebug').then(({ mountDebug }) => {
        if (!disposed) cleanups.push(mountDebug(renderer, canvas))
      })
    }

    return () => {
      disposed = true
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [])

  return <canvas ref={canvasRef} className="riso-background" aria-hidden="true" />
}

function parseT(value: string | null): number | null {
  if (value === null) return null
  const t = Number(value)
  return Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : null
}
