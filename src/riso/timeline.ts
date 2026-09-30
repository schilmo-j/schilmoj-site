import type { InkId } from './palette'

export type Keyframes = readonly (readonly [t: number, value: number])[]

export type LayerId = 'sky' | 'mountains' | 'forest' | 'sunGlow' | 'sunDisc'

export type InkDensities = Partial<Record<InkId, number>>

export const DENSITY_KEYS: Record<LayerId, Partial<Record<InkId, Keyframes>>> = {
  sky: {
    yellow: [[0, 0.7], [0.2, 0.3], [0.5, 0.12], [0.72, 0.5], [0.88, 0.4], [1, 0.1]],
    pink: [[0, 0.5], [0.2, 0.15], [0.5, 0.05], [0.72, 0.3], [0.88, 0.75], [1, 0.6]],
    blue: [[0, 0.15], [0.25, 0.5], [0.5, 0.6], [0.75, 0.35], [0.9, 0.7], [1, 1]],
  },
  mountains: {
    blue: [[0, 0.4], [0.5, 0.55], [0.9, 0.8], [1, 1]],
    pink: [[0, 0.55], [0.25, 0.15], [0.5, 0.05], [0.75, 0.3], [0.9, 0.6], [1, 0.5]],
  },
  forest: {
    yellow: [[0, 0.25], [0.3, 0.35], [0.5, 0.4], [0.75, 0.45], [0.9, 0.15], [1, 0]],
    blue: [[0, 0.15], [0.5, 0.1], [0.85, 0.35], [1, 0.7]],
    federal: [[0, 0.75], [0.5, 0.7], [0.9, 0.9], [1, 1]],
  },
  sunGlow: {
    yellow: [[0, 0.6], [0.3, 0.2], [0.5, 0.12], [0.75, 0.5], [0.9, 0.6], [1, 0.4]],
    pink: [[0, 0.7], [0.25, 0.15], [0.5, 0.05], [0.75, 0.35], [0.9, 0.8], [1, 0.5]],
  },
  sunDisc: {
    yellow: [[0, 1], [1, 1]],
    pink: [[0, 0.8], [0.25, 0.2], [0.5, 0], [0.75, 0.3], [0.92, 0.9], [1, 0.9]],
  },
}

const SUNRISE_T = -0.03
const SUNSET_T = 0.93

export function sunX(t: number): number {
  return 0.08 + 0.84 * t
}

export function sunElevation(t: number): number {
  return Math.sin((Math.PI * (t - SUNRISE_T)) / (SUNSET_T - SUNRISE_T))
}

export function sample(keys: Keyframes, t: number): number {
  const first = keys[0]
  const last = keys[keys.length - 1]
  if (!first || !last) return 0
  if (t <= first[0]) return first[1]
  if (t >= last[0]) return last[1]

  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i]!
    if (t <= t1) {
      const [t0, v0] = keys[i - 1]!
      const f = (t - t0) / (t1 - t0)
      const eased = f * f * (3 - 2 * f)
      return v0 + (v1 - v0) * eased
    }
  }
  return last[1]
}

export function densitiesAt(t: number): Record<LayerId, InkDensities> {
  const result = {} as Record<LayerId, InkDensities>
  for (const layer of Object.keys(DENSITY_KEYS) as LayerId[]) {
    const inks: InkDensities = {}
    for (const [ink, keys] of Object.entries(DENSITY_KEYS[layer]) as [InkId, Keyframes][]) {
      inks[ink] = sample(keys, t)
    }
    result[layer] = inks
  }
  return result
}
