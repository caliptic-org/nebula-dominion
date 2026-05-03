'use client';

interface Resource {
  icon: string;
  label: string;
  value: number | string;
  color?: string;
}

interface ResourceBarProps {
  mineral?: number;
  gas?: number;
  energy?: number;
  population?: number;
  xp?: number;
  xpMax?: number;
}

const RESOURCES: ((props: ResourceBarProps) => Resource[]) = (p) => [
  { icon: '💎', label: 'Mineral', value: p.mineral ?? 0, color: '#4a9eff' },
  { icon: '⚗️', label: 'Gas', value: p.gas ?? 0, color: '#44ff88' },
  { icon: '⚡', label: 'Enerji', value: p.energy ?? 0, color: '#ffc832' },
  { icon: '👥', label: 'Nüfus', value: p.population ?? 0, color: '#cc00ff' },
];

export function ResourceBar(props: ResourceBarProps) {
  const resources = RESOURCES(props);
  const xpPct = props.xpMax ? Math.round((props.xp ?? 0) / props.xpMax * 100) : 0;

  return (
    <div
      className="top-bar"
      role="status"
      aria-label="Kaynaklar"
    >
      {/* Logo mark */}
      <span className="font-display text-xs font-bold tracking-widest text-gradient-race hidden sm:block">
        NEBULA
      </span>

      {/* Resources */}
      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
        {resources.map((r) => (
          <div
            key={r.label}
            className="resource-bar"
            title={r.label}
          >
            <span aria-hidden>{r.icon}</span>
            <span style={{ color: r.color ?? 'var(--color-text-primary)' }}>
              {typeof r.value === 'number' ? r.value.toLocaleString('tr-TR') : r.value}
            </span>
          </div>
        ))}

        {/* XP Mini bar */}
        {props.xpMax !== undefined && (
          <div className="resource-bar gap-2">
            <span aria-hidden>✨</span>
            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${xpPct}%`, background: 'var(--color-race)' }}
              />
            </div>
            <span className="text-text-muted">{xpPct}%</span>
          </div>
        )}
      </div>

      {/* Right slot (children via portal or props expansion) */}
      <div className="w-6" />
    </div>
  );
}
