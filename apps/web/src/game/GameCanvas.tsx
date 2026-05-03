'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { GameSocket } from './socket/GameSocket';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';
import { UIScene } from './scenes/UIScene';
import { WinLoseScene } from './scenes/WinLoseScene';
import type { Race, GameMode } from './types';

interface Props {
  race: string;
  mode: string;
  userId: string;
}

const GAME_W = BattleScene.WIDTH;
const GAME_H = BattleScene.HEIGHT;

export default function GameCanvas({ race, mode, userId }: Props) {
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
      scene: [BootScene, BattleScene, UIScene, WinLoseScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      callbacks: {
        postBoot: (game) => {
          game.scene.start('BootScene', { socket, race: race as Race, mode: mode as GameMode });
        },
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      socketRef.current?.destroy();
      gameRef.current?.destroy(true);
      gameRef.current = null;
      socketRef.current = null;
    };
  }, [race, mode, userId]);

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
