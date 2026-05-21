'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { RACE_CATALOGS, FILTER_KEYS, FILTER_LABELS } from './data';
import type { BuildItem, FilterKey } from './data';
import './build-menu.css';

const SIGIL_LETTER: Record<string, string> = {
  insan:   'İ',
  zerg:    'Z',
  otomat:  'O',
  canavar: 'C',
  seytan:  'Ş',
};

export function BuildMenu() {
  const { race, meta } = useRaceTheme();
  const catalog = RACE_CATALOGS[race];

  const [activeTab, setActiveTab] = useState(0);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(catalog.items[0]?.id ?? null);

  // Filter counts reflect items in the active tab so the pill badges match
  // what the grid will actually show. Globally-relevant counts (KİLİT,
  // İNŞADA) live in the header chips instead.
  const counts = useMemo(() => {
    const inTab    = catalog.items.filter((b) => b.category === activeTab);
    const open     = inTab.filter((b) => !b.locked && b.state !== 'building').length;
    const locked   = inTab.filter((b) => b.locked).length;
    const building = inTab.filter((b) => b.state === 'building').length;
    return { all: inTab.length, open, locked, building };
  }, [catalog, activeTab]);

  const globalCounts = useMemo(() => ({
    locked:   catalog.items.filter((b) => b.locked).length,
    building: catalog.items.filter((b) => b.state === 'building').length,
  }), [catalog]);

  const visible = useMemo(() => {
    const inTab = catalog.items.filter((b) => b.category === activeTab);
    switch (filter) {
      case 'open':     return inTab.filter((b) => !b.locked && b.state !== 'building');
      case 'locked':   return inTab.filter((b) => b.locked);
      case 'building': return inTab.filter((b) => b.state === 'building');
      default:         return inTab;
    }
  }, [catalog, activeTab, filter]);

  const selected = selectedId
    ? catalog.items.find((b) => b.id === selectedId) ?? null
    : null;

  const ctaState = resolveCtaState(selected, catalog.actionVerb);

  return (
    <div className="build-menu" data-race={meta.dataRace}>
      <div className="bm-ground-layer" aria-hidden />
      <div className="bm-ambient-glow" aria-hidden />
      <div className="bm-sigil-watermark" aria-hidden />

      <div className="bm-shell">
        <header className="bm-header">
          <Link href="/base" className="bm-back-link" aria-label="Ana Üs'e dön">
            ← Ana Üs
          </Link>
          <span className="bm-divider" aria-hidden />
          <span className="bm-sigil" aria-hidden>{SIGIL_LETTER[meta.dataRace] ?? meta.icon}</span>
          <h1 className="bm-title">{catalog.title}</h1>

          <div className="bm-header-spacer" aria-hidden />

          {globalCounts.building > 0 && (
            <span className="bm-header-chip is-accent" aria-label={`İnşada ${globalCounts.building}`}>
              ⟳ {globalCounts.building} İNŞADA
            </span>
          )}
          {globalCounts.locked > 0 && (
            <span className="bm-header-chip" aria-label={`Kilitli ${globalCounts.locked}`}>
              {globalCounts.locked} KİLİT
            </span>
          )}
        </header>

        <nav className="bm-tabs" aria-label="Bina kategorisi">
          <div className="bm-tabs-row" role="tablist">
            {catalog.tabs.map((label, i) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={i === activeTab}
                className={clsx('bm-tab', i === activeTab && 'is-active')}
                onClick={() => setActiveTab(i)}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>

        <div className="bm-filters" role="group" aria-label="Filtre">
          {FILTER_KEYS.map((key) => {
            const on = key === filter;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={on}
                className={clsx('bm-filter', on && 'is-on')}
              >
                {FILTER_LABELS[key]}
                <span className="bm-filter-count">· {counts[key]}</span>
              </button>
            );
          })}
        </div>

        <div className="bm-catalog">
          <div className="bm-grid">
            {visible.length === 0 && (
              <div className="bm-empty">Bu filtreyle uyumlu yapı yok.</div>
            )}
            {visible.map((item) => (
              <BuildCard
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                resourceALabel={catalog.resourceA.name}
                resourceBLabel={catalog.resourceB.name}
                onSelect={() => !item.locked && setSelectedId(item.id)}
              />
            ))}
          </div>
        </div>

        <div className="bm-action">
          {selected ? (
            <>
              <div className="bm-action-info">
                <div className="bm-action-name">{selected.name}</div>
                <div className="bm-action-cost">
                  <CostChip
                    amount={selected.costA}
                    label={catalog.resourceA.name}
                    accent="a"
                  />
                  <CostChip
                    amount={selected.costB}
                    label={catalog.resourceB.name}
                    accent="b"
                  />
                  <span aria-hidden>·</span>
                  <span>{formatDuration(selected.durationSeconds)}</span>
                </div>
              </div>
              <button type="button" className="bm-action-secondary">
                Detay
              </button>
              <button
                type="button"
                className="bm-action-cta"
                disabled={ctaState.disabled}
                aria-label={ctaState.aria}
              >
                {ctaState.label}
              </button>
            </>
          ) : (
            <div className="bm-action-empty">Bir yapı seç…</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface BuildCardProps {
  item: BuildItem;
  selected: boolean;
  resourceALabel: string;
  resourceBLabel: string;
  onSelect: () => void;
}

function BuildCard({ item, selected, resourceALabel, resourceBLabel, onSelect }: BuildCardProps) {
  const maxed = item.level >= item.maxLevel && item.maxLevel > 0;
  return (
    <button
      type="button"
      className={clsx(
        'bm-card',
        selected && 'is-selected',
        item.locked && 'is-locked',
        maxed && 'is-maxed',
      )}
      onClick={onSelect}
      aria-pressed={selected}
      aria-disabled={item.locked || undefined}
      disabled={item.locked}
    >
      <div className="bm-card-head">
        <div className="bm-card-icon" aria-hidden>
          {item.thumbnail ? (
            <Image src={item.thumbnail} alt="" width={56} height={56} unoptimized />
          ) : null}
          <span className={clsx('bm-card-icon-glyph', item.thumbnail && 'has-thumb')}>
            {item.glyph}
          </span>
          <span className="bm-card-icon-level">Lv.{item.level}</span>
        </div>
        <div className="bm-card-body">
          <div className="bm-card-name">{item.name}</div>
          <div className="bm-card-desc">{item.description}</div>
          <div className="bm-card-tags">
            <span className="bm-tag">{item.level}/{item.maxLevel}</span>
            {item.locked && <span className="bm-tag is-locked">KİLİT</span>}
            {item.state === 'building' && <span className="bm-tag is-building">İNŞADA</span>}
          </div>
        </div>
      </div>

      {item.state === 'building' && typeof item.progress === 'number' ? (
        <>
          <div
            className="bm-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(item.progress * 100)}
          >
            <div
              className="bm-progress-fill"
              style={{ ['--bm-progress' as string]: `${Math.round(item.progress * 100)}%` }}
            />
          </div>
          <div className="bm-progress-meta">
            <span>İlerleme</span>
            <span className="bm-progress-percent">%{Math.round(item.progress * 100)}</span>
            <span>{formatDuration(item.durationSeconds * (1 - item.progress))}</span>
          </div>
        </>
      ) : item.locked ? (
        <div className="bm-lock-hint">
          {item.unlockHint ? `Açılış · ${item.unlockHint}` : 'Açılış · ön koşul gerekli'}
        </div>
      ) : (
        <div className="bm-card-meta">
          <span
            className="bm-cost"
            aria-label={`${item.costA} ${resourceALabel}`}
          >
            <span className="bm-res-dot" aria-hidden />
            {formatNumber(item.costA)}
          </span>
          <span
            className="bm-cost"
            aria-label={`${item.costB} ${resourceBLabel}`}
          >
            <span className="bm-res-dot is-b" aria-hidden />
            {formatNumber(item.costB)}
          </span>
          <span className="bm-duration">{formatDuration(item.durationSeconds)}</span>
        </div>
      )}
    </button>
  );
}

function CostChip({
  amount,
  label,
  accent,
}: {
  amount: number;
  label: string;
  accent: 'a' | 'b';
}) {
  return (
    <span className="bm-cost" aria-label={`${amount} ${label}`}>
      <span className={clsx('bm-res-dot', accent === 'b' && 'is-b')} aria-hidden />
      {formatNumber(amount)}
    </span>
  );
}

function resolveCtaState(selected: BuildItem | null, actionVerb: string) {
  if (!selected) {
    return { label: actionVerb.toUpperCase(), disabled: true, aria: 'Bir yapı seç' };
  }
  if (selected.locked) {
    return { label: 'KİLİTLİ', disabled: true, aria: `${selected.name} kilitli` };
  }
  if (selected.state === 'building') {
    return { label: 'İNŞADA', disabled: true, aria: `${selected.name} şu an inşada` };
  }
  if (selected.level >= selected.maxLevel) {
    return { label: 'MAKSİMUM', disabled: true, aria: `${selected.name} maksimum seviyede` };
  }
  const label = `${actionVerb} Başlat`.toUpperCase();
  return { label, disabled: false, aria: `${actionVerb} başlat: ${selected.name}` };
}

function formatNumber(n: number): string {
  return n.toLocaleString('tr-TR');
}

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}
