'use client';

import { useEffect, useMemo, useState } from 'react';
import { GlowButton } from '@/components/ui/GlowButton';
import {
  GuildSummary,
  LANGUAGE_LABEL,
  SUPPORTED_LANGUAGES,
  TIER_LABEL,
} from '@/types/guild';
import { guildApi } from '@/lib/guildApi';
import { useDebounce } from '@/hooks/useDebounce';
import { GuildCrest } from './GuildCrest';
import { GuildBadge } from './GuildBadge';

interface GuildSearchPanelProps {
  onJoin: (guild: GuildSummary) => void;
  isJoining?: string | null;
}

export function GuildSearchPanel({ onJoin, isJoining }: GuildSearchPanelProps) {
  const [tag, setTag] = useState('');
  const [language, setLanguage] = useState<string>('');
  const [minSize, setMinSize] = useState<string>('');
  const [results, setResults] = useState<GuildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const debouncedTag = useDebounce(tag, 300);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    guildApi
      .search({
        tag: debouncedTag,
        language,
        minSize: minSize ? Number(minSize) : null,
      })
      .then((res) => {
        if (!cancelled) setResults(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedTag, language, minSize]);

  const helpText = useMemo(() => {
    if (loading) return 'Loncalar aranıyor…';
    if (results.length === 0) return 'Filtreyle eşleşen lonca yok. Filtreyi değiştir veya yeni lonca kur.';
    return `${results.length} lonca bulundu`;
  }, [loading, results.length]);

  return (
    <section aria-labelledby="search-heading" className="space-y-4">
      <div>
        <h2 id="search-heading" className="font-display text-sm font-bold tracking-widest uppercase text-text-secondary mb-2">
          Lonca Ara
        </h2>
        <p className="text-text-muted text-xs">
          Tag, dil veya üye sayısına göre filtrele. Listede görünmek için lonca aktif olmalı.
        </p>
      </div>

      <div className="guild-filter-bar">
        <label className="block">
          <span className="form-label">Tag veya isim</span>
          <input
            className="form-input"
            placeholder="örn. NOVA"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            aria-label="Tag veya isimle ara"
          />
        </label>
        <label className="block">
          <span className="form-label">Dil</span>
          <select
            className="form-input"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Dile göre filtrele"
          >
            <option value="">Tümü</option>
            {SUPPORTED_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {LANGUAGE_LABEL[code]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="form-label">Min. üye</span>
          <select
            className="form-input"
            value={minSize}
            onChange={(e) => setMinSize(e.target.value)}
            aria-label="Minimum üye sayısı"
          >
            <option value="">Hepsi</option>
            <option value="10">10+</option>
            <option value="25">25+ (Tier 2)</option>
            <option value="35">35+ (Tier 3)</option>
            <option value="50">50+ (Tier 4)</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            className="btn-ghost w-full sm:w-auto"
            onClick={() => {
              setTag('');
              setLanguage('');
              setMinSize('');
            }}
            aria-label="Filtreleri temizle"
          >
            Sıfırla
          </button>
        </div>
      </div>

      <p className="text-text-muted text-xs" role="status" aria-live="polite" aria-atomic="true">
        {helpText}
      </p>

      <ul className="grid gap-3" aria-label="Lonca sonuçları">
        {results.map((g) => (
          <li
            key={g.id}
            className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <GuildCrest race={g.race} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-display text-base font-bold text-text-primary">
                  {g.name}
                </h3>
                <span className="badge badge-race">[{g.tag}]</span>
                <span className="badge badge-brand">{LANGUAGE_LABEL[g.language as keyof typeof LANGUAGE_LABEL] ?? g.language}</span>
                {g.isChampion && <span className="badge badge-energy">⭐ Şampiyon</span>}
              </div>
              <p className="text-text-secondary text-sm mb-2 line-clamp-2">{g.description}</p>
              <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                <span>👥 {g.memberCount}/{g.capacity}</span>
                <span>🏷 {TIER_LABEL[g.tier]}</span>
                {g.weeklyRank !== null && <span>📈 Haftalık #{g.weeklyRank}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GuildBadge kind="tier" tier={g.tier} />
              <GlowButton
                size="sm"
                onClick={() => onJoin(g)}
                loading={isJoining === g.id}
                disabled={g.memberCount >= g.capacity}
              >
                {g.memberCount >= g.capacity ? 'Dolu' : 'Katıl'}
              </GlowButton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
