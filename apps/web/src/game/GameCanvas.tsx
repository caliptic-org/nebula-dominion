'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameSocket } from './socket/GameSocket';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';
import { UIScene } from './scenes/UIScene';
import { WinLoseScene } from './scenes/WinLoseScene';
import { TutorialOverlayScene } from './scenes/TutorialOverlayScene';
import { getRaceVisual } from './raceVisuals';
import type { Race, GameMode } from './types';

interface Props {
  race: string;
  mode: string;
  userId: string;
  tutorial?: boolean;
}

const GAME_W = BattleScene.WIDTH;
const GAME_H = BattleScene.HEIGHT;

export default function GameCanvas({ race, mode, userId, tutorial = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const socketRef = useRef<GameSocket | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const socket = new GameSocket(userId, race);
    socketRef.current = socket;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_W,
      height: GAME_H,
      parent: containerRef.current,
      backgroundColor: '#07090f',
      scene: [BootScene, BattleScene, UIScene, WinLoseScene, TutorialOverlayScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      callbacks: {
        postBoot: (game) => {
          // Expose game for E2E tests via postBoot (avoids React StrictMode lifecycle issues)
          (window as unknown as Record<string, unknown>).__phaserGame = game;
          game.scene.start('BootScene', {
            socket,
            race: race as Race,
            mode: mode as GameMode,
            tutorial,
            tutorialRaceColorHex: getRaceVisual(race).hex,
          });
        },
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      delete (window as typeof window & { __phaserGame?: Phaser.Game }).__phaserGame;
      socketRef.current?.destroy();
      gameRef.current?.destroy(true);
      gameRef.current = null;
      socketRef.current = null;
    };
  }, [race, mode, userId, tutorial]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: GAME_W,
        aspectRatio: `${GAME_W} / ${GAME_H}`,
        margin: '0 auto',
        position: 'relative',
      }}
    >
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0 }}
      />
    </div>
  );
}
