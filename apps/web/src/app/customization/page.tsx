'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Caption,
  Chip,
  Code,
  Eyebrow,
  H3,
  ND,
  NDButton,
  NebulaBg,
  Panel,
  RaceTabs,
  ResIcon,
  ResPill,
  Sigil,
  useNDRace,
  type NDRace,
} from '@/components/handoff';
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
} from '@/lib/cosmetics-api';

/* ── Category metadata ────────────────────────────────────────────────── */

const CATEGORIES: { id: CosmeticCategory; label: string; icon: string }[] = [
  { id: 'skin',   label: 'Skinler',    icon: '⚔' },
  { id: 'frame',  label: 'Çerçeveler', icon: '◇' },
  { id: 'title',  label: 'Unvanlar',   icon: '✦' },
  { id: 'effect', label: 'Efektler',   icon: '✺' },
];

const DEFAULT_ITEM_NAMES: Record<CosmeticCategory, string> = {
  skin:   'Standart Zırh',
  frame:  'Standart Çerçeve',
  title:  'Komutan',
  effect: 'Efekt Yok',
};

function isDefaultItem(item: CosmeticItem): boolean {
  return DEFAULT_ITEM_NAMES[item.category] === item.name;
}

/* ── Toasts ───────────────────────────────────────────────────────────── */

type ToastKind = 'success' | 'error';
interface ToastState { id: number; kind: ToastKind; message: string }

/* ── CosmeticCard ─────────────────────────────────────────────────────── */

function CosmeticCard({
  item,
  selected,
  onSelect,
  pending,
  race,
}: {
  item: CosmeticItem;
  selected: boolean;
  onSelect: (item: CosmeticItem) => void;
  pending?: boolean;
  race: NDRace;
}) {
  const rarity = RARITY_META[item.rarity];
  const isLocked = !item.isOwned;
  const accent = isLocked ? ND.textMute : rarity.color;
  const ring = selected ? race.primary : `${accent}55`;
  const glow = selected ? race.glow : rarity.glow;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      aria-pressed={selected}
      aria-busy={pending || undefined}
      aria-label={`${item.name}${isLocked ? ' (kilitli)' : item.isEquipped ? ' (giyili)' : ''}`}
      className="nd-cosmetic-card"
      style={{
        all: 'unset',
        position: 'relative',
        display: 'block',
        cursor: 'pointer',
        background: selected
          ? `linear-gradient(135deg, ${race.primary}1a 0%, ${ND.surface} 70%)`
          : ND.surface,
        border: `1px solid ${ring}`,
        boxShadow: selected
          ? `0 0 0 1px ${race.primary}66, 0 0 22px -4px ${glow}`
          : `0 2px 12px rgba(0,0,0,0.25)`,
        clipPath:
          'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
        overflow: 'hidden',
        filter: isLocked ? 'grayscale(0.65)' : 'none',
        opacity: isLocked ? 0.78 : 1,
        transition: 'all 250ms cubic-bezier(0.32,0.72,0,1)',
      }}
    >
      {/* Rarity top accent bar */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: isLocked ? `${ND.border}` : rarity.color,
          opacity: 0.9,
        }}
      />

      {/* Preview area */}
      <div
        style={{
          position: 'relative',
          height: 84,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isLocked
            ? ND.bgDeep
            : `radial-gradient(ellipse 70% 65% at 50% 55%, ${rarity.glow} 0%, transparent 70%), ${ND.bgDeep}`,
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
          <span aria-hidden>{item.icon}</span>
        )}

        {/* Equipped marker */}
        {item.isEquipped && !isLocked && (
          <span
            style={{
              position: 'absolute',
              top: 6, right: 6,
              padding: '2px 6px',
              fontFamily: ND.mono,
              fontSize: 8,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              background: `${ND.ok}22`,
              color: ND.ok,
              border: `1px solid ${ND.ok}55`,
              backdropFilter: 'blur(4px)',
            }}
            aria-label="Giyili"
          >
            ◉ GİYİLİ
          </span>
        )}

        {/* Pending spinner */}
        {pending && (
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(6,8,15,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                width: 16, height: 16,
                border: `2px solid ${race.primary}33`,
                borderTopColor: race.primary,
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          </div>
        )}

        {/* Selected inner ring */}
        {selected && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              boxShadow: `inset 0 0 0 2px ${race.primary}`,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Lock overlay */}
        {isLocked && !pending && (
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(3,5,11,0.30) 0%, rgba(3,5,11,0.82) 100%)',
              display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <LockIcon color={ND.warn} size={22} />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '8px 10px 10px' }}>
        <div
          style={{
            fontFamily: ND.display,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: isLocked ? ND.textMute : ND.text,
            marginBottom: 4,
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontFamily: ND.mono,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: isLocked ? ND.textMute : rarity.color,
            }}
          >
            {rarity.label}
          </span>

          {isLocked && item.price ? (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontFamily: ND.mono,
                fontSize: 10,
                fontWeight: 700,
                color: ND.warn,
              }}
            >
              <ResIcon kind="crystal" size={10} color={ND.warn} />
              {item.price}
            </span>
          ) : !isLocked && !item.isEquipped ? (
            <span
              style={{
                fontFamily: ND.mono,
                fontSize: 9,
                letterSpacing: '0.14em',
                color: ND.textMute,
                textTransform: 'uppercase',
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

/* ── Skeletons ────────────────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div
      aria-hidden
      style={{
        background: ND.surface,
        border: `1px solid ${ND.border}`,
        clipPath:
          'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
        overflow: 'hidden',
        height: 134,
      }}
    >
      <div
        style={{
          height: 84,
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(120,160,220,0.10), rgba(255,255,255,0.02))',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s linear infinite',
        }}
      />
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{ height: 10, width: '72%', background: 'rgba(255,255,255,0.08)', marginBottom: 6 }} />
        <div style={{ height: 8, width: '40%', background: 'rgba(255,255,255,0.05)' }} />
      </div>
    </div>
  );
}

function SkeletonPreview() {
  return (
    <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ height: 16, background: ND.surface, border: `1px solid ${ND.border}` }} />
      <div
        style={{
          aspectRatio: '3/4',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(120,160,220,0.10), rgba(255,255,255,0.02))',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s linear infinite',
          border: `1px solid ${ND.border}`,
        }}
      />
      <div style={{ height: 80, background: ND.surface, border: `1px solid ${ND.border}` }} />
    </div>
  );
}

/* ── PreviewPanel ─────────────────────────────────────────────────────── */

function PreviewPanel({
  item,
  equippedItems,
  onApply,
  onPurchase,
  applying,
  purchasing,
  justApplied,
  balance,
  race,
}: {
  item: CosmeticItem | null;
  equippedItems: Record<CosmeticCategory, CosmeticItem | undefined>;
  onApply: () => void;
  onPurchase: () => void;
  applying: boolean;
  purchasing: boolean;
  justApplied: boolean;
  balance: number | null;
  race: NDRace;
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
      aria-label="Önizleme paneli"
      style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}
    >
      {/* Header strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 10,
          borderBottom: `1px solid ${ND.border}`,
        }}
      >
        <Eyebrow color={race.primary}>ÖNİZLEME</Eyebrow>
        {item && (
          <Chip color={RARITY_META[item.rarity].color}>
            {RARITY_META[item.rarity].label}
          </Chip>
        )}
      </div>

      {/* Portrait panel */}
      <Panel
        race={race}
        glow
        style={{
          position: 'relative',
          aspectRatio: '3/4',
          overflow: 'hidden',
          padding: 0,
          background: `radial-gradient(ellipse 78% 65% at 50% 35%, ${race.glow}33 0%, ${ND.bgDeep} 70%)`,
        }}
      >
        {/* Halftone */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '6px 6px',
            pointerEvents: 'none',
          }}
        />

        {/* Speed line corners */}
        <svg
          aria-hidden
          style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, pointerEvents: 'none' }}
          viewBox="0 0 40 40" fill="none"
        >
          <path d="M0 0 L40 0 L0 40 Z" fill={`${race.primary}10`} />
          <path d="M0 0 L20 0" stroke={`${race.primary}55`} strokeWidth="2" />
          <path d="M0 0 L0 20" stroke={`${race.primary}55`} strokeWidth="2" />
        </svg>
        <svg
          aria-hidden
          style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, pointerEvents: 'none', transform: 'scaleX(-1)' }}
          viewBox="0 0 40 40" fill="none"
        >
          <path d="M0 0 L40 0 L0 40 Z" fill={`${race.primary}10`} />
          <path d="M0 0 L20 0" stroke={`${race.primary}55`} strokeWidth="2" />
          <path d="M0 0 L0 20" stroke={`${race.primary}55`} strokeWidth="2" />
        </svg>

        {/* Commander portrait */}
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '70%',
              aspectRatio: '1/1',
              borderRadius: '50%',
              overflow: 'hidden',
              border: item
                ? `2px solid ${item.rarityColor}`
                : `2px solid ${race.primary}66`,
              boxShadow: item
                ? `0 0 28px ${item.rarityGlow}, 0 0 56px ${item.rarityGlow}66`
                : `0 0 22px ${race.glow}55`,
              transition: 'all 500ms cubic-bezier(0.32,0.72,0,1)',
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
                  background: ND.surfaceSolid,
                }}
              >
                <Sigil race={race} size={88} glow />
              </div>
            )}

            {equippedFrame && !isDefaultItem(equippedFrame) && (
              <div
                aria-hidden
                style={{
                  position: 'absolute', inset: -4,
                  borderRadius: '50%',
                  border: `4px solid ${equippedFrame.rarityColor}`,
                  boxShadow: `0 0 16px ${equippedFrame.rarityGlow}, inset 0 0 16px ${equippedFrame.rarityGlow}`,
                  pointerEvents: 'none',
                  animation: 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
                }}
              />
            )}
          </div>
        </div>

        {/* Effect particles */}
        {equippedEffect && !isDefaultItem(equippedEffect) && (
          <>
            {['10%,20%', '85%,15%', '5%,75%', '90%,70%', '50%,88%'].map((pos, i) => {
              const [left, top] = pos.split(',');
              return (
                <div
                  key={i}
                  aria-hidden
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
                />
              );
            })}
          </>
        )}

        {/* Apply flash */}
        {justApplied && (
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(circle, ${item?.rarityColor ?? race.primary}55 0%, transparent 70%)`,
              animation: 'applyFlash 0.6s cubic-bezier(0.32,0.72,0,1) forwards',
              pointerEvents: 'none',
            }}
          />
        )}
      </Panel>

      {/* Equipped title chip */}
      {equippedTitle && !isDefaultItem(equippedTitle) && (
        <div style={{ textAlign: 'center' }}>
          <Chip color={equippedTitle.rarityColor}>
            {equippedTitle.name}
          </Chip>
        </div>
      )}

      {/* Selected item info card */}
      {item ? (
        <Panel style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden>{item.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Eyebrow color={item.rarityColor}>{RARITY_META[item.rarity].label}</Eyebrow>
              <H3 style={{ color: ND.text, marginTop: 4 }}>{item.name}</H3>
              <Caption style={{ marginTop: 6 }}>{item.description}</Caption>
            </div>
          </div>

          {/* Price row */}
          {!item.isOwned && typeof item.price === 'number' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: insufficientFunds ? `${ND.danger}15` : `${ND.warn}12`,
                border: `1px solid ${insufficientFunds ? `${ND.danger}55` : `${ND.warn}55`}`,
                marginBottom: 12,
              }}
            >
              <ResIcon kind="crystal" size={14} color={insufficientFunds ? ND.danger : ND.warn} />
              <span
                style={{
                  fontFamily: ND.display,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: insufficientFunds ? ND.danger : ND.warn,
                }}
              >
                {item.price}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: ND.mono,
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: insufficientFunds ? ND.danger : ND.textMute,
                }}
              >
                {insufficientFunds ? 'YETERSİZ BAKİYE' : 'GEM GEREKLİ'}
              </span>
            </div>
          )}

          {/* Action */}
          {isAlreadyEquipped ? (
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 40,
                padding: '0 16px',
                background: `${ND.ok}14`,
                border: `1px solid ${ND.ok}55`,
                color: ND.ok,
                fontFamily: ND.display,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                clipPath:
                  'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
              }}
            >
              ◉ Giyili
            </div>
          ) : item.isOwned ? (
            <NDButton
              race={race}
              variant="primary"
              size="md"
              full
              disabled={applying}
              onClick={onApply}
            >
              {applying ? 'UYGULANIYOR…' : 'UYGULA'}
            </NDButton>
          ) : (
            <NDButton
              race={race}
              variant="outline"
              size="md"
              full
              disabled={purchasing || insufficientFunds || balance === null}
              onClick={onPurchase}
              icon={<ResIcon kind="crystal" size={12} color={race.primary} />}
            >
              {purchasing
                ? 'SATIN ALINIYOR…'
                : insufficientFunds
                ? 'YETERSİZ BAKİYE'
                : `SATIN AL · ${item.price}`}
            </NDButton>
          )}
        </Panel>
      ) : (
        <Panel style={{ padding: 20, textAlign: 'center' }}>
          <Caption>Bir item seç</Caption>
        </Panel>
      )}

      {/* Active set */}
      <Panel style={{ padding: 14 }}>
        <Eyebrow color={race.primary}>AKTİF SET</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
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
                  background: ND.surfaceHi,
                  border: `1px solid ${ND.border}`,
                }}
              >
                <span style={{ fontSize: 14 }} aria-hidden>{cat.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: ND.mono,
                      fontSize: 8,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: ND.textMute,
                    }}
                  >
                    {cat.label}
                  </div>
                  <div
                    style={{
                      fontFamily: ND.display,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      color: equipped ? ND.text : ND.textMute,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {equipped?.name ?? '—'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </aside>
  );
}

/* ── Toasts ───────────────────────────────────────────────────────────── */

function ToastViewport({ toasts, onDismiss }: { toasts: ToastState[]; onDismiss: (id: number) => void }) {
  return (
    <div
      role="region"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 24,
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
              background: isError ? `${ND.danger}18` : `${ND.ok}18`,
              border: `1px solid ${isError ? ND.danger : ND.ok}66`,
              color: isError ? ND.danger : ND.ok,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              fontFamily: ND.body,
              fontSize: 13,
              fontWeight: 600,
              animation: 'fadeSlideUp 0.3s cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            <span aria-hidden style={{ fontSize: 14 }}>{isError ? '⚠' : '◉'}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Kapat"
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 13,
                opacity: 0.7,
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

/* ── Lock icon ────────────────────────────────────────────────────────── */

function LockIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="3" y="10" width="16" height="10" rx="1" stroke={color} strokeWidth="1.5" />
      <path d="M7 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function CustomizationPage() {
  const race = useNDRace();

  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const activeCategory = CATEGORIES[activeCategoryIdx].id;

  const [selectedItem, setSelectedItem]   = useState<CosmeticItem | null>(null);
  const [applying, setApplying]           = useState(false);
  const [purchasing, setPurchasing]       = useState(false);
  const [justApplied, setJustApplied]     = useState(false);

  const [cosmetics, setCosmetics]         = useState<CosmeticItem[] | null>(null);
  const [balance, setBalance]             = useState<number | null>(null);
  const [loadError, setLoadError]         = useState<string | null>(null);
  const [toasts, setToasts]               = useState<ToastState[]>([]);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

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

    const optimisticCosmetics = cosmetics.map((c) =>
      c.id === target.id ? { ...c, isOwned: true } : c,
    );

    setPurchasing(true);
    setPendingItemId(target.id);
    setCosmetics(optimisticCosmetics);
    setBalance(balance - price);

    try {
      await purchaseCosmetic(target.id);
      const fresh = await fetchBalance();
      setBalance(fresh);
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
      <style>{`
        @keyframes applyFlash {
          0%   { opacity: 0; transform: scale(0.8); }
          40%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0; transform: scale(1.2); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 1;    }
        }
        @keyframes nd-blink {
          0%, 100% { opacity: 1;   }
          50%      { opacity: 0.3; }
        }
        .nd-cosmetic-card:hover {
          transform: translateY(-3px);
        }
        .nd-cosmetic-card:active {
          transform: scale(0.98);
        }
      `}</style>

      <div
        data-race={race.key}
        style={{
          position: 'relative',
          minHeight: '100dvh',
          background: ND.bg,
          color: ND.text,
          fontFamily: ND.body,
          overflow: 'hidden',
        }}
      >
        <NebulaBg race={race} intensity={0.85} dim={0.8} />

        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            background: `radial-gradient(ellipse 60% 40% at 50% 90%, ${race.glow}22 0%, transparent 65%)`,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
          {/* Header */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '12px 16px',
              background: 'rgba(6,8,15,0.92)',
              borderBottom: `1px solid ${ND.border}`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <Link
                href="/"
                style={{
                  fontFamily: ND.display,
                  fontSize: 11,
                  letterSpacing: '0.10em',
                  color: ND.textDim,
                  textDecoration: 'none',
                }}
              >
                ← ANA ÜS
              </Link>
              <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.12)' }} />
              <Chip color={race.primary}>KOZMETİK</Chip>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ResPill kind="crystal" value={balance === null ? '—' : balance.toLocaleString('tr-TR')} accent={ND.warn} />
              <Sigil race={race} size={20} />
            </div>
          </header>

          <main
            style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 1280,
              width: '100%',
              margin: '0 auto',
              padding: '0 0 32px',
            }}
          >
            {/* Tab row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 16px',
                borderBottom: `1px solid ${ND.border}`,
                background: 'rgba(8,10,16,0.55)',
              }}
            >
              <RaceTabs
                race={race}
                items={CATEGORIES.map((c) => c.label.toUpperCase())}
                active={activeCategoryIdx}
                onChange={(i) => {
                  setActiveCategoryIdx(i);
                  setSelectedItem(null);
                }}
              />
            </div>

            {/* Two-column body */}
            <div
              className="customization-layout"
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)',
              }}
            >
              {/* Card grid */}
              <section style={{ padding: '16px', minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <Sigil race={race} size={16} />
                  <H3 style={{ color: ND.text }}>
                    {CATEGORIES[activeCategoryIdx].label}
                  </H3>
                  <div
                    style={{
                      flex: 1, height: 1,
                      background: `linear-gradient(90deg, ${race.primary}66, transparent)`,
                    }}
                  />
                  {!isLoading && (
                    <Code style={{ color: race.primary }}>
                      {filteredItems.filter((i) => i.isOwned).length}/{filteredItems.length} SAHİP
                    </Code>
                  )}
                </div>

                {isLoading ? (
                  <div
                    role="status"
                    aria-label="Kozmetikler yükleniyor"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : loadError && filteredItems.length === 0 ? (
                  <Panel style={{ padding: 24, textAlign: 'center', borderColor: `${ND.danger}55` }}>
                    <Eyebrow color={ND.danger}>YÜKLENEMEDİ</Eyebrow>
                    <Caption style={{ marginTop: 6 }}>{loadError}</Caption>
                  </Panel>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {filteredItems.map((item, i) => (
                      <div
                        key={item.id}
                        style={{
                          animation: `fadeSlideUp 0.4s cubic-bezier(0.32,0.72,0,1) ${i * 0.04}s both`,
                        }}
                      >
                        <CosmeticCard
                          item={item}
                          selected={selectedItem?.id === item.id}
                          onSelect={setSelectedItem}
                          pending={pendingItemId === item.id}
                          race={race}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Preview aside */}
              <aside
                className="customization-aside"
                style={{
                  borderLeft: `1px solid ${ND.border}`,
                  background: `linear-gradient(180deg, ${race.primary}0d 0%, rgba(8,10,16,0.85) 50%)`,
                  padding: 16,
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
                    race={race}
                  />
                )}
              </aside>
            </div>
          </main>
        </div>

        <ToastViewport toasts={toasts} onDismiss={dismissToast} />

        <style jsx>{`
          @media (max-width: 768px) {
            :global([data-race]) .customization-layout {
              grid-template-columns: minmax(0, 1fr) !important;
            }
            :global([data-race]) .customization-aside {
              border-left: none !important;
              border-top: 1px solid ${ND.border};
              position: static !important;
              max-height: none !important;
            }
          }
        `}</style>
      </div>
    </>
  );
}
