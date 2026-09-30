import { Section } from '../components/Section'
import { education, experience } from '../content/experience'
import { SECTION_TITLES } from '../content/sections'

export function Experience() {
  return (
    <Section id="experience" title={SECTION_TITLES.experience}>
      <ul className="stack-list">
        {experience.map((role) => (
          <li key={`${role.company}-${role.period}`}>
            <h3>
              {role.title}, {role.company}
            </h3>
            <p className="meta">
              {role.period} · {role.location}
            </p>
            {role.highlights.map((highlight, i) => (
              <p key={i}>{highlight}</p>
            ))}
          </li>
        ))}
        <li>
          <h3>{education.degree}</h3>
          <p className="meta">
            {education.school} · {education.period}
          </p>
        </li>
      </ul>
    </Section>
  )
}
