import type { PrintedBox } from '../riso'

export type PrintedBoxesEvent =
  | { type: 'boxes'; boxes: readonly (PrintedBox | null)[] }
  | { type: 'reveal'; index: number; amount: number }
  | { type: 'ready'; ready: boolean }

type Listener = (event: PrintedBoxesEvent) => void

const listeners = new Set<Listener>()
let boxes: readonly (PrintedBox | null)[] = []
const reveals: number[] = []
let ready = false

function emit(event: PrintedBoxesEvent): void {
  listeners.forEach((listener) => listener(event))
}

export const printedBoxes = {

  setBoxes(next: readonly (PrintedBox | null)[]): void {
    boxes = next
    emit({ type: 'boxes', boxes })
  },

  setReveal(index: number, amount: number): void {
    reveals[index] = amount
    emit({ type: 'reveal', index, amount })
  },

  setReady(next: boolean): void {
    ready = next
    emit({ type: 'ready', ready })
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    listener({ type: 'boxes', boxes })
    reveals.forEach((amount, index) => listener({ type: 'reveal', index, amount }))
    listener({ type: 'ready', ready })
    return () => listeners.delete(listener)
  },
}
