import Phaser from 'phaser';
import { GameSocket, UnitState, GameRoom } from '../socket/GameSocket';
import { UnitSprite } from '../objects/UnitSprite';
import { spawnDamageText, spawnAbilityText } from '../objects/DamageText';
import { THEME } from '../theme';

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

  private unitSprites = new Map<string, UnitSprite>();
  private selectedUnit: UnitSprite | null = null;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private reachableCells: { col: number; row: number }[] = [];
  private reachableGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: { socket: GameSocket; room: GameRoom }) {
    this.socket = data.socket;
    this.room = data.room;
  }

  create() {
    this.cameras.main.setBackgroundColor(THEME.BG);
    this.drawGrid();
    this.reachableGraphics = this.add.graphics();
    this.spawnAllUnits();
    this.registerSocketEvents();
    this.input.on('pointerdown', this.handlePointerDown, this);

    // Launch UI overlay
    this.scene.launch('UIScene', { socket: this.socket, room: this.room });
  }

  private drawGrid() {
    this.gridGraphics = this.add.graphics();

    // Background panel
    this.gridGraphics.fillStyle(THEME.BG_PANEL, 1);
    this.gridGraphics.fillRect(MARGIN_X - 4, MARGIN_Y - 4, GRID_COLS * CELL_SIZE + 8, GRID_ROWS * CELL_SIZE + 8);

    // Dividing line (player left, enemy right)
    const midX = MARGIN_X + (GRID_COLS / 2) * CELL_SIZE;
    this.gridGraphics.lineStyle(2, THEME.GRID_DIVIDER, 0.5);
    this.gridGraphics.lineBetween(midX, MARGIN_Y, midX, MARGIN_Y + GRID_ROWS * CELL_SIZE);

    // Grid cells
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

      attacker.playAttackAnim(target.x, target.y, () => {
        target.unitState.hp = targetHp;
        target.applyState(target.unitState);
        spawnDamageText(this, target.x, target.y, damage);
      });
    });

    this.socket.on('unit_died', (data) => {
      const { unitId } = data as { unitId: string };
      const sprite = this.unitSprites.get(unitId);
      if (sprite) {
        sprite.playDeathAnim(() => this.unitSprites.delete(unitId));
      }
    });

    this.socket.on('unit_moved', (data) => {
      const { unitId, position } = data as { unitId: string; position: { x: number; y: number } };
      const sprite = this.unitSprites.get(unitId);
      if (!sprite) return;
      const { x, y } = cellToPixel(position.x, position.y);
      sprite.unitState.position = position;
      sprite.playMoveAnim(x, y);
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
    });

    this.socket.on('game_over', (data) => {
      this.time.delayedCall(600, () => {
        this.scene.launch('WinLoseScene', { data, myId: this.socket.myUserId });
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
