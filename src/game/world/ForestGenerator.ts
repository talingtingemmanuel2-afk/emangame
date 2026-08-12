import Phaser from 'phaser';
import { WORLD_SIZE } from '../config/balance';

export interface ForestWorld {
  obstacles: Phaser.Physics.Arcade.StaticGroup;
  breakables: Phaser.Physics.Arcade.StaticGroup;
  breakableData: Map<number, { kind: 'bush' | 'chest'; hp: number; maxHp: number }>;
}

const DECOR_TEXTURES = ['rock', 'flower', 'mushroom', 'stump', 'log', 'sign', 'ruins', 'lantern', 'crystal'];

export class ForestGenerator {
  private readonly scene: Phaser.Scene;
  private readonly rng: Phaser.Math.RandomDataGenerator;

  constructor(scene: Phaser.Scene, seed = 'glimmergrove') {
    this.scene = scene;
    this.rng = new Phaser.Math.RandomDataGenerator([seed]);
  }

  generate(): ForestWorld {
    const obstacles = this.scene.physics.add.staticGroup();
    const breakables = this.scene.physics.add.staticGroup();
    const breakableData = new Map<number, { kind: 'bush' | 'chest'; hp: number; maxHp: number }>();
    const center = WORLD_SIZE / 2;

    this.createGround();
    this.createPaths();
    this.createPonds();

    for (let i = 0; i < 165; i += 1) {
      const point = this.randomPointAwayFromCenter(380);
      const texture = this.rng.frac() < 0.12 ? 'tree-dead' : this.rng.frac() < 0.38 ? 'tree-small' : 'tree-large';
      const tree = obstacles.create(point.x, point.y, texture) as Phaser.Physics.Arcade.Image;
      const scale = this.rng.realInRange(1.15, 1.72);
      tree.setScale(scale).setOrigin(0.5, 0.86).setDepth(point.y + 48).refreshBody();
      const body = tree.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(texture === 'tree-large' ? 18 : 14, 12).setOffset(tree.displayWidth / (2 * scale) - 9, tree.height - 15);
    }

    for (let i = 0; i < 220; i += 1) {
      const point = this.randomPointAwayFromCenter(230);
      const texture = this.rng.pick(DECOR_TEXTURES);
      const item = this.scene.add.image(point.x, point.y, texture);
      item.setScale(this.rng.realInRange(0.75, 1.35)).setDepth(point.y + 5).setAlpha(this.rng.realInRange(0.78, 1));
      if (texture === 'lantern' || texture === 'crystal') {
        item.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85);
        this.scene.tweens.add({
          targets: item,
          alpha: { from: 0.6, to: 1 },
          scaleX: item.scaleX * 1.08,
          scaleY: item.scaleY * 1.08,
          duration: this.rng.integerInRange(1000, 1800),
          yoyo: true,
          repeat: -1,
        });
      }
    }

    for (let i = 0; i < 60; i += 1) {
      const point = this.randomPointAwayFromCenter(220);
      const bush = breakables.create(point.x, point.y, 'bush') as Phaser.Physics.Arcade.Image;
      const scale = this.rng.realInRange(1, 1.38);
      bush.setScale(scale).setDepth(point.y + 8).refreshBody();
      const body = bush.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(18, 12).setOffset(7, 15);
      bush.setData('breakableKey', Number(bush.x * 10_000 + bush.y));
      breakableData.set(Number(bush.getData('breakableKey')), { kind: 'bush', hp: 18, maxHp: 18 });
    }

    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2 + this.rng.realInRange(-0.12, 0.12);
      const distance = 520 + (i % 4) * 360;
      const x = Phaser.Math.Clamp(center + Math.cos(angle) * distance, 100, WORLD_SIZE - 100);
      const y = Phaser.Math.Clamp(center + Math.sin(angle) * distance, 100, WORLD_SIZE - 100);
      const chest = breakables.create(x, y, 'chest') as Phaser.Physics.Arcade.Image;
      chest.setScale(1.25).setDepth(y + 10).refreshBody();
      const body = chest.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(24, 15).setOffset(4, 15);
      chest.setData('breakableKey', Number(chest.x * 10_000 + chest.y));
      breakableData.set(Number(chest.getData('breakableKey')), { kind: 'chest', hp: 70, maxHp: 70 });
      const glow = this.scene.add.image(x, y + 1, 'crystal').setTint(0xffcf63).setBlendMode(Phaser.BlendModes.ADD).setScale(1.8).setAlpha(0.28).setDepth(y - 1);
      chest.setData('glow', glow);
      this.scene.tweens.add({ targets: glow, alpha: 0.58, scaleX: 2.15, scaleY: 2.15, yoyo: true, repeat: -1, duration: 900 });
    }

    return { obstacles, breakables, breakableData };
  }

  private createGround(): void {
    this.scene.add.tileSprite(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE, 'ground-grass').setDepth(-10_000);
    const overlay = this.scene.add.tileSprite(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE, 'ground-grass2')
      .setDepth(-9999)
      .setAlpha(0.2)
      .setTileScale(1.65, 1.65);
    overlay.tilePositionX = 17;
    overlay.tilePositionY = 11;
    const variation = this.scene.add.graphics().setDepth(-9999);
    const colors = [0x1b4b38, 0x275a3e, 0x356547, 0x12382c, 0x4e7550];
    for (let i = 0; i < 180; i += 1) {
      const x = this.rng.integerInRange(0, WORLD_SIZE);
      const y = this.rng.integerInRange(0, WORLD_SIZE);
      variation.fillStyle(this.rng.pick(colors), this.rng.realInRange(0.18, 0.48));
      if (this.rng.frac() < 0.5) variation.fillCircle(x, y, this.rng.integerInRange(4, 11));
      else variation.fillRect(x, y, this.rng.integerInRange(3, 8), this.rng.integerInRange(4, 14));
    }
  }

  private createPaths(): void {
    const graphics = this.scene.add.graphics().setDepth(-9998);
    const center = WORLD_SIZE / 2;
    graphics.lineStyle(128, 0x604f3a, 0.43);
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 0.25, Math.PI * 1.25]) {
      const points: Phaser.Math.Vector2[] = [];
      for (let i = 0; i <= 30; i += 1) {
        const t = i / 30;
        const sway = Math.sin(t * Math.PI * 3 + angle) * 90;
        const perpendicular = angle + Math.PI / 2;
        points.push(new Phaser.Math.Vector2(
          center + Math.cos(angle) * t * center + Math.cos(perpendicular) * sway,
          center + Math.sin(angle) * t * center + Math.sin(perpendicular) * sway,
        ));
      }
      graphics.strokePoints(points, false, false);
    }
    graphics.fillStyle(0x735e42, 0.5).fillCircle(center, center, 330);
    graphics.lineStyle(6, 0xb18a50, 0.2).strokeCircle(center, center, 315);
  }

  private createPonds(): void {
    for (let i = 0; i < 7; i += 1) {
      const point = this.randomPointAwayFromCenter(600);
      const pond = this.scene.add.image(point.x, point.y, 'pond');
      pond.setScale(this.rng.realInRange(2.2, 4.4), this.rng.realInRange(1.4, 2.4)).setAlpha(0.84).setDepth(-9997);
    }
  }

  private randomPointAwayFromCenter(minDistance: number): Phaser.Math.Vector2 {
    const center = WORLD_SIZE / 2;
    for (let attempts = 0; attempts < 20; attempts += 1) {
      const x = this.rng.integerInRange(80, WORLD_SIZE - 80);
      const y = this.rng.integerInRange(80, WORLD_SIZE - 80);
      if (Phaser.Math.Distance.Between(x, y, center, center) >= minDistance) return new Phaser.Math.Vector2(x, y);
    }
    return new Phaser.Math.Vector2(this.rng.integerInRange(80, WORLD_SIZE - 80), this.rng.integerInRange(80, WORLD_SIZE - 80));
  }
}
