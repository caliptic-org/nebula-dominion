import Phaser from 'phaser';
import { GameSocket, GameRoom } from '../socket/GameSocket';
import { Race } from '../types';

export class BootScene extends Phaser.Scene {
  private socket!: GameSocket;
  private race!: Race;
  private mode!: string;
  private loadingText!: Phaser.GameObjects.Text;
  private dots = 0;
  private dotTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'BootScene' });
  }

  init(data: { socket: GameSocket; race: Race; mode: string }) {
    this.socket = data.socket;
    this.race = data.race;
    this.mode = data.mode;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#060612');

    // Star field
    for (let i = 0; i < 120; i++) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, Math.random() * 0.6 + 0.1);
      g.fillCircle(Math.random() * width, Math.random() * height, Math.random() * 1.5);
    }

    this.add.text(width / 2, height / 2 - 60, 'NEBULA DOMINION', {
      fontSize: '32px', fontStyle: 'bold',
      color: '#7b8cde',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.loadingText = this.add.text(width / 2, height / 2, 'Connecting to battle server', {
      fontSize: '16px', color: '#666688',
    }).setOrigin(0.5);

    this.dotTimer = this.time.addEvent({
      delay: 400,
      repeat: -1,
      callback: () => {
        this.dots = (this.dots + 1) % 4;
        this.loadingText.setText('Connecting to battle server' + '.'.repeat(this.dots));
      },
    });

    this.startGame();
  }

  private startGame() {
    if (this.mode === 'pve') {
      this.socket.on('pve_game_ready', (data) => {
        const roomData = data as unknown as { roomId: string; botId: string; yourTurn: boolean };
        this.socket.on('room_joined', (joinData) => {
          const { room } = joinData as { room: GameRoom };
          this.dotTimer.remove();
          this.setStatus(`Battle ready! ${roomData.yourTurn ? 'You go first.' : 'Bot goes first.'}`);
          this.time.delayedCall(800, () => {
            this.scene.start('BattleScene', { socket: this.socket, room });
          });
        });
      });

      this.socket.startPve();
    } else {
      // PvP matchmaking — join matchmaking namespace
      this.setStatus('Looking for opponent...');
      // PvP matchmaking handled by MatchmakingGateway (separate integration)
    }
  }

  private setStatus(msg: string) {
    this.loadingText.setText(msg);
  }
}
