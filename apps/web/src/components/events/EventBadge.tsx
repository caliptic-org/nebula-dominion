export type EventType = 'tournament' | 'resource' | 'guild' | 'special';

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; icon: string; color: string; bg: string; border: string }> = {
  tournament: {
    label: 'TURNUVA',
    icon: '⚔️',
    color: '#ff4444',
    bg: 'rgba(255, 68, 68, 0.12)',
    border: 'rgba(255, 68, 68, 0.35)',
  },
  resource: {
    label: 'KAYNAK',
    icon: '💎',
    color: '#44d9c8',
    bg: 'rgba(68, 217, 200, 0.12)',
    border: 'rgba(68, 217, 200, 0.35)',
  },
  guild: {
    label: 'LONCA',
    icon: '🤝',
    color: '#cc00ff',
    bg: 'rgba(204, 0, 255, 0.12)',
    border: 'rgba(204, 0, 255, 0.35)',
  },
  special: {
    label: 'ÖZEL',
    icon: '⭐',
    color: '#ffc832',
    bg: 'rgba(255, 200, 50, 0.12)',
    border: 'rgba(255, 200, 50, 0.35)',
  },
};

interface EventBadgeProps {
  type: EventType;
  size?: 'sm' | 'md';
}

export function EventBadge({ type, size = 'md' }: EventBadgeProps) {
  const cfg = EVENT_TYPE_CONFIG[type];
  const px = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const text = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold tracking-widest uppercase ${px} ${text}`}
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        textShadow: `0 0 8px ${cfg.color}66`,
      }}
    >
      <span aria-hidden>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

export function getEventTypeColor(type: EventType): string {
  return EVENT_TYPE_CONFIG[type].color;
}
