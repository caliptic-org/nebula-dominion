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
  Formation, FormationTemplate, UnitSlot as ApiUnitSlot, CommanderSlot as ApiCommanderSlot,
  FORMATION_LIMITS,
} from './types';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { Race } from '@/types/units';
import {
  fetchPlayerUnits,
  fetchTemplates,
  fetchFormations,
  createFormation,
  updateFormation,
  calculatePower,
  unitToSlotUnit,
  unitToSlotCommander,
  isCommanderEligible,
  FormationApiError,
} from '@/lib/formation-api';

const MAX_COMMANDERS = FORMATION_LIMITS.MAX_COMMANDER_SLOTS;
// Backend caps total slots at 10. Layout: front 4 + middle 3 + rear 3 = 10.
const ROWS = ['rear', 'middle', 'front'] as const;
const ROW_COUNTS: Record<typeof ROWS[number], number> = { rear: 3, middle: 3, front: 4 };
const TOTAL_UNIT_SLOTS = FORMATION_LIMITS.MAX_UNIT_SLOTS;
const ROW_LABELS: Record<string, string> = { front: 'Ön Saf', middle: 'Orta Saf', rear: 'Arka Saf' };
const POWER_DEBOUNCE_MS = 350;

interface FormationScreenProps {
  playerId: string;
}

interface SavedFormationEntry {
  kind: 'saved';
  id: string;
  name: string;
  unitSlots: FormationSlotData[];
  commanderSlots: CommanderSlotData[];
  isLastActive: boolean;
}

interface PresetEntry {
  kind: 'preset';
  id: string;
  name: string;
  unitSlots: FormationSlotData[];
  commanderSlots: CommanderSlotData[];
}

type TemplateEntry = SavedFormationEntry | PresetEntry;

function buildInitialUnitSlots(): FormationSlotData[] {
  return ROWS.flatMap((row) =>
    Array.from({ length: ROW_COUNTS[row] }, (_, i) => ({ id: `${row}-${i}`, row, index: i, unit: null }))
  );
}

function buildInitialCommanderSlots(): CommanderSlotData[] {
  return Array.from({ length: MAX_COMMANDERS }, (_, i) => ({ id: `cmd-${i}`, index: i, commander: null }));
}

function applyApiSlotsToVisual(
  apiSlots: ApiUnitSlot[],
  units: SlotUnit[],
): FormationSlotData[] {
  const visual = buildInitialUnitSlots();
  const unitMap = new Map(units.map((u) => [u.id, u]));
  for (const slot of apiSlots) {
    if (slot.position < 0 || slot.position >= TOTAL_UNIT_SLOTS) continue;
    const unit = unitMap.get(slot.unitId);
    if (!unit) continue;
    visual[slot.position] = { ...visual[slot.position], unit };
  }
  return visual;
}

function applyApiCommandersToVisual(
  apiSlots: ApiCommanderSlot[],
  commanders: SlotCommander[],
): CommanderSlotData[] {
  const visual = buildInitialCommanderSlots();
  const cmdMap = new Map(commanders.map((c) => [c.id, c]));
  for (const slot of apiSlots) {
    if (slot.position < 0 || slot.position >= MAX_COMMANDERS) continue;
    const cmd = cmdMap.get(slot.commanderId);
    if (!cmd) continue;
    visual[slot.position] = { ...visual[slot.position], commander: cmd };
  }
  return visual;
}

function visualToApiUnitSlots(slots: FormationSlotData[]): ApiUnitSlot[] {
  const result: ApiUnitSlot[] = [];
  slots.forEach((s, idx) => {
    if (!s.unit) return;
    if (idx >= FORMATION_LIMITS.MAX_UNIT_SLOTS) return;
    result.push({ unitId: s.unit.id, position: idx });
  });
  return result;
}

function visualToApiCommanderSlots(slots: CommanderSlotData[]): ApiCommanderSlot[] {
  const result: ApiCommanderSlot[] = [];
  slots.forEach((s, idx) => {
    if (!s.commander) return;
    if (idx >= FORMATION_LIMITS.MAX_COMMANDER_SLOTS) return;
    result.push({ commanderId: s.commander.id, position: idx });
  });
  return result;
}

export function FormationScreen({ playerId }: FormationScreenProps) {
  const { race, setRace, meta } = useRaceTheme();
  const rc = RACE_COLORS[race] ?? RACE_COLORS.insan;

  // ── Roster state (loaded from /units/player/:playerId) ────────────────────
  const [availableUnits, setAvailableUnits] = useState<SlotUnit[]>([]);
  const [availableCommanders, setAvailableCommanders] = useState<SlotCommander[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  // ── Formation state ───────────────────────────────────────────────────────
  const [unitSlots, setUnitSlots] = useState<FormationSlotData[]>(buildInitialUnitSlots);
  const [commanderSlots, setCommanderSlots] = useState<CommanderSlotData[]>(buildInitialCommanderSlots);
  const [rosterMode, setRosterMode] = useState<'units' | 'commanders'>('units');

  // ── Templates: backend presets + user-saved formations ────────────────────
  const [presets, setPresets] = useState<PresetEntry[]>([]);
  const [savedFormations, setSavedFormations] = useState<SavedFormationEntry[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [activeFormationId, setActiveFormationId] = useState<string | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // ── Save / power state ────────────────────────────────────────────────────
  const [saveFlash, setSaveFlash] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [serverPower, setServerPower] = useState<number | null>(null);
  const [powerCalculating, setPowerCalculating] = useState(false);

  // ── Mobile click-to-place ─────────────────────────────────────────────────
  const [pendingUnit, setPendingUnit] = useState<SlotUnit | null>(null);
  const [pendingCmd, setPendingCmd] = useState<SlotCommander | null>(null);

  // ── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setUnitsLoading(true);
    setUnitsError(null);

    fetchPlayerUnits(playerId)
      .then((rawUnits) => {
        if (cancelled) return;
        const units = rawUnits.map(unitToSlotUnit);
        const commanders = rawUnits
          .filter(isCommanderEligible)
          .map(unitToSlotCommander);
        setAvailableUnits(units);
        setAvailableCommanders(commanders);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Birimler yüklenemedi';
        setUnitsError(message);
      })
      .finally(() => {
        if (!cancelled) setUnitsLoading(false);
      });

    return () => { cancelled = true; };
  }, [playerId]);

  // Templates and saved formations depend on the loaded units to resolve slot references.
  useEffect(() => {
    if (unitsLoading) return;
    let cancelled = false;
    setTemplatesLoading(true);

    Promise.all([fetchTemplates(), fetchFormations(playerId, 1, 50)])
      .then(([tplList, savedList]) => {
        if (cancelled) return;

        const presetEntries: PresetEntry[] = tplList.map((tpl: FormationTemplate) => ({
          kind: 'preset',
          id: tpl.id,
          name: tpl.name,
          unitSlots: applyApiSlotsToVisual(tpl.unitSlots, availableUnits),
          commanderSlots: applyApiCommandersToVisual(tpl.commanderSlots, availableCommanders),
        }));
        setPresets(presetEntries);

        const savedEntries: SavedFormationEntry[] = savedList.formations.map((f: Formation) => ({
          kind: 'saved',
          id: f.id,
          name: f.name,
          unitSlots: applyApiSlotsToVisual(f.unitSlots, availableUnits),
          commanderSlots: applyApiCommandersToVisual(f.commanderSlots, availableCommanders),
          isLastActive: f.isLastActive,
        }));
        setSavedFormations(savedEntries);

        // Auto-load last-active formation, if any
        const lastActive = savedEntries.find((e) => e.isLastActive) ?? savedEntries[0];
        if (lastActive) {
          setUnitSlots(lastActive.unitSlots);
          setCommanderSlots(lastActive.commanderSlots);
          setActiveTemplate(lastActive.name);
          setActiveFormationId(lastActive.id);
        }
      })
      .catch(() => {
        // Non-fatal: keep an empty list. Errors here shouldn't block placing units.
        if (cancelled) return;
        setPresets([]);
        setSavedFormations([]);
      })
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false);
      });

    return () => { cancelled = true; };
  }, [playerId, unitsLoading, availableUnits, availableCommanders]);

  /* ── Synergy detection (pure client-side: race counts) ─────────────────── */
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
      setRace(dominant as unknown as Race);
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

  const optimisticPower = useMemo(() => {
    const up = unitSlots.reduce((acc, s)      => acc + (s.unit?.power      ?? 0), 0);
    const cp = commanderSlots.reduce((acc, s) => acc + (s.commander?.power ?? 0), 0);
    return up + cp;
  }, [unitSlots, commanderSlots]);

  const displayedPower = serverPower ?? optimisticPower;

  const filledSlots = unitSlots.filter((s) => !!s.unit).length;

  /* ── Server-side power (debounced) ────────────────────────────────────── */
  const apiUnitSlotsKey = useMemo(
    () => JSON.stringify(visualToApiUnitSlots(unitSlots)),
    [unitSlots],
  );
  const apiCmdSlotsKey = useMemo(
    () => JSON.stringify(visualToApiCommanderSlots(commanderSlots)),
    [commanderSlots],
  );

  useEffect(() => {
    const apiUnitSlots = JSON.parse(apiUnitSlotsKey) as ApiUnitSlot[];
    const apiCmdSlots  = JSON.parse(apiCmdSlotsKey)  as ApiCommanderSlot[];

    if (apiUnitSlots.length === 0 && apiCmdSlots.length === 0) {
      setServerPower(null);
      setPowerCalculating(false);
      return;
    }

    let cancelled = false;
    setPowerCalculating(true);

    const handle = window.setTimeout(() => {
      calculatePower({
        playerId,
        unitSlots: apiUnitSlots,
        commanderSlots: apiCmdSlots,
      })
        .then((res) => { if (!cancelled) setServerPower(res.totalPower); })
        .catch(() => { /* Keep optimistic — server rejected (validation, ownership, etc.) */ })
        .finally(() => { if (!cancelled) setPowerCalculating(false); });
    }, POWER_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [playerId, apiUnitSlotsKey, apiCmdSlotsKey]);

  /* ── Unit slot interactions ───────────────────────────────────────────── */
  const handleUnitDrop = useCallback((toSlotId: string, unitId: string) => {
    const unit = availableUnits.find((u) => u.id === unitId);
    if (!unit) return;
    setUnitSlots((prev) =>
      prev.map((s) => {
        if (s.unit?.id === unitId) return { ...s, unit: null };
        if (s.id === toSlotId) return { ...s, unit };
        return s;
      })
    );
  }, [availableUnits]);

  const handleUnitRemove = useCallback((slotId: string) => {
    setUnitSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, unit: null } : s));
  }, []);

  const handleUnitSlotClick = useCallback((slotId: string, currentUnit: SlotUnit | null) => {
    if (pendingUnit) {
      setUnitSlots((prev) =>
        prev.map((s) => {
          if (s.unit?.id === pendingUnit.id) return { ...s, unit: currentUnit };
          if (s.id === slotId) return { ...s, unit: pendingUnit };
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
    const cmd = availableCommanders.find((c) => c.id === commanderId);
    if (!cmd) return;
    setCommanderSlots((prev) =>
      prev.map((s) => {
        if (s.commander?.id === commanderId) return { ...s, commander: null };
        if (s.id === toSlotId) return { ...s, commander: cmd };
        return s;
      })
    );
  }, [availableCommanders]);

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

  /* ── Save: POST or PUT depending on whether a saved formation is active ── */
  const handleSave = useCallback(async () => {
    const apiUnitSlots = visualToApiUnitSlots(unitSlots);
    const apiCmdSlots = visualToApiCommanderSlots(commanderSlots);

    setSaving(true);
    setSaveError(null);

    try {
      let saved: Formation;
      if (activeFormationId) {
        saved = await updateFormation(activeFormationId, playerId, {
          name: activeTemplate ?? `Formasyon ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`,
          unitSlots: apiUnitSlots,
          commanderSlots: apiCmdSlots,
        });
      } else {
        const name = `Formasyon ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
        saved = await createFormation({
          playerId,
          name,
          unitSlots: apiUnitSlots,
          commanderSlots: apiCmdSlots,
        });
      }

      const entry: SavedFormationEntry = {
        kind: 'saved',
        id: saved.id,
        name: saved.name,
        unitSlots: applyApiSlotsToVisual(saved.unitSlots, availableUnits),
        commanderSlots: applyApiCommandersToVisual(saved.commanderSlots, availableCommanders),
        isLastActive: saved.isLastActive,
      };
      setSavedFormations((prev) => {
        const without = prev.filter((e) => e.id !== saved.id);
        return [entry, ...without].slice(0, 10);
      });
      setActiveFormationId(saved.id);
      setActiveTemplate(saved.name);
      setServerPower(saved.totalPower);

      setSaveFlash(true);
      window.setTimeout(() => setSaveFlash(false), 1400);
    } catch (err: unknown) {
      const message = err instanceof FormationApiError ? err.message
        : err instanceof Error ? err.message
        : 'Formasyon kaydedilemedi';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }, [activeFormationId, activeTemplate, availableCommanders, availableUnits, commanderSlots, playerId, unitSlots]);

  const handleLoadEntry = useCallback((entry: TemplateEntry) => {
    setUnitSlots(entry.unitSlots.map((s) => ({ ...s })));
    setCommanderSlots(entry.commanderSlots.map((s) => ({ ...s })));
    setActiveTemplate(entry.name);
    setActiveFormationId(entry.kind === 'saved' ? entry.id : null);
    setPendingUnit(null);
    setPendingCmd(null);
  }, []);

  const handleReset = useCallback(() => {
    setUnitSlots(buildInitialUnitSlots());
    setCommanderSlots(buildInitialCommanderSlots());
    setActiveTemplate(null);
    setActiveFormationId(null);
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
  const allTemplates: TemplateEntry[] = useMemo(
    () => [...savedFormations, ...presets],
    [savedFormations, presets],
  );

  /* ── Initial load: error / empty state ────────────────────────────────── */
  if (unitsError) {
    return (
      <div className="h-dvh flex items-center justify-center px-4" style={{ background: '#080a10' }}>
        <MangaPanel thick className="p-8 max-w-md text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-text-primary mb-2">
            Birimler yüklenemedi
          </h2>
          <p className="text-text-muted font-body text-xs mb-4">{unitsError}</p>
          <GlowButton size="sm" onClick={() => window.location.reload()}>Yeniden Dene</GlowButton>
        </MangaPanel>
      </div>
    );
  }

  return (
    <div
      className="h-dvh text-text-primary font-body relative overflow-y-auto"
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

      {/* Save error toast */}
      {saveError && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md text-xs font-display border max-w-md text-center"
          style={{ background: 'rgba(255,51,85,0.12)', color: '#ff5577', borderColor: 'rgba(255,51,85,0.35)' }}
          role="alert"
          aria-live="assertive"
        >
          {saveError}
          <button
            onClick={() => setSaveError(null)}
            className="ml-2 opacity-70 hover:opacity-100"
            aria-label="Hatayı kapat"
          >✕</button>
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
            disabled={saving || unitsLoading}
            className={clsx(saveFlash && 'scale-105')}
            style={saveFlash ? { boxShadow: `0 0 24px ${rc.glow}` } : undefined}
          >
            {saving ? 'Kaydediliyor…' : saveFlash ? '✓ Kaydedildi' : 'Kaydet'}
          </GlowButton>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 px-4 py-4 max-w-[1280px] mx-auto">

        {/* Left column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Power summary */}
          <MangaPanel thick glow className="p-4">
            <PowerBar current={displayedPower} max={50000} raceColor={rc.color} raceGlow={rc.glow} />
            <div className="mt-2 flex items-center justify-end gap-1.5 text-[9px] font-display uppercase tracking-widest text-text-muted">
              {powerCalculating ? (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: rc.color }} aria-hidden />
                  <span>Sunucu hesaplıyor…</span>
                </>
              ) : serverPower !== null ? (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#44ff88' }} aria-hidden />
                  <span>Sunucu doğruladı</span>
                </>
              ) : (
                <span>Tahmini güç</span>
              )}
            </div>
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
                          animDelay={(ri * 5 + si) * 45}
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
            <GlowButton size="sm" onClick={handleSave} icon={<span>💾</span>} disabled={saving || unitsLoading}>
              {saving ? 'Kaydediliyor' : 'Kaydet'}
            </GlowButton>
            <GlowButton size="sm" variant="ghost" onClick={handleReset}>Sıfırla</GlowButton>
            <div className="h-4 w-px bg-white/10" />
            {templatesLoading ? (
              <span className="font-display text-[9px] uppercase tracking-wider text-text-muted">
                Şablonlar yükleniyor…
              </span>
            ) : allTemplates.length === 0 ? (
              <span className="font-display text-[9px] uppercase tracking-wider text-text-muted">
                Kayıtlı formasyon yok
              </span>
            ) : (
              allTemplates.map((t) => {
                const key = `${t.kind}:${t.id}`;
                const isActive = activeTemplate === t.name && (
                  t.kind === 'preset' ? activeFormationId === null : activeFormationId === t.id
                );
                return (
                  <button
                    key={key}
                    onClick={() => handleLoadEntry(t)}
                    title={`"${t.name}" formasyonunu yükle`}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-[10px] font-display uppercase tracking-wider border transition-all duration-250 flex items-center gap-1.5',
                      isActive
                        ? 'border-transparent'
                        : 'border-white/08 text-text-muted hover:border-white/16 hover:text-text-secondary',
                    )}
                    style={isActive ? {
                      background:   rc.dim,
                      color:        rc.color,
                      borderColor:  `${rc.color}60`,
                      boxShadow:    `0 0 10px ${rc.glow}`,
                    } : undefined}
                  >
                    {t.kind === 'preset' && <span className="opacity-60">⚙︎</span>}
                    {t.name}
                  </button>
                );
              })
            )}
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
              {unitsLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 rounded-lg animate-pulse"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                  ))}
                  <p className="text-text-muted font-body text-xs text-center pt-2">Birimler yükleniyor…</p>
                </div>
              ) : availableUnits.length === 0 ? (
                <p className="text-text-muted font-body text-xs text-center py-6">
                  Henüz birimin yok. Önce mağaza ya da savaştan birim kazan.
                </p>
              ) : (
                <UnitRoster
                  units={availableUnits}
                  commanders={availableCommanders}
                  placedUnitIds={placedUnitIds}
                  placedCommanderIds={placedCommanderIds}
                  mode={rosterMode}
                  onModeChange={setRosterMode}
                  selectedUnitId={pendingUnit?.id ?? null}
                  selectedCommanderId={pendingCmd?.id ?? null}
                  onSelectUnit={handleSelectUnit}
                  onSelectCommander={handleSelectCommander}
                />
              )}
            </div>
          </MangaPanel>
        </div>
      </div>
    </div>
  );
}
