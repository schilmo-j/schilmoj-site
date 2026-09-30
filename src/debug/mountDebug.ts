import { INK_IDS, INKS, type Renderer } from '../riso'

export function mountDebug(renderer: Renderer, canvas: HTMLCanvasElement): () => void {
  const panel = document.createElement('div')
  panel.id = 'riso-debug'
  panel.setAttribute('aria-hidden', 'true')
  Object.assign(panel.style, {
    position: 'fixed',
    right: '12px',
    bottom: '12px',
    zIndex: '1000',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid #3D5588',
    font: '12px/1.5 ui-monospace, monospace',
    color: '#1a2233',
    display: 'grid',
    gap: '6px',
    width: '220px',
  })

  const readout = document.createElement('div')
  readout.id = 'riso-debug-readout'

  const scrubber = document.createElement('input')
  scrubber.type = 'range'
  scrubber.min = '0'
  scrubber.max = '1'
  scrubber.step = '0.001'
  scrubber.value = String(renderer.stats().t)
  scrubber.addEventListener('input', () => {
    renderer.seek(Number(scrubber.value))
    update()
  })

  const toggles = document.createElement('div')
  for (const ink of INK_IDS) {
    const label = document.createElement('label')
    label.style.display = 'block'
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.checked = true
    box.addEventListener('change', () => renderer.setInkVisible(ink, box.checked))
    label.append(box, ` ${INKS[ink].name}`)
    toggles.append(label)
  }

  const hashButton = document.createElement('button')
  hashButton.textContent = 'Hash canvas'
  const hashOutput = document.createElement('code')
  hashButton.addEventListener('click', () => {
    hashOutput.textContent = hashCanvas(canvas)
  })

  panel.append(readout, scrubber, toggles, hashButton, hashOutput)
  document.body.append(panel)

  const update = () => {
    const { t, frameMs, ready } = renderer.stats()
    readout.textContent = `t ${t.toFixed(3)}  ·  ${frameMs.toFixed(2)} ms${ready ? '' : '  ·  building'}`
  }
  update()
  const interval = window.setInterval(update, 250)

  return () => {
    window.clearInterval(interval)
    panel.remove()
  }
}

function hashCanvas(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d')
  if (!ctx) return 'no context'
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let hash = 0x811c9dc5
  for (let i = 0; i < data.length; i++) {
    hash = Math.imul(hash ^ data[i]!, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
