import { hash2 } from './prng'

function smooth(f: number): number {
  return f * f * (3 - 2 * f)
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f
}

export function valueNoise1(x: number, seed: number): number {
  const i = Math.floor(x)
  return lerp(hash2(i, 0, seed), hash2(i + 1, 0, seed), smooth(x - i))
}

export function valueNoise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = smooth(x - ix)
  const fy = smooth(y - iy)
  const top = lerp(hash2(ix, iy, seed), hash2(ix + 1, iy, seed), fx)
  const bottom = lerp(hash2(ix, iy + 1, seed), hash2(ix + 1, iy + 1, seed), fx)
  return lerp(top, bottom, fy)
}

export function fbm1(x: number, seed: number, octaves = 4): number {
  let sum = 0
  let amplitude = 1
  let total = 0
  for (let o = 0; o < octaves; o++) {
    sum += amplitude * valueNoise1(x * 2 ** o, seed + o)
    total += amplitude
    amplitude *= 0.5
  }
  return sum / total
}

export function ridged1(x: number, seed: number, octaves = 4): number {
  let sum = 0
  let amplitude = 1
  let total = 0
  for (let o = 0; o < octaves; o++) {
    const n = valueNoise1(x * 2 ** o, seed + o)
    sum += amplitude * (1 - Math.abs(2 * n - 1))
    total += amplitude
    amplitude *= 0.5
  }
  return sum / total
}
