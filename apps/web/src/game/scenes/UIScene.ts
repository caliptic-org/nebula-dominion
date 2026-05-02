import Phaser from 'phaser';
import { GameSocket, GameRoom, UnitState } from '../socket/GameSocket';

const PANEL_H = 90;
const SCENE_W = 656; // matches BattleScene width

export class UIScene extends Phaser.Scene {
  private socket!: GameSocket;
  private room!: GameRoom;

  private turnText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private activeText!: Phaser.GameObjects.Text;
  private manaBar!: Phaser.GameObjects.Graphics;
  private unitInfoText!: Phaser.GameObjects.Text;
  private endTurnBtn!: Phaser.GameObjects.Text;
  private surrenderBtn!: Phaser.GameObjects.Text;
  private notifText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: { socket: GameSocket; room: GameRoom }) {
    this.socket = data.socket;
    this.room = data.room;
  }

  create() {
    const sceneH = this.scale.height;

    // Top bar
    const topBar = this.add.graphics();
    topBar.fillStyle(0x0a0a20, 0.92);
    topBar.fillRect(0, 0, SCENE_W, 56);

    this.turnText = this.add.text(16, 8, 'Turn 1', {
      fontSize: '18px', color: '#a0a0ff', fontStyle: 'bold',
    });
    this.phaseText = this.add.text(16, 30, 'Phase: action', {
      fontSize: '12px', color: '#668888',
    });
    this.activeText = this.add.text(SCENE_W / 2, 8, '', {
      fontSize: '15px', color: '#ffff88', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Mana bar
    this.add.text(SCENE_W - 160, 8, 'MANA', { fontSize: '11px', color: '#9966ff' });
    this.manaBar = this.add.graphics();
    this.drawMana(50);

    // Bottom panel
    const btmPanel = this.add.graphics();
    btmPanel.fillStyle(0x0a0a20, 0.92);
    btmPanel.fillRect(0, sceneH - PANEL_H, SCENE_W, PANEL_H);

    this.unitInfoText = this.add.text(16, sceneH - PANEL_H + 12, 'Click a unit to select', {
      fontSize: '12px', color: '#8888aa',
    });

    // End Turn button
    this.endTurnBtn = this.add.text(SCENE_W - 20, sceneH - PANEL_H + 20, 'END TURN', {
      fontSize: '14px', color: '#44ff88', fontStyle: 'bold',
      backgroundColor: '#0d3d1e', padding: { x: 12, y: 8 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    this.endTurnBtn.on('pointerdown', () => {
      if (this.room.currentPlayerId === this.socket.myUserId) {
        this.socket.sendAction('end_turn');
      }
    });

    this.endTurnBtn.on('pointerover', () => this.endTurnBtn.setStyle({ color: '#88ffaa' }));
    this.endTurnBtn.on('pointerout', () => this.endTurnBtn.setStyle({ color: '#44ff88' }));

    // Surrender button
    this.surrenderBtn = this.add.text(SCENE_W - 20, sceneH - PANEL_H + 52, 'SURRENDER', {
      fontSize: '11px', color: '#ff6666',
      backgroundColor: '#3d0d0d', padding: { x: 10, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    this.surrenderBtn.on('pointerdown', () => {
      if (this.room.currentPlayerId === this.socket.myUserId) {
        this.socket.sendAction('surrender');
      }
    });

    // Notification text (center)
    this.notifText = this.add.text(SCENE_W / 2, sceneH - PANEL_H / 2, '', {
      fontSize: '16px', color: '#ffff44', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setAlpha(0);

    // Listen to events from BattleScene
    const battleScene = this.scene.get('BattleScene');
    battleScene.events.on('unit_selected', (unit: UnitState | null) => this.updateUnitInfo(unit));

    this.events.on('game_over_start', () => {
      this.notifText.setText('BATTLE ENDED').setAlpha(1);
    });

    // Listen to socket state updates
    this.socket.on('state_update', (data) => {
      const { currentPlayerId, turn, phase } = data as { currentPlayerId: string; turn: number; phase: string };
      this.room.currentPlayerId = currentPlayerId;
      this.room.currentTurn = turn as number;
      this.room.phase = phase;
      this.refresh();
    });

    this.socket.on('turn_ended', (data) => {
      const { nextPlayerId, turn } = data as { nextPlayerId: string; turn: number };
      this.room.currentPlayerId = nextPlayerId;
      this.room.currentTurn = turn as number;
      this.refresh();
    });

    this.refresh();
  }

  private refresh() {
    this.turnText.setText(`Turn ${this.room.currentTurn}`);
    this.phaseText.setText(`Phase: ${this.room.phase}`);

    const isMyTurn = this.room.currentPlayerId === this.socket.myUserId;
    this.activeText.setText(isMyTurn ? 'YOUR TURN' : 'OPPONENT\'S TURN');
    this.activeText.setStyle({ color: isMyTurn ? '#44ff88' : '#ff6666' });

    const myState = this.room.players[this.socket.myUserId];
    if (myState) this.drawMana(myState.mana);

    this.endTurnBtn.setAlpha(isMyTurn ? 1 : 0.4);
    this.surrenderBtn.setAlpha(isMyTurn ? 1 : 0.4);
  }

  private drawMana(mana: number) {
    const x = this.scale.width - 155;
    const y = 24;
    const w = 130;
    const h = 10;
    const ratio = mana / 100;

    this.manaBar.clear();
    this.manaBar.fillStyle(0x1a1a3a, 1);
    this.manaBar.fillRect(x, y, w, h);
    this.manaBar.fillStyle(0x9966ff, 1);
    this.manaBar.fillRect(x, y, Math.round(w * ratio), h);

    this.add.text(x + w + 6, y - 2, `${mana}`, { fontSize: '11px', color: '#aa88ff' });
  }

  private updateUnitInfo(unit: UnitState | null) {
    if (!unit) {
      this.unitInfoText.setText('Click a unit to select');
      return;
    }
    this.unitInfoText.setText(
      `${unit.type.toUpperCase()}  HP: ${unit.hp}/${unit.maxHp}  ATK: ${unit.attack}  DEF: ${unit.defense}  SPD: ${unit.speed}${unit.actionUsed ? '  [USED]' : ''}`,
    );
  }
}
