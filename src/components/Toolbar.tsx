import { useEffect, useRef, type MouseEvent } from 'react'
import { profile } from '../content/profile'
import { SECTION_TITLES } from '../content/sections'
import { navigation } from '../lib/navigation'
import { onScrollProgress } from '../lib/scrollProgress'
import { STOPS, nearestStop } from '../lib/story'
import { SocialIcon } from './SocialIcon'

type Props = {

  onSelect: (i: number) => void

  trackCurrent: boolean
}

export function Toolbar({ onSelect, trackCurrent }: Props) {
  const links = useRef<(HTMLAnchorElement | null)[]>([])

  useEffect(() => {
    if (!trackCurrent) return
    let current = -1
    return onScrollProgress((progress) => {

      const next = navigation.target ?? nearestStop(progress)
      if (next === current) return
      current = next
      links.current.forEach((link, i) => {
        if (i === next) link?.setAttribute('aria-current', 'location')
        else link?.removeAttribute('aria-current')
      })
    })
  }, [trackCurrent])

  const select = (i: number) => (event: MouseEvent) => {
    event.preventDefault()
    onSelect(i)
  }

  return (
    <header className="toolbar">
      <div className="toolbar-inner">
        <nav className="toolbar-sections" aria-label="Sections">
          {STOPS.map((stop, i) => (
            <a
              key={stop.id}
              ref={(link) => {
                links.current[i] = link
              }}
              href={`#${stop.id}`}
              onClick={select(i)}
            >
              {SECTION_TITLES[stop.id]}
            </a>
          ))}
        </nav>
        <ul className="toolbar-social" aria-label="Profiles">
          {profile.links.map(
            (link) =>
              link.icon && (
                <li key={link.href}>
                  <a href={link.href} aria-label={link.label} title={link.label} rel="me">
                    <SocialIcon icon={link.icon} />
                  </a>
                </li>
              ),
          )}
        </ul>
      </div>
    </header>
  )
}
