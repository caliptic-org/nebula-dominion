'use client'

import { useState } from 'react'
import { ND, type NDRace } from '@/components/handoff'

interface BulkActionBarProps {
  selectedCount: number
  hasClaimable: boolean
  race: NDRace
  onClaimSelected: () => void
  onDeleteSelected: () => void
  onMarkRead: () => void
  onCancel: () => void
}

export function BulkActionBar({
  selectedCount,
  hasClaimable,
  race,
  onClaimSelected,
  onDeleteSelected,
  onMarkRead,
  onCancel,
}: BulkActionBarProps) {
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
        padding: '12px 14px',
        background: `linear-gradient(180deg, ${ND.surface} 0%, ${ND.surfaceSolid} 100%)`,
        borderTop: `1px solid ${race.primary}55`,
        boxShadow: `0 -8px 24px -8px ${race.glow}33`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Count badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginRight: 2,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            background: race.primary,
            color: '#0A0E1A',
            fontSize: 11,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: ND.display,
            clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
            boxShadow: `0 0 8px ${race.glow}66`,
          }}
          aria-hidden
        >
          {selectedCount}
        </div>
        <span
          style={{
            fontSize: 10,
            color: ND.textDim,
            whiteSpace: 'nowrap',
            fontFamily: ND.mono,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          seçildi
        </span>
      </div>

      {/* Divider */}
      <div
        aria-hidden
        style={{ width: 1, height: 24, background: ND.border, flexShrink: 0 }}
      />

      {/* Actions */}
      {hasClaimable && (
        <ActionButton
          icon="📥"
          label="Talep Et"
          color={ND.warn}
          onClick={onClaimSelected}
        />
      )}
      <ActionButton
        icon="👁"
        label="Okundu"
        color={race.primary}
        onClick={onMarkRead}
      />
      <ActionButton
        icon="🗑"
        label="Sil"
        color={ND.danger}
        onClick={onDeleteSelected}
        dangerous
      />

      <div style={{ flex: 1 }} />

      {/* Cancel */}
      <button
        onClick={onCancel}
        aria-label="Seçimi iptal et"
        style={{
          padding: '7px 12px',
          border: `1px solid ${ND.border}`,
          background: 'transparent',
          color: ND.textDim,
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          fontFamily: ND.display,
          transition: 'color 0.2s, border-color 0.2s',
          flexShrink: 0,
          clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
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
  onClick: () => void
  dangerous?: boolean
}

function ActionButton({ icon, label, color, onClick, dangerous = false }: ActionButtonProps) {
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
        border: `1px solid ${hovered ? color : ND.border}`,
        background: hovered ? `${color}1f` : ND.surface,
        color: hovered ? color : ND.text,
        cursor: 'pointer',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        fontFamily: ND.display,
        transition: 'all 0.25s cubic-bezier(0.32,0.72,0,1)',
        boxShadow: hovered ? `0 0 12px ${color}55` : 'none',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        flexShrink: 0,
        clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
      }}
    >
      <span style={{ fontSize: 13 }} aria-hidden>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
