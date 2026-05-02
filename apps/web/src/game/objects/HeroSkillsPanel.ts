import Phaser from 'phaser';

export type SkillState = 'ready' | 'cooling' | 'no_mana' | 'activating';

interface SkillConfig {
  index: number;
  shortcut: 'Q' | 'W' | 'E' | 'R';
  icon: string;
}

interface ButtonAssets {
  outerRing: Phaser.GameObjects.Graphics;
  innerBody: Phaser.GameObjects.Graphics;
  cooldownArc: Phaser.GameObjects.Graphics;
  iconText: Phaser.GameObjects.Text;
  shortcutText: Phaser.GameObjects.Text;
  cooldownText: Phaser.GameObjects.Text;
  lockText: Phaser.GameObjects.Text;
  flashOverlay: Phaser.GameObjects.Graphics;
  speedLines: Phaser.GameObjects.Graphics;
  hitArea: Phaser.GameObjects.Rectangle;
  state: SkillState;
  cooldownRemaining: number;
  cooldownTotal: number;
  config: SkillConfig;
}

const BTN_SIZE = 64;
const BTN_GAP = 6;
const PANEL_W = 4 * BTN_SIZE + 3 * BTN_GAP; // 4 buttons, 3 gaps = 274
const PANEL_H = 68;

const SHORTCUTS: Array<'Q' | 'W' | 'E' | 'R'> = ['Q', 'W', 'E', 'R'];
const DEFAULT_ICONS = ['⚡', '🔥', '❄', '☄'];

const STATE_RING_COLORS: Record<Exclude<SkillState, 'ready' | 'activating'>, number> = {
  cooling: 0x333355,
  no_mana: 0x224466,
};

export class HeroSkillsPanel extends Phaser.GameObjects.Container {
  private buttons: ButtonAssets[] = [];
  private raceColor: number;

  constructor(scene: Phaser.Scene, x: number, y: number, raceColor: number, icons: string[] = DEFAULT_ICONS) {
    super(scene, x, y);
    this.raceColor = raceColor;

    for (let i = 0; i < 4; i++) {
      const bx = i * (BTN_SIZE + BTN_GAP);
      const cfg: SkillConfig = {
        index: i,
        shortcut: SHORTCUTS[i],
        icon: icons[i] ?? DEFAULT_ICONS[i],
      };
      this.buttons.push(this.createButton(bx, 0, cfg));
    }

    this.bindKeyboard();
    scene.add.existing(this);
  }

  private createButton(x: number, y: number, config: SkillConfig): ButtonAssets {
    const outerRing = this.scene.add.graphics();
    const innerBody = this.scene.add.graphics();
    const cooldownArc = this.scene.add.graphics();
    const flashOverlay = this.scene.add.graphics();
    const speedLines = this.scene.add.graphics();

    const iconText = this.scene.add.text(x + BTN_SIZE / 2, y + BTN_SIZE / 2, config.icon, {
      fontSize: '28px',
      fontFamily: 'Orbitron, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    const shortcutText = this.scene.add.text(x + 4, y + 2, config.shortcut, {
      fontSize: '10px',
      fontFamily: 'Orbitron, sans-serif',
      color: '#a0a8c0',
    });

    const cooldownText = this.scene.add.text(x + BTN_SIZE / 2, y + BTN_SIZE - 8, '', {
      fontSize: '9px',
      fontFamily: 'Rajdhani, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    const lockText = this.scene.add.text(x + BTN_SIZE / 2, y + 14, '🔒', {
      fontSize: '12px',
      color: '#aaccff',
    }).setOrigin(0.5, 0.5).setVisible(false);

    const hitArea = this.scene.add.rectangle(x, y, BTN_SIZE, BTN_SIZE, 0x000000, 0).setOrigin(0, 0);
    hitArea.setInteractive({ useHandCursor: true });

    flashOverlay.setAlpha(0);

    this.add([outerRing, innerBody, cooldownArc, lockText, iconText, shortcutText, cooldownText, flashOverlay, speedLines, hitArea]);

    const btn: ButtonAssets = {
      outerRing,
      innerBody,
      cooldownArc,
      iconText,
      shortcutText,
      cooldownText,
      lockText,
      flashOverlay,
      speedLines,
      hitArea,
      state: 'ready',
      cooldownRemaining: 0,
      cooldownTotal: 0,
      config,
    };

    hitArea.on('pointerdown', () => this.onActivate(config.index));

    this.drawStatic(btn, x, y);
    this.drawState(btn, x, y);
    return btn;
  }

  private drawStatic(btn: ButtonAssets, x: number, y: number) {
    btn.innerBody.clear();
    btn.innerBody.fillStyle(0x0a0e1a, 1);
    btn.innerBody.fillRoundedRect(x + 2, y + 2, BTN_SIZE - 4, BTN_SIZE - 4, 6);
  }

  private drawState(btn: ButtonAssets, x: number, y: number) {
    const ring = btn.outerRing;
    ring.clear();

    let ringColor = this.raceColor;
    let glow = false;

    if (btn.state === 'cooling') {
      ringColor = STATE_RING_COLORS.cooling;
    } else if (btn.state === 'no_mana') {
      ringColor = STATE_RING_COLORS.no_mana;
    } else if (btn.state === 'ready' || btn.state === 'activating') {
      ringColor = this.raceColor;
      glow = true;
    }

    if (glow) {
      ring.lineStyle(6, this.raceColor, 0.18);
      ring.strokeRoundedRect(x - 2, y - 2, BTN_SIZE + 4, BTN_SIZE + 4, 10);
    }
    ring.lineStyle(2, ringColor, 1);
    ring.strokeRoundedRect(x, y, BTN_SIZE, BTN_SIZE, 8);

    btn.iconText.setAlpha(btn.state === 'cooling' ? 0.35 : btn.state === 'no_mana' ? 0.5 : 1.0);
    btn.lockText.setVisible(btn.state === 'no_mana');
    btn.cooldownText.setVisible(btn.state === 'cooling');
  }

  private drawCooldownArc(btn: ButtonAssets, x: number, y: number) {
    btn.cooldownArc.clear();
    if (btn.state !== 'cooling' || btn.cooldownTotal <= 0) return;

    const ratio = Phaser.Math.Clamp(btn.cooldownRemaining / btn.cooldownTotal, 0, 1);
    if (ratio <= 0) return;

    const cx = x + BTN_SIZE / 2;
    const cy = y + BTN_SIZE / 2;
    const radius = BTN_SIZE; // larger than button so the slice fills the face
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + ratio * Math.PI * 2;

    btn.cooldownArc.fillStyle(0x0a0c1a, 0.78);
    btn.cooldownArc.slice(cx, cy, radius, startAngle, endAngle, false);
    btn.cooldownArc.fillPath();
  }

  private buttonOrigin(index: number): { x: number; y: number } {
    return { x: index * (BTN_SIZE + BTN_GAP), y: 0 };
  }

  private bindKeyboard() {
    if (!this.scene.input?.keyboard) return;
    const keys: Array<keyof typeof Phaser.Input.Keyboard.KeyCodes> = ['Q', 'W', 'E', 'R'];
    keys.forEach((k, i) => {
      const key = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes[k]);
      key.on('down', () => this.onActivate(i));
    });
  }

  private onActivate(index: number) {
    const btn = this.buttons[index];
    if (!btn || btn.state !== 'ready') return;
    this.playMangaFlash(index);
    this.emit('skill_activate', { skillIndex: index, shortcut: btn.config.shortcut });
  }

  setSkillReady(skillIndex: number) {
    const btn = this.buttons[skillIndex];
    if (!btn) return;
    btn.state = 'ready';
    btn.cooldownRemaining = 0;
    btn.cooldownTotal = 0;
    const { x, y } = this.buttonOrigin(skillIndex);
    this.drawState(btn, x, y);
    this.drawCooldownArc(btn, x, y);
  }

  setSkillOnCooldown(skillIndex: number, cooldown: number) {
    const btn = this.buttons[skillIndex];
    if (!btn) return;
    btn.state = 'cooling';
    btn.cooldownRemaining = cooldown;
    btn.cooldownTotal = cooldown;
    const { x, y } = this.buttonOrigin(skillIndex);
    this.drawState(btn, x, y);
    this.drawCooldownArc(btn, x, y);
  }

  setSkillNoMana(skillIndex: number, noMana: boolean) {
    const btn = this.buttons[skillIndex];
    if (!btn) return;
    if (btn.state === 'cooling') return;
    btn.state = noMana ? 'no_mana' : 'ready';
    const { x, y } = this.buttonOrigin(skillIndex);
    this.drawState(btn, x, y);
  }

  setRaceColor(color: number) {
    this.raceColor = color;
    this.buttons.forEach((btn, i) => {
      const { x, y } = this.buttonOrigin(i);
      this.drawState(btn, x, y);
    });
  }

  update(_time: number, deltaMs: number) {
    const dt = deltaMs / 1000;
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      if (btn.state !== 'cooling') continue;
      btn.cooldownRemaining = Math.max(0, btn.cooldownRemaining - dt);
      const { x, y } = this.buttonOrigin(i);
      btn.cooldownText.setText(btn.cooldownRemaining >= 10 ? Math.ceil(btn.cooldownRemaining).toString() : btn.cooldownRemaining.toFixed(1));
      this.drawCooldownArc(btn, x, y);
      if (btn.cooldownRemaining <= 0) {
        this.setSkillReady(i);
      }
    }
  }

  private playMangaFlash(index: number) {
    const btn = this.buttons[index];
    if (!btn) return;
    const { x, y } = this.buttonOrigin(index);

    btn.flashOverlay.clear();
    btn.flashOverlay.fillStyle(0xffffff, 1);
    btn.flashOverlay.fillRoundedRect(x, y, BTN_SIZE, BTN_SIZE, 8);
    btn.flashOverlay.setAlpha(0.85);
    this.scene.tweens.add({
      targets: btn.flashOverlay,
      alpha: 0,
      duration: 80,
      ease: 'Power2',
    });

    btn.speedLines.clear();
    btn.speedLines.lineStyle(1.5, this.raceColor, 0.7);
    btn.speedLines.setAlpha(0.7);
    const corners = [
      { cx: x, cy: y, dirAngle: -Math.PI * 0.75 },
      { cx: x + BTN_SIZE, cy: y, dirAngle: -Math.PI * 0.25 },
      { cx: x, cy: y + BTN_SIZE, dirAngle: Math.PI * 0.75 },
      { cx: x + BTN_SIZE, cy: y + BTN_SIZE, dirAngle: Math.PI * 0.25 },
    ];
    corners.forEach((corner) => {
      for (let s = 0; s < 2; s++) {
        const len = 40 + Math.random() * 30;
        const jitter = (Math.random() - 0.5) * 0.4;
        const angle = corner.dirAngle + jitter;
        const ex = corner.cx + Math.cos(angle) * len;
        const ey = corner.cy + Math.sin(angle) * len;
        btn.speedLines.lineBetween(corner.cx, corner.cy, ex, ey);
      }
    });
    this.scene.tweens.add({
      targets: btn.speedLines,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
    });

    this.scene.time.delayedCall(80, () => {
      this.scene.cameras.main.flash(120, 255, 255, 255, false);
    });
  }

  static get PANEL_WIDTH() { return PANEL_W; }
  static get PANEL_HEIGHT() { return PANEL_H; }
}
