import Phaser from 'phaser';
import type { AbilityId, Faction } from '../types';

export type ProjectileOwner = Faction;

export interface ProjectileConfig {
  x: number;
  y: number;
  texture: string;
  owner: ProjectileOwner;
  velocity: Phaser.Math.Vector2;
  damage: number;
  lifespan?: number;
  pierce?: number;
  scale?: number;
  tint?: number;
  critical?: boolean;
  ability?: AbilityId;
  rotate?: number;
  bounce?: boolean;
  bodyRadius?: number;
}

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  owner: ProjectileOwner = 'player';
  damage = 0;
  pierce = 0;
  critical = false;
  ability: AbilityId = 'bolt';
  expiresAt = 0;
  spin = 0;
  bounce = false;
  private readonly hitIds = new Set<number>();

  constructor(scene: Phaser.Scene, x = -100, y = -100) {
    super(scene, x, y, 'projectile-bolt');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.disableBody(true, true);
  }

  launch(config: ProjectileConfig, time: number): this {
    this.enableBody(true, config.x, config.y, true, true);
    this.setTexture(config.texture);
    this.owner = config.owner;
    this.damage = config.damage;
    this.pierce = config.pierce ?? 0;
    this.critical = config.critical ?? false;
    this.ability = config.ability ?? 'bolt';
    this.expiresAt = time + (config.lifespan ?? 1800);
    this.spin = config.rotate ?? 0;
    this.bounce = config.bounce ?? false;
    this.hitIds.clear();
    this.setScale(config.scale ?? 1).setAlpha(1).setAngle(Phaser.Math.RadToDeg(config.velocity.angle()));
    this.setTint(config.tint ?? 0xffffff).setDepth(7000);
    this.setVelocity(config.velocity.x, config.velocity.y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const radius = config.bodyRadius ?? Phaser.Math.Clamp(5 * Math.sqrt(config.scale ?? 1), 5, 10);
    body.setCircle(radius, Math.max(0, this.width / 2 - radius), Math.max(0, this.height / 2 - radius));
    body.setBounce(1, 1).setCollideWorldBounds(this.bounce);
    body.onWorldBounds = this.bounce;
    return this;
  }

  updateProjectile(time: number, delta: number): void {
    if (!this.active) return;
    if (time >= this.expiresAt) {
      this.retire();
      return;
    }
    if (this.spin !== 0) this.angle += this.spin * (delta / 1000);
    if (!this.bounce) {
      const world = this.scene.physics.world.bounds;
      if (this.x < world.left - 64 || this.x > world.right + 64 || this.y < world.top - 64 || this.y > world.bottom + 64) {
        this.retire();
      }
    }
  }

  canHit(id: number): boolean {
    return !this.hitIds.has(id);
  }

  registerHit(id: number): boolean {
    this.hitIds.add(id);
    if (this.pierce <= 0) {
      this.retire();
      return false;
    }
    this.pierce -= 1;
    return true;
  }

  retire(): void {
    this.disableBody(true, true);
    this.clearTint().setVelocity(0).setAngularVelocity(0);
  }
}
