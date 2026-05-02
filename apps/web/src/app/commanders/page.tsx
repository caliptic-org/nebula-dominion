'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Race, RACE_DESCRIPTIONS, CommanderInfo } from '@/types/units';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { GlowButton } from '@/components/ui/GlowButton';
import { CommanderCard } from '@/components/ui/CommanderCard';
import { EquipmentSlots } from '@/components/ui/EquipmentSlots';
import {
  CommanderEquipment,
  EquipmentItem,
  EquipmentSlotType,
  DEMO_COMMANDER_EQUIPMENT,
} from '@/types/equipment';
import clsx from 'clsx';

export default function CommandersPage() {
  const { race, setRace, raceColor, raceGlow } = useRaceTheme();
  const [selectedCommander, setSelectedCommander] = useState<CommanderInfo | null>(
    RACE_DESCRIPTIONS[Race.INSAN].commanders[0]
  );
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  // Equipment state keyed by commander id
  const [equipmentMap, setEquipmentMap] = useState<Record<string, CommanderEquipment>>({
    voss: DEMO_COMMANDER_EQUIPMENT,
  });

  function getEquipment(commanderId: string): CommanderEquipment {
    return equipmentMap[commanderId] ?? { commanderId, slots: {}, lockedSlots: [EquipmentSlotType.AKSESUAR_3, EquipmentSlotType.OZEL] };
  }

  function handleEquip(slot: EquipmentSlotType, item: EquipmentItem) {
    if (!selectedCommander) return;
    setEquipmentMap(prev => ({
      ...prev,
      [selectedCommander.id]: {
        ...getEquipment(selectedCommander.id),
        slots: { ...getEquipment(selectedCommander.id).slots, [slot]: item },
      },
    }));
  }

  function handleUnequip(slot: EquipmentSlotType) {
    if (!selectedCommander) return;
    setEquipmentMap(prev => {
      const curr = getEquipment(selectedCommander.id);
      const slots = { ...curr.slots };
      delete slots[slot];
      return { ...prev, [selectedCommander.id]: { ...curr, slots } };
    });
  }

  const races = Object.values(Race) as Race[];
  const raceDesc = RACE_DESCRIPTIONS[race];
  const allCommanders = races.flatMap(r => RACE_DESCRIPTIONS[r].commanders);

  function handleRaceChange(r: Race) {
    setRace(r);
    setSelectedCommander(RACE_DESCRIPTIONS[r].commanders[0]);
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col relative"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Background */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />
      <div className="fixed inset-0 halftone-bg pointer-events-none opacity-15" aria-hidden />

      {/* Top bar */}
      <header
        className="relative z-40 sticky top-0 flex items-center justify-between px-4 py-3"
        style={{
          background: 'rgba(8,10,16,0.9)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-display text-text-muted text-xs hover:text-text-primary transition-colors flex items-center gap-1"
          >
            ← Ana Üs
          </Link>
          <div
            className="h-4 w-px"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          />
          <div>
            <span className="badge badge-race mr-2">Komutanlar</span>
            <span className="font-display text-sm font-black text-text-primary">
              {allCommanders.length} Komutan
            </span>
          </div>
        </div>

        {/* Race filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {races.map((r) => {
            const d = RACE_DESCRIPTIONS[r];
            const active = r === race;
            return (
              <button
                key={r}
                onClick={() => handleRaceChange(r)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-display font-bold shrink-0 transition-all duration-200"
                style={{
                  background: active ? d.bgColor : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? d.color : 'rgba(255,255,255,0.08)'}`,
                  color: active ? d.color : '#555',
                  boxShadow: active ? `0 0 10px ${d.glowColor}` : 'none',
                }}
              >
                <span>{d.icon}</span>
                <span className="hidden sm:inline">{d.name}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main layout */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* Commanders Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {raceDesc.commanders.map((cmd) => (
              <CommanderCard
                key={cmd.id}
                commander={cmd}
                selected={selectedCommander?.id === cmd.id}
                onSelect={setSelectedCommander}
              />
            ))}
          </div>

          {/* Other races preview */}
          {races.filter(r => r !== race).map((r) => {
            const d = RACE_DESCRIPTIONS[r];
            return (
              <div key={r} className="mt-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-lg">{d.icon}</span>
                  <h3
                    className="font-display text-sm font-black"
                    style={{ color: d.color }}
                  >
                    {d.name}
                  </h3>
                  <div className="flex-1 h-px" style={{ background: `${d.color}20` }} />
                  <button
                    onClick={() => handleRaceChange(r)}
                    className="font-display text-[10px] uppercase tracking-widest transition-colors"
                    style={{ color: d.color }}
                  >
                    Tümünü Gör →
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {d.commanders.slice(0, 4).map((cmd) => (
                    <CommanderCard
                      key={cmd.id}
                      commander={cmd}
                      selected={selectedCommander?.id === cmd.id}
                      onSelect={setSelectedCommander}
                      compact
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        {selectedCommander && (
          <div
            className="lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l overflow-y-auto"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="relative">
              {/* Full portrait */}
              <div className="relative h-72 overflow-hidden">
                {!imgError[selectedCommander.id] ? (
                  <Image
                    src={selectedCommander.portrait}
                    alt={selectedCommander.name}
                    fill
                    className="object-cover object-top"
                    onError={() => setImgError(prev => ({ ...prev, [selectedCommander.id]: true }))}
                    priority
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-6xl"
                    style={{ background: RACE_DESCRIPTIONS[selectedCommander.race].bgColor }}
                  >
                    {RACE_DESCRIPTIONS[selectedCommander.race].icon}
                  </div>
                )}
                {/* Gradient overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, var(--color-bg) 0%, transparent 50%)`,
                  }}
                />
                {/* Name overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div
                    className="font-display text-2xl font-black leading-tight"
                    style={{
                      color: RACE_DESCRIPTIONS[selectedCommander.race].color,
                      textShadow: `0 0 20px ${RACE_DESCRIPTIONS[selectedCommander.race].glowColor}`,
                    }}
                  >
                    {selectedCommander.name}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="badge text-[9px]"
                      style={{
                        background: RACE_DESCRIPTIONS[selectedCommander.race].bgColor,
                        color: RACE_DESCRIPTIONS[selectedCommander.race].color,
                        border: `1px solid ${RACE_DESCRIPTIONS[selectedCommander.race].color}40`,
                      }}
                    >
                      {RACE_DESCRIPTIONS[selectedCommander.race].name}
                    </span>
                    <span
                      className="badge text-[9px]"
                      style={{
                        background: 'rgba(255,200,50,0.12)',
                        color: '#ffc832',
                        border: '1px solid rgba(255,200,50,0.3)',
                      }}
                    >
                      Seviye {selectedCommander.level}
                    </span>
                    {!selectedCommander.isUnlocked && (
                      <span className="badge text-[9px]" style={{ background: 'rgba(255,51,85,0.1)', color: '#ff3355', border: '1px solid rgba(255,51,85,0.3)' }}>
                        Kilitli
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Story */}
              <div className="p-5">
                <MangaPanel className="p-4 mb-4">
                  <div className="font-display text-[9px] uppercase tracking-widest text-text-muted mb-2">Hikaye</div>
                  <p className="text-text-secondary text-xs leading-relaxed">{selectedCommander.story}</p>
                </MangaPanel>

                {/* Abilities */}
                <div className="mb-6">
                  <div className="font-display text-[9px] uppercase tracking-widest text-text-muted mb-3">Yetenekler</div>
                  <div className="space-y-2">
                    {selectedCommander.abilities.map((ab, i) => (
                      <div
                        key={ab}
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-display font-black shrink-0"
                          style={{
                            background: RACE_DESCRIPTIONS[selectedCommander.race].bgColor,
                            color: RACE_DESCRIPTIONS[selectedCommander.race].color,
                            border: `1px solid ${RACE_DESCRIPTIONS[selectedCommander.race].color}30`,
                          }}
                        >
                          {i + 1}
                        </div>
                        <span className="text-text-primary text-xs font-medium">{ab}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                {selectedCommander.isUnlocked ? (
                  <GlowButton
                    className="w-full"
                    icon={<span>→</span>}
                    style={{ background: RACE_DESCRIPTIONS[selectedCommander.race].color }}
                  >
                    Komutan Seç
                  </GlowButton>
                ) : (
                  <GlowButton
                    className="w-full"
                    style={{ background: '#ffc832', color: '#080a10' }}
                    icon={<span>🔓</span>}
                  >
                    Kilidi Aç
                  </GlowButton>
                )}
              </div>

              {/* Equipment Slots */}
              {selectedCommander.isUnlocked && (
                <div
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <EquipmentSlots
                    equipment={getEquipment(selectedCommander.id)}
                    raceColor={RACE_DESCRIPTIONS[selectedCommander.race].color}
                    raceGlow={RACE_DESCRIPTIONS[selectedCommander.race].glowColor}
                    onEquip={handleEquip}
                    onUnequip={handleUnequip}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
