export function onScrollProgress(onChange: (t: number) => void): () => void {
  let frame = 0

  const report = () => {
    frame = 0
    const scrollable = document.documentElement.scrollHeight - window.innerHeight
    onChange(scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0)
  }
  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(report)
  }

  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  schedule()

  return () => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    cancelAnimationFrame(frame)
  }
}
