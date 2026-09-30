import { useEffect, type RefObject } from 'react'
import { onDevicePixelRatio, snapHeights } from '../lib/devicePixels'

export function useBoxPixelSnapping(root: RefObject<HTMLElement | null>, boxes: RefObject<(HTMLElement | null)[]>) {
  useEffect(() => {
    let unsnap = () => {}
    const stop = onDevicePixelRatio((ratio) => {
      root.current?.style.setProperty('--dpx', `${1 / ratio}px`)
      unsnap()
      unsnap = snapHeights(boxes.current.filter((box) => box !== null), ratio)
    })
    return () => {
      stop()
      unsnap()
    }
  }, [root, boxes])
}
