let target: number | null = null
let token = 0

export const navigation = {
  get target(): number | null {
    return target
  },

  start(to: number): number {
    target = to
    return ++token
  },

  end(id: number): void {
    if (id === token) target = null
  },
}
