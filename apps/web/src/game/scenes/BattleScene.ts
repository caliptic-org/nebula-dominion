import Phaser from 'phaser';
import { GameSocket, UnitState, GameRoom } from '../socket/GameSocket';
import { UnitSprite } from '../objects/UnitSprite';
import { spawnDamageText, spawnAbilityText } from '../objects/DamageText';
import { THEME, getRaceVisual } from '../theme';

const GRID_COLS = 8;
const GRID_ROWS = 6;
const CELL_SIZE = 72;
const MARGIN_X = 80;
const MARGIN_Y = 100;

const SCENE_W = MARGIN_X * 2 + GRID_COLS * CELL_SIZE;
const SCENE_H = MARGIN_Y * 2 + GRID_ROWS * CELL_SIZE;

function cellToPixel(col: number, row: number): { x: number; y: number } {
  return {
    x: MARGIN_X + col * CELL_SIZE + CELL_SIZE / 2,
    y: MARGIN_Y + row * CELL_SIZE + CELL_SIZE / 2,
  };
}

function pixelToCell(px: number, py: number): { col: number; row: number } {
  return {
    col: Math.floor((px - MARGIN_X) / CELL_SIZE),
    row: Math.floor((py - MARGIN_Y) / CELL_SIZE),
  };
}

export class BattleScene extends Phaser.Scene {
  private socket!: GameSocket;
  private room!: GameRoom;
  private tutorial = false;
  private tutorialRaceColorHex?: number;

  private unitSprites = new Map<string, UnitSprite>();
  private selectedUnit: UnitSprite | null = null;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private reachableCells: { col: number; row: number }[] = [];
  private reachableGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: {
    socket: GameSocket;
    room: GameRoom;
    tutorial?: boolean;
    tutorialRaceColorHex?: number;
  }) {
    this.socket = data.socket;
    this.room = data.room;
    this.tutorial = data.tutorial === true;
    this.tutorialRaceColorHex = data.tutorialRaceColorHex;
  }

  create() {
    this.cameras.main.setBackgroundColor(THEME.BG);
    this.drawGrid();
    this.reachableGraphics = this.add.graphics();
    this.spawnAllUnits();
    this.registerSocketEvents();
    this.input.on('pointerdown', this.handlePointerDown, this);

    // Launch UI overlay with race context
    const myId = this.socket.myUserId;
    const enemyId = Object.keys(this.room.players).find((id) => id !== myId) ?? myId;
    const playerRace = this.room.players[myId]?.race ?? this.socket.myRace;
    const enemyRace = this.room.players[enemyId]?.race ?? 'canavar';

    this.scene.launch('UIScene', {
      socket: this.socket,
      room: this.room,
      playerRace,
      enemyRace,
    });

    if (this.tutorial) {
      // Run the 3-step tutorial overlay in parallel — it sleeps the BattleScene
      // events bus rather than the game itself, so combat still flows below.
      this.scene.launch('TutorialOverlayScene', {
        raceColorHex: this.tutorialRaceColorHex,
      });
    }
  }

  private drawHalftoneBackdrop() {
    // Halftone dot pattern — manga texture
    const g = this.add.graphics();
    g.fillStyle(THEME.HALFTONE_DOT, 0.04);
    const step = 18;
    for (let y = 0; y < SCENE_H; y += step) {
      for (let x = ((y / step) % 2 === 0 ? 0 : step / 2); x < SCENE_W; x += step) {
        g.fillCircle(x, y, 1.2);
      }
    }
    g.setDepth(-10);
  }

  private drawGrid() {
    this.gridGraphics = this.add.graphics();

    const playerVisual = getRaceVisual(this.room.players[this.socket.myUserId]?.race);
    const enemyId = Object.keys(this.room.players).find((id) => id !== this.socket.myUserId);
    const enemyVisual = getRaceVisual(enemyId ? this.room.players[enemyId]?.race : undefined);

    const gridX = MARGIN_X - 4;
    const gridY = MARGIN_Y - 4;
    const gridW = GRID_COLS * CELL_SIZE + 8;
    const gridH = GRID_ROWS * CELL_SIZE + 8;

    // Background panel
    this.gridGraphics.fillStyle(THEME.BG_PANEL, 1);
    this.gridGraphics.fillRect(MARGIN_X - 4, MARGIN_Y - 4, GRID_COLS * CELL_SIZE + 8, GRID_ROWS * CELL_SIZE + 8);

    // Manga ink border (thick black outline)
    this.gridGraphics.lineStyle(4, THEME.PANEL_INK, 1);
    this.gridGraphics.strokeRect(gridX, gridY, gridW, gridH);

    // Dividing line (player left, enemy right) — manga split
    const midX = MARGIN_X + (GRID_COLS / 2) * CELL_SIZE;
    this.gridGraphics.lineStyle(2, THEME.GRID_DIVIDER, 0.5);
    this.gridGraphics.lineBetween(midX, MARGIN_Y, midX, MARGIN_Y + GRID_ROWS * CELL_SIZE);

    // Grid cells with race-tinted halves
    for (let c = 0; c < GRID_COLS; c++) {
      for (let r = 0; r < GRID_ROWS; r++) {
        const x = MARGIN_X + c * CELL_SIZE;
        const y = MARGIN_Y + r * CELL_SIZE;
        const isPlayerSide = c < GRID_COLS / 2;
        this.gridGraphics.lineStyle(1, isPlayerSide ? THEME.GRID_PLAYER_SIDE : THEME.GRID_ENEMY_SIDE, 0.4);
        this.gridGraphics.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }

    // Labels
    this.add.text(MARGIN_X + GRID_COLS * CELL_SIZE * 0.25, MARGIN_Y - 24, 'YOUR FORCES', {
      fontSize: '12px', color: THEME.INFO_STR, fontStyle: 'bold',
    }).setOrigin(0.5, 1);

    this.add.text(MARGIN_X + GRID_COLS * CELL_SIZE * 0.75, MARGIN_Y - 24, 'ENEMY FORCES', {
      fontSize: '12px', color: THEME.DANGER_STR, fontStyle: 'bold',
    }).setOrigin(0.5, 1);
  }

  private spawnAllUnits() {
    const playerIds = Object.keys(this.room.players);
    const myId = this.socket.myUserId;

    for (const pid of playerIds) {
      const isEnemy = pid !== myId;
      for (const unit of this.room.players[pid].units) {
        this.spawnUnit(unit, pid, isEnemy);
      }
    }
  }

  private spawnUnit(unit: UnitState, ownerId: string, isEnemy: boolean): UnitSprite {
    const { x, y } = cellToPixel(unit.position.x, unit.position.y);
    const sprite = new UnitSprite(this, x, y, unit, ownerId, isEnemy);

    if (!isEnemy) {
      sprite.on('pointerdown', (ptr: Phaser.Input.Pointer, lx: number, ly: number, evt: Event) => {
        evt.stopPropagation();
        this.onOwnUnitClick(sprite);
      });
    }

    this.unitSprites.set(unit.id, sprite);
    return sprite;
  }

  private onOwnUnitClick(sprite: UnitSprite) {
    const myId = this.socket.myUserId;
    if (this.room.currentPlayerId !== myId) return;
    if (sprite.unitState.actionUsed) return;

    if (this.selectedUnit === sprite) {
      this.deselect();
      return;
    }

    this.deselect();
    this.selectedUnit = sprite;
    sprite.setSelected(true);
    this.drawReachable(sprite);

    // Highlight enemy units as attack targets
    for (const [, s] of this.unitSprites) {
      if (s.isEnemy) s.setHighlighted(true);
    }

    this.scene.get('UIScene').events.emit('unit_selected', sprite.unitState);
  }

  private handlePointerDown(ptr: Phaser.Input.Pointer) {
    const myId = this.socket.myUserId;
    if (!this.selectedUnit || this.room.currentPlayerId !== myId) return;

    // Check if clicked on an enemy unit
    for (const [, s] of this.unitSprites) {
      if (!s.isEnemy) continue;
      const dx = Math.abs(ptr.worldX - s.x);
      const dy = Math.abs(ptr.worldY - s.y);
      if (dx < 20 && dy < 20) {
        this.sendAttack(s);
        return;
      }
    }

    // Check if clicked on a grid cell for movement
    const { col, row } = pixelToCell(ptr.worldX, ptr.worldY);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      this.deselect();
      return;
    }

    const isReachable = this.reachableCells.some((c) => c.col === col && c.row === row);
    if (isReachable) {
      this.sendMove(col, row);
    } else {
      this.deselect();
    }
  }

  private sendAttack(target: UnitSprite) {
    if (!this.selectedUnit) return;
    const attacker = this.selectedUnit;
    this.deselect();

    this.socket.sendAction('attack', {
      attackerUnitId: attacker.unitState.id,
      targetUnitId: target.unitState.id,
    });
  }

  private sendMove(col: number, row: number) {
    if (!this.selectedUnit) return;
    const unit = this.selectedUnit;
    this.deselect();
    this.socket.sendAction('move_unit', { unitId: unit.unitState.id, position: { x: col, y: row } });
  }

  private drawReachable(sprite: UnitSprite) {
    const spd = sprite.unitState.speed;
    const px = sprite.unitState.position.x;
    const py = sprite.unitState.position.y;
    this.reachableCells = [];

    for (let dc = -spd; dc <= spd; dc++) {
      for (let dr = -(spd - Math.abs(dc)); dr <= spd - Math.abs(dc); dr++) {
        const c = px + dc;
        const r = py + dr;
        if (c < 0 || c >= GRID_COLS || r < 0 || r >= GRID_ROWS) continue;
        if (dc === 0 && dr === 0) continue;
        // Don't allow moving into enemy half... actually allow it for aggression
        const occupied = Array.from(this.unitSprites.values()).some(
          (s) => s.unitState.position.x === c && s.unitState.position.y === r,
        );
        if (!occupied) this.reachableCells.push({ col: c, row: r });
      }
    }

    this.reachableGraphics.clear();
    this.reachableGraphics.fillStyle(THEME.GRID_REACHABLE, 0.25);
    for (const { col, row } of this.reachableCells) {
      this.reachableGraphics.fillRect(
        MARGIN_X + col * CELL_SIZE + 2,
        MARGIN_Y + row * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4,
      );
    }
  }

  private deselect() {
    this.selectedUnit?.setSelected(false);
    this.selectedUnit = null;
    this.reachableCells = [];
    this.reachableGraphics.clear();
    for (const [, s] of this.unitSprites) {
      if (s.isEnemy) s.setHighlighted(false);
    }
    this.scene.get('UIScene').events.emit('unit_selected', null);
  }

  private registerSocketEvents() {
    this.socket.on('unit_attacked', (data) => {
      const { attackerUnitId, targetUnitId, damage, targetHp } = data as {
        attackerUnitId: string; targetUnitId: string; damage: number; targetHp: number;
      };
      const attacker = this.unitSprites.get(attackerUnitId);
      const target = this.unitSprites.get(targetUnitId);
      if (!attacker || !target) return;

      // Tutorial overlay listens for these to advance step 3.
      if (!attacker.isEnemy) {
        this.events.emit('tutorial:attacked', { attackerUnitId, targetUnitId });
      }

      // Speed lines fire as the attacker lunges
      const ui = this.scene.get('UIScene');
      ui.events.emit('speed_lines', { fromX: attacker.x, fromY: attacker.y, toX: target.x, toY: target.y });

      attacker.playAttackAnim(target.x, target.y, () => {
        target.unitState.hp = targetHp;
        target.applyState(target.unitState);
        spawnDamageText(this, target.x, target.y, damage);
        ui.events.emit('hp_changed');
      });
    });

    this.socket.on('unit_died', (data) => {
      const { unitId } = data as { unitId: string };
      const sprite = this.unitSprites.get(unitId);
      if (sprite) {
        sprite.playDeathAnim(() => this.unitSprites.delete(unitId));
        this.scene.get('UIScene').events.emit('hp_changed');
      }
    });

    this.socket.on('unit_moved', (data) => {
      const { unitId, position } = data as { unitId: string; position: { x: number; y: number } };
      const sprite = this.unitSprites.get(unitId);
      if (!sprite) return;
      const { x, y } = cellToPixel(position.x, position.y);
      sprite.unitState.position = position;
      sprite.playMoveAnim(x, y);

      // Tutorial overlay advances to step 3 when the player's unit moves.
      if (!sprite.isEnemy) {
        this.events.emit('tutorial:moved', { unitId, position });
      }
    });

    this.socket.on('ability_used', (data) => {
      const { unitId } = data as { unitId: string };
      const sprite = this.unitSprites.get(unitId);
      if (sprite) spawnAbilityText(this, sprite.x, sprite.y, sprite.unitState.type);
    });

    this.socket.on('state_update', (data) => {
      const { currentPlayerId, turn, phase, status } = data as {
        currentPlayerId: string; turn: number; phase: string; status: string;
      };
      this.room.currentPlayerId = currentPlayerId;
      this.room.currentTurn = turn as number;
      this.room.phase = phase;
      this.room.status = status;
      this.deselect();

      if (status === 'finished') {
        this.scene.get('UIScene').events.emit('game_over_start');
      }
    });

    this.socket.on('full_state_sync', (data) => {
      const { room } = data as { room: GameRoom };
      this.room = room;
      this.unitSprites.forEach((s) => s.destroy());
      this.unitSprites.clear();
      this.spawnAllUnits();
      this.scene.get('UIScene').events.emit('hp_changed');
    });

    this.socket.on('game_over', (data) => {
      this.time.delayedCall(600, () => {
        const winnerId = (data as { winner?: string }).winner;
        const winnerRace = winnerId ? this.room.players[winnerId]?.race : undefined;
        this.scene.launch('WinLoseScene', {
          data: { ...data, winnerRace, room: this.room },
          myId: this.socket.myUserId,
          tutorial: this.tutorial,
        });
        this.scene.pause();
      });
    });

    this.socket.on('turn_ended', (data) => {
      const { nextPlayerId, turn } = data as { nextPlayerId: string; turn: number };
      this.room.currentPlayerId = nextPlayerId;
      this.room.currentTurn = turn as number;
      // Reset actionUsed visually for the new active player's units
      for (const [, sprite] of this.unitSprites) {
        if (sprite.ownerId === nextPlayerId) {
          sprite.unitState.actionUsed = false;
          sprite.applyState(sprite.unitState);
        }
      }
    });
  }

  static get WIDTH() { return SCENE_W; }
  static get HEIGHT() { return SCENE_H; }
}
