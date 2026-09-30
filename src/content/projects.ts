export type Project = {
  name: string
  summary: string
  stack: readonly string[]
  href?: string
}

export const projects: readonly Project[] = [
  {
    name: 'Skilled-trade assessment platform',
    summary: 'Founding engineer at TEQ Connect: the platform employers use to assess skilled-labor candidates.',
    stack: ['React', 'TypeScript', 'Go', 'Kubernetes'],
  },
  {
    name: 'Patient record ETL pipelines',
    summary: 'At Oracle Cerner: ingesting and transforming patient records to healthcare data standards.',
    stack: ['Apache Spark', 'Python', 'Java'],
  },
  {
    name: 'This site',
    summary: 'A procedural risograph print of a Colorado forest that moves from sunrise to sunset as you scroll.',
    stack: ['TypeScript', 'React', 'Canvas 2D'],
  },
]
