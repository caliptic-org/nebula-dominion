'use client'

import { useState, useEffect } from 'react'
import type { Mail } from './types'
import { MailTypeIcon, getMailTypeConfig } from './MailTypeIcon'

interface MailDetailProps {
  mail: Mail
  onClose?: () => void
  onClaim: (mailId: string) => void
  onDelete: (mailId: string) => void
  claimedIds: Set<string>
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MailDetail({ mail, onClose, onClaim, onDelete, claimedIds }: MailDetailProps) {
  const config = getMailTypeConfig(mail.type)
  const isClaimed = claimedIds.has(mail.id)
  const hasRewards = Boolean(mail.rewards?.length)
  const [claimAnim, setClaimAnim] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [mail.id])

  function handleClaim() {
    if (isClaimed) return
    setClaimAnim(true)
    setTimeout(() => {
      onClaim(mail.id)
      setClaimAnim(false)
    }, 700)
  }

  const TYPE_LABELS: Record<string, string> = {
    system: 'Sistem Mesajı',
    battle_report: 'Savaş Raporu',
    guild: 'Lonca Mesajı',
    event: 'Etkinlik',
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.35s cubic-bezier(0.32,0.72,0,1), transform 0.35s cubic-bezier(0.32,0.72,0,1)',
      }}
    >
      {/* Header panel */}
      <div
        style={{
          padding: '20px 24px 18px',
          borderBottom: '1px solid var(--color-border)',
          background: `linear-gradient(135deg, ${config.color}12 0%, var(--color-bg-surface) 60%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Manga speed-lines (decorative, pointer-events: none) */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-linear-gradient(
              -60deg,
              transparent,
              transparent 18px,
              ${config.color}06 18px,
              ${config.color}06 19px
            )`,
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <MailTypeIcon type={mail.type} size="lg" animated />

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Type eyebrow badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 10px',
                borderRadius: 20,
                background: `${config.color}18`,
                border: `1px solid ${config.color}33`,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: config.color,
                  fontFamily: 'var(--font-display)',
                }}
              >
                {TYPE_LABELS[mail.type]}
              </span>
            </div>

            <h2
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: '0.03em',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-display)',
                lineHeight: 1.3,
                marginBottom: 4,
              }}
            >
              {mail.title}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                Gönderen: <span style={{ color: 'var(--color-text-secondary)' }}>{mail.sender}</span>
              </span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--color-border-hover)' }} aria-hidden />
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {formatDate(mail.sentAt)}
              </span>
            </div>
          </div>

          {/* Close (mobile) */}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Kapat"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {/* Manga panel styled body */}
        <div
          className="manga-panel"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '18px 20px',
            marginBottom: 20,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Corner accent SVGs */}
          <svg
            aria-hidden
            style={{ position: 'absolute', top: 0, left: 0 }}
            width="18" height="18" viewBox="0 0 18 18"
          >
            <path d="M0 0 L18 0 L0 18 Z" fill={`${config.color}18`} />
          </svg>
          <svg
            aria-hidden
            style={{ position: 'absolute', bottom: 0, right: 0 }}
            width="18" height="18" viewBox="0 0 18 18"
          >
            <path d="M18 18 L0 18 L18 0 Z" fill={`${config.color}18`} />
          </svg>

          <p
            style={{
              fontSize: 13.5,
              lineHeight: 1.75,
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {mail.body}
          </p>
        </div>

        {/* Rewards section */}
        {hasRewards && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--color-energy)',
                marginBottom: 12,
                fontFamily: 'var(--font-display)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 24,
                  height: 1,
                  background: 'linear-gradient(90deg, var(--color-energy)88, transparent)',
                }}
              />
              Ekli Ödüller
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 24,
                  height: 1,
                  background: 'linear-gradient(270deg, var(--color-energy)88, transparent)',
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: 10,
                marginBottom: 20,
              }}
            >
              {mail.rewards!.map((reward, i) => (
                <RewardCard
                  key={i}
                  reward={reward}
                  index={i}
                  claimed={isClaimed}
                  animating={claimAnim}
                />
              ))}
            </div>
          </div>
        )}

        {/* Expiry notice */}
        {mail.expiresAt && !isClaimed && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(255,170,34,0.08)',
              border: '1px solid rgba(255,170,34,0.25)',
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 13 }} aria-hidden>⏳</span>
            <span style={{ fontSize: 11, color: 'var(--color-warning)' }}>
              Son talep tarihi: {formatDate(mail.expiresAt)}
            </span>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div
        style={{
          padding: '14px 24px 20px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg-surface)',
          display: 'flex',
          gap: 10,
        }}
      >
        {hasRewards && (
          <ClaimButton
            claimed={isClaimed}
            animating={claimAnim}
            accentColor={config.color}
            glowColor={config.glow ?? config.color}
            onClick={handleClaim}
          />
        )}
        <button
          onClick={() => onDelete(mail.id)}
          aria-label="Postayı sil"
          style={{
            flex: hasRewards ? '0 0 auto' : 1,
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'border-color 0.2s, color 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-danger)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'
          }}
        >
          <span aria-hidden>🗑</span>
          Sil
        </button>
      </div>
    </div>
  )
}

interface RewardCardProps {
  reward: { type: string; label: string; amount: number; icon: string }
  index: number
  claimed: boolean
  animating: boolean
}

function RewardCard({ reward, index, claimed, animating }: RewardCardProps) {
  return (
    <div
      style={{
        padding: '12px 10px',
        borderRadius: 10,
        background: claimed
          ? 'var(--color-bg-surface)'
          : animating
          ? 'rgba(255,200,50,0.18)'
          : 'linear-gradient(135deg, rgba(255,200,50,0.1) 0%, var(--color-bg-elevated) 100%)',
        border: `1px solid ${claimed ? 'var(--color-border)' : 'rgba(255,200,50,0.3)'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        opacity: claimed ? 0.45 : 1,
        transition: `all 0.4s cubic-bezier(0.32,0.72,0,1) ${index * 60}ms`,
        transform: animating ? 'scale(1.08)' : 'scale(1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {animating && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(255,200,50,0.4) 0%, transparent 70%)',
            animation: 'glow-pulse 0.7s ease-out forwards',
          }}
        />
      )}
      <span style={{ fontSize: 22, filter: claimed ? 'grayscale(1)' : 'none' }} aria-hidden>
        {reward.icon}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: claimed ? 'var(--color-text-muted)' : 'var(--color-energy)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.03em',
        }}
      >
        {reward.amount.toLocaleString()}
      </span>
      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', letterSpacing: '0.03em' }}>
        {reward.label}
      </span>
      {claimed && (
        <div
          style={{
            position: 'absolute',
            top: 5,
            right: 6,
            fontSize: 9,
            color: 'var(--color-success)',
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          ✓
        </div>
      )}
    </div>
  )
}

interface ClaimButtonProps {
  claimed: boolean
  animating: boolean
  accentColor: string
  glowColor: string
  onClick: () => void
}

function ClaimButton({ claimed, animating, accentColor, glowColor, onClick }: ClaimButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      disabled={claimed || animating}
      aria-label={claimed ? 'Ödüller talep edildi' : 'Ödülleri talep et'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        padding: '10px 20px',
        borderRadius: 8,
        border: `1px solid ${claimed ? 'var(--color-border)' : accentColor + '88'}`,
        background: claimed
          ? 'var(--color-bg-elevated)'
          : animating
          ? `linear-gradient(135deg, ${accentColor}55, ${accentColor}22)`
          : hovered
          ? `linear-gradient(135deg, ${accentColor}44, ${accentColor}18)`
          : `linear-gradient(135deg, ${accentColor}28, var(--color-bg-elevated))`,
        color: claimed ? 'var(--color-text-muted)' : accentColor,
        cursor: claimed ? 'default' : 'pointer',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.06em',
        fontFamily: 'var(--font-display)',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        boxShadow: claimed ? 'none' : hovered ? `0 0 18px ${glowColor}` : `0 0 8px ${glowColor}55`,
        transition: 'all 0.35s cubic-bezier(0.32,0.72,0,1)',
        transform: animating ? 'scale(0.98)' : hovered ? 'scale(1.01)' : 'scale(1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {animating && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at center, ${accentColor}66 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}
      <span aria-hidden style={{ fontSize: 14 }}>{claimed ? '✓' : animating ? '✨' : '📥'}</span>
      {claimed ? 'Talep Edildi' : animating ? 'Talep Ediliyor…' : 'Ödülleri Talep Et'}
    </button>
  )
}
