import Phaser from 'phaser';
import { THEME } from '../theme';

/**
 * Manga-style flying damage number — bigger crits get a yellow impact halo
 * (radial spokes) and a sharper tilt; normal hits are smaller and yellow.
 */
export function spawnDamageText(scene: Phaser.Scene, x: number, y: number, value: number) {
  const isCrit = value > 12;
  const tilt = (Math.random() * 16 - 8) + (isCrit ? 12 : 0);
  const driftX = (Math.random() - 0.5) * 20;

  if (isCrit) drawImpactHalo(scene, x, y, THEME.ENERGY);

  const text = scene.add.text(x, y - 10, `-${value}`, {
    fontSize: isCrit ? '32px' : '18px',
    fontFamily: 'Impact, "Arial Black", system-ui, sans-serif',
    fontStyle: 'bold',
    color: isCrit ? '#ffffff' : THEME.ENERGY_STR,
    stroke: isCrit ? THEME.DANGER_STR : '#000000',
    strokeThickness: isCrit ? 6 : 3,
  }).setOrigin(0.5, 1).setDepth(120).setAngle(tilt).setScale(0.4);

  // Manga punch-in scale, then drift up
  scene.tweens.chain({
    targets: text,
    tweens: [
      { scale: isCrit ? 1.25 : 1, duration: 110, ease: 'Back.out' },
      {
        x: x + driftX,
        y: y - 60,
        scale: isCrit ? 1.0 : 0.9,
        alpha: 0,
        duration: 750,
        ease: 'Cubic.easeIn',
      },
    ],
    onComplete: () => text.destroy(),
  });
}

function drawImpactHalo(scene: Phaser.Scene, x: number, y: number, color: number) {
  const halo = scene.add.graphics().setDepth(115);
  const spokes = 12;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const r1 = 14;
    const r2 = 38;
    halo.lineStyle(3, color, 0.95);
    halo.beginPath();
    halo.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    halo.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
    halo.strokePath();
  }
  scene.tweens.add({
    targets: halo,
    alpha: 0,
    scaleX: 1.6,
    scaleY: 1.6,
    duration: 320,
    ease: 'Power2',
    onComplete: () => halo.destroy(),
  });
}

export function spawnHealText(scene: Phaser.Scene, x: number, y: number, value: number) {
  const text = scene.add.text(x, y - 10, `+${value}`, {
    fontSize: '18px',
    fontFamily: 'Impact, "Arial Black", system-ui, sans-serif',
    fontStyle: 'bold',
    color: THEME.SUCCESS_STR,
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5, 1).setDepth(120).setScale(0.4);

  scene.tweens.chain({
    targets: text,
    tweens: [
      { scale: 1, duration: 110, ease: 'Back.out' },
      { y: y - 60, alpha: 0, duration: 800, ease: 'Cubic.easeIn' },
    ],
    onComplete: () => text.destroy(),
  });
}

export function spawnAbilityText(scene: Phaser.Scene, x: number, y: number, unitType: string) {
  const labels: Record<string, string> = {
    mage: 'ARCANE BOLT!',
    archer: 'RAPID SHOT!',
    drone: 'ACID SPIT!',
    guardian: 'SHELL HARDEN!',
    'combat-bot': 'OVERCLOCK!',
    artillery: 'BARRAGE!',
    soldier: 'RALLY!',
  };
  const text = scene.add.text(x, y - 10, labels[unitType] ?? 'ABILITY!', {
    fontSize: '14px',
    fontFamily: 'Impact, "Arial Black", system-ui, sans-serif',
    fontStyle: 'bold',
    color: '#cc88ff',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5, 1).setDepth(120).setAngle(-6).setScale(0.5);

  scene.tweens.chain({
    targets: text,
    tweens: [
      { scale: 1.1, duration: 110, ease: 'Back.out' },
      { y: y - 70, alpha: 0, duration: 1000, ease: 'Cubic.easeIn' },
    ],
    onComplete: () => text.destroy(),
  });
}
