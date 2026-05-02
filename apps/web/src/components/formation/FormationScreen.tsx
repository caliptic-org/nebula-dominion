'use client';

import { useState, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { GlowButton } from '@/components/ui/GlowButton';
import { UnitSlot, CommanderSlot } from './FormationSlot';
import { PowerBar } from './PowerBar';
import { SynergyPanel } from './SynergyPanel';
import { UnitRoster } from './UnitRoster';
import {
  SlotUnit, SlotCommander, FormationSlotData, CommanderSlotData,
  RaceSynergy, RACE_COLORS, SYNERGY_RULES,
  DEMO_AVAILABLE_UNITS, DEMO_AVAILABLE_COMMANDERS,
} from './types';
import { useRaceTheme } from '@/hooks/useRaceTheme';

const MAX_COMMANDERS = 5;
const ROWS = ['rear', 'middle', 'front'] as const;
const SLOTS_PER_ROW = 5;
const ROW_LABELS: Record<string, string> = { front: 'Ön Saf', middle: 'Orta Saf', rear: 'Arka Saf' };

function buildInitialUnitSlots(): FormationSlotData[] {
  return ROWS.flatMap((row, ri) =>
    Array.from({ length: SLOTS_PER_ROW }, (_, i) => ({
      id: `${row}-${i}`,
      row,
      index: i,
      unit: null,
    }))
  );
}

function buildInitialCommanderSlots(): CommanderSlotData[] {
  return Array.from({ length: MAX_COMMANDERS }, (_, i) => ({ id: `cmd-${i}`, index: i, commander: null }));
}

export function FormationScreen() {
  const { race, meta } = useRaceTheme();
  const rc = RACE_COLORS[race] ?? RACE_COLORS.insan;

  const [unitSlots, setUnitSlots]         = useState<FormationSlotData[]>(buildInitialUnitSlots);
  const [commanderSlots, setCommanderSlots] = useState<CommanderSlotData[]>(buildInitialCommanderSlots);
  const [rosterMode, setRosterMode]        = useState<'units' | 'commanders'>('units');
  const [savedTemplates, setSavedTemplates] = useState<string[]>(['Saldırı Formasyonu', 'Savunma Hattı']);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [saveFlash, setSaveFlash]          = useState(false);

  /* Placed IDs */
  const placedUnitIds = useMemo(
    () => new Set(unitSlots.map((s) => s.unit?.id).filter(Boolean) as string[]),
    [unitSlots],
  );
  const placedCommanderIds = useMemo(
    () => new Set(commanderSlots.map((s) => s.commander?.id).filter(Boolean) as string[]),
    [commanderSlots],
  );

  /* Total power */
  const totalPower = useMemo(() => {
    const up = unitSlots.reduce((acc, s) => acc + (s.unit?.power ?? 0), 0);
    const cp = commanderSlots.reduce((acc, s) => acc + (s.commander?.power ?? 0), 0);
    return up + cp;
  }, [unitSlots, commanderSlots]);

  /* Synergies */
  const synergies = useMemo<RaceSynergy[]>(() => {
    const counts = new Map<string, number>();
    unitSlots.forEach((s) => { if (s.unit) counts.set(s.unit.race, (counts.get(s.unit.race) ?? 0) + 1); });
    commanderSlots.forEach((s) => { if (s.commander) counts.set(s.commander.race, (counts.get(s.commander.race) ?? 0) + 1); });

    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([r, count]) => {
        const raceKey = r as keyof typeof SYNERGY_RULES;
        const rules = SYNERGY_RULES[raceKey].map((rule) => ({ ...rule, active: count >= rule.threshold }));
        return { race: raceKey, count, bonuses: rules };
      });
  }, [unitSlots, commanderSlots]);

  /* ── Unit drop handlers ───────────────────────────────────────────────── */
  const handleUnitDrop = useCallback((toSlotId: string, unitId: string) => {
    const unit = DEMO_AVAILABLE_UNITS.find((u) => u.id === unitId);
    if (!unit) return;

    setUnitSlots((prev) => {
      const next = prev.map((s) => {
        if (s.unit?.id === unitId) return { ...s, unit: null };        // remove from source
        if (s.id === toSlotId) return { ...s, unit };                  // place in target
        return s;
      });
      return next;
    });
  }, []);

  const handleUnitRemove = useCallback((slotId: string) => {
    setUnitSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, unit: null } : s));
  }, []);

  /* ── Commander drop handlers ──────────────────────────────────────────── */
  const handleCommanderDrop = useCallback((toSlotId: string, commanderId: string) => {
    const cmd = DEMO_AVAILABLE_COMMANDERS.find((c) => c.id === commanderId);
    if (!cmd) return;

    setCommanderSlots((prev) =>
      prev.map((s) => {
        if (s.commander?.id === commanderId) return { ...s, commander: null };
        if (s.id === toSlotId) return { ...s, commander: cmd };
        return s;
      })
    );
  }, []);

  const handleCommanderRemove = useCallback((slotId: string) => {
    setCommanderSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, commander: null } : s));
  }, []);

  /* ── Save ─────────────────────────────────────────────────────────────── */
  const handleSave = useCallback(() => {
    const name = `Formasyon ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    setSavedTemplates((p) => [...p.slice(-4), name]);
    setActiveTemplate(name);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1400);
  }, []);

  const handleReset = useCallback(() => {
    setUnitSlots(buildInitialUnitSlots());
    setCommanderSlots(buildInitialCommanderSlots());
    setActiveTemplate(null);
  }, []);

  const filledSlots  = unitSlots.filter((s) => !!s.unit).length;
  const totalSlots   = unitSlots.length;

  return (
    <div
      className="min-h-dvh bg-space-black text-text-primary font-body relative overflow-hidden"
      style={{ background: `radial-gradient(ellipse 90% 50% at 50% 0%, ${rc.dim} 0%, #080a10 55%)` }}
    >
      {/* Speed lines bg */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(255,255,255,0.012) 40px, rgba(255,255,255,0.012) 41px)`,
        }}
        aria-hidden
      />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/05"
        style={{ background: 'rgba(8,10,16,0.88)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center gap-3">
          <a href="/" className="text-text-muted hover:text-text-primary transition-colors text-sm font-display">←</a>
          <div>
            <h1 className="font-display font-black text-sm sm:text-base uppercase tracking-[0.14em]" style={{ color: rc.color }}>
              Formasyon Kurma
            </h1>
            <p className="text-text-muted font-body text-[10px] tracking-wider uppercase">
              {filledSlots}/{totalSlots} birim · {commanderSlots.filter((s) => !!s.commander).length}/{MAX_COMMANDERS} komutan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTemplate && (
            <span className="hidden sm:block text-[10px] font-display uppercase tracking-wider px-2 py-1 rounded-full border"
              style={{ color: rc.color, borderColor: `${rc.color}40`, background: rc.dim }}
            >
              {activeTemplate}
            </span>
          )}
          <GlowButton
            size="sm"
            onClick={handleSave}
            className={clsx(saveFlash && 'scale-105')}
            style={saveFlash ? { boxShadow: `0 0 24px ${rc.glow}` } : undefined}
          >
            {saveFlash ? '✓ Kaydedildi' : 'Kaydet'}
          </GlowButton>
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 px-4 py-4 max-w-[1280px] mx-auto">

        {/* Left column: grid + synergy */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Power summary */}
          <MangaPanel thick glow className="p-4">
            <PowerBar
              current={totalPower}
              max={50000}
              raceColor={rc.color}
              raceGlow={rc.glow}
            />
          </MangaPanel>

          {/* Commander slots */}
          <MangaPanel className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: rc.color }}>
                  Komutanlar
                </span>
                <span
                  className="px-1.5 py-px rounded text-[9px] font-display font-bold border"
                  style={{ color: rc.color, borderColor: `${rc.color}40`, background: rc.dim }}
                >
                  {commanderSlots.filter((s) => !!s.commander).length}/{MAX_COMMANDERS}
                </span>
              </div>
              <span className="text-[9px] text-text-muted font-body">Sürükle-bırak veya listeden seç</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {commanderSlots.map((slot, i) => (
                <CommanderSlot
                  key={slot.id}
                  commander={slot.commander}
                  slotId={slot.id}
                  index={i}
                  animDelay={i * 60}
                  onDrop={handleCommanderDrop}
                  onRemove={handleCommanderRemove}
                />
              ))}
            </div>
          </MangaPanel>

          {/* Formation grid */}
          <MangaPanel thick className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: rc.color }}>
                Formasyon
              </span>
              <div className="flex gap-1">
                {(['front','middle','rear'] as const).map((r) => (
                  <span
                    key={r}
                    className="text-[8px] font-display uppercase tracking-wider px-1.5 py-px rounded border border-white/08 text-text-muted"
                  >
                    {ROW_LABELS[r]}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {ROWS.map((row, ri) => {
                const rowSlots = unitSlots.filter((s) => s.row === row);
                return (
                  <div key={row}>
                    {/* Row label */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 opacity-20" style={{ background: rc.color }} />
                      <span className="text-[9px] font-display uppercase tracking-widest" style={{ color: rc.color }}>
                        {ROW_LABELS[row]}
                      </span>
                      <div className="h-px flex-1 opacity-20" style={{ background: rc.color }} />
                    </div>

                    {/* Slot row */}
                    <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                      {rowSlots.map((slot, si) => (
                        <UnitSlot
                          key={slot.id}
                          unit={slot.unit}
                          slotId={slot.id}
                          animDelay={(ri * SLOTS_PER_ROW + si) * 45}
                          onDrop={handleUnitDrop}
                          onRemove={handleUnitRemove}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </MangaPanel>

          {/* Synergy panel */}
          <MangaPanel className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: rc.color }}>
                Irk Sinerjisi
              </span>
              {synergies.filter((s) => s.count >= 2).length > 0 && (
                <span
                  className="px-1.5 py-px rounded text-[9px] font-display font-bold animate-race-glow-pulse"
                  style={{ color: rc.color, background: rc.dim, boxShadow: `0 0 8px ${rc.glow}` }}
                >
                  {synergies.filter((s) => s.count >= 2).length} AKTİF
                </span>
              )}
            </div>
            <SynergyPanel synergies={synergies} />
          </MangaPanel>

          {/* Template actions */}
          <div className="flex gap-2 flex-wrap">
            <GlowButton size="sm" onClick={handleSave} icon={<span>💾</span>}>Kaydet</GlowButton>
            <GlowButton size="sm" variant="ghost" onClick={handleReset}>Sıfırla</GlowButton>
            {savedTemplates.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTemplate(t)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-[10px] font-display uppercase tracking-wider border transition-all duration-250',
                  activeTemplate === t
                    ? 'border-transparent'
                    : 'border-white/08 text-text-muted hover:border-white/16',
                )}
                style={activeTemplate === t ? {
                  background: rc.dim,
                  color: rc.color,
                  borderColor: `${rc.color}60`,
                  boxShadow: `0 0 10px ${rc.glow}`,
                } : undefined}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Right column: unit roster */}
        <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <MangaPanel className="p-4 h-full lg:sticky lg:top-20" style={{ maxHeight: 'calc(100dvh - 6rem)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: rc.color }}>
                Kadro Listesi
              </span>
            </div>
            <div className="h-full min-h-0 flex flex-col" style={{ maxHeight: 'calc(100dvh - 10rem)' }}>
              <UnitRoster
                units={DEMO_AVAILABLE_UNITS}
                commanders={DEMO_AVAILABLE_COMMANDERS}
                placedUnitIds={placedUnitIds}
                placedCommanderIds={placedCommanderIds}
                mode={rosterMode}
                onModeChange={setRosterMode}
              />
            </div>
          </MangaPanel>
        </div>
      </div>
    </div>
  );
}
