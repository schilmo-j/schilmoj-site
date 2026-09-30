import { densitiesAt } from './timeline'

export const PAPER = '#F4EEDF'

export const INKS = {
  yellow: { name: 'Yellow', hex: '#FFE800' },
  pink: { name: 'Fluorescent Pink', hex: '#FF48B0' },
  blue: { name: 'Blue', hex: '#0078BF' },
  federal: { name: 'Federal Blue', hex: '#3D5588' },
} as const

export type InkId = keyof typeof INKS

export const INK_IDS: readonly InkId[] = ['yellow', 'pink', 'blue', 'federal']

export const SCREEN_ANGLE: Record<InkId, number> = {
  yellow: 0,
  pink: 75,
  blue: 15,
  federal: 45,
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function printedColor(amounts: Partial<Record<InkId, number>>): string {
  const color = hexToRgb(PAPER)
  for (const ink of INK_IDS) {
    const amount = amounts[ink] ?? 0
    const inkRgb = hexToRgb(INKS[ink].hex)
    for (let i = 0; i < 3; i++) {
      color[i] = color[i]! * (1 - amount * (1 - inkRgb[i]! / 255))
    }
  }
  return `#${color.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

export function treelineColor(t: number): string {
  return printedColor(densitiesAt(t).forest)
}
