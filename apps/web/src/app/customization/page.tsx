'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  CosmeticItem,
  CosmeticCategory,
  RARITY_META,
} from '@/types/cosmetics';
import {
  fetchCosmetics,
  fetchBalance,
  equipCosmetic,
  purchaseCosmetic,
  newIdempotencyKey,
} from '@/lib/cosmetics-api';

// ─── Category metadata ────────────────────────────────────────────────────────
const CATEGORIES: { id: CosmeticCategory; label: string; icon: string }[] = [
  { id: 'skin',   label: 'Skinler',    icon: '⚔️' },
  { id: 'frame',  label: 'Çerçeveler', icon: '🖼️' },
  { id: 'title',  label: 'Unvanlar',   icon: '🎖️' },
  { id: 'effect', label: 'Efektler',   icon: '✨' },
];

// ─── Shared color tokens (match design system) ────────────────────────────────
const TOKEN = {
  bg:          'var(--color-bg,          #080a10)',
  bgSurface:   'var(--color-bg-surface,  #0d1117)',
  bgElevated:  'var(--color-bg-elevated, #141d2b)',
  textPrimary: 'var(--color-text-primary,   #e8e8f0)',
  textSecondary:'var(--color-text-secondary, #a0a8c0)',
  textMuted:   'var(--color-text-muted,    #555d7a)',
  border:      'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  brand:       'var(--color-brand,      #4a9eff)',
  brandDim:    'var(--color-brand-dim,  rgba(74,158,255,0.12))',
  brandGlow:   'var(--color-brand-glow, rgba(74,158,255,0.35))',
  energy:      'var(--color-energy,     #ffc832)',
  energyDim:   'var(--color-energy-dim, rgba(255,200,50,0.12))',
  success:     'var(--color-success,    #44ff88)',
  danger:      'var(--color-danger,     #ff4a6e)',
  dangerDim:   'rgba(255,74,110,0.12)',
};

// ─── Toast types ──────────────────────────────────────────────────────────────
type ToastKind = 'success' | 'error';
interface ToastState { id: number; kind: ToastKind; message: string }

// ─── CosmeticCard component ───────────────────────────────────────────────────
function CosmeticCard({
  item,
  selected,
  onSelect,
  pending,
}: {
  item: CosmeticItem;
  selected: boolean;
  onSelect: (item: CosmeticItem) => void;
  pending?: boolean;
}) {
  const rarity = RARITY_META[item.rarity];
  const isLocked = !item.isOwned;

  return (
    <button
      onClick={() => onSelect(item)}
      aria-pressed={selected}
      aria-busy={pending || undefined}
      aria-label={`${item.name}${isLocked ? ' (kilitli)' : item.isEquipped ? ' (giyili)' : ''}`}
      style={{
        position: 'relative',
        background: selected
          ? `linear-gradient(135deg, ${item.rarityColor}18 0%, ${TOKEN.bgSurface} 100%)`
          : TOKEN.bgSurface,
        border: `1px solid ${selected ? item.rarityColor : TOKEN.border}`,
        borderRadius: 12,
        padding: 0,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.32,0.72,0,1)',
        boxShadow: selected
          ? `0 0 18px ${item.rarityGlow}, 0 4px 20px rgba(0,0,0,0.4)`
          : '0 2px 12px rgba(0,0,0,0.3)',
        filter: isLocked ? 'grayscale(0.65)' : 'none',
        opacity: isLocked ? 0.72 : 1,
        textAlign: 'left',
      }}
    >
      {/* Rarity top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: isLocked ? 'rgba(255,255,255,0.08)' : rarity.color,
          opacity: isLocked ? 1 : 0.9,
        }}
      />

      {/* Icon / preview area */}
      <div
        style={{
          position: 'relative',
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isLocked
            ? 'rgba(0,0,0,0.3)'
            : `radial-gradient(circle at 50% 60%, ${item.rarityGlow} 0%, transparent 70%)`,
          fontSize: 32,
        }}
      >
        {item.previewImage ? (
          <Image
            src={item.previewImage}
            alt={item.name}
            fill
            style={{ objectFit: 'cover', objectPosition: 'top' }}
            sizes="150px"
          />
        ) : (
          <span role="img" aria-hidden>{item.icon}</span>
        )}

        {/* Equipped badge */}
        {item.isEquipped && !isLocked && (
          <span
            style={{
              position: 'absolute',
              top: 6, right: 6,
              width: 20, height: 20,
              borderRadius: '50%',
              background: TOKEN.success,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#080a10', fontWeight: 800,
              boxShadow: `0 0 8px ${TOKEN.success}`,
            }}
            aria-label="Giyili"
          >
            ✓
          </span>
        )}

        {/* Pending overlay */}
        {pending && (
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(8,10,16,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-hidden
          >
            <span
              style={{
                width: 16, height: 16,
                border: '2px solid rgba(255,255,255,0.25)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          </div>
        )}

        {/* Selected glow ring */}
        {selected && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 11,
              boxShadow: `inset 0 0 0 2px ${item.rarityColor}`,
              pointerEvents: 'none',
            }}
            aria-hidden
          />
        )}

        {/* Lock overlay */}
        {isLocked && !pending && (
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4,
            }}
            aria-hidden
          >
            <span style={{ fontSize: 20 }}>🔒</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '8px 10px 10px' }}>
        <p
          style={{
            fontFamily: 'var(--font-display, Orbitron, system-ui)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: isLocked ? TOKEN.textMuted : TOKEN.textPrimary,
            marginBottom: 4,
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.name}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Rarity label */}
          <span
            style={{
              fontSize: 9,
              fontFamily: 'var(--font-display, Orbitron, system-ui)',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: isLocked ? TOKEN.textMuted : rarity.color,
            }}
          >
            {rarity.label}
          </span>

          {/* Price or owned badge */}
          {isLocked && item.price ? (
            <span
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 10, fontWeight: 700,
                color: TOKEN.energy,
                fontFamily: 'var(--font-display, Orbitron, system-ui)',
              }}
            >
              💎 {item.price}
            </span>
          ) : !isLocked && !item.isEquipped ? (
            <span
              style={{
                fontSize: 9, color: TOKEN.textMuted,
                fontFamily: 'var(--font-display, Orbitron, system-ui)',
              }}
            >
              SAHİP
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        background: TOKEN.bgSurface,
        border: `1px solid ${TOKEN.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        height: 132,
      }}
      aria-hidden
    >
      <div
        style={{
          height: 80,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s linear infinite',
        }}
      />
      <div style={{ padding: '8px 10px 10px' }}>
        <div
          style={{
            height: 10,
            width: '70%',
            borderRadius: 4,
            background: 'rgba(255,255,255,0.08)',
            marginBottom: 6,
          }}
        />
        <div
          style={{
            height: 8,
            width: '40%',
            borderRadius: 4,
            background: 'rgba(255,255,255,0.05)',
          }}
        />
      </div>
    </div>
  );
}

// ─── Skeleton preview ─────────────────────────────────────────────────────────
function SkeletonPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-hidden>
      <div
        style={{
          paddingBottom: 12,
          borderBottom: `1px solid ${TOKEN.border}`,
          height: 24,
        }}
      />
      <div
        style={{
          aspectRatio: '3/4',
          borderRadius: 16,
          border: `1px solid ${TOKEN.border}`,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s linear infinite',
        }}
      />
      <div
        style={{
          height: 84,
          borderRadius: 12,
          background: TOKEN.bgElevated,
          border: `1px solid ${TOKEN.border}`,
        }}
      />
    </div>
  );
}

// ─── PreviewPanel component ───────────────────────────────────────────────────
function PreviewPanel({
  item,
  equippedItems,
  onApply,
  onPurchase,
  applying,
  purchasing,
  justApplied,
  balance,
}: {
  item: CosmeticItem | null;
  equippedItems: Record<CosmeticCategory, CosmeticItem | undefined>;
  onApply: () => void;
  onPurchase: () => void;
  applying: boolean;
  purchasing: boolean;
  justApplied: boolean;
  balance: number | null;
}) {
  const equippedSkin   = equippedItems['skin'];
  const equippedFrame  = equippedItems['frame'];
  const equippedTitle  = equippedItems['title'];
  const equippedEffect = equippedItems['effect'];

  const isAlreadyEquipped = item?.isEquipped;
  const insufficientFunds =
    item && !item.isOwned && typeof item.price === 'number' && balance !== null && balance < item.price;

  return (
    <aside
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
      aria-label="Önizleme paneli"
    >
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 12,
          borderBottom: `1px solid ${TOKEN.border}`,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display, Orbitron, system-ui)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: TOKEN.textMuted,
          }}
        >
          Önizleme
        </span>
        {item && (
          <span
            style={{
              fontSize: 9,
              fontFamily: 'var(--font-display, Orbitron, system-ui)',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: RARITY_META[item.rarity].color,
              background: `${RARITY_META[item.rarity].glow}`,
              padding: '2px 8px',
              borderRadius: 20,
              border: `1px solid ${RARITY_META[item.rarity].border}`,
            }}
          >
            {RARITY_META[item.rarity].label}
          </span>
        )}
      </div>

      {/* Character preview area */}
      <div
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          background: `radial-gradient(ellipse 80% 70% at 50% 30%,
            ${TOKEN.brandDim} 0%,
            ${TOKEN.bgSurface} 65%)`,
          border: `1px solid ${TOKEN.border}`,
          aspectRatio: '3/4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Halftone texture */}
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '6px 6px',
            pointerEvents: 'none',
          }}
          aria-hidden
        />

        {/* Speed line corners */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, pointerEvents: 'none' }}
          viewBox="0 0 40 40" fill="none" aria-hidden
        >
          <path d="M0 0 L40 0 L0 40 Z" fill="rgba(255,255,255,0.02)" />
          <path d="M0 0 L20 0" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
          <path d="M0 0 L0 20" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
        </svg>
        <svg
          style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, pointerEvents: 'none', transform: 'scaleX(-1)' }}
          viewBox="0 0 40 40" fill="none" aria-hidden
        >
          <path d="M0 0 L40 0 L0 40 Z" fill="rgba(255,255,255,0.02)" />
          <path d="M0 0 L20 0" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
          <path d="M0 0 L0 20" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
        </svg>

        {/* Commander portrait */}
        <div
          style={{
            position: 'relative',
            width: '75%',
            aspectRatio: '1/1',
            borderRadius: '50%',
            overflow: 'hidden',
            border: item
              ? `2px solid ${item.rarityColor}`
              : `2px solid ${TOKEN.border}`,
            boxShadow: item
              ? `0 0 32px ${item.rarityGlow}, 0 0 64px ${item.rarityGlow}80`
              : `0 0 20px rgba(0,0,0,0.5)`,
            transition: 'all 0.5s cubic-bezier(0.32,0.72,0,1)',
          }}
        >
          {equippedSkin?.previewImage ? (
            <Image
              src={equippedSkin.previewImage}
              alt="Komutan görünümü"
              fill
              style={{ objectFit: 'cover', objectPosition: 'top' }}
              sizes="200px"
            />
          ) : (
            <div
              style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48,
                background: TOKEN.bgElevated,
              }}
            >
              {equippedSkin?.icon ?? '⚔️'}
            </div>
          )}

          {/* Frame overlay ring */}
          {equippedFrame && equippedFrame.id !== 'frame-default' && (
            <div
              style={{
                position: 'absolute', inset: -4,
                borderRadius: '50%',
                border: `4px solid ${equippedFrame.rarityColor}`,
                boxShadow: `0 0 16px ${equippedFrame.rarityGlow}, inset 0 0 16px ${equippedFrame.rarityGlow}`,
                pointerEvents: 'none',
                animation: 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
              }}
              aria-hidden
            />
          )}
        </div>

        {/* Effect particles (decorative) */}
        {equippedEffect && equippedEffect.id !== 'effect-none' && (
          <>
            {['10%,20%', '85%,15%', '5%,75%', '90%,70%', '50%,88%'].map((pos, i) => {
              const [left, top] = pos.split(',');
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left, top,
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: equippedEffect.rarityColor,
                    boxShadow: `0 0 8px ${equippedEffect.rarityGlow}`,
                    animation: `float ${3 + i * 0.4}s ease-in-out infinite`,
                    animationDelay: `${i * 0.6}s`,
                  }}
                  aria-hidden
                />
              );
            })}
          </>
        )}

        {/* Apply flash animation overlay */}
        {justApplied && (
          <div
            style={{
              position: 'absolute', inset: 0,
              borderRadius: 16,
              background: `radial-gradient(circle, ${item?.rarityColor ?? TOKEN.brand}44 0%, transparent 70%)`,
              animation: 'applyFlash 0.6s cubic-bezier(0.32,0.72,0,1) forwards',
              pointerEvents: 'none',
            }}
            aria-hidden
          />
        )}
      </div>

      {/* Selected item title display (when in title tab) */}
      {equippedTitle && equippedTitle.id !== 'title-default' && (
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-display, Orbitron, system-ui)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              color: equippedTitle.rarityColor,
              background: `${equippedTitle.rarityGlow}`,
              padding: '4px 14px',
              borderRadius: 20,
              border: `1px solid ${equippedTitle.rarityColor}50`,
            }}
          >
            {equippedTitle.icon} {equippedTitle.name}
          </span>
        </div>
      )}

      {/* Selected item info */}
      {item ? (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: TOKEN.bgElevated,
            border: `1px solid ${TOKEN.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 24 }}>{item.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  fontFamily: 'var(--font-display, Orbitron, system-ui)',
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: item.rarityColor,
                  marginBottom: 4,
                }}
              >
                {item.name}
              </h3>
              <p
                style={{
                  fontSize: 12,
                  color: TOKEN.textSecondary,
                  lineHeight: 1.5,
                  fontFamily: 'var(--font-body, Rajdhani, system-ui)',
                }}
              >
                {item.description}
              </p>
            </div>
          </div>

          {/* Price or status */}
          {!item.isOwned && item.price && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 8,
                background: insufficientFunds ? TOKEN.dangerDim : TOKEN.energyDim,
                border: `1px solid ${insufficientFunds ? `${TOKEN.danger}40` : 'rgba(255,200,50,0.2)'}`,
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 16 }}>💎</span>
              <span
                style={{
                  fontFamily: 'var(--font-display, Orbitron, system-ui)',
                  fontSize: 14,
                  fontWeight: 800,
                  color: insufficientFunds ? TOKEN.danger : TOKEN.energy,
                }}
              >
                {item.price}
              </span>
              <span style={{ fontSize: 11, color: insufficientFunds ? TOKEN.danger : TOKEN.textMuted, marginLeft: 'auto' }}>
                {insufficientFunds ? 'Yetersiz bakiye' : 'Gem gerekli'}
              </span>
            </div>
          )}

          {/* Apply / Buy / Equipped button */}
          {isAlreadyEquipped ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 9999,
                background: `${TOKEN.success}18`,
                border: `1px solid ${TOKEN.success}40`,
                color: TOKEN.success,
                fontFamily: 'var(--font-display, Orbitron, system-ui)',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
              }}
              role="status"
            >
              <span>✓</span>
              <span>Giyili</span>
            </div>
          ) : item.isOwned ? (
            <button
              onClick={onApply}
              disabled={applying}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '13px 24px',
                borderRadius: 9999,
                background: applying ? `${item.rarityColor}aa` : item.rarityColor,
                border: 'none',
                cursor: applying ? 'wait' : 'pointer',
                color: '#080a10',
                fontFamily: 'var(--font-display, Orbitron, system-ui)',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                transition: 'all 0.3s cubic-bezier(0.32,0.72,0,1)',
                boxShadow: applying
                  ? 'none'
                  : `0 4px 20px ${item.rarityGlow}, 0 0 0 1px ${item.rarityColor}40`,
                transform: applying ? 'scale(0.97)' : 'scale(1)',
              }}
              aria-busy={applying}
            >
              {applying ? (
                <>
                  <span
                    style={{
                      width: 14, height: 14,
                      border: '2px solid rgba(0,0,0,0.3)',
                      borderTopColor: '#080a10',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }}
                    aria-hidden
                  />
                  <span>Uygulanıyor…</span>
                </>
              ) : (
                <>
                  <span>Uygula</span>
                  <span
                    style={{
                      width: 22, height: 22,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.2)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
                    }}
                    aria-hidden
                  >
                    ✦
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onPurchase}
              disabled={purchasing || insufficientFunds || balance === null}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '13px 24px',
                borderRadius: 9999,
                background: TOKEN.energyDim,
                border: `1px solid ${TOKEN.energy}40`,
                cursor: purchasing
                  ? 'wait'
                  : insufficientFunds || balance === null
                  ? 'not-allowed'
                  : 'pointer',
                color: TOKEN.energy,
                fontFamily: 'var(--font-display, Orbitron, system-ui)',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                transition: 'all 0.3s cubic-bezier(0.32,0.72,0,1)',
                opacity: insufficientFunds || balance === null ? 0.55 : 1,
              }}
              aria-busy={purchasing}
            >
              {purchasing ? (
                <>
                  <span
                    style={{
                      width: 14, height: 14,
                      border: `2px solid ${TOKEN.energy}40`,
                      borderTopColor: TOKEN.energy,
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }}
                    aria-hidden
                  />
                  <span>Satın alınıyor…</span>
                </>
              ) : (
                <>
                  <span>💎</span>
                  <span>
                    {insufficientFunds ? 'Yetersiz Bakiye' : `Satın Al — ${item.price} Gem`}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: 20,
            borderRadius: 12,
            background: TOKEN.bgElevated,
            border: `1px solid ${TOKEN.border}`,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display, Orbitron, system-ui)',
              fontSize: 11,
              color: TOKEN.textMuted,
              letterSpacing: '0.08em',
            }}
          >
            Bir item seç
          </p>
        </div>
      )}

      {/* Currently equipped summary */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: 12,
          background: TOKEN.bgSurface,
          border: `1px solid ${TOKEN.border}`,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-display, Orbitron, system-ui)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase' as const,
            color: TOKEN.textMuted,
            marginBottom: 10,
          }}
        >
          Aktif Set
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {CATEGORIES.map((cat) => {
            const equipped = equippedItems[cat.id];
            return (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 8,
                  background: TOKEN.bgElevated,
                  border: `1px solid ${TOKEN.border}`,
                }}
              >
                <span style={{ fontSize: 14 }}>{cat.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 9,
                      color: TOKEN.textMuted,
                      fontFamily: 'var(--font-display, Orbitron, system-ui)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    {cat.label}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: equipped ? TOKEN.textPrimary : TOKEN.textMuted,
                      fontFamily: 'var(--font-body, Rajdhani, system-ui)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {equipped?.name ?? '—'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ─── Toast viewport ───────────────────────────────────────────────────────────
function ToastViewport({ toasts, onDismiss }: { toasts: ToastState[]; onDismiss: (id: number) => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 100,
        maxWidth: 420,
        width: 'calc(100% - 32px)',
        pointerEvents: 'none',
      }}
      role="region"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const isError = t.kind === 'error';
        return (
          <div
            key={t.id}
            role={isError ? 'alert' : 'status'}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 12,
              background: isError ? TOKEN.dangerDim : `${TOKEN.success}18`,
              border: `1px solid ${isError ? TOKEN.danger : TOKEN.success}55`,
              color: isError ? TOKEN.danger : TOKEN.success,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              fontFamily: 'var(--font-body, Rajdhani, system-ui)',
              fontSize: 13,
              fontWeight: 600,
              animation: 'fadeSlideUp 0.3s cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            <span style={{ fontSize: 16 }}>{isError ? '⚠️' : '✓'}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Kapat"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: 14,
                opacity: 0.7,
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CustomizationPage() {
  const [activeCategory, setActiveCategory] = useState<CosmeticCategory>('skin');
  const [selectedItem, setSelectedItem]     = useState<CosmeticItem | null>(null);
  const [applying, setApplying]             = useState(false);
  const [purchasing, setPurchasing]         = useState(false);
  const [justApplied, setJustApplied]       = useState(false);

  const [cosmetics, setCosmetics]           = useState<CosmeticItem[] | null>(null);
  const [balance, setBalance]               = useState<number | null>(null);
  const [loadError, setLoadError]           = useState<string | null>(null);
  const [toasts, setToasts]                 = useState<ToastState[]>([]);
  const [pendingItemId, setPendingItemId]   = useState<string | null>(null);

  const toastIdRef = useRef(0);

  const pushToast = useCallback((kind: ToastKind, message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [items, gems] = await Promise.all([fetchCosmetics(), fetchBalance()]);
        if (cancelled) return;
        setCosmetics(items);
        setBalance(gems);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Veri yüklenemedi';
        setLoadError(msg);
        pushToast('error', msg);
      }
    })();
    return () => { cancelled = true; };
  }, [pushToast]);

  // Re-sync the selected item with the latest cosmetics list (post-update).
  useEffect(() => {
    if (!selectedItem || !cosmetics) return;
    const fresh = cosmetics.find((c) => c.id === selectedItem.id);
    if (fresh && fresh !== selectedItem) setSelectedItem(fresh);
  }, [cosmetics, selectedItem]);

  const filteredItems = (cosmetics ?? []).filter((c) => c.category === activeCategory);

  const equippedItems = Object.fromEntries(
    CATEGORIES.map((cat) => [
      cat.id,
      (cosmetics ?? []).find((c) => c.category === cat.id && c.isEquipped),
    ])
  ) as Record<CosmeticCategory, CosmeticItem | undefined>;

  const handleApply = useCallback(async () => {
    if (!selectedItem || !selectedItem.isOwned || selectedItem.isEquipped || !cosmetics) return;
    if (applying) return;

    const target = selectedItem;
    const previous = cosmetics;

    // Optimistic update: equip target, unequip others in same category.
    const optimistic = cosmetics.map((c) => {
      if (c.category === target.category) {
        return { ...c, isEquipped: c.id === target.id };
      }
      return c;
    });

    setApplying(true);
    setPendingItemId(target.id);
    setCosmetics(optimistic);

    try {
      await equipCosmetic(target.id);
      setJustApplied(true);
      setTimeout(() => setJustApplied(false), 800);
    } catch (e) {
      setCosmetics(previous);
      const msg = e instanceof Error ? e.message : 'Giydirme başarısız';
      pushToast('error', msg);
    } finally {
      setApplying(false);
      setPendingItemId(null);
    }
  }, [selectedItem, cosmetics, applying, pushToast]);

  const handlePurchase = useCallback(async () => {
    if (!selectedItem || selectedItem.isOwned || !cosmetics) return;
    if (purchasing) return;
    if (balance === null) return;

    const price = selectedItem.price;
    if (typeof price !== 'number') return;

    if (balance < price) {
      pushToast('error', 'Yetersiz gem bakiyesi');
      return;
    }

    const target = selectedItem;
    const previousCosmetics = cosmetics;
    const previousBalance = balance;

    // Optimistic: subtract price, mark owned.
    const optimisticCosmetics = cosmetics.map((c) =>
      c.id === target.id ? { ...c, isOwned: true } : c,
    );
    const optimisticBalance = balance - price;

    setPurchasing(true);
    setPendingItemId(target.id);
    setCosmetics(optimisticCosmetics);
    setBalance(optimisticBalance);

    try {
      const { newBalance } = await purchaseCosmetic(target.id, newIdempotencyKey());
      setBalance(newBalance);
      pushToast('success', `${target.name} satın alındı`);
    } catch (e) {
      setCosmetics(previousCosmetics);
      setBalance(previousBalance);
      const msg = e instanceof Error ? e.message : 'Satın alma başarısız';
      pushToast('error', msg);
    } finally {
      setPurchasing(false);
      setPendingItemId(null);
    }
  }, [selectedItem, cosmetics, balance, purchasing, pushToast]);

  const isLoading = cosmetics === null || balance === null;

  return (
    <>
      {/* ── Keyframe animations injected via style tag ─────────────────── */}
      <style>{`
        @keyframes applyFlash {
          0%   { opacity: 0; transform: scale(0.8); }
          40%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0; transform: scale(1.2); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .cosmetic-card-hover:hover {
          transform: translateY(-4px) !important;
          border-color: rgba(255,255,255,0.18) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
        }
        .cosmetic-card-hover:active {
          transform: scale(0.97) !important;
        }
        .apply-btn-hover:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.01) !important;
        }
        .apply-btn-hover:active:not(:disabled) {
          transform: scale(0.97) !important;
        }
      `}</style>

      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          background: TOKEN.bg,
        }}
      >
        {/* ── Background nebula gradient ────────────────────────────── */}
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'var(--gradient-nebula, radial-gradient(ellipse 80% 60% at 50% 0%, rgba(74,158,255,0.08) 0%, #080a10 70%))',
            pointerEvents: 'none',
            zIndex: 0,
          }}
          aria-hidden
        />
        <div
          style={{
            position: 'fixed', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '6px 6px',
            pointerEvents: 'none',
            zIndex: 0,
          }}
          aria-hidden
        />

        {/* ── Top bar ───────────────────────────────────────────────── */}
        <header
          style={{
            position: 'sticky', top: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(8,10,16,0.88)',
            borderBottom: `1px solid ${TOKEN.border}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href="/"
              style={{
                fontFamily: 'var(--font-display, Orbitron, system-ui)',
                fontSize: 11,
                color: TOKEN.textMuted,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'color 0.2s',
                letterSpacing: '0.06em',
              }}
            >
              ← Geri
            </Link>

            <div
              style={{
                width: 1, height: 16,
                background: TOKEN.border,
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '2px 10px',
                  borderRadius: 20,
                  fontSize: 9,
                  fontFamily: 'var(--font-display, Orbitron, system-ui)',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: TOKEN.brand,
                  background: TOKEN.brandDim,
                  border: `1px solid ${TOKEN.brandGlow}`,
                }}
              >
                Kozmetik
              </span>
              <h1
                style={{
                  fontFamily: 'var(--font-display, Orbitron, system-ui)',
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  color: TOKEN.textPrimary,
                }}
              >
                Kişiselleştirme
              </h1>
            </div>
          </div>

          {/* Gem balance */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px',
              borderRadius: 9999,
              background: TOKEN.energyDim,
              border: `1px solid rgba(255,200,50,0.2)`,
              minWidth: 88,
              justifyContent: 'center',
            }}
            aria-live="polite"
            aria-label="Gem bakiyesi"
          >
            <span style={{ fontSize: 14 }}>💎</span>
            {balance === null ? (
              <span
                style={{
                  display: 'inline-block',
                  width: 44,
                  height: 12,
                  borderRadius: 4,
                  background: 'rgba(255,200,50,0.18)',
                  animation: 'shimmer 1.4s linear infinite',
                  backgroundSize: '200% 100%',
                  backgroundImage:
                    'linear-gradient(90deg, rgba(255,200,50,0.10), rgba(255,200,50,0.30), rgba(255,200,50,0.10))',
                }}
                aria-label="Bakiye yükleniyor"
              />
            ) : (
              <span
                style={{
                  fontFamily: 'var(--font-display, Orbitron, system-ui)',
                  fontSize: 13,
                  fontWeight: 800,
                  color: TOKEN.energy,
                }}
              >
                {balance.toLocaleString('tr-TR')}
              </span>
            )}
          </div>
        </header>

        {/* ── Main layout ───────────────────────────────────────────── */}
        <main
          style={{
            position: 'relative', zIndex: 10,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            maxWidth: 1280,
            width: '100%',
            margin: '0 auto',
            padding: '0 0 80px',
          }}
        >
          {/* ── Category tab bar ──────────────────────────────────── */}
          <nav
            style={{
              display: 'flex',
              gap: 8,
              padding: '12px 16px',
              overflowX: 'auto',
              borderBottom: `1px solid ${TOKEN.border}`,
              scrollbarWidth: 'none',
            }}
            aria-label="Kozmetik kategorileri"
          >
            {CATEGORIES.map((cat) => {
              const active = cat.id === activeCategory;
              const equippedInCat = (cosmetics ?? []).find(
                (c) => c.category === cat.id && c.isEquipped
              );
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setSelectedItem(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 18px',
                    borderRadius: 9999,
                    border: `1px solid ${active ? TOKEN.brand : TOKEN.border}`,
                    background: active ? TOKEN.brandDim : 'rgba(255,255,255,0.02)',
                    color: active ? TOKEN.brand : TOKEN.textSecondary,
                    fontFamily: 'var(--font-display, Orbitron, system-ui)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.25s cubic-bezier(0.32,0.72,0,1)',
                    boxShadow: active ? `0 0 12px ${TOKEN.brandGlow}` : 'none',
                    flexShrink: 0,
                  }}
                  aria-pressed={active}
                >
                  <span style={{ fontSize: 14 }}>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {/* Active item dot indicator */}
                  {equippedInCat && equippedInCat.id !== `${cat.id}-default` && (
                    <span
                      style={{
                        width: 6, height: 6,
                        borderRadius: '50%',
                        background: TOKEN.success,
                        flexShrink: 0,
                      }}
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* ── Content: grid + preview ───────────────────────────── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            {/* Mobile: preview panel at top when item is selected */}
            <div
              style={{
                display: 'block',
                padding: '16px 16px 0',
              }}
              className="lg-hide"
            >
              {selectedItem && !isLoading && (
                <div
                  style={{
                    marginBottom: 16,
                    animation: 'fadeSlideUp 0.35s cubic-bezier(0.32,0.72,0,1)',
                  }}
                >
                  <PreviewPanel
                    item={selectedItem}
                    equippedItems={equippedItems}
                    onApply={handleApply}
                    onPurchase={handlePurchase}
                    applying={applying}
                    purchasing={purchasing}
                    justApplied={justApplied}
                    balance={balance}
                  />
                </div>
              )}
            </div>

            {/* Desktop two-column layout */}
            <div
              style={{
                display: 'flex',
                gap: 0,
                flex: 1,
              }}
            >
              {/* ── Card grid ─────────────────────────────────────── */}
              <div
                style={{
                  flex: 1,
                  padding: 16,
                  overflowY: 'auto',
                  minWidth: 0,
                }}
              >
                {/* Category label */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontSize: 18 }}>
                    {CATEGORIES.find((c) => c.id === activeCategory)?.icon}
                  </span>
                  <h2
                    style={{
                      fontFamily: 'var(--font-display, Orbitron, system-ui)',
                      fontSize: 13,
                      fontWeight: 900,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                      color: TOKEN.textPrimary,
                    }}
                  >
                    {CATEGORIES.find((c) => c.id === activeCategory)?.label}
                  </h2>
                  <div
                    style={{
                      flex: 1, height: 1,
                      background: `linear-gradient(90deg, ${TOKEN.borderHover}, transparent)`,
                    }}
                  />
                  {!isLoading && (
                    <span
                      style={{
                        fontSize: 10,
                        color: TOKEN.textMuted,
                        fontFamily: 'var(--font-display, Orbitron, system-ui)',
                      }}
                    >
                      {filteredItems.filter((i) => i.isOwned).length}/{filteredItems.length} Sahip
                    </span>
                  )}
                </div>

                {/* Grid */}
                {isLoading ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: 12,
                    }}
                    role="status"
                    aria-label="Kozmetikler yükleniyor"
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                ) : loadError && filteredItems.length === 0 ? (
                  <div
                    role="alert"
                    style={{
                      padding: 24,
                      borderRadius: 12,
                      background: TOKEN.dangerDim,
                      border: `1px solid ${TOKEN.danger}40`,
                      color: TOKEN.danger,
                      textAlign: 'center',
                      fontFamily: 'var(--font-body, Rajdhani, system-ui)',
                      fontSize: 13,
                    }}
                  >
                    <p style={{ fontWeight: 700, marginBottom: 6 }}>Yüklenemedi</p>
                    <p style={{ opacity: 0.85 }}>{loadError}</p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {filteredItems.map((item, i) => (
                      <div
                        key={item.id}
                        className="cosmetic-card-hover"
                        style={{
                          animation: `fadeSlideUp 0.4s cubic-bezier(0.32,0.72,0,1) ${i * 0.05}s both`,
                        }}
                      >
                        <CosmeticCard
                          item={item}
                          selected={selectedItem?.id === item.id}
                          onSelect={setSelectedItem}
                          pending={pendingItemId === item.id}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Preview panel (desktop sticky sidebar) ────────── */}
              <aside
                style={{
                  width: 300,
                  flexShrink: 0,
                  padding: 16,
                  borderLeft: `1px solid ${TOKEN.border}`,
                  position: 'sticky',
                  top: 56,
                  alignSelf: 'flex-start',
                  maxHeight: 'calc(100dvh - 56px)',
                  overflowY: 'auto',
                }}
                aria-label="Seçili item önizlemesi"
              >
                {isLoading ? (
                  <SkeletonPreview />
                ) : (
                  <PreviewPanel
                    item={selectedItem}
                    equippedItems={equippedItems}
                    onApply={handleApply}
                    onPurchase={handlePurchase}
                    applying={applying}
                    purchasing={purchasing}
                    justApplied={justApplied}
                    balance={balance}
                  />
                )}
              </aside>
            </div>
          </div>
        </main>

        {/* ── Toasts ────────────────────────────────────────────────── */}
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />

        {/* ── Bottom navigation ─────────────────────────────────────── */}
        <nav
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            display: 'flex',
            background: 'rgba(8,10,16,0.95)',
            borderTop: `1px solid ${TOKEN.border}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 50,
            padding: '6px 0',
          }}
          aria-label="Alt navigasyon"
        >
          {[
            { href: '/',              icon: '🏠', label: 'Üs'       },
            { href: '/commanders',    icon: '👤', label: 'Komutanlar' },
            { href: '/customization', icon: '🎨', label: 'Kozmetik', active: true },
            { href: '/progression',   icon: '⬆️', label: 'İlerleme' },
            { href: '/dashboard',     icon: '⚙️', label: 'Ayarlar'  },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '6px 4px',
                textDecoration: 'none',
                color: item.active ? TOKEN.brand : TOKEN.textMuted,
                transition: 'color 0.2s',
              }}
              aria-current={item.active ? 'page' : undefined}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span
                style={{
                  fontSize: 9,
                  fontFamily: 'var(--font-display, Orbitron, system-ui)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase' as const,
                }}
              >
                {item.label}
              </span>
              {item.active && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    width: 24, height: 2,
                    borderRadius: 1,
                    background: TOKEN.brand,
                    boxShadow: `0 0 8px ${TOKEN.brandGlow}`,
                  }}
                  aria-hidden
                />
              )}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
