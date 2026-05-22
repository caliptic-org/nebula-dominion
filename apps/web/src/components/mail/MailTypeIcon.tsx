'use client'

import { ND, type NDRace } from '@/components/handoff'
import type { MailType } from './types'

interface MailTypeIconProps {
  type: MailType
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  race?: NDRace
}

export interface MailTypeConfig {
  icon: string
  color: string
  glow: string
  label: string
}

const SIZE_MAP = {
  sm: { outer: 28, inner: 20, text: 12 },
  md: { outer: 38, inner: 26, text: 16 },
  lg: { outer: 52, inner: 34, text: 22 },
}

export function getMailTypeConfig(type: MailType, race?: NDRace): MailTypeConfig {
  switch (type) {
    case 'system':
      return { icon: '📦', color: ND.warn,   glow: ND.warn,   label: 'Sistem' }
    case 'battle_report':
      return { icon: '⚔️', color: ND.danger, glow: ND.danger, label: 'Savaş Raporu' }
    case 'guild':
      return { icon: '🛡️', color: ND.ok,     glow: ND.ok,     label: 'Lonca' }
    case 'event':
    default:
      return {
        icon: '✨',
        color: race?.primary ?? 'oklch(0.78 0.16 220)',
        glow:  race?.glow    ?? 'oklch(0.82 0.18 220)',
        label: 'Etkinlik',
      }
  }
}

export function MailTypeIcon({ type, size = 'md', animated = false, race }: MailTypeIconProps) {
  const config = getMailTypeConfig(type, race)
  const dim = SIZE_MAP[size]

  return (
    <div
      style={{
        width: dim.outer,
        height: dim.outer,
        borderRadius: 3,
        clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
        background: `linear-gradient(180deg, ${config.color}22, ${config.color}08)`,
        border: `1px solid ${config.color}55`,
        boxShadow: animated
          ? `0 0 14px ${config.glow}44, inset 0 1px 0 rgba(255,255,255,0.06)`
          : `0 0 6px ${config.glow}22, inset 0 1px 0 rgba(255,255,255,0.04)`,
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
