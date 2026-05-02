import Phaser from 'phaser';
import { UnitState } from '../socket/GameSocket';

const UNIT_COLORS: Record<string, number> = {
  soldier: 0x4488ff,
  mage: 0xaa44ff,
  archer: 0x44ffaa,
  drone: 0xff6644,
  guardian: 0xff2222,
  'combat-bot': 0xffcc00,
  artillery: 0xff8800,
};

const UNIT_SHAPES: Record<string, 'circle' | 'square' | 'triangle'> = {
  soldier: 'square',
  mage: 'circle',
  archer: 'triangle',
  drone: 'circle',
  guardian: 'square',
  'combat-bot': 'square',
  artillery: 'triangle',
};

export class UnitSprite extends Phaser.GameObjects.Container {
  private body: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;
  private selectionRing: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;

  state: UnitState;
  ownerId: string;
  isEnemy: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, state: UnitState, ownerId: string, isEnemy: boolean) {
    super(scene, x, y);
    this.state = state;
    this.ownerId = ownerId;
    this.isEnemy = isEnemy;

    this.selectionRing = scene.add.graphics();
    this.body = scene.add.graphics();
    this.healthBar = scene.add.graphics();
    this.label = scene.add.text(0, 22, state.type.slice(0, 3).toUpperCase(), {
      fontSize: '9px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);

    this.add([this.selectionRing, this.body, this.healthBar, this.label]);
    scene.add.existing(this);

    this.drawBody();
    this.drawHealth();
    this.setSelected(false);

    if (!isEnemy) {
      this.setInteractive(new Phaser.Geom.Circle(0, 0, 18), Phaser.Geom.Circle.Contains);
    }
  }

  private drawBody() {
    const color = UNIT_COLORS[this.state.type] ?? 0x888888;
    const shape = UNIT_SHAPES[this.state.type] ?? 'circle';
    const alpha = this.state.actionUsed ? 0.45 : 1;

    this.body.clear();
    this.body.fillStyle(color, alpha);
    this.body.lineStyle(2, this.isEnemy ? 0xff4444 : 0x4444ff, alpha);

    if (shape === 'circle') {
      this.body.fillCircle(0, 0, 16);
      this.body.strokeCircle(0, 0, 16);
    } else if (shape === 'square') {
      this.body.fillRect(-14, -14, 28, 28);
      this.body.strokeRect(-14, -14, 28, 28);
    } else {
      this.body.fillTriangle(0, -16, 14, 12, -14, 12);
      this.body.strokeTriangle(0, -16, 14, 12, -14, 12);
    }
  }

  private drawHealth() {
    const ratio = this.state.hp / this.state.maxHp;
    const w = 32;
    const h = 4;
    const x = -w / 2;
    const y = -24;

    this.healthBar.clear();
    this.healthBar.fillStyle(0x333333, 0.8);
    this.healthBar.fillRect(x, y, w, h);

    const barColor = ratio > 0.6 ? 0x44ff44 : ratio > 0.3 ? 0xffaa00 : 0xff2222;
    this.healthBar.fillStyle(barColor, 1);
    this.healthBar.fillRect(x, y, Math.round(w * ratio), h);
  }

  setSelected(selected: boolean) {
    this.selectionRing.clear();
    if (selected) {
      this.selectionRing.lineStyle(3, 0xffff00, 1);
      this.selectionRing.strokeCircle(0, 0, 22);
    }
  }

  setHighlighted(on: boolean) {
    this.selectionRing.clear();
    if (on) {
      this.selectionRing.lineStyle(2, 0xff6666, 0.8);
      this.selectionRing.strokeCircle(0, 0, 22);
    }
  }

  applyState(state: UnitState) {
    this.state = state;
    this.drawBody();
    this.drawHealth();
  }

  playAttackAnim(targetX: number, targetY: number, onComplete: () => void) {
    const origX = this.x;
    const origY = this.y;
    const midX = origX + (targetX - origX) * 0.45;
    const midY = origY + (targetY - origY) * 0.45;

    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { x: midX, y: midY, duration: 120, ease: 'Power2' },
        {
          x: origX, y: origY, duration: 140, ease: 'Power1',
          onComplete: () => {
            this.scene.cameras.main.shake(80, 0.006);
            onComplete();
          },
        },
      ],
    });
  }

  playDeathAnim(onComplete: () => void) {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 350,
      ease: 'Power2',
      onComplete: () => { this.destroy(); onComplete(); },
    });
  }

  playMoveAnim(toX: number, toY: number) {
    this.scene.tweens.add({
      targets: this,
      x: toX,
      y: toY,
      duration: 220,
      ease: 'Power2',
    });
  }
}
