interface Race {
  name: string
  color: string
  symbol: string
  tagline: string
}

export function RaceCard({ race }: { race: Race }) {
  return (
    <div
      className="glass-card p-4 text-center cursor-pointer hover-glow group transition-all duration-200 hover:-translate-y-1"
      tabIndex={0}
      role="button"
      aria-label={`${race.name} ırkını seç`}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 transition-transform group-hover:scale-110"
        style={{ background: `${race.color}20`, border: `1px solid ${race.color}40` }}
        aria-hidden
      >
        {race.symbol}
      </div>
      <h3
        className="font-display text-sm font-bold mb-1"
        style={{ color: race.color }}
      >
        {race.name}
      </h3>
      <p className="text-text-muted text-xs leading-snug">{race.tagline}</p>
    </div>
  )
}
