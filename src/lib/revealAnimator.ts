export type RevealAnimator = {

  aim(index: number, target: number): void
  dispose(): void
}

export function createRevealAnimator(
  count: number,
  { inMs, outMs }: { inMs: number; outMs: number },
  onChange: (index: number, value: number) => void,
): RevealAnimator {
  const values = new Array<number>(count).fill(0)
  const targets = new Array<number>(count).fill(0)
  let frame = 0
  let last = 0

  const step = (now: number) => {
    const elapsed = now - last
    last = now
    let moving = false
    for (let i = 0; i < count; i++) {
      const value = values[i]!
      const target = targets[i]!
      if (value === target) continue
      const rising = target > value
      const delta = elapsed / (rising ? inMs : outMs)
      const next = rising ? Math.min(target, value + delta) : Math.max(target, value - delta)
      values[i] = next
      onChange(i, next)
      if (next !== target) moving = true
    }
    frame = moving ? requestAnimationFrame(step) : 0
  }

  return {
    aim(index, target) {
      targets[index] = target
      if (frame === 0 && values[index] !== target) {
        last = performance.now()
        frame = requestAnimationFrame(step)
      }
    },
    dispose() {
      cancelAnimationFrame(frame)
      frame = 0
    },
  }
}
