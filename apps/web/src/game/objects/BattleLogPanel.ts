import Phaser from 'phaser';

export type BattleEventType =
  | 'damage'
  | 'heal'
  | 'ability'
  | 'death'
  | 'turn_start'
  | 'buff'
  | 'debuff';

export interface BattleEventData {
  type: BattleEventType;
  turn?: number;
  actorName?: string;
  targetName?: string;
  value?: number;
  isCrit?: boolean;
  abilityName?: string;
  text?: string;
}

interface EntryStyle {
  prefix: string;
  color: string;
  fontSize: string;
  fontFamily: string;
  fontStyle?: string;
}

const STYLE_BY_TYPE: Record<BattleEventType, EntryStyle> = {
  damage:     { prefix: '⚔', color: '#ffb830', fontSize: '11px', fontFamily: 'Rajdhani, sans-serif' },
  heal:       { prefix: '♥', color: '#44ff88', fontSize: '11px', fontFamily: 'Rajdhani, sans-serif' },
  ability:    { prefix: '✦', color: '#cc88ff', fontSize: '11px', fontFamily: 'Rajdhani, sans-serif' },
  death:      { prefix: '✕', color: '#555d7a', fontSize: '10px', fontFamily: 'Rajdhani, sans-serif', fontStyle: 'italic' },
  turn_start: { prefix: '▶', color: '#00cfff', fontSize: '10px', fontFamily: 'Orbitron, sans-serif' },
  buff:       { prefix: '↑', color: '#4488ff', fontSize: '11px', fontFamily: 'Rajdhani, sans-serif' },
  debuff:     { prefix: '↓', color: '#ff6622', fontSize: '11px', fontFamily: 'Rajdhani, sans-serif' },
};

const CRIT_STYLE: EntryStyle = {
  prefix: '💥 CRITICAL!',
  color: '#ff3355',
  fontSize: '14px',
  fontFamily: 'Orbitron, sans-serif',
  fontStyle: 'bold',
};

const PADDING_X = 8;
const HEADER_H = 22;
const ENTRY_GAP = 4;
const MAX_ENTRIES = 50;

interface LogEntry {
  container: Phaser.GameObjects.Container;
  height: number;
}

export class BattleLogPanel extends Phaser.GameObjects.Container {
  private panelW: number;
  private panelH: number;
  private raceColor: number;

  private background!: Phaser.GameObjects.Graphics;
  private leftBorder!: Phaser.GameObjects.Graphics;
  private header!: Phaser.GameObjects.Text;
  private contentContainer!: Phaser.GameObjects.Container;
  private maskGraphics!: Phaser.GameObjects.Graphics;
  private flashOverlay!: Phaser.GameObjects.Graphics;
  private speedLines!: Phaser.GameObjects.Graphics;

  private entries: LogEntry[] = [];
  private contentHeight = 0;
  private visibleHeight: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, raceColor: number) {
    super(scene, x, y);
    this.panelW = width;
    this.panelH = height;
    this.raceColor = raceColor;
    this.visibleHeight = height - HEADER_H - 8;

    this.buildChrome();
    this.buildContent();

    scene.add.existing(this);
  }

  private buildChrome() {
    this.background = this.scene.add.graphics();
    this.background.fillStyle(0x080a10, 0.9);
    this.background.fillRect(0, 0, this.panelW, this.panelH);

    this.leftBorder = this.scene.add.graphics();
    this.leftBorder.lineStyle(2, this.raceColor, 0.6);
    this.leftBorder.lineBetween(0, 0, 0, this.panelH);

    this.header = this.scene.add.text(PADDING_X, 6, 'SAVAŞ KAYDI', {
      fontSize: '9px',
      fontFamily: 'Orbitron, sans-serif',
      color: this.toHexString(this.raceColor),
      fontStyle: 'bold',
    });

    this.flashOverlay = this.scene.add.graphics();
    this.flashOverlay.setAlpha(0);

    this.speedLines = this.scene.add.graphics();
    this.speedLines.setAlpha(0);

    this.add([this.background, this.leftBorder, this.header, this.flashOverlay, this.speedLines]);
  }

  private buildContent() {
    this.contentContainer = this.scene.add.container(0, HEADER_H + 4);
    this.add(this.contentContainer);

    this.maskGraphics = this.scene.make.graphics({});
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(this.x, this.y + HEADER_H + 4, this.panelW, this.visibleHeight);
    this.maskGraphics.setVisible(false);
    const mask = this.maskGraphics.createGeometryMask();
    this.contentContainer.setMask(mask);
  }

  setRaceColor(color: number) {
    this.raceColor = color;
    this.leftBorder.clear();
    this.leftBorder.lineStyle(2, color, 0.6);
    this.leftBorder.lineBetween(0, 0, 0, this.panelH);
    this.header.setColor(this.toHexString(color));
  }

  resize(width: number, height: number) {
    this.panelW = width;
    this.panelH = height;
    this.visibleHeight = height - HEADER_H - 8;

    this.background.clear();
    this.background.fillStyle(0x080a10, 0.9);
    this.background.fillRect(0, 0, this.panelW, this.panelH);

    this.leftBorder.clear();
    this.leftBorder.lineStyle(2, this.raceColor, 0.6);
    this.leftBorder.lineBetween(0, 0, 0, this.panelH);

    this.maskGraphics.clear();
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(this.x, this.y + HEADER_H + 4, this.panelW, this.visibleHeight);

    this.scrollToBottom();
  }

  addEvent(evt: BattleEventData) {
    const style = evt.isCrit && evt.type === 'damage' ? CRIT_STYLE : STYLE_BY_TYPE[evt.type] ?? STYLE_BY_TYPE.damage;

    const entryContainer = this.scene.add.container(0, this.contentHeight);

    const turn = evt.turn ?? 0;
    const stamp = this.scene.add.text(PADDING_X, 0, `[T:${turn}]`, {
      fontSize: '7px',
      fontFamily: 'Rajdhani, sans-serif',
      color: '#333d55',
    });

    const message = this.formatMessage(evt, style);
    const text = this.scene.add.text(PADDING_X + 26, 0, message, {
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      color: style.color,
      fontStyle: style.fontStyle,
      wordWrap: { width: this.panelW - PADDING_X - 30 },
    });

    entryContainer.add([stamp, text]);

    const isCrit = evt.isCrit && evt.type === 'damage';
    if (isCrit) {
      const lines = this.scene.add.graphics();
      lines.lineStyle(1, 0xff3355, 0.35);
      const ty = text.height / 2;
      const tx = PADDING_X + 26;
      const tw = text.width;
      for (let i = 0; i < 6; i++) {
        const ly = ty - 6 + (i % 3) * 6;
        lines.lineBetween(0, ly, tx - 4, ly);
        lines.lineBetween(tx + tw + 4, ly, this.panelW - 4, ly);
      }
      entryContainer.add(lines);
      this.playCritEffect();
    }

    const entryHeight = Math.max(text.height, stamp.height) + ENTRY_GAP;
    this.contentContainer.add(entryContainer);
    this.entries.push({ container: entryContainer, height: entryHeight });
    this.contentHeight += entryHeight;

    this.fadeOlderEntries();
    this.trimOldEntries();
    this.scrollToBottom();
  }

  private formatMessage(evt: BattleEventData, style: EntryStyle): string {
    if (evt.text) {
      return `${style.prefix} ${evt.text}`;
    }
    const isCrit = evt.isCrit && evt.type === 'damage';
    const prefix = isCrit ? CRIT_STYLE.prefix : style.prefix;

    switch (evt.type) {
      case 'damage':
        return `${prefix} ${evt.actorName ?? '?'} → ${evt.targetName ?? '?'}  -${evt.value ?? 0}`;
      case 'heal':
        return `${prefix} ${evt.targetName ?? '?'}  +${evt.value ?? 0}`;
      case 'ability':
        return `${prefix} ${evt.actorName ?? '?'} ${evt.abilityName ?? 'ability'}`;
      case 'death':
        return `${prefix} ${evt.targetName ?? evt.actorName ?? '?'} düştü`;
      case 'turn_start':
        return `${prefix} TUR ${evt.turn ?? '?'}`;
      case 'buff':
        return `${prefix} ${evt.targetName ?? '?'} ${evt.abilityName ?? 'buff'}`;
      case 'debuff':
        return `${prefix} ${evt.targetName ?? '?'} ${evt.abilityName ?? 'debuff'}`;
      default:
        return `${prefix}`;
    }
  }

  private fadeOlderEntries() {
    const fadeBeyond = 8;
    const start = Math.max(0, this.entries.length - fadeBeyond);
    for (let i = 0; i < start; i++) {
      this.entries[i].container.setAlpha(0.5);
    }
  }

  private trimOldEntries() {
    while (this.entries.length > MAX_ENTRIES) {
      const old = this.entries.shift();
      if (!old) break;
      this.contentHeight -= old.height;
      this.entries.forEach((e) => {
        e.container.y -= old.height;
      });
      old.container.destroy();
    }
  }

  private scrollToBottom() {
    if (this.contentHeight <= this.visibleHeight) {
      this.contentContainer.y = HEADER_H + 4;
      return;
    }
    const overflow = this.contentHeight - this.visibleHeight;
    this.contentContainer.y = HEADER_H + 4 - overflow;
  }

  private playCritEffect() {
    this.flashOverlay.clear();
    this.flashOverlay.fillStyle(0xff3355, 1);
    this.flashOverlay.fillRect(0, 0, this.panelW, this.panelH);
    this.flashOverlay.setAlpha(0);
    this.scene.tweens.add({
      targets: this.flashOverlay,
      alpha: { from: 0, to: 0.12 },
      duration: 60,
      yoyo: true,
      ease: 'Power2',
    });

    const camera = this.scene.cameras.main;
    if (!camera.shakeEffect?.isRunning) {
      camera.shake(200, 0.004);
    }
  }

  private toHexString(num: number): string {
    return `#${num.toString(16).padStart(6, '0')}`;
  }

  destroy(fromScene?: boolean) {
    this.maskGraphics?.destroy();
    super.destroy(fromScene);
  }
}
