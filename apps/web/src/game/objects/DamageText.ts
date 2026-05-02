import Phaser from 'phaser';

export function spawnDamageText(scene: Phaser.Scene, x: number, y: number, value: number) {
  const isCrit = value > 12;
  const text = scene.add.text(x, y - 10, `-${value}`, {
    fontSize: isCrit ? '22px' : '16px',
    fontStyle: 'bold',
    color: isCrit ? '#ff4444' : '#ffcc44',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5, 1).setDepth(100);

  scene.tweens.add({
    targets: text,
    y: y - 55,
    alpha: 0,
    duration: 900,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  });
}

export function spawnHealText(scene: Phaser.Scene, x: number, y: number, value: number) {
  const text = scene.add.text(x, y - 10, `+${value}`, {
    fontSize: '16px',
    fontStyle: 'bold',
    color: '#44ff88',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5, 1).setDepth(100);

  scene.tweens.add({
    targets: text,
    y: y - 55,
    alpha: 0,
    duration: 900,
    ease: 'Power2',
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
    fontStyle: 'bold',
    color: '#cc88ff',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5, 1).setDepth(100);

  scene.tweens.add({
    targets: text,
    y: y - 65,
    alpha: 0,
    duration: 1100,
    ease: 'Power1',
    onComplete: () => text.destroy(),
  });
}
