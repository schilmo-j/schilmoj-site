import { profile } from '../content/profile'

export function Hero() {
  return (
    <header id="hero" className="hero">
      <h1>{profile.name}</h1>
      <p className="hero-role">
        {profile.role} · {profile.location}
      </p>
      <p>{profile.summary}</p>
    </header>
  )
}
