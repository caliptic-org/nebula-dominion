'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useEffect, type CSSProperties, type DragEvent } from 'react';
import {
  ND,
  RACES,
  Sigil,
  Eyebrow,
  H3,
  Caption,
  Panel,
  NDButton,
  useNDRace,
} from '@/components/handoff';
import {
  SlotUnit, SlotCommander, FormationSlotData, CommanderSlotData,
  RaceSynergy, RaceKey, SYNERGY_RULES, CLASS_ICONS,
  Formation, FormationTemplate, UnitSlot as ApiUnitSlot, CommanderSlot as ApiCommanderSlot,
  FORMATION_LIMITS,
} from './types';
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
const ROWS = ['rear', 'middle', 'front'] as const;
const ROW_COUNTS: Record<typeof ROWS[number], number> = { rear: 3, middle: 3, front: 4 };
const TOTAL_UNIT_SLOTS = FORMATION_LIMITS.MAX_UNIT_SLOTS;
const ROW_LABELS: Record<string, string> = { front: 'Ön Saf', middle: 'Orta Saf', rear: 'Arka Saf' };
const POWER_DEBOUNCE_MS = 350;

interface FormationScreenNDProps {
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

function applyApiSlotsToVisual(apiSlots: ApiUnitSlot[], units: SlotUnit[]): FormationSlotData[] {
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

function applyApiCommandersToVisual(apiSlots: ApiCommanderSlot[], commanders: SlotCommander[]): CommanderSlotData[] {
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

export function FormationScreenND({ playerId }: FormationScreenNDProps) {
  const race = useNDRace();
  const router = useRouter();

  /* ── Roster state ─────────────────────────────────────────────────────── */
  const [availableUnits, setAvailableUnits] = useState<SlotUnit[]>([]);
  const [availableCommanders, setAvailableCommanders] = useState<SlotCommander[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  /* ── Formation state ──────────────────────────────────────────────────── */
  const [unitSlots, setUnitSlots] = useState<FormationSlotData[]>(buildInitialUnitSlots);
  const [commanderSlots, setCommanderSlots] = useState<CommanderSlotData[]>(buildInitialCommanderSlots);
  const [rosterMode, setRosterMode] = useState<'units' | 'commanders'>('units');
  const [raceFilter, setRaceFilter] = useState<RaceKey | 'all'>('all');

  /* ── Templates ────────────────────────────────────────────────────────── */
  const [presets, setPresets] = useState<PresetEntry[]>([]);
  const [savedFormations, setSavedFormations] = useState<SavedFormationEntry[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [activeFormationId, setActiveFormationId] = useState<string | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  /* ── Save / power ─────────────────────────────────────────────────────── */
  const [saveFlash, setSaveFlash] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [serverPower, setServerPower] = useState<number | null>(null);
  const [powerCalculating, setPowerCalculating] = useState(false);

  /* ── Click-to-place selection ─────────────────────────────────────────── */
  const [pendingUnit, setPendingUnit] = useState<SlotUnit | null>(null);
  const [pendingCmd, setPendingCmd] = useState<SlotCommander | null>(null);

  /* ── Load units ───────────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    setUnitsLoading(true);
    setUnitsError(null);

    fetchPlayerUnits(playerId)
      .then((rawUnits) => {
        if (cancelled) return;
        const units = rawUnits.map(unitToSlotUnit);
        const commanders = rawUnits.filter(isCommanderEligible).map(unitToSlotCommander);
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

  /* ── Load templates + saved formations ────────────────────────────────── */
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

        const lastActive = savedEntries.find((e) => e.isLastActive) ?? savedEntries[0];
        if (lastActive) {
          setUnitSlots(lastActive.unitSlots);
          setCommanderSlots(lastActive.commanderSlots);
          setActiveTemplate(lastActive.name);
          setActiveFormationId(lastActive.id);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPresets([]);
        setSavedFormations([]);
      })
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false);
      });

    return () => { cancelled = true; };
  }, [playerId, unitsLoading, availableUnits, availableCommanders]);

  /* ── Synergies ────────────────────────────────────────────────────────── */
  const synergies = useMemo<RaceSynergy[]>(() => {
    const counts = new Map<string, number>();
    unitSlots.forEach((s) => { if (s.unit) counts.set(s.unit.race, (counts.get(s.unit.race) ?? 0) + 1); });
    commanderSlots.forEach((s) => { if (s.commander) counts.set(s.commander.race, (counts.get(s.commander.race) ?? 0) + 1); });
    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([r, count]) => {
        const raceKey = r as RaceKey;
        const rules = SYNERGY_RULES[raceKey].map((rule) => ({ ...rule, active: count >= rule.threshold }));
        return { race: raceKey, count, bonuses: rules };
      });
  }, [unitSlots, commanderSlots]);

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
    const up = unitSlots.reduce((acc, s) => acc + (s.unit?.power ?? 0), 0);
    const cp = commanderSlots.reduce((acc, s) => acc + (s.commander?.power ?? 0), 0);
    return up + cp;
  }, [unitSlots, commanderSlots]);

  const displayedPower = serverPower ?? optimisticPower;
  const filledSlots = unitSlots.filter((s) => !!s.unit).length;
  const filledCmds = commanderSlots.filter((s) => !!s.commander).length;

  /* ── Server-side power (debounced) ────────────────────────────────────── */
  const apiUnitSlotsKey = useMemo(() => JSON.stringify(visualToApiUnitSlots(unitSlots)), [unitSlots]);
  const apiCmdSlotsKey = useMemo(() => JSON.stringify(visualToApiCommanderSlots(commanderSlots)), [commanderSlots]);

  useEffect(() => {
    const apiUnitSlots = JSON.parse(apiUnitSlotsKey) as ApiUnitSlot[];
    const apiCmdSlots = JSON.parse(apiCmdSlotsKey) as ApiCommanderSlot[];

    if (apiUnitSlots.length === 0 && apiCmdSlots.length === 0) {
      setServerPower(null);
      setPowerCalculating(false);
      return;
    }

    let cancelled = false;
    setPowerCalculating(true);

    const handle = window.setTimeout(() => {
      calculatePower({ playerId, unitSlots: apiUnitSlots, commanderSlots: apiCmdSlots })
        .then((res) => { if (!cancelled) setServerPower(res.totalPower); })
        .catch(() => { /* keep optimistic */ })
        .finally(() => { if (!cancelled) setPowerCalculating(false); });
    }, POWER_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [playerId, apiUnitSlotsKey, apiCmdSlotsKey]);

  /* ── Unit interactions ────────────────────────────────────────────────── */
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

  /* ── Commander interactions ───────────────────────────────────────────── */
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

  /* ── Roster selection ─────────────────────────────────────────────────── */
  const handleSelectUnit = useCallback((unit: SlotUnit) => {
    setPendingUnit((prev) => prev?.id === unit.id ? null : unit);
    setPendingCmd(null);
  }, []);

  const handleSelectCommander = useCallback((cmd: SlotCommander) => {
    setPendingCmd((prev) => prev?.id === cmd.id ? null : cmd);
    setPendingUnit(null);
  }, []);

  /* ── Save ─────────────────────────────────────────────────────────────── */
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
        saved = await createFormation({ playerId, name, unitSlots: apiUnitSlots, commanderSlots: apiCmdSlots });
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

  /* ── Escape cancels selection ─────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPendingUnit(null); setPendingCmd(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hasPending = !!pendingUnit || !!pendingCmd;
  const allTemplates: TemplateEntry[] = useMemo(() => [...savedFormations, ...presets], [savedFormations, presets]);

  /* ── Error state ──────────────────────────────────────────────────────── */
  if (unitsError) {
    return (
      <div
        data-race={race.key}
        style={{
          minHeight: '100dvh',
          background: ND.bgDeep,
          color: ND.text,
          fontFamily: ND.body,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <Panel race={race} glow style={{ padding: 24, maxWidth: 380, textAlign: 'center' }}>
          <div style={{ marginBottom: 12 }}>
            <Sigil race={race} size={36} glow />
          </div>
          <H3 style={{ color: race.primary, marginBottom: 6 }}>Birimler yüklenemedi</H3>
          <Caption style={{ color: ND.textDim, marginBottom: 14 }}>{unitsError}</Caption>
          <NDButton race={race} size="sm" onClick={() => window.location.reload()}>Yeniden Dene</NDButton>
        </Panel>
      </div>
    );
  }

  return (
    <div
      data-race={race.key}
      style={{
        minHeight: '100dvh',
        background: ND.bgDeep,
        color: ND.text,
        fontFamily: ND.body,
        position: 'relative',
        overflow: 'hidden',
        paddingBottom: 96,
      }}
    >
      <Backdrop race={race} />

      {/* Pending selection toast */}
      {hasPending && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            padding: '8px 14px',
            background: 'rgba(6,8,15,0.92)',
            border: `1px solid ${race.primary}66`,
            color: race.primary,
            fontFamily: ND.display,
            fontSize: 11,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            boxShadow: `0 0 20px ${race.glow}`,
            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
          }}
        >
          {pendingUnit ? `${pendingUnit.name} seçildi — slot’a yerleştir` : `${pendingCmd?.name} seçildi — slot’a yerleştir`}
          {' · '}<span style={{ color: ND.textDim }}>ESC iptal</span>
        </div>
      )}

      {/* Save error toast */}
      {saveError && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            padding: '8px 14px',
            background: 'rgba(20,4,8,0.92)',
            border: `1px solid ${ND.danger}77`,
            color: ND.danger,
            fontFamily: ND.display,
            fontSize: 11,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            maxWidth: 420,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{saveError}</span>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            aria-label="Hatayı kapat"
            style={{
              all: 'unset',
              cursor: 'pointer',
              color: ND.textDim,
              padding: '0 4px',
            }}
          >✕</button>
        </div>
      )}

      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderBottom: `1px solid ${ND.border}`,
          background: 'linear-gradient(180deg, rgba(6,8,15,0.94), rgba(6,8,15,0.55))',
          backdropFilter: 'blur(10px)',
        }}
      >
        <button
          type="button"
          aria-label="Geri"
          onClick={() => router.back()}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 32,
            height: 32,
            border: `1px solid ${ND.border}`,
            color: ND.textDim,
            fontFamily: ND.display,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)',
          }}
        >
          ‹
        </button>
        <div>
          <Eyebrow>Screen · Roster</Eyebrow>
          <H3 style={{ color: race.primary }}>FORMASYON KUR</H3>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeTemplate && (
            <span
              style={{
                fontFamily: ND.mono,
                fontSize: 10,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: race.primary,
                padding: '4px 8px',
                border: `1px solid ${race.primary}55`,
                background: `${race.primary}14`,
                borderRadius: 999,
              }}
            >
              {activeTemplate}
            </span>
          )}
          <Sigil race={race} size={28} glow />
        </div>
      </header>

      <main
        style={{
          position: 'relative',
          zIndex: 5,
          padding: 14,
          maxWidth: 1240,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: 12,
          }}
          className="formation-grid"
        >
          {/* Left/main column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            {/* Power readout */}
            <Panel race={race} glow style={{ padding: 14 }}>
              <NDPowerReadout
                power={displayedPower}
                max={50000}
                race={race}
                calculating={powerCalculating}
                verified={serverPower !== null}
                filledSlots={filledSlots}
                totalSlots={TOTAL_UNIT_SLOTS}
                cmds={filledCmds}
                maxCmds={MAX_COMMANDERS}
              />
            </Panel>

            {/* Commanders */}
            <Panel race={race} style={{ padding: 14 }}>
              <SectionHeader
                title="Komutanlar"
                trailing={`${filledCmds}/${MAX_COMMANDERS}`}
                race={race}
                hint="Sürükle-bırak · listeden seç · slot’a dokun"
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {commanderSlots.map((slot, i) => (
                  <NDCommanderSlot
                    key={slot.id}
                    commander={slot.commander}
                    slotId={slot.id}
                    index={i}
                    pendingCommander={pendingCmd}
                    onDrop={handleCommanderDrop}
                    onSlotClick={handleCommanderSlotClick}
                  />
                ))}
              </div>
            </Panel>

            {/* Formation grid */}
            <Panel race={race} glow style={{ padding: 14 }}>
              <SectionHeader
                title={`Formasyon ${filledSlots}/${TOTAL_UNIT_SLOTS}`}
                race={race}
                hint={hasPending ? 'Slot seç → yerleştir' : 'Sürükle-bırak veya listeden seç'}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {ROWS.map((row) => {
                  const rowSlots = unitSlots.filter((s) => s.row === row);
                  return (
                    <div key={row}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ height: 1, flex: 1, background: `${race.primary}30` }} />
                        <Eyebrow color={race.primary}>{ROW_LABELS[row]}</Eyebrow>
                        <div style={{ height: 1, flex: 1, background: `${race.primary}30` }} />
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          flexWrap: 'wrap',
                          justifyContent: 'center',
                          padding: 8,
                          background: `${race.primary}06`,
                          border: `1px dashed ${race.primary}30`,
                          borderRadius: 4,
                        }}
                      >
                        {rowSlots.map((slot) => (
                          <NDUnitSlot
                            key={slot.id}
                            unit={slot.unit}
                            slotId={slot.id}
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
            </Panel>

            {/* Synergy */}
            <Panel style={{ padding: 14 }}>
              <SectionHeader
                title="Irk Sinerjisi"
                race={race}
                trailing={
                  synergies.filter((s) => s.count >= 2).length > 0
                    ? `${synergies.filter((s) => s.count >= 2).length} AKTİF`
                    : undefined
                }
              />
              <div style={{ marginTop: 10 }}>
                <NDSynergyPanel synergies={synergies} />
              </div>
            </Panel>

            {/* Templates */}
            <Panel style={{ padding: 14 }}>
              <SectionHeader title="Şablonlar" race={race} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
                <NDButton race={race} size="sm" variant="ghost" onClick={handleReset}>SIFIRLA</NDButton>
                <div style={{ height: 16, width: 1, background: ND.border }} />
                {templatesLoading ? (
                  <Eyebrow>Şablonlar yükleniyor…</Eyebrow>
                ) : allTemplates.length === 0 ? (
                  <Eyebrow>Kayıtlı formasyon yok</Eyebrow>
                ) : (
                  allTemplates.map((t) => {
                    const key = `${t.kind}:${t.id}`;
                    const isActive = activeTemplate === t.name && (
                      t.kind === 'preset' ? activeFormationId === null : activeFormationId === t.id
                    );
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleLoadEntry(t)}
                        title={`"${t.name}" formasyonunu yükle`}
                        style={{
                          all: 'unset',
                          cursor: 'pointer',
                          padding: '6px 12px',
                          fontFamily: ND.display,
                          fontSize: 11,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          border: `1px solid ${isActive ? race.primary + '88' : ND.border}`,
                          background: isActive ? `${race.primary}1a` : 'transparent',
                          color: isActive ? race.primary : ND.textDim,
                          boxShadow: isActive ? `0 0 12px -4px ${race.glow}` : 'none',
                          borderRadius: 3,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {t.kind === 'preset' && <span style={{ opacity: 0.6 }}>⚙</span>}
                        {t.name}
                      </button>
                    );
                  })
                )}
              </div>
            </Panel>
          </div>

          {/* Roster sidebar */}
          <div className="formation-roster">
            <Panel style={{ padding: 14, position: 'sticky', top: 76 }}>
              <SectionHeader
                title="Kadro"
                race={race}
                trailing={hasPending ? '✕ İptal' : undefined}
                onTrailingClick={hasPending ? () => { setPendingUnit(null); setPendingCmd(null); } : undefined}
              />
              <div style={{ display: 'flex', gap: 4, marginTop: 10, marginBottom: 10, padding: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
                {(['units', 'commanders'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRosterMode(m)}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      flex: 1,
                      textAlign: 'center',
                      padding: '6px 8px',
                      fontFamily: ND.display,
                      fontSize: 10,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      color: rosterMode === m ? '#0A0E1A' : ND.textDim,
                      background: rosterMode === m ? race.primary : 'transparent',
                      borderRadius: 3,
                      fontWeight: rosterMode === m ? 700 : 500,
                    }}
                  >
                    {m === 'units' ? 'Birimler' : 'Komutanlar'}
                  </button>
                ))}
              </div>

              {/* Race filter */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {(['all', 'insan', 'zerg', 'otomat', 'canavar', 'seytan'] as const).map((k) => {
                  const isAll = k === 'all';
                  const filterRace = !isAll ? RACES[k] : null;
                  const active = raceFilter === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setRaceFilter(k)}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        padding: '3px 8px',
                        fontFamily: ND.mono,
                        fontSize: 9,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        border: `1px solid ${active ? (filterRace?.primary ?? race.primary) + '88' : ND.border}`,
                        background: active ? `${filterRace?.primary ?? race.primary}18` : 'transparent',
                        color: active ? (filterRace?.primary ?? race.primary) : ND.textMute,
                        borderRadius: 2,
                      }}
                    >
                      {isAll ? 'Tümü' : RACES[k].short}
                    </button>
                  );
                })}
              </div>

              {hasPending && (
                <div
                  style={{
                    marginBottom: 8,
                    padding: '6px 8px',
                    background: `${race.primary}10`,
                    border: `1px solid ${race.primary}44`,
                    color: race.primary,
                    fontFamily: ND.mono,
                    fontSize: 10,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    borderRadius: 2,
                  }}
                >
                  Seçim aktif — formasyonda bir slot’a tıkla
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 'calc(100dvh - 280px)', overflowY: 'auto', paddingRight: 4 }}>
                {unitsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        height: 48,
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${ND.border}`,
                        borderRadius: 4,
                        animation: 'pulse 1.4s ease-in-out infinite',
                      }}
                    />
                  ))
                ) : rosterMode === 'units' ? (
                  (() => {
                    const filtered = availableUnits.filter((u) => (raceFilter === 'all' || u.race === raceFilter) && !placedUnitIds.has(u.id));
                    if (filtered.length === 0) {
                      return <Caption style={{ textAlign: 'center', padding: '14px 0' }}>Tüm birimler yerleştirildi</Caption>;
                    }
                    return filtered.map((u) => (
                      <NDRosterRowUnit
                        key={u.id}
                        unit={u}
                        isSelected={pendingUnit?.id === u.id}
                        onSelect={handleSelectUnit}
                      />
                    ));
                  })()
                ) : (
                  (() => {
                    const filtered = availableCommanders.filter((c) => (raceFilter === 'all' || c.race === raceFilter) && !placedCommanderIds.has(c.id));
                    if (filtered.length === 0) {
                      return <Caption style={{ textAlign: 'center', padding: '14px 0' }}>Tüm komutanlar yerleştirildi</Caption>;
                    }
                    return filtered.map((c) => (
                      <NDRosterRowCommander
                        key={c.id}
                        commander={c}
                        isSelected={pendingCmd?.id === c.id}
                        onSelect={handleSelectCommander}
                      />
                    ));
                  })()
                )}
              </div>
            </Panel>
          </div>
        </div>
      </main>

      {/* Sticky footer save bar */}
      <footer
        style={{
          position: 'fixed',
          insetInline: 0,
          bottom: 0,
          zIndex: 20,
          padding: 12,
          background: 'linear-gradient(0deg, rgba(6,8,15,0.96), rgba(6,8,15,0.55))',
          borderTop: `1px solid ${ND.border}`,
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, maxWidth: 1240, margin: '0 auto', alignItems: 'center' }}>
          <span style={{ fontFamily: ND.mono, fontSize: 11, color: ND.textDim, letterSpacing: '0.08em' }}>
            GÜÇ <span style={{ color: race.primary, fontWeight: 600 }}>{displayedPower.toLocaleString('tr-TR')}</span>
          </span>
          <div style={{ flex: 1 }} />
          <NDButton race={race} variant="ghost" size="md" onClick={handleReset}>SIFIRLA</NDButton>
          <NDButton
            race={race}
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={saving || unitsLoading}
            style={saveFlash ? { boxShadow: `0 0 28px ${race.glow}` } : undefined}
          >
            {saving ? 'KAYDEDİLİYOR…' : saveFlash ? '✓ KAYDEDİLDİ' : 'KAYDET'}
          </NDButton>
        </div>
      </footer>

      <style jsx>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media (min-width: 1024px) {
          .formation-grid {
            grid-template-columns: minmax(0, 1fr) 320px;
          }
        }
      `}</style>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function Backdrop({ race }: { race: { primary: string } }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(50% 40% at 50% 0%, ${race.primary}20 0%, transparent 60%),
                     radial-gradient(60% 50% at 50% 100%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%),
                     ${ND.bgDeep}`,
        pointerEvents: 'none',
      }}
    />
  );
}

interface SectionHeaderProps {
  title: string;
  race: { primary: string };
  trailing?: string;
  hint?: string;
  onTrailingClick?: () => void;
}

function SectionHeader({ title, race, trailing, hint, onTrailingClick }: SectionHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <H3 style={{ color: race.primary }}>{title}</H3>
      {trailing && (
        onTrailingClick ? (
          <button
            type="button"
            onClick={onTrailingClick}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontFamily: ND.mono,
              fontSize: 10,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: ND.textDim,
              padding: '2px 8px',
              border: `1px solid ${ND.border}`,
              borderRadius: 999,
            }}
          >
            {trailing}
          </button>
        ) : (
          <span
            style={{
              fontFamily: ND.mono,
              fontSize: 10,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: race.primary,
              padding: '2px 8px',
              border: `1px solid ${race.primary}44`,
              background: `${race.primary}14`,
              borderRadius: 999,
            }}
          >
            {trailing}
          </span>
        )
      )}
      <div style={{ flex: 1 }} />
      {hint && <Eyebrow>{hint}</Eyebrow>}
    </div>
  );
}

/* ── Power readout ───────────────────────────────────────────────────────── */

function NDPowerReadout({
  power, max, race, calculating, verified, filledSlots, totalSlots, cmds, maxCmds,
}: {
  power: number; max: number; race: { primary: string; glow: string };
  calculating: boolean; verified: boolean;
  filledSlots: number; totalSlots: number; cmds: number; maxCmds: number;
}) {
  const pct = Math.min((power / max) * 100, 100);
  const tier = pct < 30 ? 'low' : pct < 60 ? 'mid' : pct < 85 ? 'high' : 'max';
  const tierLabel = ({ low: 'ZAYIF', mid: 'ORTA', high: 'GÜÇLÜ', max: 'EFSANE' } as const)[tier];
  const tierColor = tier === 'low' ? ND.danger : tier === 'mid' ? ND.warn : race.primary;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Eyebrow>Savaş Gücü</Eyebrow>
          <span
            style={{
              fontFamily: ND.display,
              fontSize: 10,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: tierColor,
              border: `1px solid ${tierColor}55`,
              background: `${tierColor}12`,
              padding: '2px 8px',
              borderRadius: 2,
              fontWeight: 700,
            }}
          >
            {tierLabel}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span
            style={{
              fontFamily: ND.display,
              fontWeight: 700,
              fontSize: 28,
              color: race.primary,
              textShadow: `0 0 20px ${race.glow}`,
              letterSpacing: '0.02em',
              lineHeight: 1,
            }}
          >
            {power.toLocaleString('tr-TR')}
          </span>
          <span style={{ fontFamily: ND.mono, fontSize: 11, color: ND.textDim }}>/ {max.toLocaleString('tr-TR')}</span>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuenow={power}
        aria-valuemax={max}
        aria-label="Savaş gücü"
        style={{
          marginTop: 8,
          height: 8,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${race.primary}33`,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 2,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${race.primary}66 0%, ${race.primary} 60%, #ffffff33 100%)`,
            boxShadow: `0 0 12px ${race.glow}`,
            transition: 'width 320ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        />
      </div>

      <div
        style={{
          marginTop: 6,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: ND.mono,
          fontSize: 10,
          color: ND.textDim,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <span>
          {filledSlots}/{totalSlots} birim · {cmds}/{maxCmds} komutan
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: 999,
              background: calculating ? ND.warn : verified ? ND.ok : ND.textMute,
              boxShadow: calculating || verified ? `0 0 6px currentColor` : 'none',
              color: calculating ? ND.warn : verified ? ND.ok : ND.textMute,
              animation: calculating ? 'pulse 1.2s ease-in-out infinite' : undefined,
            }}
          />
          {calculating ? 'Sunucu hesaplıyor' : verified ? 'Sunucu doğruladı' : 'Tahmini güç'}
        </span>
      </div>
    </div>
  );
}

/* ── Unit slot ──────────────────────────────────────────────────────────── */

interface NDUnitSlotProps {
  unit: SlotUnit | null;
  slotId: string;
  pendingUnit: SlotUnit | null;
  onDrop: (slotId: string, unitId: string) => void;
  onSlotClick: (slotId: string, currentUnit: SlotUnit | null) => void;
}

function NDUnitSlot({ unit, slotId, pendingUnit, onDrop, onSlotClick }: NDUnitSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);
  const unitRace = unit ? RACES[unit.race] : null;
  const pendingRace = pendingUnit ? RACES[pendingUnit.race] : null;

  const canReceive = !!pendingUnit && !unit;
  const wouldSwap = !!pendingUnit && !!unit;

  const ringColor = pendingRace?.primary ?? ND.borderHi;

  const baseStyle: CSSProperties = {
    position: 'relative',
    width: 64,
    height: 80,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: unit ? `${unitRace?.primary ?? ND.border}18` : 'rgba(6,8,15,0.55)',
    border: `1px solid ${unit ? (unitRace?.primary ?? ND.border) + '77' : ND.border}`,
    clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
    cursor: pendingUnit || unit ? 'pointer' : 'default',
    userSelect: 'none',
    overflow: 'hidden',
    transition: 'background 160ms ease, transform 160ms ease',
  };

  return (
    <div
      draggable={!!unit}
      role="button"
      aria-label={
        canReceive ? `${pendingUnit?.name} için boş slot — yerleştirmek için tıkla`
          : wouldSwap ? `${pendingUnit?.name} ile ${unit?.name} yer değiştir`
          : unit ? `${unit.name} — kaldırmak için tıkla`
          : 'Boş slot'
      }
      onDragStart={(e: DragEvent<HTMLDivElement>) => {
        if (!unit) return;
        e.dataTransfer.setData('unitId', unit.id);
        e.dataTransfer.setData('fromSlot', slotId);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragOver(true); e.dataTransfer.dropEffect = 'move'; }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        const uid = e.dataTransfer.getData('unitId');
        if (uid) onDrop(slotId, uid);
      }}
      onClick={() => onSlotClick(slotId, unit)}
      style={baseStyle}
      title={unit ? `${unit.name} Lv.${unit.level} — Güç: ${unit.power.toLocaleString()}` : 'Birim ekle'}
    >
      {(canReceive || isDragOver) && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            border: `2px solid ${ringColor}`,
            boxShadow: `0 0 14px ${ringColor}99 inset`,
            clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
            pointerEvents: 'none',
          }}
        />
      )}

      {unit && unitRace ? (
        <>
          <div style={{ position: 'relative', width: '100%', flex: 1, overflow: 'hidden' }}>
            {!imgError ? (
              <Image
                src={unit.portrait}
                alt={unit.name}
                fill
                sizes="64px"
                onError={() => setImgError(true)}
                style={{ objectFit: 'cover', objectPosition: 'top' }}
              />
            ) : (
              <div
                style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${unitRace.primary}1c`, fontSize: 22,
                }}
              >
                {CLASS_ICONS[unit.unitClass]}
              </div>
            )}
            {/* dim overlay */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(to top, ${unitRace.primary}55 0%, transparent 60%)`,
                pointerEvents: 'none',
              }}
            />
            {/* tier */}
            <div
              style={{
                position: 'absolute',
                top: 2, right: 2,
                padding: '1px 4px',
                fontFamily: ND.display,
                fontSize: 9,
                fontWeight: 700,
                color: '#0A0E1A',
                background: unitRace.primary,
                lineHeight: 1,
              }}
            >
              T{unit.level}
            </div>
            <div
              style={{
                position: 'absolute',
                top: 2, left: 2,
                fontSize: 10,
                lineHeight: 1,
              }}
              aria-hidden
            >
              {CLASS_ICONS[unit.unitClass]}
            </div>
          </div>
          <div
            style={{
              width: '100%',
              padding: '2px 4px',
              textAlign: 'center',
              fontFamily: ND.display,
              fontSize: 9,
              color: unitRace.primary,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              background: 'rgba(6,8,15,0.6)',
            }}
          >
            {unit.name.split(' ')[0]}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: canReceive ? 0.85 : 0.45 }}>
          <span style={{ fontFamily: ND.display, fontSize: 18, color: canReceive ? ringColor : ND.textMute, lineHeight: 1 }}>
            {canReceive ? '↓' : '+'}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Commander slot ─────────────────────────────────────────────────────── */

interface NDCommanderSlotProps {
  commander: SlotCommander | null;
  slotId: string;
  index: number;
  pendingCommander: SlotCommander | null;
  onDrop: (slotId: string, commanderId: string) => void;
  onSlotClick: (slotId: string, currentCmd: SlotCommander | null) => void;
}

function NDCommanderSlot({ commander, slotId, index, pendingCommander, onDrop, onSlotClick }: NDCommanderSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);
  const cmdRace = commander ? RACES[commander.race] : null;
  const pendingRace = pendingCommander ? RACES[pendingCommander.race] : null;

  const canReceive = !!pendingCommander && !commander;
  const ringColor = pendingRace?.primary ?? ND.borderHi;

  const baseStyle: CSSProperties = {
    position: 'relative',
    width: 72,
    height: 96,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: commander ? `${cmdRace?.primary ?? ND.border}1c` : 'rgba(6,8,15,0.55)',
    border: `1px solid ${commander ? (cmdRace?.primary ?? ND.border) + '88' : ND.border}`,
    clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
    cursor: pendingCommander || commander ? 'pointer' : 'default',
    overflow: 'hidden',
    userSelect: 'none',
    boxShadow: commander ? `0 0 0 1px ${cmdRace?.primary}33, 0 0 12px -4px ${cmdRace?.glow}` : undefined,
  };

  return (
    <div
      draggable={!!commander}
      role="button"
      aria-label={
        canReceive ? `${pendingCommander?.name} için boş komutan slotu`
          : commander ? `${commander.name} komutanı — kaldırmak için tıkla`
          : `Komutan slotu ${index + 1}`
      }
      onDragStart={(e: DragEvent<HTMLDivElement>) => {
        if (!commander) return;
        e.dataTransfer.setData('commanderId', commander.id);
        e.dataTransfer.setData('fromSlot', slotId);
      }}
      onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        const cid = e.dataTransfer.getData('commanderId');
        if (cid) onDrop(slotId, cid);
      }}
      onClick={() => onSlotClick(slotId, commander)}
      style={baseStyle}
    >
      {(canReceive || isDragOver) && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            border: `2px solid ${ringColor}`,
            boxShadow: `0 0 16px ${ringColor}99 inset`,
            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
            pointerEvents: 'none',
          }}
        />
      )}

      {commander && cmdRace ? (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 2, insetInline: 0,
              display: 'flex', justifyContent: 'center', gap: 1,
              pointerEvents: 'none', zIndex: 2,
            }}
          >
            {Array.from({ length: Math.min(commander.level, 5) }).map((_, i) => (
              <span key={i} style={{ fontSize: 7, color: cmdRace.primary }}>★</span>
            ))}
          </div>
          <div style={{ position: 'relative', width: '100%', flex: 1, overflow: 'hidden', marginTop: 10 }}>
            {!imgError ? (
              <Image
                src={commander.portrait}
                alt={commander.name}
                fill
                sizes="72px"
                onError={() => setImgError(true)}
                style={{ objectFit: 'cover', objectPosition: 'top' }}
              />
            ) : (
              <div
                style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${cmdRace.primary}1c`, fontSize: 22,
                }}
              >
                ♛
              </div>
            )}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(to top, ${cmdRace.primary}66 0%, transparent 55%)`,
              }}
            />
          </div>
          <div
            style={{
              width: '100%',
              padding: '3px 4px',
              textAlign: 'center',
              fontFamily: ND.display,
              fontSize: 9,
              color: cmdRace.primary,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              background: 'rgba(6,8,15,0.65)',
            }}
          >
            {commander.name.split(' ')[0]}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: canReceive ? 0.85 : 0.4 }}>
          <span style={{ fontFamily: ND.display, fontSize: 18, color: canReceive ? ringColor : ND.textMute, lineHeight: 1 }}>
            {canReceive ? '↓' : '♛'}
          </span>
          <span
            style={{
              fontFamily: ND.mono,
              fontSize: 8,
              color: ND.textMute,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}
          >
            Komutan {index + 1}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Roster rows ────────────────────────────────────────────────────────── */

function NDRosterRowUnit({
  unit, isSelected, onSelect,
}: { unit: SlotUnit; isSelected: boolean; onSelect: (u: SlotUnit) => void }) {
  const [imgError, setImgError] = useState(false);
  const r = RACES[unit.race];
  return (
    <div
      role="button"
      aria-pressed={isSelected}
      draggable
      onDragStart={(e: DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('unitId', unit.id);
        e.dataTransfer.setData('fromRoster', 'true');
      }}
      onClick={() => onSelect(unit)}
      title={`${unit.name} — seç veya sürükle`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        cursor: 'pointer',
        background: isSelected ? `${r.primary}18` : 'transparent',
        border: `1px solid ${isSelected ? r.primary + '88' : ND.border}`,
        borderRadius: 3,
        boxShadow: isSelected ? `0 0 12px -4px ${r.glow}` : 'none',
        transition: 'background 160ms ease, border-color 160ms ease',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 36, height: 36,
          flexShrink: 0,
          overflow: 'hidden',
          border: `1px solid ${r.primary}55`,
          borderRadius: 2,
        }}
      >
        {!imgError ? (
          <Image src={unit.portrait} alt={unit.name} fill sizes="36px" onError={() => setImgError(true)} style={{ objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${r.primary}1c` }}>
            {CLASS_ICONS[unit.unitClass]}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: ND.display, fontSize: 12, fontWeight: 700, color: r.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {unit.name}
          </span>
          <span style={{ fontFamily: ND.mono, fontSize: 9, color: ND.textDim }}>Lv.{unit.level}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 10 }} aria-hidden>{CLASS_ICONS[unit.unitClass]}</span>
          <span style={{ fontFamily: ND.mono, fontSize: 9, color: ND.textMute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{unit.unitClass}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: ND.display, fontSize: 12, fontWeight: 700, color: r.primary, fontVariantNumeric: 'tabular-nums' }}>
          {unit.power.toLocaleString('tr-TR')}
        </div>
        <div style={{ fontFamily: ND.mono, fontSize: 8, color: ND.textMute, letterSpacing: '0.10em', textTransform: 'uppercase' }}>güç</div>
      </div>
      {isSelected && <span style={{ color: r.primary, fontSize: 12 }} aria-hidden>✓</span>}
    </div>
  );
}

function NDRosterRowCommander({
  commander, isSelected, onSelect,
}: { commander: SlotCommander; isSelected: boolean; onSelect: (c: SlotCommander) => void }) {
  const [imgError, setImgError] = useState(false);
  const r = RACES[commander.race];
  return (
    <div
      role="button"
      aria-pressed={isSelected}
      draggable
      onDragStart={(e: DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('commanderId', commander.id);
        e.dataTransfer.setData('fromRoster', 'true');
      }}
      onClick={() => onSelect(commander)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        cursor: 'pointer',
        background: isSelected ? `${r.primary}18` : 'transparent',
        border: `1px solid ${isSelected ? r.primary + '88' : ND.border}`,
        borderRadius: 3,
        boxShadow: isSelected ? `0 0 12px -4px ${r.glow}` : 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 36, height: 36,
          flexShrink: 0,
          overflow: 'hidden',
          border: `1px solid ${r.primary}77`,
          boxShadow: `0 0 8px ${r.glow}66`,
          borderRadius: 2,
        }}
      >
        {!imgError ? (
          <Image src={commander.portrait} alt={commander.name} fill sizes="36px" onError={() => setImgError(true)} style={{ objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${r.primary}1c` }}>♛</div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: ND.display, fontSize: 12, fontWeight: 700, color: r.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {commander.name}
          </span>
          <span style={{ fontFamily: ND.mono, fontSize: 9, color: ND.textDim }}>Lv.{commander.level}</span>
        </div>
        <div style={{ display: 'flex', gap: 1, marginTop: 2 }}>
          {Array.from({ length: Math.min(commander.level, 5) }).map((_, i) => (
            <span key={i} style={{ fontSize: 8, color: r.primary }}>★</span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: ND.display, fontSize: 12, fontWeight: 700, color: r.primary, fontVariantNumeric: 'tabular-nums' }}>
          {commander.power.toLocaleString('tr-TR')}
        </div>
        <div style={{ fontFamily: ND.mono, fontSize: 8, color: ND.textMute, letterSpacing: '0.10em', textTransform: 'uppercase' }}>güç</div>
      </div>
      {isSelected && <span style={{ color: r.primary, fontSize: 12 }} aria-hidden>✓</span>}
    </div>
  );
}

/* ── Synergy panel ──────────────────────────────────────────────────────── */

function NDSynergyPanel({ synergies }: { synergies: RaceSynergy[] }) {
  if (synergies.length === 0) {
    return <Caption style={{ textAlign: 'center', padding: '10px 0', opacity: 0.7 }}>Sinerji yok — birim ekle</Caption>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {synergies.map((syn) => {
        const r = RACES[syn.race];
        const rules = SYNERGY_RULES[syn.race];
        const nextThreshold = rules.find((rule) => syn.count < rule.threshold)?.threshold ?? null;
        return (
          <div key={syn.race}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: ND.display, fontSize: 11, fontWeight: 700, color: r.primary, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                  {r.name}
                </span>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 8, height: 8,
                        background: i < syn.count ? r.primary : 'rgba(255,255,255,0.08)',
                        boxShadow: i < syn.count ? `0 0 5px ${r.glow}` : 'none',
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontFamily: ND.mono, fontSize: 10, color: ND.textDim }}>×{syn.count}</span>
              </div>
              {nextThreshold && (
                <span style={{ fontFamily: ND.mono, fontSize: 9, color: ND.textMute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  +{nextThreshold - syn.count} → bonus
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {rules.map((bonus) => {
                const unlocked = syn.count >= bonus.threshold;
                return (
                  <div
                    key={bonus.threshold}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      fontFamily: ND.mono,
                      fontSize: 9,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      border: `1px solid ${unlocked ? r.primary + '88' : ND.border}`,
                      background: unlocked ? `${r.primary}14` : 'transparent',
                      color: unlocked ? r.primary : ND.textMute,
                      boxShadow: unlocked ? `0 0 8px -2px ${r.glow}` : 'none',
                      borderRadius: 999,
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{bonus.threshold}×</span>
                    <span>{bonus.description}</span>
                    {unlocked && <span style={{ fontSize: 8 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {synergies.filter((s) => s.count >= 2).length === 0 && (
        <Caption style={{ marginTop: 4, opacity: 0.7 }}>Sinerji için aynı ırktan 2+ birim ekle.</Caption>
      )}
    </div>
  );
}
