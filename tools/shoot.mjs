import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'
import { createServer } from 'vite'

const args = process.argv.slice(2)
const mode = args.includes('--stops') ? 'stops' : 'background'
const tArg = args[args.indexOf('--t') + 1]
const TS = args.includes('--t') && tArg ? tArg.split(',').map(Number) : [0, 0.25, 0.5, 0.75, 1]

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'laptop', width: 1440, height: 900 },
]

const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'error' })
await server.listen()
const browser = await chromium.launch({ channel: 'msedge' })
await mkdir('shots', { recursive: true })

const waitForBuild = (page) =>
  page.waitForFunction(() => {
    const text = document.getElementById('riso-debug-readout')?.textContent ?? ''
    return text !== '' && !text.includes('building')
  })

async function shootStops(page, viewport) {
  await page.goto('http://localhost:5199/?debug')
  await waitForBuild(page)
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: '#riso-debug{display:none!important}' })

  const inner = await page.$$eval('.story-snap', (markers) => markers.map((m) => m.offsetTop))
  const bottom = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  const holds = [0, ...inner, bottom]
  const targets = holds.flatMap((y, i) => {
    const next = holds[i + 1]
    return next === undefined ? [[`stop${i}`, y]] : [[`stop${i}`, y], [`travel${i}`, (y + next) / 2]]
  })
  for (const [label, y] of targets) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `shots/${viewport.name}-${label}.png` })
  }
  console.log(`${viewport.name}: ${targets.map(([label]) => label).join(' ')}`)
}

try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
    if (mode === 'stops') {
      await shootStops(page, viewport)
      await page.close()
      continue
    }
    for (const t of TS) {
      await page.goto(`http://localhost:5199/?t=${t}&debug`)
      await waitForBuild(page)
      const stats = await page.evaluate(() => {
        document.getElementById('riso-debug')?.querySelector('button')?.click()
        return document.getElementById('riso-debug')?.textContent ?? ''
      })
      await page.addStyleTag({ content: '#riso-debug{display:none!important} main{visibility:hidden}' })
      const name = `${viewport.name}-t${t.toFixed(2)}`
      console.log(`${name}  ${stats.match(/[\d.]+ ms/)?.[0] ?? ''}  hash ${stats.slice(-8)}`)
      await page.screenshot({ path: `shots/${name}.png` })
    }
    await page.close()
  }
} finally {
  await browser.close()
  await server.close()
}
