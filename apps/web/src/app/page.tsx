'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const RACES = [
  { value: 'human', label: 'Human — Balanced warriors' },
  { value: 'zerg', label: 'Zerg — Swarm tactics' },
  { value: 'automaton', label: 'Automaton — Heavy armor' },
];

export default function LobbyPage() {
  const router = useRouter();
  const [race, setRace] = useState('human');
  const [mode, setMode] = useState<'pve' | 'pvp'>('pve');
  const [userId, setUserId] = useState(() => `player_${Math.random().toString(36).slice(2, 9)}`);

  const handlePlay = () => {
    const params = new URLSearchParams({ race, mode, userId });
    router.push(`/battle?${params.toString()}`);
  };

  return (
    <main className="lobby">
      <h1>Nebula Dominion</h1>
      <p className="subtitle">Turn-based galactic strategy</p>

      <div className="card">
        <h2>Start Battle</h2>

        <div className="field">
          <label>Your Race</label>
          <select value={race} onChange={(e) => setRace(e.target.value)}>
            {RACES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Game Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as 'pve' | 'pvp')}>
            <option value="pve">PvE — vs AI Bot</option>
            <option value="pvp">PvP — Ranked Matchmaking</option>
          </select>
        </div>

        <div className="field">
          <label>Player ID (demo)</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="player_abc123"
          />
        </div>

        <button className="btn btn-primary" onClick={handlePlay}>
          Enter Battle
        </button>
      </div>
    </main>
  );
}
