import Phaser from 'phaser';
import './style.css';
import { createGameConfig } from './game/config/gameConfig';

const game = new Phaser.Game(createGameConfig());

window.addEventListener('beforeunload', () => {
  game.destroy(true);
});
