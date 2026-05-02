import Phaser from 'phaser';
import { BattleRewards, GameRoom } from '../socket/GameSocket';
import { THEME } from '../theme';
import { getRaceVisual } from '../raceVisuals';

interface WinLoseData {
  winner: string;
  loser: string;
  endReason: string;
  eloDelta: Record<string, number>;
  newElo: Record<string, number>;
  rewards: Record<string, BattleRewards>;
  /** Optional — winner's race for race-coloured glow border. */
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

    // Winner-race glow color — defaults to success/danger if race unavailable
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
    // Drop-shadow ink
    panel.fillStyle(THEME.PANEL_INK, 0.95);
    panel.fillRoundedRect(px + 5, py + 5, panelW, panelH, 12);
    // Panel body
    panel.fillStyle(isWinner ? THEME.WIN_PANEL : THEME.LOSE_PANEL, 0.97);
    panel.fillRoundedRect(px, py, panelW, panelH, 12);
    // Heavy ink stroke
    panel.lineStyle(3, THEME.PANEL_INK, 1);
    panel.strokeRoundedRect(px, py, panelW, panelH, 12);
    // Inner race-colored glow border
    panel.lineStyle(2, accentHex, 0.95);
    panel.strokeRoundedRect(px + 4, py + 4, panelW - 8, panelH - 8, 10);
    panel.lineStyle(1, accentHex, 0.4);
    panel.strokeRoundedRect(px + 8, py + 8, panelW - 16, panelH - 16, 8);
    panel.setAlpha(0);
    this.tweens.add({ targets: panel, alpha: 1, duration: 350, delay: 200 });

    // Race ribbon strip across the top
    const ribbon = this.add.graphics();
    ribbon.fillStyle(accentHex, 0.95);
    ribbon.fillRect(px + 12, py + 18, panelW - 24, 6);
    ribbon.fillStyle(THEME.PANEL_INK, 1);
    for (let i = 0; i < 18; i++) {
      const sx = px + 12 + i * ((panelW - 24) / 18);
      ribbon.fillRect(sx + 2, py + 18, 2, 6);
    }
    ribbon.setAlpha(0);
    this.tweens.add({ targets: ribbon, alpha: 1, duration: 250, delay: 300 });

    // Title — manga impact text
    const titleText = isWinner ? 'ZAFER!' : 'YENILGI';
    const title = this.add.text(width / 2, py + 64, titleText, {
      fontSize: '52px',
      fontFamily: 'Impact, "Arial Black", system-ui, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: accentStr,
      strokeThickness: 8,
    }).setOrigin(0.5, 0.5).setAlpha(0).setScale(0.4).setAngle(-4);

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
    this.add.text(width / 2, py + 130, reasonLabel[this.winLoseData.endReason] ?? '', {
      fontSize: '13px', color: THEME.TEXT_MUTED,
    }).setOrigin(0.5, 0);

    // ELO change
    const eloDeltaStr = eloDelta >= 0 ? `+${eloDelta}` : `${eloDelta}`;
    const eloColor = eloDelta >= 0 ? THEME.SUCCESS_STR : THEME.DANGER_STR;
    this.add.text(width / 2, py + 152, `ELO ${this.winLoseData.newElo?.[this.myId] ?? '—'}  (${eloDeltaStr})`, {
      fontSize: '15px', fontStyle: 'bold', color: eloColor,
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // Rewards
    if (rewards) {
      const cy = py + 192;
      this.add.text(width / 2, cy, 'ODULLER', {
        fontSize: '12px', color: THEME.TEXT_SECONDARY, fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      const rewardItems = [
        { label: 'Mineral',  value: rewards.minerals, color: THEME.REWARD_MINERAL, icon: '◆' },
        { label: 'Gaz',      value: rewards.gas,      color: THEME.REWARD_GAS,     icon: '◈' },
        { label: 'XP',       value: rewards.xp,       color: THEME.REWARD_XP,      icon: '★' },
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
          quick_victory: '⚡ Hizli Zafer',
          epic_battle:   '⚔ Epik Savas',
          upset_victory: '★ Surpriz Zafer',
        };
        const badgeText = rewards.bonuses.map((b) => bonusLabels[b] ?? b).join('   ');
        this.add.text(width / 2, py + 308, badgeText, {
          fontSize: '12px', fontStyle: 'bold', color: THEME.WARNING_STR,
          stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5, 0);
      }
    }

    // Buttons — manga style
    const btnY = py + panelH - 52;
    this.makeMangaButton(width / 2 - 90, btnY, 'TEKRAR OYNA', accentHex, accentStr, () => window.location.reload());
    this.makeMangaButton(width / 2 + 90, btnY, 'ANA EKRAN',   THEME.BRAND, THEME.BRAND_STR, () => { window.location.href = '/'; });
  }

  private makeMangaButton(
    x: number, y: number, label: string,
    accentHex: number, accentStr: string,
    onClick: () => void,
  ) {
    const padX = 14;
    const padY = 9;
    const text = this.add.text(0, 0, label, {
      fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    });
    const tw = text.width + padX * 2;
    const th = text.height + padY * 2;
    text.setPosition(padX, padY);

    const bg = this.add.graphics();
    const draw = (down = false) => {
      bg.clear();
      bg.fillStyle(THEME.PANEL_INK, 1);
      bg.fillRoundedRect(2, 2, tw, th, 4);
      bg.fillStyle(accentHex, down ? 0.6 : 0.85);
      bg.fillRoundedRect(0, 0, tw, th, 4);
      bg.lineStyle(2, THEME.PANEL_INK, 1);
      bg.strokeRoundedRect(0, 0, tw, th, 4);
      bg.lineStyle(1, 0xffffff, 0.25);
      bg.strokeRoundedRect(2, 2, tw - 4, th - 4, 3);
    };
    draw(false);

    const c = this.add.container(x - tw / 2, y, [bg, text]).setDepth(60);
    c.setSize(tw, th);
    c.setInteractive(new Phaser.Geom.Rectangle(0, 0, tw, th), Phaser.Geom.Rectangle.Contains);
    c.on('pointerover', () => text.setColor(accentStr));
    c.on('pointerout', () => { text.setColor('#ffffff'); draw(false); });
    c.on('pointerdown', () => { draw(true); onClick(); });
    c.on('pointerup', () => draw(false));
    return c;
  }

  private drawRadialSpeedLines(cx: number, cy: number, color: number) {
    const g = this.add.graphics();
    const lineCount = 28;
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2 + (Math.random() * 0.06);
      const r1 = 110 + Math.random() * 30;
      const r2 = 360 + Math.random() * 80;
      g.lineStyle(2 + Math.random() * 2, color, 0.6);
      g.beginPath();
      g.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      g.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      g.strokePath();
    }
    g.setAlpha(0);
    this.tweens.add({
      targets: g,
      alpha: 1,
      duration: 250,
      yoyo: true,
      hold: 600,
      onComplete: () => g.destroy(),
    });
  }

  private addVictoryParticles(cx: number, cy: number, color: number) {
    const colors = [color, THEME.ENERGY, 0xffffff];
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
