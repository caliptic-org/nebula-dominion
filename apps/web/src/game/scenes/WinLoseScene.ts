import * as Phaser from 'phaser';
import { BattleRewards } from '../socket/GameSocket';
import { THEME } from '../theme';
import { getRaceVisual } from '../raceVisuals';

interface WinLoseData {
  winner: string;
  loser: string;
  endReason: string;
  eloDelta: Record<string, number>;
  newElo: Record<string, number>;
  rewards: Record<string, BattleRewards>;
  /** Optional â€” winner's race for race-coloured glow border. */
  winnerRace?: string;
  room?: GameRoom;
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

    // Winner-race glow color â€” defaults to success/danger if race unavailable
    const winnerRace = this.winLoseData.winnerRace
      ?? this.winLoseData.room?.players?.[this.winLoseData.winner]?.race;
    const winnerVisual = getRaceVisual(winnerRace);
    const accentHex = isWinner ? winnerVisual.hex : THEME.DANGER;
    const accentStr = isWinner ? winnerVisual.str : THEME.DANGER_STR;

    // Dim overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, width, height);
    this.tweens.add({ targets: overlay, alpha: 0.78, duration: 400 });

    // Speed-line burst behind the panel for "decisive moment" vibe
    this.drawRadialSpeedLines(width / 2, height / 2, accentHex);

    // Panel
    const panelW = 460;
    const panelH = 400;
    const px = (width - panelW) / 2;
    const py = (height - panelH) / 2;

    const panel = this.add.graphics();
    panel.fillStyle(isWinner ? THEME.WIN_PANEL : THEME.LOSE_PANEL, 0.97);
    panel.lineStyle(3, isWinner ? THEME.WIN_BORDER : THEME.LOSE_BORDER, 1);
    panel.fillRoundedRect(px, py, panelW, panelH, 16);
    panel.strokeRoundedRect(px, py, panelW, panelH, 16);
    panel.setAlpha(0);
    this.tweens.add({ targets: panel, alpha: 1, duration: 350, delay: 200 });

    // Title
    const titleText = isWinner ? 'VICTORY!' : 'DEFEAT';
    const titleColor = isWinner ? THEME.SUCCESS_STR : THEME.DANGER_STR;
    const title = this.add.text(width / 2, py + 44, titleText, {
      fontSize: '48px', fontStyle: 'bold', color: titleColor,
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5, 0.5).setAlpha(0).setScale(0.5);

    this.tweens.add({
      targets: title,
      alpha: 1, scale: 1, angle: 0,
      duration: 500, delay: 400, ease: 'Back.out',
    });

    if (isWinner) {
      this.addVictoryParticles(width / 2, py + 64, accentHex);
      // Subtitle: race name
      this.add.text(width / 2, py + 100, `${winnerVisual.icon}  ${winnerVisual.label}  ${winnerVisual.icon}`, {
        fontSize: '13px', fontStyle: 'bold', color: accentStr,
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 0);
    }

    // End reason
    const reasonLabel: Record<string, string> = {
      all_units_destroyed: 'Tum dusman birimleri yok edildi',
      surrender: 'Rakip teslim oldu',
      timeout: 'Sure doldu',
    };
    this.add.text(width / 2, py + 90, reasonLabel[this.data.endReason] ?? '', {
      fontSize: '14px', color: THEME.TEXT_SECONDARY,
    }).setOrigin(0.5, 0);

    // ELO change
    const eloDeltaStr = eloDelta >= 0 ? `+${eloDelta}` : `${eloDelta}`;
    const eloColor = eloDelta >= 0 ? THEME.SUCCESS_STR : THEME.DANGER_STR;
    this.add.text(width / 2, py + 120, `ELO: ${this.data.newElo?.[this.myId] ?? 'â€”'}  (${eloDeltaStr})`, {
      fontSize: '16px', fontStyle: 'bold', color: eloColor,
    }).setOrigin(0.5, 0);

    // Rewards
    if (rewards) {
      const cy = py + 165;
      this.add.text(width / 2, cy, 'REWARDS', {
        fontSize: '13px', color: THEME.TEXT_SECONDARY, fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      const rewardItems = [
        { label: 'Minerals', value: rewards.minerals, color: THEME.REWARD_MINERAL, icon: 'â—†' },
        { label: 'Gas', value: rewards.gas, color: THEME.REWARD_GAS, icon: 'â—ˆ' },
        { label: 'XP', value: rewards.xp, color: THEME.REWARD_XP, icon: 'â˜…' },
      ];

      rewardItems.forEach((item, i) => {
        const itemX = px + 78 + i * 116;
        const itemY = cy + 28;

        const box = this.add.graphics();
        box.fillStyle(THEME.PANEL_INK, 1);
        box.fillRoundedRect(itemX - 40 + 2, itemY + 2, 90, 74, 8);
        box.fillStyle(0x141428, 0.95);
        box.fillRoundedRect(itemX - 40, itemY, 90, 74, 8);
        box.lineStyle(2, accentHex, 0.4);
        box.strokeRoundedRect(itemX - 40, itemY, 90, 74, 8);
        box.setAlpha(0);

        const icon = this.add.text(itemX + 5, itemY + 10, item.icon, {
          fontSize: '24px', color: item.color,
        }).setOrigin(0.5, 0).setAlpha(0);

        const valText = this.add.text(itemX + 5, itemY + 40, '0', {
          fontSize: '16px', fontStyle: 'bold', color: THEME.TEXT_PRIMARY,
        }).setOrigin(0.5, 0).setAlpha(0);

        const labelText = this.add.text(itemX + 5, itemY + 58, item.label, {
          fontSize: '10px', color: THEME.TEXT_MUTED,
        }).setOrigin(0.5, 0).setAlpha(0);

        this.tweens.add({
          targets: [box, icon, valText, labelText],
          alpha: 1, duration: 300, delay: 700 + i * 120,
        });

        this.tweens.addCounter({
          from: 0, to: item.value,
          duration: 800, delay: 800 + i * 120,
          ease: 'Power2',
          onUpdate: (tween) => valText.setText(String(Math.floor(tween.getValue() ?? 0))),
        });
      });

      if (rewards.bonuses.length > 0) {
        const bonusLabels: Record<string, string> = {
          quick_victory: 'âš¡ Hizli Zafer',
          epic_battle:   'âš” Epik Savas',
          upset_victory: 'â˜… Surpriz Zafer',
        };
        const badgeText = rewards.bonuses.map((b) => bonusLabels[b] ?? b).join('  ');
        this.add.text(width / 2, py + 290, badgeText, {
          fontSize: '12px', color: THEME.WARNING_STR,
        }).setOrigin(0.5, 0);
      }
    }

    // Buttons
    const btnY = py + panelH - 56;

    const playAgainBtn = this.add.text(width / 2 - 80, btnY, 'PLAY AGAIN', {
      fontSize: '14px', fontStyle: 'bold', color: THEME.SUCCESS_STR,
      backgroundColor: '#0d3d1e', padding: { x: 16, y: 10 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

    playAgainBtn.on('pointerdown', () => window.location.reload());
    playAgainBtn.on('pointerover', () => playAgainBtn.setStyle({ color: THEME.ACCENT_STR }));
    playAgainBtn.on('pointerout', () => playAgainBtn.setStyle({ color: THEME.SUCCESS_STR }));

    const menuBtn = this.add.text(width / 2 + 80, btnY, 'MAIN MENU', {
      fontSize: '14px', fontStyle: 'bold', color: THEME.BRAND_STR,
      backgroundColor: '#1a1a30', padding: { x: 16, y: 10 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => { window.location.href = '/'; });
    menuBtn.on('pointerover', () => menuBtn.setStyle({ color: THEME.TEXT_PRIMARY }));
    menuBtn.on('pointerout', () => menuBtn.setStyle({ color: THEME.BRAND_STR }));
  }

  private addVictoryParticles(cx: number, cy: number) {
    const colors = [THEME.ENERGY, THEME.SUCCESS, THEME.BRAND, THEME.INFO];
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
