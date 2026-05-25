'use client'

import { useState } from 'react'
import { Chip, ND, type NDRace } from '@/components/handoff'
import type { Mail } from './types'
import { MailTypeIcon, getMailTypeConfig } from './MailTypeIcon'

interface MailListItemProps {
  mail: Mail
  isActive: boolean
  isSelected: boolean
  selectMode: boolean
  race: NDRace
  onClick: () => void
  onToggleSelect: () => void
}

function formatRelativeTime(isoString: string): string {
  const now = new Date('2026-05-03T12:00:00Z')
  const sent = new Date(isoString)
  const diffMs = now.getTime() - sent.getTime()
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffH / 24)
  if (diffH < 1) return 'Az önce'
  if (diffH < 24) return `${diffH}s önce`
  if (diffD === 1) return 'Dün'
  return `${diffD}g önce`
}

export function MailListItem({
  mail,
  isActive,
  isSelected,
  selectMode,
  race,
  onClick,
  onToggleSelect,
}: MailListItemProps) {
  const [hovered, setHovered] = useState(false)
  const config = getMailTypeConfig(mail.type, race)
  const hasRewards = Boolean(mail.rewards?.length)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={`${mail.isRead ? '' : 'Okunmamış: '}${mail.title}`}
      className="relative flex items-stretch cursor-pointer select-none outline-none"
      style={{
        transition: 'transform 0.25s cubic-bezier(0.32,0.72,0,1)',
        transform: hovered && !selectMode ? 'translateX(3px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={selectMode ? onToggleSelect : onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          selectMode ? onToggleSelect() : onClick()
        }
      }}
    >
      {/* Unread left accent bar */}
      <div
        style={{
          width: 3,
          background: mail.isRead ? 'transparent' : config.color,
          flexShrink: 0,
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
          boxShadow: mail.isRead ? 'none' : `0 0 8px ${config.glow}88`,
        }}
      />

      {/* Main row */}
      <div
        style={{
          flex: 1,
          padding: '12px 14px 12px 10px',
          background: isActive
            ? `linear-gradient(90deg, ${race.primary}22 0%, ${ND.surface} 80%)`
            : hovered
              ? ND.surfaceHi
              : mail.isRead
                ? 'transparent'
                : ND.surface,
          borderBottom: `1px solid ${ND.border}`,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          transition: 'background 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Checkbox (select mode) or icon */}
        <div style={{ paddingTop: 1 }}>
          {selectMode ? (
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 3,
                border: `1.5px solid ${isSelected ? race.primary : ND.borderHi}`,
                background: isSelected ? `${race.primary}22` : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s cubic-bezier(0.32,0.72,0,1)',
                flexShrink: 0,
                boxShadow: isSelected ? `0 0 6px ${race.glow}55` : 'none',
              }}
              aria-hidden
            >
              {isSelected && (
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                  <path
                    d="M1 4.5L4.5 8L11 1"
                    stroke={race.primary}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ) : (
            <MailTypeIcon type={mail.type} size="sm" animated={!mail.isRead} race={race} />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 3,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: mail.isRead ? 500 : 700,
                color: mail.isRead ? ND.textDim : ND.text,
                letterSpacing: mail.isRead ? '0.01em' : '0.03em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                fontFamily: mail.isRead ? ND.body : ND.display,
                textTransform: mail.isRead ? 'none' : 'uppercase',
              }}
            >
              {mail.title}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              {!mail.isRead && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: config.color,
                    boxShadow: `0 0 6px ${config.glow}`,
                  }}
                  aria-hidden
                />
              )}
              <span
                style={{
                  fontSize: 10,
                  color: ND.textMute,
                  letterSpacing: '0.06em',
                  fontFamily: ND.mono,
                  textTransform: 'uppercase',
                }}
              >
                {formatRelativeTime(mail.sentAt)}
              </span>
            </div>
          </div>

          <p
            style={{
              fontSize: 12,
              color: ND.textDim,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: hasRewards ? 6 : 0,
              lineHeight: 1.45,
              fontFamily: ND.body,
            }}
          >
            {mail.preview}
          </p>

          {/* Reward indicator chips */}
          {hasRewards && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {mail.rewards!.map((r, i) => (
                <Chip key={i} color={ND.warn}>
                  {r.icon} {r.amount.toLocaleString()}
                </Chip>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
