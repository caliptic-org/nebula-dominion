'use client'

import { useState } from 'react'
import type { Mail } from './types'
import { MailTypeIcon, getMailTypeConfig } from './MailTypeIcon'

interface MailListItemProps {
  mail: Mail
  isActive: boolean
  isSelected: boolean
  selectMode: boolean
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
  onClick,
  onToggleSelect,
}: MailListItemProps) {
  const [hovered, setHovered] = useState(false)
  const config = getMailTypeConfig(mail.type)
  const hasRewards = Boolean(mail.rewards?.length)

  const accentColor = mail.isRead ? 'transparent' : config.color

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
          borderRadius: '0 2px 2px 0',
          background: accentColor,
          flexShrink: 0,
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
          boxShadow: mail.isRead ? 'none' : `0 0 8px ${config.glow ?? config.color}88`,
        }}
      />

      {/* Main row */}
      <div
        style={{
          flex: 1,
          padding: '12px 14px 12px 10px',
          background: isActive
            ? `linear-gradient(90deg, ${config.color}18 0%, var(--color-bg-elevated) 100%)`
            : hovered
            ? 'var(--color-bg-elevated)'
            : mail.isRead
            ? 'transparent'
            : 'var(--color-bg-surface)',
          borderBottom: '1px solid var(--color-border)',
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
                borderRadius: 4,
                border: `2px solid ${isSelected ? config.color : 'var(--color-border-hover)'}`,
                background: isSelected ? `${config.color}22` : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s cubic-bezier(0.32,0.72,0,1)',
                flexShrink: 0,
              }}
              aria-hidden
            >
              {isSelected && (
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                  <path
                    d="M1 4.5L4.5 8L11 1"
                    stroke={config.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ) : (
            <MailTypeIcon type={mail.type} size="sm" animated={!mail.isRead} />
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
                fontWeight: mail.isRead ? 400 : 700,
                color: mail.isRead ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                letterSpacing: mail.isRead ? 'normal' : '0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                fontFamily: mail.isRead ? 'var(--font-body)' : 'var(--font-display)',
              }}
            >
              {mail.title}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              {!mail.isRead && (
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: config.color,
                    boxShadow: `0 0 6px ${config.color}`,
                    animation: 'glow-pulse 2s ease-in-out infinite',
                  }}
                  aria-hidden
                />
              )}
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.02em',
                }}
              >
                {formatRelativeTime(mail.sentAt)}
              </span>
            </div>
          </div>

          <p
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: hasRewards ? 6 : 0,
              lineHeight: 1.4,
            }}
          >
            {mail.preview}
          </p>

          {/* Reward indicator chips */}
          {hasRewards && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {mail.rewards!.map((r, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10,
                    padding: '1px 7px',
                    borderRadius: 20,
                    background: 'var(--color-energy-dim)',
                    color: 'var(--color-energy)',
                    border: '1px solid rgba(255,200,50,0.2)',
                    letterSpacing: '0.02em',
                    fontWeight: 600,
                  }}
                >
                  {r.icon} {r.amount.toLocaleString()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
