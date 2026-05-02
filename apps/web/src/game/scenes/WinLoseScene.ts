import Phaser from 'phaser';
import { BattleRewards } from '../socket/GameSocket';

interface WinLoseData {
  winner: string;
  loser: string;
  endReason: string;
  eloDelta: Record<string, number>;
  newElo: Record<string, number>;
  rewards: Record<string, BattleRewards>;
}

export class WinLoseScene extends Phaser.Scene {
  private myId!: string;
  private winLoseData!: WinLoseData;

  constructor() {
    super({ key: 'WinLoseScene' });
  }

  init(initData: { data: Record<string, unknown>; myId: string }) {
    this.myId = initData.myId;
    this.winLoseData = initData.data as unknown as WinLoseData;
  }

  create() {
    const { width, height } = this.scale;
    const isWinner = this.winLoseData.winner === this.myId;
    const rewards: BattleRewards | undefined = this.winLoseData.rewards?.[this.myId];
    const eloDelta = this.winLoseData.eloDelta?.[this.myId] ?? 0;

    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, width, height);
    this.tweens.add({ targets: overlay, alpha: 0.75, duration: 400 });

    // Result panel
    const panelW = 440;
    const panelH = 380;
    const px = (width - panelW) / 2;
    const py = (height - panelH) / 2;

    const panel = this.add.graphics();
    panel.fillStyle(isWinner ? 0x0d2d0d : 0x2d0d0d, 0.97);
    panel.lineStyle(3, isWinner ? 0x44ff88 : 0xff4444, 1);
    panel.fillRoundedRect(px, py, panelW, panelH, 16);
    panel.strokeRoundedRect(px, py, panelW, panelH, 16);
    panel.setAlpha(0);
    this.tweens.add({ targets: panel, alpha: 1, duration: 350, delay: 200 });

    // Title
    const titleText = isWinner ? 'VICTORY!' : 'DEFEAT';
    const titleColor = isWinner ? '#44ff88' : '#ff4444';
    const title = this.add.text(width / 2, py + 44, titleText, {
      fontSize: '48px', fontStyle: 'bold', color: titleColor,
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5, 0.5).setAlpha(0).setScale(0.5);

    this.tweens.add({
      targets: title,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 500, delay: 400, ease: 'Back.out',
    });

    if (isWinner) this.addVictoryParticles(width / 2, py + 44);

    // End reason
    const reasonLabel: Record<string, string> = {
      all_units_destroyed: 'All enemy units destroyed',
      surrender: 'Opponent surrendered',
      timeout: 'Time limit reached',
    };
    this.add.text(width / 2, py + 90, reasonLabel[this.winLoseData.endReason] ?? '', {
      fontSize: '14px', color: '#888888',
    }).setOrigin(0.5, 0);

    // ELO change
    const eloDeltaStr = eloDelta >= 0 ? `+${eloDelta}` : `${eloDelta}`;
    const eloColor = eloDelta >= 0 ? '#44ff88' : '#ff6666';
    this.add.text(width / 2, py + 120, `ELO: ${this.winLoseData.newElo?.[this.myId] ?? '—'}  (${eloDeltaStr})`, {
      fontSize: '16px', fontStyle: 'bold', color: eloColor,
    }).setOrigin(0.5, 0);

    // Rewards
    if (rewards) {
      const cy = py + 165;
      this.add.text(width / 2, cy, 'REWARDS', {
        fontSize: '13px', color: '#aaaacc', fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      const rewardItems = [
        { label: 'Minerals', value: rewards.minerals, color: '#60aaff', icon: '◆' },
        { label: 'Gas', value: rewards.gas, color: '#88ffaa', icon: '◈' },
        { label: 'XP', value: rewards.xp, color: '#ffcc44', icon: '★' },
      ];

      rewardItems.forEach((item, i) => {
        const itemX = px + 70 + i * 110;
        const itemY = cy + 30;

        const box = this.add.graphics();
        box.fillStyle(0x141428, 0.9);
        box.fillRoundedRect(itemX - 40, itemY, 90, 70, 8);
        box.setAlpha(0);

        const icon = this.add.text(itemX + 5, itemY + 12, item.icon, {
          fontSize: '24px', color: item.color,
        }).setOrigin(0.5, 0).setAlpha(0);

        const valText = this.add.text(itemX + 5, itemY + 40, '0', {
          fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
        }).setOrigin(0.5, 0).setAlpha(0);

        const labelText = this.add.text(itemX + 5, itemY + 58, item.label, {
          fontSize: '10px', color: '#666688',
        }).setOrigin(0.5, 0).setAlpha(0);

        this.tweens.add({ targets: [box, icon, valText, labelText], alpha: 1, duration: 300, delay: 700 + i * 120 });

        // Counting animation
        this.tweens.addCounter({
          from: 0,
          to: item.value,
          duration: 800,
          delay: 800 + i * 120,
          ease: 'Power2',
          onUpdate: (tween) => {
            valText.setText(String(Math.floor(tween.getValue() ?? 0)));
          },
        });
      });

      // Bonus badges
      if (rewards.bonuses.length > 0) {
        const bonusLabels: Record<string, string> = {
          quick_victory: '⚡ Quick Victory',
          epic_battle: '⚔ Epic Battle',
          upset_victory: '🌟 Upset Victory',
        };
        const badgeText = rewards.bonuses.map((b) => bonusLabels[b] ?? b).join('  ');
        this.add.text(width / 2, py + 290, badgeText, {
          fontSize: '12px', color: '#ffaa44',
        }).setOrigin(0.5, 0);
      }
    }

    // Buttons
    const btnY = py + panelH - 56;

    const playAgainBtn = this.add.text(width / 2 - 80, btnY, 'PLAY AGAIN', {
      fontSize: '14px', fontStyle: 'bold', color: '#44ff88',
      backgroundColor: '#0d3d1e', padding: { x: 16, y: 10 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

    playAgainBtn.on('pointerdown', () => window.location.reload());
    playAgainBtn.on('pointerover', () => playAgainBtn.setStyle({ color: '#88ffaa' }));
    playAgainBtn.on('pointerout', () => playAgainBtn.setStyle({ color: '#44ff88' }));

    const menuBtn = this.add.text(width / 2 + 80, btnY, 'MAIN MENU', {
      fontSize: '14px', fontStyle: 'bold', color: '#8888cc',
      backgroundColor: '#1a1a30', padding: { x: 16, y: 10 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => { window.location.href = '/'; });
    menuBtn.on('pointerover', () => menuBtn.setStyle({ color: '#aaaaff' }));
    menuBtn.on('pointerout', () => menuBtn.setStyle({ color: '#8888cc' }));
  }

  private addVictoryParticles(cx: number, cy: number) {
    const colors = [0xffcc00, 0x44ff88, 0xff88ff, 0x60aaff];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const dist = 60 + Math.random() * 80;
      const tx = cx + Math.cos(angle) * dist;
      const ty = cy + Math.sin(angle) * dist;

      const g = this.add.graphics();
      g.fillStyle(colors[i % colors.length], 1);
      g.fillCircle(cx, cy, 5);

      this.tweens.add({
        targets: g,
        x: tx - cx,
        y: ty - cy,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 800 + Math.random() * 400,
        delay: 500 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => g.destroy(),
      });
    }
  }
}
