import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';
import { COLORS } from '../config/balance';
import { OverlayManager } from '../ui/OverlayManager';
import { SaveManager } from '../core/SaveManager';

export class MenuScene extends Phaser.Scene {
  private audio!: AudioManager;
  private overlay!: OverlayManager;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.audio = AudioManager.get(this);
    this.overlay = new OverlayManager(this, {
      resumeGame: () => this.create(),
      restartGame: () => this.scene.start('GameScene'),
      returnToMenu: () => this.scene.restart(),
    }, this.audio);
    this.audio.setMusic('forest', { fadeMs: 900 });
    this.buildMenu();
    this.scale.on('resize', () => this.scene.restart());
  }

  private buildMenu(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLORS.deepForest);
    const backdrop = this.add.graphics();
    backdrop.fillGradientStyle(0x061612, 0x061612, 0x14392d, 0x14392d, 1);
    backdrop.fillRect(0, 0, width, height);
    backdrop.fillStyle(0x2c6248, 0.25).fillEllipse(width * 0.5, height * 0.62, width * 0.82, height * 0.52);

    for (let i = 0; i < Math.ceil(width / 52); i += 1) {
      const x = i * 52 + Phaser.Math.Between(-18, 18);
      const texture = i % 6 === 0 ? 'tree-dead' : i % 3 === 0 ? 'tree-small' : 'tree-large';
      const tree = this.add.image(x, height * 0.66 + Phaser.Math.Between(-25, 25), texture)
        .setOrigin(0.5, 0.86)
        .setScale(2.8 + Math.random())
        .setTint(0x153c31)
        .setAlpha(0.9);
      tree.setDepth(2);
    }
    for (let i = 0; i < 42; i += 1) {
      const mote = this.add.image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 'orb')
        .setScale(Phaser.Math.FloatBetween(0.12, 0.34))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(Phaser.Math.FloatBetween(0.16, 0.62))
        .setDepth(3);
      this.tweens.add({
        targets: mote,
        y: mote.y - Phaser.Math.Between(80, 220),
        x: mote.x + Phaser.Math.Between(-45, 45),
        alpha: 0.05,
        duration: Phaser.Math.Between(2500, 5600),
        yoyo: true,
        repeat: -1,
      });
    }

    const heroineGlow = this.add.circle(width * 0.5, height * 0.475, 76, 0x7ce4c7, 0.13).setDepth(4);
    this.tweens.add({ targets: heroineGlow, scale: 1.2, alpha: 0.04, duration: 1300, yoyo: true, repeat: -1 });
    this.add.sprite(width * 0.5, height * 0.48, 'girl', 0).setScale(Math.max(4.6, Math.min(7.2, width / 205))).play('girl-idle-down').setDepth(5);

    this.add.text(width * 0.5, height * 0.095, 'GLIMMERGROVE', {
      fontFamily: 'Cinzel, serif', fontSize: `${Math.max(34, Math.min(68, width * 0.056))}px`, fontStyle: 'bold', color: '#fff1b1', stroke: '#291e12', strokeThickness: 8,
      shadow: { offsetY: 5, color: '#020a08', blur: 8, fill: true },
    }).setOrigin(0.5).setDepth(10);
    this.add.text(width * 0.5, height * 0.195, 'D R A G O N F A L L', {
      fontFamily: 'Cinzel, serif', fontSize: `${Math.max(16, Math.min(27, width * 0.022))}px`, color: '#7ce4c7', stroke: '#09231d', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    const play = this.makeButton(width * 0.5, height * 0.69, 'PLAY', 250);
    const how = this.makeButton(width * 0.5 - 135, height * 0.79, 'HOW TO PLAY', 230);
    const settings = this.makeButton(width * 0.5 + 135, height * 0.79, 'SETTINGS', 230);
    play.on('pointerup', () => {
      this.audio.playSfx('click', { volume: 0.45 });
      void this.audio.unlock();
      this.scene.start('GameScene');
    });
    how.on('pointerup', () => this.overlay.showHowToPlay(() => this.scene.restart()));
    settings.on('pointerup', () => this.overlay.showSettings(() => this.scene.restart()));
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('GameScene'));

    const highScore = SaveManager.load().highScore;
    const scoreText = highScore
      ? `BEST  •  WAVE ${highScore.wave}  •  ${highScore.kills} KILLS${highScore.victory ? '  •  FOREST SAVED' : ''}`
      : 'SURVIVE 10 HARD WAVES  •  SLAY THE ANCIENT BEAST  •  DEFEAT THE DRAGON';
    this.add.text(width * 0.5, height * 0.91, scoreText, {
      fontFamily: 'Nunito, sans-serif', fontSize: `${Math.max(11, Math.min(15, width * 0.012))}px`, fontStyle: 'bold', color: '#b9d7bd', letterSpacing: 1,
    }).setOrigin(0.5).setAlpha(0.78).setDepth(10);
  }

  private makeButton(x: number, y: number, label: string, width: number): Phaser.GameObjects.Container {
    const plate = this.add.rectangle(0, 0, width, 54, 0x102f27, 0.97).setStrokeStyle(2, COLORS.gold, 0.75);
    const text = this.add.text(0, 0, label, { fontFamily: 'Cinzel, serif', fontSize: '18px', fontStyle: 'bold', color: '#fff1b1' }).setOrigin(0.5);
    const button = this.add.container(x, y, [plate, text]).setSize(width, 54).setInteractive({ useHandCursor: true }).setDepth(12);
    button.on('pointerover', () => { plate.setFillStyle(0x245b49, 1); button.setScale(1.035); });
    button.on('pointerout', () => { plate.setFillStyle(0x102f27, 0.97); button.setScale(1); });
    return button;
  }
}
