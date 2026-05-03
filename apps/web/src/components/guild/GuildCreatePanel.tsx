'use client';

import { FormEvent, useState } from 'react';
import { GlowButton } from '@/components/ui/GlowButton';
import {
  GuildCreateInput,
  GuildSummary,
  LANGUAGE_LABEL,
  SUPPORTED_LANGUAGES,
} from '@/types/guild';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { guildApi } from '@/lib/guildApi';
import { GuildCrest } from './GuildCrest';

interface GuildCreatePanelProps {
  defaultRace: Race;
  onCreated: (guild: GuildSummary) => void;
  isAge3Veteran?: boolean;
}

const TAG_REGEX = /^[A-Z0-9]{3,5}$/;
const NAME_MIN = 3;
const NAME_MAX = 24;

export function GuildCreatePanel({ defaultRace, onCreated, isAge3Veteran = true }: GuildCreatePanelProps) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [language, setLanguage] = useState('tr');
  const [description, setDescription] = useState('');
  const [race, setRace] = useState<Race>(defaultRace);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tagUpper = tag.toUpperCase();
  const tagValid = TAG_REGEX.test(tagUpper);
  const nameValid = name.trim().length >= NAME_MIN && name.trim().length <= NAME_MAX;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nameValid) {
      setError(`İsim ${NAME_MIN}-${NAME_MAX} karakter olmalı.`);
      return;
    }
    if (!tagValid) {
      setError('Tag 3-5 karakter, büyük harf ve rakam.');
      return;
    }
    setSubmitting(true);
    try {
      const input: GuildCreateInput = {
        name: name.trim(),
        tag: tagUpper,
        language,
        description: description.trim(),
        race,
        isFreeTrial: isAge3Veteran,
      };
      const created = await guildApi.create(input);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lonca kurulamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="create-heading" className="space-y-4">
      <div>
        <h2 id="create-heading" className="font-display text-sm font-bold tracking-widest uppercase text-text-secondary mb-2">
          Yeni Lonca Kur
        </h2>
        <p className="text-text-muted text-xs">
          Lider olacaksın. Üye davet edebilir, görev oluşturabilir, raid başlatabilirsin.
        </p>
      </div>

      <div
        className={`glass-card p-4 flex items-center gap-4 ${isAge3Veteran ? '' : 'opacity-90'}`}
        role="note"
      >
        <span className="text-2xl" aria-hidden>{isAge3Veteran ? '🎁' : '💎'}</span>
        <div className="flex-1 text-sm">
          {isAge3Veteran ? (
            <>
              <strong className="text-text-primary">Çağ 3 oyuncusuna ücretsiz</strong>
              <span className="text-text-secondary"> — ilk 30 gün boyunca lonca kurma ücreti yok.</span>
            </>
          ) : (
            <>
              <strong className="text-text-primary">500 Gem</strong>
              <span className="text-text-secondary"> kuruluş ücreti tahsil edilecek.</span>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-[1fr,200px]">
        <div className="space-y-3">
          <label className="block">
            <span className="form-label">Lonca İsmi</span>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              placeholder="örn. Nova Muhafızları"
              required
              aria-describedby="name-help"
            />
            <span id="name-help" className="text-text-muted text-xs mt-1 block">
              {NAME_MIN}-{NAME_MAX} karakter
            </span>
          </label>

          <label className="block">
            <span className="form-label">Tag (3-5 karakter)</span>
            <input
              className="form-input"
              value={tag}
              onChange={(e) => setTag(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
              maxLength={5}
              placeholder="NOVA"
              style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
              required
              aria-invalid={tag.length > 0 && !tagValid}
            />
          </label>

          <label className="block">
            <span className="form-label">Dil</span>
            <select
              className="form-input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_LABEL[code]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="form-label">Tanıtım</span>
            <textarea
              className="form-input"
              rows={3}
              maxLength={240}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lonca hedefleri, beklenen aktivite seviyesi…"
            />
          </label>

          <fieldset className="block">
            <span className="form-label">Lonca Race Teması</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {(Object.keys(RACE_DESCRIPTIONS) as Race[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRace(r)}
                  className={`badge ${race === r ? 'badge-race' : 'badge-brand'} cursor-pointer`}
                  style={
                    race === r
                      ? { background: RACE_DESCRIPTIONS[r].bgColor, color: RACE_DESCRIPTIONS[r].color, borderColor: RACE_DESCRIPTIONS[r].glowColor }
                      : undefined
                  }
                  aria-pressed={race === r}
                >
                  {RACE_DESCRIPTIONS[r].icon} {RACE_DESCRIPTIONS[r].name}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="flex flex-col items-center justify-start gap-3 p-3 rounded-xl bg-bg-elevated/50 border border-border">
          <span className="form-label">Önizleme</span>
          <GuildCrest race={race} size="lg" />
          <div className="text-center">
            <p className="font-display font-bold text-text-primary">
              {name || 'Lonca İsmi'}
            </p>
            <p className="badge badge-race mt-1">[{tagUpper || 'TAG'}]</p>
          </div>
        </aside>

        {error && (
          <p role="alert" className="text-status-danger text-sm sm:col-span-2">
            {error}
          </p>
        )}

        <div className="sm:col-span-2 flex items-center gap-3">
          <GlowButton type="submit" size="lg" loading={submitting} disabled={!nameValid || !tagValid}>
            Loncayı Kur
          </GlowButton>
          <span className="text-text-muted text-xs">
            Kurulduktan sonra tag değiştirilemez.
          </span>
        </div>
      </form>
    </section>
  );
}
