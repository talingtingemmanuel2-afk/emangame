import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { GameScene } from '../scenes/GameScene';

export const createGameConfig = (): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#071b18',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
    min: { width: 720, height: 405 },
    max: { width: 2560, height: 1440 },
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
      fps: 60,
    },
  },
  scene: [BootScene, MenuScene, GameScene],
  audio: {
    disableWebAudio: false,
  },
});
