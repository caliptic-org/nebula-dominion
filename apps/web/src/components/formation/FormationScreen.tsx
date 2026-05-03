'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { GlowButton } from '@/components/ui/GlowButton';
import { UnitSlot, CommanderSlot } from './FormationSlot';
import { PowerBar } from './PowerBar';
import { SynergyPanel } from './SynergyPanel';
import { UnitRoster } from './UnitRoster';
import {
  SlotUnit, SlotCommander, FormationSlotData, CommanderSlotData,
  RaceSynergy, RaceKey, RACE_COLORS, SYNERGY_RULES,
  DEMO_AVAILABLE_UNITS, DEMO_AVAILABLE_COMMANDERS,
} from './types';
import { useRaceTheme } from '@/hooks/useRaceTheme';

const MAX_COMMANDERS = 5;
const ROWS = ['rear', 'middle', 'front'] as const;
const SLOTS_PER_ROW = 5;
const ROW_LABELS: Record<string, string> = { front: 'Ön Saf', middle: 'Orta Saf', rear: 'Arka Saf' };

/* ── Snapshot types for templates ────────────────────────────────────────── */
interface FormationSnapshot {
  name: string;
  unitSlots: FormationSlotData[];
  commanderSlots: CommanderSlotData[];
}

function buildInitialUnitSlots(): FormationSlotData[] {
  return ROWS.flatMap((row) =>
    Array.from({ length: SLOTS_PER_ROW }, (_, i) => ({ id: `${row}-${i}`, row, index: i, unit: null }))
  );
}

function buildInitialCommanderSlots(): CommanderSlotData[] {
  return Array.from({ length: MAX_COMMANDERS }, (_, i) => ({ id: `cmd-${i}`, index: i, commander: null }));
}

/* Pre-seeded demo templates */
function buildPresetTemplates(): FormationSnapshot[] {
  const attackUnits = buildInitialUnitSlots().map((s, i) => ({
    ...s,
    unit: i < 5 ? (DEMO_AVAILABLE_UNITS[i] ?? null) : null,
  }));
  const attackCmds = buildInitialCommanderSlots().map((s, i) => ({
    ...s,
    commander: i < 2 ? (DEMO_AVAILABLE_COMMANDERS[i] ?? null) : null,
  }));

  const defenseUnits = buildInitialUnitSlots().map((s, i) => ({
    ...s,
    unit: [3, 7, 9].includes(i) ? (DEMO_AVAILABLE_UNITS[[3, 7, 9].indexOf(i)] ?? null) : null,
  }));
  const defenseCmds = buildInitialCommanderSlots().map((s, i) => ({
    ...s,
    commander: i === 0 ? (DEMO_AVAILABLE_COMMANDERS[1] ?? null) : null,
  }));

  return [
    { name: 'Saldırı Formasyonu', unitSlots: attackUnits, commanderSlots: attackCmds },
    { name: 'Savunma Hattı',      unitSlots: defenseUnits, commanderSlots: defenseCmds },
  ];
}

export function FormationScreen() {
  const { race, setRace, meta } = useRaceTheme();
  const rc = RACE_COLORS[race] ?? RACE_COLORS.insan;

  const [unitSlots, setUnitSlots]             = useState<FormationSlotData[]>(buildInitialUnitSlots);
  const [commanderSlots, setCommanderSlots]   = useState<CommanderSlotData[]>(buildInitialCommanderSlots);
  const [rosterMode, setRosterMode]           = useState<'units' | 'commanders'>('units');
  const [templates, setTemplates]             = useState<FormationSnapshot[]>(buildPresetTemplates);
  const [activeTemplate, setActiveTemplate]   = useState<string | null>(null);
  const [saveFlash, setSaveFlash]             = useState(false);

  /* Mobile click-to-place: pending selection from roster */
  const [pendingUnit, setPendingUnit]         = useState<SlotUnit | null>(null);
  const [pendingCmd, setPendingCmd]           = useState<SlotCommander | null>(null);

  /* ── Auto race theme: dominant race in formation ─────────────────────── */
  const synergies = useMemo<RaceSynergy[]>(() => {
    const counts = new Map<string, number>();
    unitSlots.forEach((s)      => { if (s.unit)      counts.set(s.unit.race,      (counts.get(s.unit.race)      ?? 0) + 1); });
    commanderSlots.forEach((s) => { if (s.commander) counts.set(s.commander.race, (counts.get(s.commander.race) ?? 0) + 1); });
    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([r, count]) => {
        const raceKey = r as RaceKey;
        const rules = SYNERGY_RULES[raceKey].map((rule) => ({ ...rule, active: count >= rule.threshold }));
        return { race: raceKey, count, bonuses: rules };
      });
  }, [unitSlots, commanderSlots]);

  /* Update CSS race theme whenever dominant race changes */
  const prevDominantRef = useRef<RaceKey | null>(null);
  useEffect(() => {
    const dominant = synergies[0]?.race ?? null;
    if (dominant && dominant !== prevDominantRef.current) {
      prevDominantRef.current = dominant;
      setRace(dominant);
    }
  }, [synergies, setRace]);

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const placedUnitIds = useMemo(
    () => new Set(unitSlots.map((s) => s.unit?.id).filter(Boolean) as string[]),
    [unitSlots],
  );
  const placedCommanderIds = useMemo(
    () => new Set(commanderSlots.map((s) => s.commander?.id).filter(Boolean) as string[]),
    [commanderSlots],
  );
  const totalPower = useMemo(() => {
    const up = unitSlots.reduce((acc, s)      => acc + (s.unit?.power      ?? 0), 0);
    const cp = commanderSlots.reduce((acc, s) => acc + (s.commander?.power ?? 0), 0);
    return up + cp;
  }, [unitSlots, commanderSlots]);

  const filledSlots = unitSlots.filter((s) => !!s.unit).length;

  /* ── Unit slot interactions ───────────────────────────────────────────── */
  const handleUnitDrop = useCallback((toSlotId: string, unitId: string) => {
    const unit = DEMO_AVAILABLE_UNITS.find((u) => u.id === unitId);
    if (!unit) return;
    setUnitSlots((prev) =>
      prev.map((s) => {
        if (s.unit?.id === unitId) return { ...s, unit: null };
        if (s.id === toSlotId) return { ...s, unit };
        return s;
      })
    );
  }, []);

  const handleUnitRemove = useCallback((slotId: string) => {
    setUnitSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, unit: null } : s));
  }, []);

  /* Mobile: clicking an empty slot places the pending unit */
  const handleUnitSlotClick = useCallback((slotId: string, currentUnit: SlotUnit | null) => {
    if (pendingUnit) {
      // Swap or place
      setUnitSlots((prev) =>
        prev.map((s) => {
          if (s.unit?.id === pendingUnit.id) return { ...s, unit: currentUnit }; // source gets old occupant
          if (s.id === slotId) return { ...s, unit: pendingUnit };               // target gets pending
          return s;
        })
      );
      setPendingUnit(null);
    } else if (currentUnit) {
      handleUnitRemove(slotId);
    }
  }, [pendingUnit, handleUnitRemove]);

  /* ── Commander slot interactions ─────────────────────────────────────── */
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

  const handleCommanderSlotClick = useCallback((slotId: string, currentCmd: SlotCommander | null) => {
    if (pendingCmd) {
      setCommanderSlots((prev) =>
        prev.map((s) => {
          if (s.commander?.id === pendingCmd.id) return { ...s, commander: currentCmd };
          if (s.id === slotId) return { ...s, commander: pendingCmd };
          return s;
        })
      );
      setPendingCmd(null);
    } else if (currentCmd) {
      handleCommanderRemove(slotId);
    }
  }, [pendingCmd, handleCommanderRemove]);

  /* ── Roster selection (mobile click-to-place) ────────────────────────── */
  const handleSelectUnit = useCallback((unit: SlotUnit) => {
    setPendingUnit((prev) => prev?.id === unit.id ? null : unit);
    setPendingCmd(null);
  }, []);

  const handleSelectCommander = useCallback((cmd: SlotCommander) => {
    setPendingCmd((prev) => prev?.id === cmd.id ? null : cmd);
    setPendingUnit(null);
  }, []);

  /* ── Template save / load ─────────────────────────────────────────────── */
  const handleSave = useCallback(() => {
    const name = `Formasyon ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    const snapshot: FormationSnapshot = {
      name,
      unitSlots: unitSlots.map((s) => ({ ...s })),
      commanderSlots: commanderSlots.map((s) => ({ ...s })),
    };
    setTemplates((prev) => [...prev.slice(-4), snapshot]);
    setActiveTemplate(name);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1400);
  }, [unitSlots, commanderSlots]);

  const handleLoadTemplate = useCallback((templateName: string) => {
    const tpl = templates.find((t) => t.name === templateName);
    if (!tpl) return;
    setUnitSlots(tpl.unitSlots.map((s) => ({ ...s })));
    setCommanderSlots(tpl.commanderSlots.map((s) => ({ ...s })));
    setActiveTemplate(templateName);
    setPendingUnit(null);
    setPendingCmd(null);
  }, [templates]);

  const handleReset = useCallback(() => {
    setUnitSlots(buildInitialUnitSlots());
    setCommanderSlots(buildInitialCommanderSlots());
    setActiveTemplate(null);
    setPendingUnit(null);
    setPendingCmd(null);
  }, []);

  /* Cancel pending selection on Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPendingUnit(null); setPendingCmd(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hasPending = !!pendingUnit || !!pendingCmd;

  return (
    <div
      className="min-h-dvh text-text-primary font-body relative overflow-hidden"
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

      {/* Mobile pending hint */}
      {hasPending && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-display uppercase tracking-wider border pointer-events-none"
          style={{ background: rc.dim, color: rc.color, borderColor: `${rc.color}60`, boxShadow: `0 0 20px ${rc.glow}` }}
          role="status"
          aria-live="polite"
        >
          {pendingUnit ? `${pendingUnit.name} seçildi — slot'a yerleştir` : `${pendingCmd?.name} seçildi — slot'a yerleştir`}
          {' · '}ESC iptal
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/05"
        style={{ background: 'rgba(8,10,16,0.88)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center gap-3">
          <a href="/" className="text-text-muted hover:text-text-primary transition-colors text-sm font-display">←</a>
          <div>
            <h1 className="font-display font-black text-sm sm:text-base uppercase tracking-[0.14em]" style={{ color: rc.color }}>
              Formasyon Kurma
            </h1>
            <p className="text-text-muted font-body text-[10px] tracking-wider uppercase">
              {filledSlots}/{unitSlots.length} birim · {commanderSlots.filter((s) => !!s.commander).length}/{MAX_COMMANDERS} komutan
              {' · '}<span style={{ color: rc.color }}>{meta.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTemplate && (
            <span
              className="hidden sm:block text-[10px] font-display uppercase tracking-wider px-2 py-1 rounded-full border"
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

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 px-4 py-4 max-w-[1280px] mx-auto">

        {/* Left column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Power summary */}
          <MangaPanel thick glow className="p-4">
            <PowerBar current={totalPower} max={50000} raceColor={rc.color} raceGlow={rc.glow} />
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
              <span className="text-[9px] text-text-muted font-body">Sürükle-bırak · listeden seç · dokunarak yerleştir</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {commanderSlots.map((slot, i) => (
                <CommanderSlot
                  key={slot.id}
                  commander={slot.commander}
                  slotId={slot.id}
                  index={i}
                  animDelay={i * 60}
                  pendingCommander={pendingCmd}
                  onDrop={handleCommanderDrop}
                  onSlotClick={handleCommanderSlotClick}
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
              <span className="text-[9px] text-text-muted font-body">
                {hasPending ? '↓ Slot seç → yerleştir' : 'Sürükle-bırak veya listeden seç'}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {ROWS.map((row, ri) => {
                const rowSlots = unitSlots.filter((s) => s.row === row);
                return (
                  <div key={row}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 opacity-20" style={{ background: rc.color }} />
                      <span className="text-[9px] font-display uppercase tracking-widest" style={{ color: rc.color }}>
                        {ROW_LABELS[row]}
                      </span>
                      <div className="h-px flex-1 opacity-20" style={{ background: rc.color }} />
                    </div>

                    <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                      {rowSlots.map((slot, si) => (
                        <UnitSlot
                          key={slot.id}
                          unit={slot.unit}
                          slotId={slot.id}
                          animDelay={(ri * SLOTS_PER_ROW + si) * 45}
                          pendingUnit={pendingUnit}
                          onDrop={handleUnitDrop}
                          onSlotClick={handleUnitSlotClick}
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

          {/* Template bar */}
          <div className="flex gap-2 flex-wrap items-center">
            <GlowButton size="sm" onClick={handleSave} icon={<span>💾</span>}>Kaydet</GlowButton>
            <GlowButton size="sm" variant="ghost" onClick={handleReset}>Sıfırla</GlowButton>
            <div className="h-4 w-px bg-white/10" />
            {templates.map((t) => (
              <button
                key={t.name}
                onClick={() => handleLoadTemplate(t.name)}
                title={`"${t.name}" formasyonunu yükle`}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-[10px] font-display uppercase tracking-wider border transition-all duration-250',
                  activeTemplate === t.name
                    ? 'border-transparent'
                    : 'border-white/08 text-text-muted hover:border-white/16 hover:text-text-secondary',
                )}
                style={activeTemplate === t.name ? {
                  background:   rc.dim,
                  color:        rc.color,
                  borderColor:  `${rc.color}60`,
                  boxShadow:    `0 0 10px ${rc.glow}`,
                } : undefined}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right column: roster */}
        <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <MangaPanel className="p-4 lg:sticky lg:top-20" style={{ maxHeight: 'calc(100dvh - 6rem)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: rc.color }}>
                Kadro Listesi
              </span>
              {hasPending && (
                <button
                  onClick={() => { setPendingUnit(null); setPendingCmd(null); }}
                  className="text-[9px] font-display uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors"
                >
                  ✕ İptal
                </button>
              )}
            </div>
            <div className="flex flex-col" style={{ maxHeight: 'calc(100dvh - 10rem)' }}>
              <UnitRoster
                units={DEMO_AVAILABLE_UNITS}
                commanders={DEMO_AVAILABLE_COMMANDERS}
                placedUnitIds={placedUnitIds}
                placedCommanderIds={placedCommanderIds}
                mode={rosterMode}
                onModeChange={setRosterMode}
                selectedUnitId={pendingUnit?.id ?? null}
                selectedCommanderId={pendingCmd?.id ?? null}
                onSelectUnit={handleSelectUnit}
                onSelectCommander={handleSelectCommander}
              />
            </div>
          </MangaPanel>
        </div>
      </div>
    </div>
  );
}
