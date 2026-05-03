import Phaser from 'phaser';
import { GameSocket, GameRoom, UnitState } from '../socket/GameSocket';
import { THEME } from '../theme';
import { HeroSkillsPanel } from '../objects/HeroSkillsPanel';
import { BattleLogPanel, BattleEventData, BattleEventType } from '../objects/BattleLogPanel';

const PANEL_H = 100;
const SCENE_W = 656; // matches BattleScene width
const LOG_W = 200;
const TOP_BAR_H = 56;
const SKILL_PANEL_H = HeroSkillsPanel.PANEL_HEIGHT;
const SKILL_PANEL_OFFSET_FROM_BOTTOM = PANEL_H + 12;

type RaceKey = keyof typeof THEME.RACE;

const RACE_ICONS: Record<string, string[]> = {
  insan:   ['⚡', '🔫', '💥', '🛡'],
  zerg:    ['🦷', '🩸', '🕸', '🦠'],
  otomat:  ['⚡', '🔧', '🛰', '☄'],
  canavar: ['🔥', '💢', '🌀', '☄'],
  seytan:  ['💀', '🔥', '🌑', '⛧'],
};

export class UIScene extends Phaser.Scene {
  private socket!: GameSocket;
  private room!: GameRoom;

  private turnText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private activeText!: Phaser.GameObjects.Text;
  private manaBar!: Phaser.GameObjects.Graphics;
  private manaValueText!: Phaser.GameObjects.Text;
  private unitInfoText!: Phaser.GameObjects.Text;
  private endTurnBtn!: Phaser.GameObjects.Container;
  private surrenderBtn!: Phaser.GameObjects.Container;
  private notifText!: Phaser.GameObjects.Text;
  private skillsPanel!: HeroSkillsPanel;
  private logPanel!: BattleLogPanel;

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
    const sceneH = this.scale.height;
    const raceColor = this.getRaceColor();

    // Top bar
    const topBar = this.add.graphics();
    topBar.fillStyle(THEME.HUD_BG, 0.92);
    topBar.fillRect(0, 0, SCENE_W, TOP_BAR_H);

    this.turnText = this.add.text(16, 8, 'Turn 1', {
      fontSize: '18px', color: THEME.BRAND_STR, fontStyle: 'bold',
    });
    this.phaseText = this.add.text(16, 30, 'Phase: action', {
      fontSize: '12px', color: THEME.TEXT_MUTED,
    });
    this.activeText = this.add.text(SCENE_W / 2, 8, '', {
      fontSize: '15px', color: THEME.ENERGY_STR, fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Mana bar (now placed left of the right-edge log panel)
    this.add.text(SCENE_W - LOG_W - 160, 8, 'MANA', { fontSize: '11px', color: '#9966ff' });
    this.manaBar = this.add.graphics();
    this.manaValueText = this.add.text(0, 22, '', { fontSize: '11px', color: '#aa88ff' });
    this.drawMana(50);

    // Bottom panel
    const btmPanel = this.add.graphics();
    btmPanel.fillStyle(THEME.HUD_BG, 0.92);
    btmPanel.fillRect(0, sceneH - PANEL_H, SCENE_W, PANEL_H);

    this.unitInfoText = this.add.text(16, sceneH - PANEL_H + 12, 'Click a unit to select', {
      fontSize: '12px', color: THEME.TEXT_SECONDARY,
    });

    // End Turn / Surrender — moved left to clear the log panel on the right
    const buttonRightX = SCENE_W - 220;

    this.endTurnBtn = this.add.text(buttonRightX, sceneH - PANEL_H + 20, 'END TURN', {
      fontSize: '14px', color: THEME.HUD_END_TURN, fontStyle: 'bold',
      backgroundColor: '#0d3d1e', padding: { x: 12, y: 8 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    this.endTurnBtn.on('pointerdown', () => {
      if (this.room.currentPlayerId === this.socket.myUserId) {
        this.socket.sendAction('end_turn');
      }
    });

    this.endTurnBtn.on('pointerover', () => this.endTurnBtn.setStyle({ color: THEME.SUCCESS_STR }));
    this.endTurnBtn.on('pointerout', () => this.endTurnBtn.setStyle({ color: THEME.HUD_END_TURN }));

    this.surrenderBtn = this.add.text(buttonRightX, sceneH - PANEL_H + 56, 'SURRENDER', {
      fontSize: '11px', color: THEME.HUD_SURRENDER,
      backgroundColor: '#3d0d0d', padding: { x: 10, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    this.surrenderBtn.on('pointerdown', () => {
      if (this.room.currentPlayerId === this.socket.myUserId) {
        this.socket.sendAction('surrender');
      }
    });

    // Notification (center, above bottom panel)
    this.notifText = this.add.text(SCENE_W / 2, sceneH - PANEL_H / 2, '', {
      fontSize: '16px', color: THEME.ENERGY_STR, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setAlpha(0);

    // Hero skills panel — bottom-left, above the bottom panel
    const icons = RACE_ICONS[this.socket.myRace] ?? RACE_ICONS.insan;
    this.skillsPanel = new HeroSkillsPanel(this, 12, sceneH - SKILL_PANEL_OFFSET_FROM_BOTTOM, raceColor, icons);
    this.skillsPanel.on('skill_activate', (data: { skillIndex: number }) => {
      if (this.room.currentPlayerId === this.socket.myUserId) {
        this.socket.sendAction('use_ability', { skillIndex: data.skillIndex });
      }
    });

    // Battle log panel — right edge, between top bar and bottom panel
    const logH = sceneH - PANEL_H - TOP_BAR_H - 4;
    this.logPanel = new BattleLogPanel(this, SCENE_W - LOG_W, TOP_BAR_H + 2, LOG_W, logH, raceColor);

    // Listen to events from BattleScene
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
      this.logPanel.addEvent({ type: 'turn_start', turn: this.room.currentTurn });
    });

    // Hero skill state events
    this.socket.on('ability_ready', (data) => {
      const { skillIndex } = data as { skillIndex: number; cooldown?: number };
      if (typeof skillIndex === 'number') {
        this.skillsPanel.setSkillReady(skillIndex);
      }
    });

    this.socket.on('ability_used', (data) => {
      const { skillIndex, cooldown, abilityName, actorName } = data as {
        unitId?: string; skillIndex?: number; cooldown?: number; abilityName?: string; actorName?: string;
      };
      if (typeof skillIndex === 'number') {
        this.skillsPanel.setSkillOnCooldown(skillIndex, typeof cooldown === 'number' ? cooldown : 0);
      }
      this.logPanel.addEvent({
        type: 'ability',
        turn: this.room.currentTurn,
        actorName: actorName ?? 'Unit',
        abilityName: abilityName ?? `skill ${typeof skillIndex === 'number' ? skillIndex + 1 : ''}`,
      });
    });

    // Generic battle event stream (damage, heal, death, buff, etc.)
    this.socket.on('battle_event', (data) => {
      const evt = data as unknown as BattleEventData;
      const allowed: BattleEventType[] = ['damage', 'heal', 'ability', 'death', 'turn_start', 'buff', 'debuff'];
      const type = allowed.includes(evt.type) ? evt.type : 'damage';
      this.logPanel.addEvent({ ...evt, type, turn: evt.turn ?? this.room.currentTurn });
    });

    this.refresh();
    this.refreshTeamHp();
    this.startTimer();
  }

  update(time: number, deltaMs: number) {
    this.skillsPanel?.update(time, deltaMs);
  }

  update(time: number, deltaMs: number) {
    this.skillsPanel?.update(time, deltaMs);
  }

  private refresh() {
    this.turnLabel.setText(`TUR ${this.room.currentTurn}`);

    const isMyTurn = this.room.currentPlayerId === this.socket.myUserId;
    this.activeBanner.setText(isMyTurn ? 'SIRA SENDE' : 'RAKIBIN SIRASI');
    this.activeBanner.setColor(isMyTurn ? THEME.SUCCESS_STR : THEME.DANGER_STR);

    this.endTurnBtn.setAlpha(isMyTurn ? 1 : 0.4);
    this.surrenderBtn.setAlpha(isMyTurn ? 1 : 0.4);
  }

  private drawMana(mana: number) {
    const x = this.scale.width - LOG_W - 155;
    const y = 24;
    const w = 130;
    const h = 10;
    const ratio = mana / 100;

    this.manaBar.clear();
    this.manaBar.fillStyle(THEME.HUD_MANA_BG, 1);
    this.manaBar.fillRect(x, y, w, h);
    this.manaBar.fillStyle(THEME.HUD_MANA, 1);
    this.manaBar.fillRect(x, y, Math.round(w * ratio), h);

    this.manaValueText.setPosition(x + w + 6, y - 2);
    this.manaValueText.setText(`${mana}`);
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

  private getRaceColor(): number {
    const race = this.socket.myRace as RaceKey;
    return THEME.RACE[race]?.num ?? THEME.BRAND;
  }
}
