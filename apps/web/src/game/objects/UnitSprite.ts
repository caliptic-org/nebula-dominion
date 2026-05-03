import Phaser from 'phaser';
import { UnitState } from '../socket/GameSocket';
import { THEME, UNIT_COLORS } from '../theme';

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
  private unitBody: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;
  private selectionRing: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;

  unitState: UnitState;
  ownerId: string;
  isEnemy: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, state: UnitState, ownerId: string, isEnemy: boolean) {
    super(scene, x, y);
    this.unitState = state;
    this.ownerId = ownerId;
    this.isEnemy = isEnemy;

    this.selectionRing = scene.add.graphics();
    this.unitBody = scene.add.graphics();
    this.healthBar = scene.add.graphics();
    this.label = scene.add.text(0, 22, state.type.slice(0, 3).toUpperCase(), {
      fontSize: '9px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);

    this.add([this.selectionRing, this.unitBody, this.healthBar, this.label]);
    scene.add.existing(this);

    this.drawBody();
    this.drawHealth();
    this.setSelected(false);

    if (!isEnemy) {
      this.setInteractive(new Phaser.Geom.Circle(0, 0, 18), Phaser.Geom.Circle.Contains);
    }
  }

  private drawBody() {
    const color = UNIT_COLORS[this.unitState.type] ?? 0x888888;
    const shape = UNIT_SHAPES[this.unitState.type] ?? 'circle';
    const alpha = this.unitState.actionUsed ? 0.45 : 1;

    this.body.clear();
    this.body.fillStyle(color, alpha);
    this.body.lineStyle(2, this.isEnemy ? THEME.DANGER : THEME.INFO, alpha);

    if (shape === 'circle') {
      this.unitBody.fillCircle(0, 0, 16);
      this.unitBody.strokeCircle(0, 0, 16);
    } else if (shape === 'square') {
      this.unitBody.fillRect(-14, -14, 28, 28);
      this.unitBody.strokeRect(-14, -14, 28, 28);
    } else {
      this.unitBody.fillTriangle(0, -16, 14, 12, -14, 12);
      this.unitBody.strokeTriangle(0, -16, 14, 12, -14, 12);
    }
  }

  private drawHealth() {
    const ratio = this.unitState.hp / this.unitState.maxHp;
    const w = 32;
    const h = 4;
    const x = -w / 2;
    const y = -24;

    this.healthBar.clear();
    this.healthBar.fillStyle(0x333333, 0.8);
    this.healthBar.fillRect(x, y, w, h);

    const barColor = ratio > 0.6 ? THEME.HP_HIGH : ratio > 0.3 ? THEME.HP_MED : THEME.HP_LOW;
    this.healthBar.fillStyle(barColor, 1);
    this.healthBar.fillRect(x, y, Math.round(w * ratio), h);
  }

  setSelected(selected: boolean) {
    this.selectionRing.clear();
    if (selected) {
      this.selectionRing.lineStyle(3, THEME.ENERGY, 1);
      this.selectionRing.strokeCircle(0, 0, 22);
    }
  }

  setHighlighted(on: boolean) {
    this.selectionRing.clear();
    if (on) {
      this.selectionRing.lineStyle(2, THEME.DANGER, 0.8);
      this.selectionRing.strokeCircle(0, 0, 22);
    }
  }

  applyState(state: UnitState) {
    this.unitState = state;
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
