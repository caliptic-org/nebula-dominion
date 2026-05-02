'use client'

import type { MailType } from './types'

interface MailTypeIconProps {
  type: MailType
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const TYPE_CONFIG: Record<MailType, { icon: string; color: string; glow: string; label: string }> = {
  system: {
    icon: '📦',
    color: 'var(--color-energy)',
    glow: 'rgba(255, 200, 50, 0.35)',
    label: 'Sistem',
  },
  battle_report: {
    icon: '⚔️',
    color: 'var(--color-danger)',
    glow: 'rgba(255, 68, 68, 0.35)',
    label: 'Savaş Raporu',
  },
  guild: {
    icon: '🛡️',
    color: 'var(--color-accent)',
    glow: 'rgba(68, 217, 200, 0.35)',
    label: 'Lonca',
  },
  event: {
    icon: '✨',
    color: 'var(--color-brand)',
    glow: 'rgba(123, 140, 222, 0.35)',
    label: 'Etkinlik',
  },
}

const SIZE_MAP = {
  sm: { outer: 28, inner: 20, text: 12 },
  md: { outer: 38, inner: 26, text: 16 },
  lg: { outer: 52, inner: 34, text: 22 },
}

export function MailTypeIcon({ type, size = 'md', animated = false }: MailTypeIconProps) {
  const config = TYPE_CONFIG[type]
  const dim = SIZE_MAP[size]

  return (
    <div
      style={{
        width: dim.outer,
        height: dim.outer,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${config.color}22, ${config.color}08)`,
        border: `1px solid ${config.color}44`,
        boxShadow: animated ? `0 0 14px ${config.glow}, inset 0 1px 1px rgba(255,255,255,0.08)` : `0 0 8px ${config.glow}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'box-shadow 0.4s cubic-bezier(0.32,0.72,0,1)',
      }}
      aria-label={config.label}
    >
      <span style={{ fontSize: dim.text, lineHeight: 1 }}>{config.icon}</span>
    </div>
  )
}

export function getMailTypeConfig(type: MailType) {
  return TYPE_CONFIG[type]
}
