import Phaser from 'phaser';
import { GameSocket, GameRoom, UnitState } from '../socket/GameSocket';
import { THEME } from '../theme';
import { getRaceVisual, RaceVisual } from '../raceVisuals';

const ROUND_TIME_SECONDS = 30;
const PANEL_H = 96;

interface UISceneInitData {
  socket: GameSocket;
  room: GameRoom;
  playerRace: string;
  enemyRace: string;
}

export class UIScene extends Phaser.Scene {
  private socket!: GameSocket;
  private room!: GameRoom;

  private playerVisual!: RaceVisual;
  private enemyVisual!: RaceVisual;

  // Top HUD
  private topPanel!: Phaser.GameObjects.Graphics;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private enemyHpBar!: Phaser.GameObjects.Graphics;
  private playerHpLabel!: Phaser.GameObjects.Text;
  private enemyHpLabel!: Phaser.GameObjects.Text;
  private playerNameLabel!: Phaser.GameObjects.Text;
  private enemyNameLabel!: Phaser.GameObjects.Text;
  private timerRing!: Phaser.GameObjects.Graphics;
  private timerText!: Phaser.GameObjects.Text;
  private turnLabel!: Phaser.GameObjects.Text;
  private activeBanner!: Phaser.GameObjects.Text;

  // Bottom HUD
  private bottomPanel!: Phaser.GameObjects.Graphics;
  private unitInfoText!: Phaser.GameObjects.Text;
  private endTurnBtn!: Phaser.GameObjects.Container;
  private surrenderBtn!: Phaser.GameObjects.Container;
  private notifText!: Phaser.GameObjects.Text;

  // Speed-lines overlay layer
  private speedLines!: Phaser.GameObjects.Container;

  // Round timer
  private timeLeft = ROUND_TIME_SECONDS;
  private timerEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: UISceneInitData) {
    this.socket = data.socket;
    this.room = data.room;
    this.playerVisual = getRaceVisual(data.playerRace);
    this.enemyVisual = getRaceVisual(data.enemyRace);
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.buildTopHud(w);
    this.buildBottomHud(w, h);
    this.speedLines = this.add.container(0, 0).setDepth(200);

    const battleScene = this.scene.get('BattleScene');
    battleScene.events.on('unit_selected', (unit: UnitState | null) => this.updateUnitInfo(unit));
    this.events.on('hp_changed', () => this.refreshTeamHp());
    this.events.on('speed_lines', (data: { fromX: number; fromY: number; toX: number; toY: number }) => {
      this.flashSpeedLines(data.fromX, data.fromY, data.toX, data.toY);
    });
    this.events.on('game_over_start', () => {
      this.showNotif('SAVAS BITTI');
      this.timerEvent?.remove();
    });

    this.socket.on('state_update', (data) => {
      const { currentPlayerId, turn, phase } = data as { currentPlayerId: string; turn: number; phase: string };
      this.room.currentPlayerId = currentPlayerId;
      this.room.currentTurn = turn;
      this.room.phase = phase;
      this.refresh();
      this.resetTimer();
    });

    this.socket.on('turn_ended', (data) => {
      const { nextPlayerId, turn } = data as { nextPlayerId: string; turn: number };
      this.room.currentPlayerId = nextPlayerId;
      this.room.currentTurn = turn;
      this.refresh();
      this.resetTimer();
    });

    this.refresh();
    this.refreshTeamHp();
    this.startTimer();
  }

  // ── Top HUD ────────────────────────────────────────────────────────────

  private buildTopHud(w: number) {
    this.topPanel = this.add.graphics();
    this.drawMangaPanel(this.topPanel, 8, 6, w - 16, 78);

    const sideW = this.playerSideW();
    const leftX = 22;
    const rightX = w - 22;

    this.playerNameLabel = this.add.text(
      leftX, 14,
      `${this.playerVisual.icon}  ${this.playerVisual.label}`,
      { fontSize: '14px', fontStyle: 'bold', color: this.playerVisual.str, stroke: '#000000', strokeThickness: 3 },
    ).setOrigin(0, 0).setDepth(50);

    this.playerHpBar = this.add.graphics().setDepth(48);
    this.playerHpLabel = this.add.text(leftX + sideW - 4, 36, '', {
      fontSize: '11px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(50);

    this.enemyNameLabel = this.add.text(
      rightX, 14,
      `${this.enemyVisual.label}  ${this.enemyVisual.icon}`,
      { fontSize: '14px', fontStyle: 'bold', color: this.enemyVisual.str, stroke: '#000000', strokeThickness: 3 },
    ).setOrigin(1, 0).setDepth(50);

    this.enemyHpBar = this.add.graphics().setDepth(48);
    this.enemyHpLabel = this.add.text(rightX - sideW + 4, 36, '', {
      fontSize: '11px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0).setDepth(50);

    // Center cluster: turn, timer ring, active banner
    const cx = w / 2;
    this.timerRing = this.add.graphics().setDepth(50);
    this.timerText = this.add.text(cx, 32, '30', {
      fontSize: '20px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setDepth(51);
    this.turnLabel = this.add.text(cx, 8, 'TUR 1', {
      fontSize: '10px', fontStyle: 'bold', color: THEME.TEXT_MUTED,
    }).setOrigin(0.5, 0).setDepth(50);
    this.activeBanner = this.add.text(cx, 60, 'SIRA SENDE', {
      fontSize: '12px', fontStyle: 'bold', color: THEME.SUCCESS_STR, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(50);

    this.drawTimerRing(1);
  }

  /** Manga panel: black ink border + thin highlight + dark fill, with offset shadow. */
  private drawMangaPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
    g.clear();
    g.fillStyle(THEME.PANEL_INK, 0.95);
    g.fillRoundedRect(x + 3, y + 3, w, h, 6);
    g.fillStyle(THEME.PANEL_FILL, 0.96);
    g.fillRoundedRect(x, y, w, h, 6);
    g.lineStyle(2, THEME.PANEL_INK, 1);
    g.strokeRoundedRect(x, y, w, h, 6);
    g.lineStyle(1, 0xffffff, 0.08);
    g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 5);
  }

  // ── Bottom HUD ─────────────────────────────────────────────────────────

  private buildBottomHud(w: number, h: number) {
    const top = h - PANEL_H;
    this.bottomPanel = this.add.graphics();
    this.drawMangaPanel(this.bottomPanel, 8, top + 4, w - 16, PANEL_H - 12);

    this.unitInfoText = this.add.text(20, top + 16, 'BIRIM SECMEK ICIN TIKLA', {
      fontSize: '12px', color: THEME.TEXT_SECONDARY, fontStyle: 'bold',
    }).setDepth(50);

    this.endTurnBtn = this.makeMangaButton(
      'TURU BITIR', this.playerVisual.hex, this.playerVisual.str,
      () => {
        if (this.room.currentPlayerId === this.socket.myUserId) {
          this.socket.sendAction('end_turn');
        }
      },
    );
    const endBounds = this.endTurnBtn.getBounds();
    this.endTurnBtn.setPosition(w - 24 - endBounds.width, top + 18);

    this.surrenderBtn = this.makeMangaButton(
      'TESLIM OL', THEME.DANGER, THEME.DANGER_STR,
      () => {
        if (this.room.currentPlayerId === this.socket.myUserId) {
          this.socket.sendAction('surrender');
        }
      },
      { compact: true },
    );
    const surrBounds = this.surrenderBtn.getBounds();
    this.surrenderBtn.setPosition(w - 24 - surrBounds.width, top + 56);

    this.notifText = this.add.text(w / 2, top + PANEL_H / 2, '', {
      fontSize: '22px', fontStyle: 'bold', color: this.playerVisual.str,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setDepth(60).setAlpha(0);
  }

  private makeMangaButton(
    label: string,
    accentHex: number, accentStr: string,
    onClick: () => void,
    opts: { compact?: boolean } = {},
  ): Phaser.GameObjects.Container {
    const padX = opts.compact ? 10 : 14;
    const padY = opts.compact ? 6 : 9;
    const fontSize = opts.compact ? '11px' : '13px';

    const text = this.add.text(0, 0, label, {
      fontSize, fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0);
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

    const container = this.add.container(0, 0, [bg, text]).setDepth(60);
    container.setSize(tw, th);
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, tw, th), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => text.setColor(accentStr));
    container.on('pointerout', () => { text.setColor('#ffffff'); draw(false); });
    container.on('pointerdown', () => { draw(true); onClick(); });
    container.on('pointerup', () => draw(false));

    return container;
  }

  // ── Speed lines overlay ────────────────────────────────────────────────

  private flashSpeedLines(fromX: number, fromY: number, toX: number, toY: number) {
    const w = this.scale.width;
    const h = this.scale.height;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    const lines: Phaser.GameObjects.Graphics[] = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      const offset = (i - count / 2) * 16;
      const perpX = -Math.sin(angle) * offset;
      const perpY = Math.cos(angle) * offset;

      const midX = (fromX + toX) / 2 + perpX;
      const midY = (fromY + toY) / 2 + perpY;
      const len = Math.max(w, h) * 1.4;

      const x1 = midX - Math.cos(angle) * len / 2;
      const y1 = midY - Math.sin(angle) * len / 2;
      const x2 = midX + Math.cos(angle) * len / 2;
      const y2 = midY + Math.sin(angle) * len / 2;

      const g = this.add.graphics();
      g.lineStyle(2 + Math.random() * 2, THEME.SPEED_LINE, 0.85);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.strokePath();
      this.speedLines.add(g);
      lines.push(g);
    }

    this.tweens.add({
      targets: lines,
      alpha: 0,
      duration: 220,
      delay: 60,
      ease: 'Power2',
      onComplete: () => lines.forEach((l) => l.destroy()),
    });
  }

  // ── Team HP bars ───────────────────────────────────────────────────────

  private refreshTeamHp() {
    const myId = this.socket.myUserId;
    const enemyId = Object.keys(this.room.players).find((id) => id !== myId);
    const me = this.room.players[myId];
    const en = enemyId ? this.room.players[enemyId] : undefined;

    const myHp = sumHp(me?.units);
    const myMax = sumMaxHp(me?.units);
    const enHp = sumHp(en?.units);
    const enMax = sumMaxHp(en?.units);

    const sideW = this.playerSideW();
    this.drawHpBar(this.playerHpBar, 22, 36, sideW, 16, myHp, myMax, this.playerVisual.hex, false);
    this.drawHpBar(this.enemyHpBar, this.scale.width - 22 - sideW, 36, sideW, 16, enHp, enMax, this.enemyVisual.hex, true);

    this.playerHpLabel.setText(`${myHp} / ${myMax}`);
    this.enemyHpLabel.setText(`${enHp} / ${enMax}`);
  }

  private playerSideW() {
    return Math.max(120, (this.scale.width - 32) / 2 - 80);
  }

  private drawHpBar(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    hp: number, maxHp: number,
    accent: number,
    rightAligned: boolean,
  ) {
    g.clear();
    const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    const fillW = Math.round(w * ratio);

    g.fillStyle(THEME.PANEL_INK, 1);
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle(THEME.HUD_HP_TRACK, 1);
    g.fillRect(x, y, w, h);

    // Damage glow at the leading edge of the missing chunk
    g.fillStyle(THEME.HUD_HP_DAMAGE, 0.55);
    if (rightAligned) {
      const edge = x + (w - fillW);
      g.fillRect(edge - 6, y, Math.min(6, w - fillW), h);
    } else {
      g.fillRect(x + fillW, y, Math.min(6, w - fillW), h);
    }

    g.fillStyle(accent, 1);
    if (rightAligned) {
      g.fillRect(x + (w - fillW), y, fillW, h);
    } else {
      g.fillRect(x, y, fillW, h);
    }

    // Diagonal hatching on filled portion
    g.lineStyle(1, 0xffffff, 0.18);
    const step = 6;
    if (rightAligned) {
      const startX = x + (w - fillW);
      for (let hx = 0; hx < fillW + h; hx += step) {
        g.beginPath();
        g.moveTo(startX + hx, y);
        g.lineTo(startX + hx - h, y + h);
        g.strokePath();
      }
    } else {
      for (let hx = -h; hx < fillW; hx += step) {
        g.beginPath();
        g.moveTo(x + hx, y + h);
        g.lineTo(x + hx + h, y);
        g.strokePath();
      }
    }

    g.lineStyle(2, THEME.PANEL_INK, 1);
    g.strokeRect(x, y, w, h);
    g.lineStyle(1, accent, 0.45);
    g.strokeRect(x + 2, y + 2, w - 4, h - 4);
  }

  // ── Round timer ────────────────────────────────────────────────────────

  private startTimer() {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tickTimer(),
    });
  }

  private resetTimer() {
    this.timeLeft = ROUND_TIME_SECONDS;
    this.drawTimerRing(1);
    this.timerText.setText(String(this.timeLeft));
    this.timerText.setColor('#ffffff');
    this.timerText.setScale(1);
  }

  private tickTimer() {
    this.timeLeft = Math.max(0, this.timeLeft - 1);
    const ratio = this.timeLeft / ROUND_TIME_SECONDS;
    this.drawTimerRing(ratio);
    this.timerText.setText(String(this.timeLeft));

    this.tweens.add({
      targets: this.timerText,
      scale: 1.25,
      duration: 90,
      yoyo: true,
      ease: 'Sine.easeOut',
    });

    if (this.timeLeft <= 5 && this.timeLeft > 0) {
      this.timerText.setColor(THEME.DANGER_STR);
      this.cameras.main.shake(60, 0.0015);
    } else {
      this.timerText.setColor('#ffffff');
    }
  }

  private drawTimerRing(ratio: number) {
    const cx = this.scale.width / 2;
    const cy = 32;
    const r = 22;
    this.timerRing.clear();

    this.timerRing.fillStyle(THEME.PANEL_INK, 1);
    this.timerRing.fillCircle(cx, cy, r + 3);
    this.timerRing.fillStyle(THEME.HUD_TIMER_BG, 1);
    this.timerRing.fillCircle(cx, cy, r);

    const start = -Math.PI / 2;
    const end = start + Math.PI * 2 * Math.max(0, Math.min(1, ratio));
    const color = ratio < 0.17 ? THEME.HUD_TIMER_DANGER : THEME.HUD_TIMER_RING;
    this.timerRing.lineStyle(4, color, 1);
    this.timerRing.beginPath();
    this.timerRing.arc(cx, cy, r - 2, start, end, false);
    this.timerRing.strokePath();
  }

  // ── Misc ───────────────────────────────────────────────────────────────

  private refresh() {
    this.turnLabel.setText(`TUR ${this.room.currentTurn}`);

    const isMyTurn = this.room.currentPlayerId === this.socket.myUserId;
    this.activeBanner.setText(isMyTurn ? 'SIRA SENDE' : 'RAKIBIN SIRASI');
    this.activeBanner.setColor(isMyTurn ? THEME.SUCCESS_STR : THEME.DANGER_STR);

    this.endTurnBtn.setAlpha(isMyTurn ? 1 : 0.4);
    this.surrenderBtn.setAlpha(isMyTurn ? 1 : 0.5);
  }

  private updateUnitInfo(unit: UnitState | null) {
    if (!unit) {
      this.unitInfoText.setText('BIRIM SECMEK ICIN TIKLA');
      return;
    }
    const used = unit.actionUsed ? '  [KULLANILDI]' : '';
    this.unitInfoText.setText(
      `${unit.type.toUpperCase()}   HP ${unit.hp}/${unit.maxHp}   ATK ${unit.attack}   DEF ${unit.defense}   SPD ${unit.speed}${used}`,
    );
  }

  private showNotif(msg: string) {
    this.notifText.setText(msg).setAlpha(0).setScale(0.5);
    this.tweens.add({
      targets: this.notifText,
      alpha: 1,
      scale: 1,
      duration: 350,
      ease: 'Back.out',
    });
  }
}

function sumHp(units?: UnitState[]) {
  return (units ?? []).reduce((acc, u) => acc + Math.max(0, u.hp), 0);
}
function sumMaxHp(units?: UnitState[]) {
  return (units ?? []).reduce((acc, u) => acc + u.maxHp, 0);
}
