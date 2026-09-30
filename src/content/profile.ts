export type Link = {
  label: string
  href: string

  icon?: 'github' | 'linkedin'
}

export type Profile = {
  name: string
  role: string
  location: string
  summary: string
  email: string
  links: readonly Link[]
}

export const profile: Profile = {
  name: 'Jacob Schilmoeller',
  role: 'Full-stack software engineer',
  location: 'Kansas City, MO',
  summary:
    'I build production systems end to end, from Go and Python services to React and TypeScript front-ends, with 5+ years across healthcare, HR, and SaaS.',
  email: 'schilmoj@gmail.com',
  links: [
    { label: 'GitHub', href: 'https://github.com/schilmo-j', icon: 'github' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jacob-schilmoeller', icon: 'linkedin' },
  ],
}
