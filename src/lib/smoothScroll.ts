export const SCROLL_MS = { min: 700, max: 2000 } as const

export function scrollDuration(screens: number): number {
  return Math.min(SCROLL_MS.max, Math.max(SCROLL_MS.min, 450 + Math.abs(screens) * 200))
}

export function easeInOut(f: number): number {
  return f < 0.5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2
}

const CANCEL_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

let cancelCurrent: (() => void) | null = null

export function animateScroll(positionAt: (f: number) => number, durationMs: number, onEnd?: () => void): void {
  cancelCurrent?.()
  const root = document.documentElement

  const snap = root.style.scrollSnapType
  root.style.scrollSnapType = 'none'

  let frame = 0
  const start = performance.now()
  const stop = () => {
    cancelAnimationFrame(frame)
    CANCEL_EVENTS.forEach((type) => window.removeEventListener(type, stop))
    root.style.scrollSnapType = snap
    if (cancelCurrent === stop) cancelCurrent = null
    onEnd?.()
  }
  const step = (now: number) => {
    const f = Math.min(1, (now - start) / durationMs)
    window.scrollTo({ top: positionAt(easeInOut(f)), behavior: 'instant' })
    if (f < 1) frame = requestAnimationFrame(step)
    else stop()
  }

  CANCEL_EVENTS.forEach((type) => window.addEventListener(type, stop, { passive: true }))
  cancelCurrent = stop
  frame = requestAnimationFrame(step)
}
