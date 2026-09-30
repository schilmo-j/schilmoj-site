import { useCallback, useRef, type CSSProperties, type ReactNode } from 'react'
import { useBoxPixelSnapping } from '../hooks/useBoxPixelSnapping'
import { PRINT_IN_MS, useStoryPlayback } from '../hooks/useStoryPlayback'
import { navigation } from '../lib/navigation'
import { animateScroll, scrollDuration } from '../lib/smoothScroll'
import { STOPS, holdCenter, isEdgeStop, navigationPath, storyLength, type StopId } from '../lib/story'
import { Contact } from '../sections/Contact'
import { Experience } from '../sections/Experience'
import { Hero } from '../sections/Hero'
import { Projects } from '../sections/Projects'
import { StoryBox } from './StoryBox'
import { Toolbar } from './Toolbar'

const SECTIONS: Record<StopId, () => ReactNode> = {
  hero: Hero,
  projects: Projects,
  experience: Experience,
  contact: Contact,
}

export function Story() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const boxes = useRef<(HTMLElement | null)[]>([])
  const reducedMotion = prefersReducedMotion()

  const goToStop = useCallback(
    (i: number) => {
      const box = boxes.current[i]
      if (reducedMotion) {

        box?.scrollIntoView({ block: 'start' })
        return
      }

      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      const from = window.scrollY / scrollable
      const path = navigationPath(from, i)
      const screens = holdCenter(i) - from * storyLength()
      const trip = navigation.start(i)
      animateScroll((f) => path(f) * scrollable, scrollDuration(screens), () => navigation.end(trip))
    },
    [reducedMotion],
  )

  const selectSection = useCallback(
    (i: number) => {
      goToStop(i)

      boxes.current[i]?.focus({ preventScroll: true })
    },
    [goToStop],
  )

  useBoxPixelSnapping(root, boxes)
  useStoryPlayback({ root, boxes, goToStop, enabled: !reducedMotion })

  return (
    <>
      <Toolbar onSelect={selectSection} trackCurrent={!reducedMotion} />
      <main
        ref={root}
        className="story"
        style={{ '--story-screens': storyLength() + 1, '--print-in': `${PRINT_IN_MS}ms` } as CSSProperties}
      >
        {STOPS.map((stop, i) =>
          isEdgeStop(i) ? null : (
            <div
              key={stop.id}
              className="story-snap"
              style={{ '--at': holdCenter(i) } as CSSProperties}
              aria-hidden="true"
            />
          ),
        )}
        <div ref={stage} className="story-stage">
          {STOPS.map((stop, i) => {
            const Content = SECTIONS[stop.id]
            return (
              <StoryBox
                key={stop.id}
                stop={stop}
                reducedMotion={reducedMotion}
                ref={(box) => {
                  boxes.current[i] = box
                }}
              >
                <Content />
              </StoryBox>
            )
          })}
        </div>
      </main>
    </>
  )
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
