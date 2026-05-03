'use client';

import { Race } from '@/types/units';

const RACE_DATA: Record<Race, { name: string; description: string; color: string }> = {
  [Race.INSAN]:   { name: 'İnsan',   description: 'Dengeli ve çok yönlü savaşçılar.', color: '#60a5fa' },
  [Race.ZERG]:    { name: 'Zerg',    description: 'Hızlı ve sayıca üstün sürü gücü.', color: '#a3e635' },
  [Race.OTOMAT]:  { name: 'Otomat',  description: 'Mekanik hassasiyet ve uzun menzil.', color: '#fb923c' },
  [Race.CANAVAR]: { name: 'Canavar', description: 'Güçlü yakın dövüşçüler.', color: '#f43f5e' },
  [Race.SEYTAN]:  { name: 'Şeytan',  description: 'Karanlık büyü ve korkutucu güç.', color: '#a855f7' },
};

interface Props {
  selectedRace: Race | null;
  onSelect: (race: Race) => void;
  onConfirm: (race: Race) => void;
}

export function RaceSelectionScreen({ selectedRace, onSelect, onConfirm }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">Irk Seç</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {(Object.values(Race) as Race[]).map((race) => {
          const data = RACE_DATA[race];
          const isSelected = selectedRace === race;
          return (
            <button
              key={race}
              onClick={() => onSelect(race)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                isSelected ? 'border-white scale-105' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              style={{ borderColor: isSelected ? data.color : undefined, background: `${data.color}20` }}
            >
              <div className="font-bold" style={{ color: data.color }}>{data.name}</div>
              <div className="text-sm mt-1 text-gray-300">{data.description}</div>
            </button>
          );
        })}
      </div>
      <button
        disabled={!selectedRace}
        onClick={() => selectedRace && onConfirm(selectedRace)}
        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg font-bold transition-colors"
      >
        Devam Et
      </button>
    </div>
  );
}
