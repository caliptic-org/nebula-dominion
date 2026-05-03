import Phaser from 'phaser';
import { BattleRewards, GameRoom } from '../socket/GameSocket';
import { THEME, getRaceVisual } from '../theme';

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

const FIRST_VICTORY_LS_KEY = 'nebula:firstVictoryClaimedAt';
const ONBOARDING_LS_KEY = 'nebula:onboarding:v1';

export class WinLoseScene extends Phaser.Scene {
  private myId!: string;
  private winLoseData!: WinLoseData;
  private tutorial = false;

  constructor() {
    super({ key: 'WinLoseScene' });
  }

  init(initData: { data: Record<string, unknown>; myId: string; tutorial?: boolean }) {
    this.myId = initData.myId;
    this.winLoseData = initData.data as unknown as WinLoseData;
    this.tutorial = initData.tutorial === true;
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
    const accentHex = isWinner ? winnerVisual.color : THEME.DANGER;
    const accentStr = isWinner ? winnerVisual.colorStr : THEME.DANGER_STR;

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
      this.addVictoryParticles(width / 2, py + 64);
      // Subtitle: race name
      const raceLabel = (winnerRace ?? '').toString().toUpperCase();
      this.add.text(width / 2, py + 100, `★  ${raceLabel}  ★`, {
        fontSize: '13px', fontStyle: 'bold', color: accentStr,
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 0);

      // First Victory badge: shown only the first time a player wins, with
      // an extra emphasis if they win the tutorial battle. Persisted to
      // localStorage so a /battle reload can't farm the celebration twice.
      if (this.shouldShowFirstVictory()) {
        this.spawnFirstVictoryBadge(width / 2, py + panelH - 110, accentHex, accentStr);
        this.markFirstVictoryClaimed();
        this.markOnboardingComplete();
      }
    }

    // End reason
    const reasonLabel: Record<string, string> = {
      all_units_destroyed: 'Tum dusman birimleri yok edildi',
      surrender: 'Rakip teslim oldu',
      timeout: 'Sure doldu',
    };
    this.add.text(width / 2, py + 90, reasonLabel[this.winLoseData.endReason] ?? '', {
      fontSize: '14px', color: THEME.TEXT_SECONDARY,
    }).setOrigin(0.5, 0);

    // ELO change
    const eloDeltaStr = eloDelta >= 0 ? `+${eloDelta}` : `${eloDelta}`;
    const eloColor = eloDelta >= 0 ? THEME.SUCCESS_STR : THEME.DANGER_STR;
    this.add.text(width / 2, py + 120, `ELO: ${this.winLoseData.newElo?.[this.myId] ?? '—'}  (${eloDeltaStr})`, {
      fontSize: '16px', fontStyle: 'bold', color: eloColor,
    }).setOrigin(0.5, 0);

    // Rewards
    if (rewards) {
      const cy = py + 165;
      this.add.text(width / 2, cy, 'REWARDS', {
        fontSize: '13px', color: THEME.TEXT_SECONDARY, fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      const rewardItems = [
        { label: 'Minerals', value: rewards.minerals, color: THEME.REWARD_MINERAL, icon: '◆' },
        { label: 'Gas', value: rewards.gas, color: THEME.REWARD_GAS, icon: '◈' },
        { label: 'XP', value: rewards.xp, color: THEME.REWARD_XP, icon: '★' },
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
        const badgeText = rewards.bonuses.map((b) => bonusLabels[b] ?? b).join('  ');
        this.add.text(width / 2, py + 290, badgeText, {
          fontSize: '12px', color: THEME.WARNING_STR,
        }).setOrigin(0.5, 0);
      }
    }

    // Buttons
    const btnY = py + panelH - 56;

    const goHome = () => { window.location.href = '/'; };

    const playAgainBtn = this.add.text(width / 2 - 80, btnY, 'PLAY AGAIN', {
      fontSize: '14px', fontStyle: 'bold', color: THEME.SUCCESS_STR,
      backgroundColor: '#0d3d1e', padding: { x: 16, y: 10 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

    playAgainBtn.on('pointerdown', () => { cancelAutoRedirect(); window.location.reload(); });
    playAgainBtn.on('pointerover', () => { cancelAutoRedirect(); playAgainBtn.setStyle({ color: THEME.ACCENT_STR }); });
    playAgainBtn.on('pointerout', () => playAgainBtn.setStyle({ color: THEME.SUCCESS_STR }));

    const menuBtn = this.add.text(width / 2 + 80, btnY, 'ANA USSE DON', {
      fontSize: '14px', fontStyle: 'bold', color: THEME.BRAND_STR,
      backgroundColor: '#1a1a30', padding: { x: 16, y: 10 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => { cancelAutoRedirect(); goHome(); });
    menuBtn.on('pointerover', () => menuBtn.setStyle({ color: THEME.TEXT_PRIMARY }));
    menuBtn.on('pointerout', () => menuBtn.setStyle({ color: THEME.BRAND_STR }));

    // Auto-redirect to Ana Us after 3s, cancelled by any button interaction.
    const AUTO_REDIRECT_SECONDS = 3;
    let remaining = AUTO_REDIRECT_SECONDS;
    const countdownText = this.add.text(width / 2, btnY + 44, `Ana Usse donus: ${remaining}s`, {
      fontSize: '11px', color: THEME.TEXT_MUTED,
    }).setOrigin(0.5, 0);

    const redirectTimer = this.time.addEvent({
      delay: 1000,
      repeat: AUTO_REDIRECT_SECONDS - 1,
      callback: () => {
        remaining -= 1;
        if (remaining <= 0) {
          countdownText.destroy();
          goHome();
        } else {
          countdownText.setText(`Ana Usse donus: ${remaining}s`);
        }
      },
    });

    let cancelled = false;
    const cancelAutoRedirect = () => {
      if (cancelled) return;
      cancelled = true;
      redirectTimer.remove(false);
      countdownText.destroy();
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cancelAutoRedirect);
  }

  /** "First Victory" is a one-shot celebration to make the first win feel huge. */
  private shouldShowFirstVictory(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      // Tutorial wins always trigger the badge; later wins don't.
      const claimed = window.localStorage.getItem(FIRST_VICTORY_LS_KEY);
      return claimed === null;
    } catch {
      return false;
    }
  }

  private markFirstVictoryClaimed() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(FIRST_VICTORY_LS_KEY, new Date().toISOString());
    } catch {
      // ignore quota errors
    }
  }

  /** Mirrors the schema in `useOnboarding.ts` — keep both in sync. */
  private markOnboardingComplete() {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(ONBOARDING_LS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      const next = {
        ...parsed,
        hasSeenIntro: true,
        hasCompletedTutorial: true,
        firstVictoryClaimedAt: new Date().toISOString(),
        lastSessionEndedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(ONBOARDING_LS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  private spawnFirstVictoryBadge(cx: number, cy: number, accentHex: number, accentStr: string) {
    const badge = this.add.container(cx, cy).setDepth(200);

    const ringR = 46;
    const halo = this.add.graphics();
    halo.fillStyle(accentHex, 0.18);
    halo.fillCircle(0, 0, ringR + 22);
    badge.add(halo);

    const ring = this.add.graphics();
    ring.lineStyle(3, accentHex, 1);
    ring.strokeCircle(0, 0, ringR);
    ring.lineStyle(1, accentHex, 0.5);
    ring.strokeCircle(0, 0, ringR + 8);
    badge.add(ring);

    const star = this.add.text(0, -2, '★', {
      fontSize: '46px', fontStyle: 'bold', color: accentStr,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);
    badge.add(star);

    const subtitle = this.add.text(0, ringR + 26, 'ILK ZAFER', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: accentStr,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    badge.add(subtitle);

    const microTitle = this.add.text(0, ringR + 44, this.tutorial ? 'Egitim tamamlandi' : 'Komutan rutubesinde', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '11px',
      color: '#e8e8f0',
    }).setOrigin(0.5);
    badge.add(microTitle);

    badge.setAlpha(0).setScale(0.3);

    this.tweens.add({
      targets: badge,
      alpha: 1,
      scale: 1,
      duration: 520,
      delay: 1100,
      ease: 'Back.out',
    });

    // Continuous halo pulse to keep the eye locked on it.
    this.tweens.add({
      targets: halo,
      scale: { from: 1, to: 1.18 },
      alpha: { from: 0.55, to: 0.15 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      delay: 1600,
    });

    // Slow ring rotation
    this.tweens.add({
      targets: ring,
      angle: 360,
      duration: 8000,
      repeat: -1,
      ease: 'Linear',
      delay: 1600,
    });

    // Star sparkle bounce
    this.tweens.add({
      targets: star,
      scale: { from: 1, to: 1.08 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      delay: 1600,
    });

    // Confetti particles around the badge
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const dist = 70 + Math.random() * 40;
      const dot = this.add.graphics();
      dot.fillStyle(accentHex, 1);
      dot.fillCircle(0, 0, 3);
      badge.add(dot);
      this.tweens.add({
        targets: dot,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 700,
        delay: 1500 + Math.random() * 200,
        ease: 'Cubic.out',
        onComplete: () => dot.destroy(),
      });
    }
  }

  private drawRadialSpeedLines(cx: number, cy: number, color: number) {
    const g = this.add.graphics();
    const lines = 24;
    for (let i = 0; i < lines; i++) {
      const angle = (i / lines) * Math.PI * 2;
      const r1 = 60;
      const r2 = 480;
      g.lineStyle(2, color, 0.18);
      g.beginPath();
      g.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      g.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      g.strokePath();
    }
    g.setAlpha(0);
    this.tweens.add({ targets: g, alpha: 1, duration: 400, delay: 200 });
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
