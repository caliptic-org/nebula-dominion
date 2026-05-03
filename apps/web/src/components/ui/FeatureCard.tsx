interface Feature {
  icon: string
  title: string
  description: string
}

export function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <div className="glass-card p-6 hover-glow group">
      <span className="manga-halftone-overlay" aria-hidden />
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 transition-transform group-hover:scale-110"
        style={{ background: 'var(--color-bg-elevated)' }}
        aria-hidden
      >
        {feature.icon}
      </div>
      <h3 className="font-display text-base font-bold mb-2 text-text-primary">
        {feature.title}
      </h3>
      <p className="text-text-secondary text-sm leading-relaxed">
        {feature.description}
      </p>
    </div>
  )
}
