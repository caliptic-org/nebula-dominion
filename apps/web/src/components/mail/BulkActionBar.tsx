'use client'

import { useState } from 'react'

interface BulkActionBarProps {
  selectedCount: number
  hasClaimable: boolean
  onClaimSelected: () => void
  onDeleteSelected: () => void
  onMarkRead: () => void
  onCancel: () => void
}

export function BulkActionBar({
  selectedCount,
  hasClaimable,
  onClaimSelected,
  onDeleteSelected,
  onMarkRead,
  onCancel,
}: BulkActionBarProps) {
  const [visible] = useState(true)

  return (
    <div
      role="toolbar"
      aria-label={`${selectedCount} posta seçildi`}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        padding: '14px 16px',
        background: 'var(--color-bg-surface)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
        backdropFilter: 'none',
      }}
    >
      {/* Count badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginRight: 4,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--color-brand)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
          }}
          aria-hidden
        >
          {selectedCount}
        </div>
        <span
          style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}
        >
          seçildi
        </span>
      </div>

      {/* Divider */}
      <div
        aria-hidden
        style={{ width: 1, height: 28, background: 'var(--color-border)', flexShrink: 0 }}
      />

      {/* Actions */}
      {hasClaimable && (
        <ActionButton
          icon="📥"
          label="Talep Et"
          color="var(--color-energy)"
          glow="rgba(255,200,50,0.4)"
          onClick={onClaimSelected}
        />
      )}
      <ActionButton
        icon="👁"
        label="Okundu"
        color="var(--color-accent)"
        glow="rgba(68,217,200,0.35)"
        onClick={onMarkRead}
      />
      <ActionButton
        icon="🗑"
        label="Sil"
        color="var(--color-danger)"
        glow="rgba(255,68,68,0.35)"
        onClick={onDeleteSelected}
        dangerous
      />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Cancel */}
      <button
        onClick={onCancel}
        aria-label="Seçimi iptal et"
        style={{
          padding: '7px 14px',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          background: 'transparent',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          transition: 'color 0.2s, border-color 0.2s',
          flexShrink: 0,
        }}
      >
        İptal
      </button>
    </div>
  )
}

interface ActionButtonProps {
  icon: string
  label: string
  color: string
  glow: string
  onClick: () => void
  dangerous?: boolean
}

function ActionButton({ icon, label, color, glow, onClick, dangerous = false }: ActionButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '7px 12px',
        borderRadius: 8,
        border: `1px solid ${hovered ? color + '66' : 'var(--color-border)'}`,
        background: hovered
          ? dangerous
            ? `rgba(255,68,68,0.12)`
            : `${color}14`
          : 'var(--color-bg-elevated)',
        color: hovered ? color : 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.03em',
        transition: 'all 0.25s cubic-bezier(0.32,0.72,0,1)',
        boxShadow: hovered ? `0 0 10px ${glow}` : 'none',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 13 }} aria-hidden>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
