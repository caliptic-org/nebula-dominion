import Phaser from 'phaser';
import { THEME } from '../theme';

type TutorialStep = 'select' | 'move' | 'attack' | 'done';

interface StepCopy {
  eyebrow: string;
  title: string;
  body: string;
}

const STEP_COPY: Record<Exclude<TutorialStep, 'done'>, StepCopy> = {
  select: {
    eyebrow: '1 / 3',
    title: 'BIRIM SEC',
    body: 'Sol taraftaki birimlerinden birini tikla.',
  },
  move: {
    eyebrow: '2 / 3',
    title: 'HAREKET ET',
    body: 'Mavi parlayan kareye tiklayarak ilerle.',
  },
  attack: {
    eyebrow: '3 / 3',
    title: 'SALDIR',
    body: 'Dusman birime tiklayarak saldiriyi baslat.',
  },
};

const TUTORIAL_LS_KEY = 'nebula:tutorial:battle:v1';
const CARD_HEIGHT = 132;
const CARD_MAX_WIDTH = 520;

export class TutorialOverlayScene extends Phaser.Scene {
  private currentStep: TutorialStep = 'select';
  private dim!: Phaser.GameObjects.Graphics;
  private card!: Phaser.GameObjects.Container;
  private cardBg!: Phaser.GameObjects.Graphics;
  private eyebrowText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private stepDots: Phaser.GameObjects.Graphics[] = [];
  private skipBtn!: Phaser.GameObjects.Container;
  private borderTween?: Phaser.Tweens.Tween;
  private active = false;
  private cardW = CARD_MAX_WIDTH;
  private raceColorHex: number = THEME.BRAND;

  constructor() {
    super({ key: 'TutorialOverlayScene' });
  }

  init(data: { raceColorHex?: number }) {
    if (typeof data.raceColorHex === 'number') {
      this.raceColorHex = data.raceColorHex;
    }
  }

  create() {
    const { width, height } = this.scale;

    this.active = true;
    this.currentStep = 'select';

    this.dim = this.add.graphics();
    this.dim.fillStyle(0x000000, 0.4);
    this.dim.fillRect(0, 0, width, height);
    this.dim.setDepth(0);

    this.cardW = Math.min(CARD_MAX_WIDTH, width - 32);
    const cardX = (width - this.cardW) / 2;
    const cardY = height - CARD_HEIGHT - 16;

    this.card = this.add.container(cardX, cardY).setDepth(20);

    this.cardBg = this.add.graphics();
    this.drawCardBg(0.85);
    this.card.add(this.cardBg);

    for (let i = 0; i < 3; i++) {
      const dot = this.add.graphics();
      this.card.add(dot);
      this.stepDots.push(dot);
    }

    this.eyebrowText = this.add.text(20, 14, '1 / 3', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '11px',
      color: THEME.TEXT_MUTED,
      fontStyle: 'bold',
    });
    this.card.add(this.eyebrowText);

    this.titleText = this.add.text(20, 32, '', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '20px',
      color: THEME.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    this.card.add(this.titleText);

    this.bodyText = this.add.text(20, 64, '', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      color: THEME.TEXT_SECONDARY,
      wordWrap: { width: this.cardW - 40 },
    });
    this.card.add(this.bodyText);

    this.skipBtn = this.makeSkipButton();
    this.skipBtn.setPosition(this.cardW - 88, CARD_HEIGHT - 34);
    this.card.add(this.skipBtn);

    this.card.setAlpha(0);
    this.card.y += 24;
    this.tweens.add({
      targets: this.card,
      y: cardY,
      alpha: 1,
      duration: 380,
      ease: 'Cubic.out',
    });

    this.renderStep();
    this.wireBattleEvents();
    this.startBorderPulse();
  }

  private drawCardBg(borderAlpha: number) {
    const g = this.cardBg;
    g.clear();
    g.fillStyle(0x000000, 0.6);
    g.fillRoundedRect(2, 4, this.cardW, CARD_HEIGHT, 12);
    g.fillStyle(THEME.BG_PANEL, 0.97);
    g.fillRoundedRect(0, 0, this.cardW, CARD_HEIGHT, 12);
    g.lineStyle(2, this.raceColorHex, borderAlpha);
    g.strokeRoundedRect(0, 0, this.cardW, CARD_HEIGHT, 12);
    g.lineStyle(1, 0xffffff, 0.06);
    g.strokeRoundedRect(2, 2, this.cardW - 4, CARD_HEIGHT - 4, 11);
  }

  private startBorderPulse() {
    const target = { a: 0.55 };
    this.borderTween = this.tweens.add({
      targets: target,
      a: 1,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      onUpdate: () => this.drawCardBg(target.a),
    });
  }

  private makeSkipButton() {
    const c = this.add.container(0, 0);
    const w = 80;
    const h = 26;
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.04);
    bg.fillRoundedRect(0, 0, w, h, 6);
    bg.lineStyle(1, 0xffffff, 0.15);
    bg.strokeRoundedRect(0, 0, w, h, 6);
    const txt = this.add
      .text(w / 2, h / 2, 'ATLA', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '10px',
        color: THEME.TEXT_MUTED,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    c.add([bg, txt]);
    c.setSize(w, h);
    c.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    c.input!.cursor = 'pointer';
    c.on('pointerover', () => txt.setColor(THEME.TEXT_PRIMARY));
    c.on('pointerout', () => txt.setColor(THEME.TEXT_MUTED));
    c.on('pointerdown', () => this.completeAndClose('skipped'));
    return c;
  }

  private renderStep() {
    if (this.currentStep === 'done') return;
    const copy = STEP_COPY[this.currentStep];
    this.eyebrowText.setText(copy.eyebrow);
    this.titleText.setText(copy.title);
    this.bodyText.setText(copy.body);

    const stepIndex = this.currentStep === 'select' ? 0 : this.currentStep === 'move' ? 1 : 2;
    this.stepDots.forEach((dot, i) => {
      dot.clear();
      const x = 20 + i * 14;
      const y = 110;
      const isDone = i < stepIndex;
      const isActive = i === stepIndex;
      const fill = isDone || isActive ? this.raceColorHex : 0xffffff;
      const alpha = isDone ? 1 : isActive ? 1 : 0.18;
      dot.fillStyle(fill, alpha);
      const r = isActive ? 5 : 4;
      dot.fillCircle(x, y, r);
      if (isActive) {
        dot.lineStyle(1, fill, 0.6);
        dot.strokeCircle(x, y, 8);
      }
    });
  }

  private wireBattleEvents() {
    const battle = this.scene.get('BattleScene');
    if (!battle) return;

    battle.events.on('unit_selected', this.onUnitSelected, this);
    battle.events.on('tutorial:moved', this.onUnitMoved, this);
    battle.events.on('tutorial:attacked', this.onUnitAttacked, this);
  }

  private onUnitSelected = (unit: unknown) => {
    if (!this.active) return;
    if (unit && this.currentStep === 'select') this.advanceTo('move');
  };

  private onUnitMoved = () => {
    if (!this.active) return;
    if (this.currentStep === 'move') this.advanceTo('attack');
  };

  private onUnitAttacked = () => {
    if (!this.active) return;
    if (this.currentStep === 'attack') this.advanceTo('done');
  };

  private advanceTo(next: TutorialStep) {
    this.currentStep = next;
    if (next === 'done') {
      this.completeAndClose('completed');
      return;
    }
    this.renderStep();
    this.tweens.add({
      targets: this.titleText,
      scale: { from: 1.15, to: 1 },
      duration: 280,
      ease: 'Back.out',
    });
  }

  private completeAndClose(reason: 'completed' | 'skipped') {
    if (!this.active) return;
    this.active = false;
    this.persistCompletion(reason);
    this.game.events.emit('tutorial:battle_completed', { reason });

    this.borderTween?.stop();
    this.borderTween = undefined;

    this.tweens.add({
      targets: [this.card, this.dim],
      alpha: 0,
      duration: 300,
      ease: 'Cubic.in',
      onComplete: () => this.scene.stop(),
    });
  }

  private persistCompletion(reason: 'completed' | 'skipped') {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        TUTORIAL_LS_KEY,
        JSON.stringify({ reason, at: new Date().toISOString() }),
      );
    } catch {
      // ignore quota errors — non-critical local hint
    }
  }

  shutdown() {
    const battle = this.scene.get('BattleScene');
    if (battle) {
      battle.events.off('unit_selected', this.onUnitSelected, this);
      battle.events.off('tutorial:moved', this.onUnitMoved, this);
      battle.events.off('tutorial:attacked', this.onUnitAttacked, this);
    }
    this.borderTween?.stop();
    this.borderTween = undefined;
  }
}
