'use client'

import { useState, useEffect } from 'react'
import { Caption, Chip, Eyebrow, NDButton, Panel, ND, type NDRace } from '@/components/handoff'
import type { Mail } from './types'
import { MailTypeIcon, getMailTypeConfig } from './MailTypeIcon'

interface MailDetailProps {
  mail: Mail
  race: NDRace
  onClose?: () => void
  onClaim: (mailId: string) => void
  onDelete: (mailId: string) => void
  claimedIds: Set<string>
}

const TYPE_LABELS: Record<string, string> = {
  system: 'Sistem Mesajı',
  battle_report: 'Savaş Raporu',
  guild: 'Lonca Mesajı',
  event: 'Etkinlik',
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

export function MailDetail({ mail, race, onClose, onClaim, onDelete, claimedIds }: MailDetailProps) {
  const config = getMailTypeConfig(mail.type, race)
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
      {/* Header */}
      <div
        style={{
          padding: '18px 22px 16px',
          borderBottom: `1px solid ${ND.border}`,
          background: `linear-gradient(135deg, ${config.color}14 0%, ${ND.surface} 70%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Scan-line decorative overlay */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-linear-gradient(
              -60deg,
              transparent,
              transparent 22px,
              ${config.color}06 22px,
              ${config.color}06 23px
            )`,
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <MailTypeIcon type={mail.type} size="lg" animated race={race} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow color={config.color}>{TYPE_LABELS[mail.type]}</Eyebrow>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: ND.text,
                fontFamily: ND.display,
                lineHeight: 1.25,
                margin: '4px 0 6px',
                textTransform: 'uppercase',
              }}
            >
              {mail.title}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: ND.textMute, fontFamily: ND.mono, letterSpacing: '0.04em' }}>
                <span style={{ color: ND.textDim }}>{mail.sender}</span>
              </span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: ND.borderHi }} aria-hidden />
              <span style={{ fontSize: 11, color: ND.textMute, fontFamily: ND.mono, letterSpacing: '0.04em' }}>
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
                width: 32,
                height: 32,
                border: `1px solid ${ND.border}`,
                background: ND.surface,
                color: ND.textDim,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                flexShrink: 0,
                transition: 'background 0.2s, color 0.2s',
                fontFamily: ND.display,
                clipPath:
                  'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
        <Panel
          race={race}
          style={{
            padding: '16px 18px',
            marginBottom: 18,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Corner accents */}
          <svg
            aria-hidden
            style={{ position: 'absolute', top: 0, left: 0 }}
            width="14" height="14" viewBox="0 0 14 14"
          >
            <path d="M0 0 L14 0 L0 14 Z" fill={`${config.color}20`} />
          </svg>
          <svg
            aria-hidden
            style={{ position: 'absolute', bottom: 0, right: 0 }}
            width="14" height="14" viewBox="0 0 14 14"
          >
            <path d="M14 14 L0 14 L14 0 Z" fill={`${config.color}20`} />
          </svg>

          <p
            style={{
              fontSize: 13,
              lineHeight: 1.7,
              color: ND.textDim,
              fontFamily: ND.body,
              margin: 0,
            }}
          >
            {mail.body}
          </p>
        </Panel>

        {/* Rewards section */}
        {hasRewards && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  flex: 1,
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${ND.warn}66)`,
                }}
              />
              <Eyebrow color={ND.warn}>EKLİ ÖDÜLLER</Eyebrow>
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  flex: 1,
                  height: 1,
                  background: `linear-gradient(270deg, transparent, ${ND.warn}66)`,
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: 10,
                marginBottom: 18,
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
              gap: 8,
              padding: '10px 12px',
              background: `${ND.warn}10`,
              border: `1px solid ${ND.warn}55`,
              marginBottom: 12,
              clipPath:
                'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
            }}
          >
            <span style={{ fontSize: 13 }} aria-hidden>⏳</span>
            <span style={{ fontSize: 11, color: ND.warn, fontFamily: ND.mono, letterSpacing: '0.06em' }}>
              Son talep: {formatDate(mail.expiresAt)}
            </span>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div
        style={{
          padding: '14px 22px 18px',
          borderTop: `1px solid ${ND.border}`,
          background: ND.surface,
          display: 'flex',
          gap: 10,
        }}
      >
        {hasRewards && (
          <NDButton
            race={race}
            variant={isClaimed ? 'ghost' : 'primary'}
            size="md"
            full
            disabled={isClaimed || claimAnim}
            onClick={handleClaim}
            icon={<span aria-hidden>{isClaimed ? '✓' : claimAnim ? '✨' : '📥'}</span>}
          >
            {isClaimed ? 'Talep Edildi' : claimAnim ? 'Talep Ediliyor…' : 'Ödülleri Talep Et'}
          </NDButton>
        )}
        <NDButton
          race={race}
          variant="danger"
          size="md"
          onClick={() => onDelete(mail.id)}
          icon={<span aria-hidden>🗑</span>}
        >
          Sil
        </NDButton>
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
        padding: '12px 8px',
        background: claimed
          ? ND.surface
          : animating
            ? `${ND.warn}26`
            : `linear-gradient(135deg, ${ND.warn}12 0%, ${ND.surface} 100%)`,
        border: `1px solid ${claimed ? ND.border : ND.warn + '55'}`,
        clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        opacity: claimed ? 0.5 : 1,
        transition: `all 0.4s cubic-bezier(0.32,0.72,0,1) ${index * 60}ms`,
        transform: animating ? 'scale(1.06)' : 'scale(1)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: claimed ? 'none' : `0 0 12px ${ND.warn}22`,
      }}
    >
      {animating && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at center, ${ND.warn}55 0%, transparent 70%)`,
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
          fontWeight: 700,
          color: claimed ? ND.textMute : ND.warn,
          fontFamily: ND.display,
          letterSpacing: '0.04em',
        }}
      >
        {reward.amount.toLocaleString('tr-TR')}
      </span>
      <span
        style={{
          fontSize: 9,
          color: ND.textMute,
          textAlign: 'center',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          fontFamily: ND.mono,
        }}
      >
        {reward.label}
      </span>
      {claimed && (
        <div
          style={{
            position: 'absolute',
            top: 5,
            right: 6,
            fontSize: 10,
            color: ND.ok,
            fontWeight: 800,
            letterSpacing: '0.06em',
          }}
        >
          ✓
        </div>
      )}
    </div>
  )
}
