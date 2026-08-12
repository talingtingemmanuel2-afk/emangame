import Phaser from 'phaser';
import { COLORS } from '../config/balance';
import { createGameTextures } from '../world/TextureFactory';
import { AudioManager } from '../audio/AudioManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.spritesheet('girl', 'assets/player/Girl-Sheet(1).png', {
      frameWidth: 24,
      frameHeight: 24,
      endFrame: 43,
    });
    AudioManager.preload(this);
  }

  create(): void {
    this.createFallbackTexture();
    createGameTextures(this);
    this.createPlayerAnimations();
    this.scene.start('MenuScene');
  }

  private createFallbackTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.cyan, 1);
    graphics.fillCircle(8, 8, 7);
    graphics.lineStyle(2, COLORS.parchment, 1);
    graphics.strokeCircle(8, 8, 6);
    graphics.generateTexture('wisp', 16, 16);
    graphics.destroy();
  }

  private createPlayerAnimations(): void {
    const definitions: Array<[string, number[], number]> = [
      ['girl-idle-down', [0, 1, 2, 3], 5],
      ['girl-idle-left', [4, 5, 6, 7], 5],
      ['girl-idle-right', [8, 9, 10, 11], 5],
      ['girl-idle-up', [12, 13, 14, 15], 5],
      ['girl-walk-down', [16, 17, 18, 19, 20, 21], 10],
      ['girl-walk-left', [22, 23, 24, 25, 26, 27], 10],
      ['girl-walk-right', [28, 29, 30, 31, 32, 33], 10],
      ['girl-walk-up', [34, 35, 36, 37, 38, 39], 10],
      ['girl-death', [40, 41, 42, 43], 7],
    ];

    for (const [key, frames, frameRate] of definitions) {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: frames.map((frame) => ({ key: 'girl', frame })),
          frameRate,
          repeat: key === 'girl-death' ? 0 : -1,
        });
      }
    }
  }
}
