export type Role = {
  title: string
  company: string
  period: string
  location: string
  highlights: readonly string[]
}

export type Education = {
  school: string
  degree: string
  period: string
}

export const experience: readonly Role[] = [
  {
    title: 'Senior Software Engineer',
    company: 'TEQ Connect',
    period: '2024 – present',
    location: 'Kansas City, MO',
    highlights: [
      'Founding engineer of a skilled-trade recruiting assessment platform; architected and owns the back end and front end, from first design to production.',
    ],
  },
  {
    title: 'Software Engineer III',
    company: 'Paycom',
    period: '2023 – 2024',
    location: 'Oklahoma City, OK',
    highlights: [
      'Built HR benefits and records services in Angular, C#/.NET, and Go, and led the redesign of legacy apps onto modern front-end tooling.',
    ],
  },
  {
    title: 'Software Engineer I',
    company: 'Oracle Cerner',
    period: '2020 – 2022',
    location: 'Kansas City, MO',
    highlights: ['Built patient-record ingestion services and ETL pipelines in React, Java, Python, and Apache Spark.'],
  },
]

export const education: Education = {
  school: 'Kansas State University',
  degree: 'B.S. Computer Science',
  period: '2016 – 2020',
}
