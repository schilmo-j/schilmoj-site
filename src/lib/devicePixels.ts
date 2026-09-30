export function onDevicePixelRatio(onChange: (ratio: number) => void): () => void {
  let query: MediaQueryList | null = null
  const update = () => {
    query?.removeEventListener('change', update)
    const ratio = window.devicePixelRatio || 1
    query = window.matchMedia(`(resolution: ${ratio}dppx)`)
    query.addEventListener('change', update)
    onChange(ratio)
  }
  update()
  return () => query?.removeEventListener('change', update)
}

export function snapHeights(elements: readonly HTMLElement[], ratio: number): () => void {
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement
      const current = parseFloat(element.style.getPropertyValue('--snap-pad')) || 0
      const clamped = element.scrollHeight > element.clientHeight
      const height = (entry.borderBoxSize[0]?.blockSize ?? element.offsetHeight) - current
      const device = height * ratio
      const pad = clamped ? 0 : (Math.ceil(device - 0.001) - device) / ratio

      if (Math.abs(pad - current) > 0.001) element.style.setProperty('--snap-pad', `${pad}px`)
    }
  })
  elements.forEach((element) => observer.observe(element))
  return () => observer.disconnect()
}
