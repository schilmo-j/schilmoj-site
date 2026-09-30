import { Section } from '../components/Section'
import { SECTION_TITLES } from '../content/sections'
import { projects } from '../content/projects'

export function Projects() {
  return (
    <Section id="projects" title={SECTION_TITLES.projects}>
      <ul className="stack-list">
        {projects.map((project) => (
          <li key={project.name}>
            <h3>{project.href ? <a href={project.href}>{project.name}</a> : project.name}</h3>
            <p>{project.summary}</p>
            <p className="meta">{project.stack.join(' · ')}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}
