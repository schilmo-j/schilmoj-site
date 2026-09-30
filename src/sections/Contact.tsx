import { Section } from '../components/Section'
import { profile } from '../content/profile'
import { SECTION_TITLES } from '../content/sections'

export function Contact() {
  return (
    <Section id="contact" title={SECTION_TITLES.contact}>
      <ul className="link-list">
        <li>
          <a href={`mailto:${profile.email}`}>{profile.email}</a>
        </li>
        {profile.links.map((link) => (
          <li key={link.href}>
            <a href={link.href} rel="me">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </Section>
  )
}
