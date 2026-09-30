import type { CSSProperties, ReactNode, Ref } from 'react'
import { REDUCED_MOTION_T, boxColor, boxPlacement, boxText, type Stop } from '../lib/story'

type Props = {
  stop: Stop
  reducedMotion: boolean
  ref: Ref<HTMLDivElement>
  children: ReactNode
}

export function StoryBox({ stop, reducedMotion, ref, children }: Props) {
  const { side, vertical, sunY, sunRoom } = boxPlacement(stop)
  const style = {
    '--box': boxColor(stop, reducedMotion ? REDUCED_MOTION_T : stop.t),
    '--box-text': boxText(stop),
    '--sun-y': sunY,
    '--sun-room': sunRoom,
  } as CSSProperties
  return (
    <div ref={ref} className="story-box" data-side={side} data-vertical={vertical} style={style} tabIndex={-1}>
      {children}
    </div>
  )
}
