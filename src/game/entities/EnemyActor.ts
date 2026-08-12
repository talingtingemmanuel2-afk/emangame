import Phaser from 'phaser';
import { ELITE_MODIFIERS, ENEMY_DEFINITIONS } from '../content/definitions';
import type { DamageOptions, EliteModifier, EnemyKind } from '../types';
import type { Player } from './Player';

export interface EnemyHost {
  player: Player;
  wave: number;
  fireEnemyProjectile(x: number, y: number, targetX: number, targetY: number, options?: {
    texture?: string; speed?: number; damage?: number; spread?: number; count?: number; scale?: number;
  }): void;
  spawnEnemy(kind: EnemyKind, x?: number, y?: number, forcedElite?: boolean): EnemyActor | null;
  enemyDied(enemy: EnemyActor): void;
  damagePlayer(amount: number): void;
  burst(x: number, y: number, color: number, count: number, speed?: number): void;
  floatingText(x: number, y: number, text: string, color: string, large?: boolean): void;
  playSfx(key: string, volume?: number): void;
  createDangerCircle(x: number, y: number, radius: number, delay: number, damage: number, color?: number): void;
}

let nextEnemyId = 1;

export class EnemyActor extends Phaser.Physics.Arcade.Sprite {
  readonly enemyId = nextEnemyId++;
  kind: EnemyKind = 'slime';
  displayName = 'Enemy';
  maxHp = 1;
  hp = 1;
  damage = 1;
  xpValue = 1;
  baseSpeed = 50;
  elite = false;
  eliteModifier: EliteModifier | null = null;
  isArcher = false;
  slowedUntil = 0;
  slowMultiplier = 1;
  spawnedAt = 0;
  lastDamagedAt = 0;
  private host!: EnemyHost;
  private nextActionAt = 0;
  private aiState: 'pursue' | 'warn' | 'charge' | 'recover' = 'pursue';
  private chargeVector = new Phaser.Math.Vector2();
  private actionEndsAt = 0;
  private baseScale = 1;
  private phaseSeed = Math.random() * Math.PI * 2;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'enemy-slime');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.disableBody(true, true);
  }

  spawn(host: EnemyHost, kind: EnemyKind, x: number, y: number, wave: number, forcedElite = false): this {
    const definition = ENEMY_DEFINITIONS[kind];
    const hpScale = 1 + Math.max(0, wave - 1) * 0.12 + Math.max(0, wave - 10) * 0.025;
    this.host = host;
    this.kind = kind;
    this.displayName = definition.name;
    this.baseSpeed = definition.speed * (1 + Math.max(0, wave - 10) * 0.012);
    this.maxHp = Math.round(definition.hp * hpScale);
    this.damage = Math.round(definition.damage * (1 + wave * 0.055));
    this.xpValue = Math.round(definition.xp * (1 + wave * 0.035));
    this.baseScale = definition.scale;
    this.elite = forcedElite || (wave >= 6 && Math.random() < Math.min(0.2, 0.018 + wave * 0.006));
    this.eliteModifier = this.elite ? Phaser.Utils.Array.GetRandom(ELITE_MODIFIERS) : null;
    if (this.elite) {
      this.maxHp = Math.round(this.maxHp * (this.eliteModifier === 'Armored' ? 3.2 : 2.25));
      this.damage = Math.round(this.damage * 1.35);
      this.xpValue = Math.round(this.xpValue * 2.4);
      if (this.eliteModifier === 'Swift') this.baseSpeed *= 1.42;
      if (this.eliteModifier === 'Frenzied') this.baseSpeed *= 1.2;
    }
    this.hp = this.maxHp;
    this.isArcher = kind === 'skeleton' && Math.random() < Math.min(0.58, 0.22 + wave * 0.018);
    this.slowedUntil = 0;
    this.slowMultiplier = 1;
    this.spawnedAt = sceneTime(this.scene);
    this.lastDamagedAt = 0;
    this.nextActionAt = this.spawnedAt + Phaser.Math.Between(800, 2100);
    this.aiState = 'pursue';
    this.actionEndsAt = 0;
    this.phaseSeed = Math.random() * Math.PI * 2;

    this.enableBody(true, x, y, true, true);
    this.setTexture(definition.texture).setScale(this.baseScale * (this.elite ? 1.28 : 1));
    this.setAlpha(1).setAngle(0).setFlipX(false).setDepth(y + 18).clearTint();
    if (this.elite) this.setTint(this.eliteModifier === 'Armored' ? 0xc7d7db : this.eliteModifier === 'Vampiric' ? 0xff8ca5 : 0xffe27a);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const radius = definition.bodyRadius * (this.elite ? 1.16 : 1);
    body.setCircle(radius, Math.max(0, this.width / 2 - radius), Math.max(0, this.height / 2 - radius));
    body.setEnable(true).setVelocity(0);
    return this;
  }

  updateEnemy(time: number, delta: number): void {
    if (!this.active || !this.host.player.active) return;
    const player = this.host.player;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = this.baseSpeed * (time < this.slowedUntil ? this.slowMultiplier : 1);
    const direction = new Phaser.Math.Vector2(dx / distance, dy / distance);

    switch (this.kind) {
      case 'slime': {
        const hop = 0.68 + Math.max(0, Math.sin(time * 0.006 + this.phaseSeed)) * 0.55;
        this.setVelocity(direction.x * speed * hop, direction.y * speed * hop);
        const squash = 1 + Math.sin(time * 0.008 + this.phaseSeed) * 0.08;
        this.setScale(this.baseScale * (this.elite ? 1.28 : 1) / squash, this.baseScale * (this.elite ? 1.28 : 1) * squash);
        break;
      }
      case 'goblin': {
        const flank = Math.sin(time * 0.0025 + this.phaseSeed) * 0.42;
        this.setVelocity((direction.x - direction.y * flank) * speed, (direction.y + direction.x * flank) * speed);
        break;
      }
      case 'bat': {
        const wobble = Math.sin(time * 0.006 + this.phaseSeed) * 0.62;
        const dive = time > this.nextActionAt && time < this.nextActionAt + 520 ? 1.75 : 1;
        if (time > this.nextActionAt + 520) this.nextActionAt = time + Phaser.Math.Between(1700, 3200);
        this.setVelocity((direction.x - direction.y * wobble) * speed * dive, (direction.y + direction.x * wobble) * speed * dive);
        this.setScale(this.baseScale * (1 + Math.sin(time * 0.02) * 0.12), this.baseScale * (1 - Math.sin(time * 0.02) * 0.08));
        break;
      }
      case 'skeleton': {
        if (this.isArcher) {
          if (distance > 300) this.setVelocity(direction.x * speed, direction.y * speed);
          else if (distance < 215) this.setVelocity(-direction.x * speed * 0.8, -direction.y * speed * 0.8);
          else this.setVelocity(-direction.y * speed * 0.32, direction.x * speed * 0.32);
          if (time >= this.nextActionAt) {
            this.nextActionAt = time + Math.max(850, 1900 - this.host.wave * 24);
            this.host.fireEnemyProjectile(this.x, this.y, player.x, player.y, {
              texture: 'projectile-rock', speed: 205, damage: this.damage, scale: 0.58,
            });
            this.host.playSfx('rock', 0.25);
          }
        } else {
          this.setVelocity(direction.x * speed, direction.y * speed);
        }
        break;
      }
      case 'wolf': {
        this.updateWolf(time, speed, direction);
        break;
      }
    }

    this.setFlipX(this.body instanceof Phaser.Physics.Arcade.Body && this.body.velocity.x < -4);
    this.setDepth(this.y + 18);
    if (distance > 1550 && time - this.spawnedAt > 5000) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      this.setPosition(player.x + Math.cos(angle) * 760, player.y + Math.sin(angle) * 760);
    }
    if (this.eliteModifier === 'Vampiric' && distance < 35 && time >= this.nextActionAt) {
      this.hp = Math.min(this.maxHp, this.hp + 2);
    }
    void delta;
  }

  takeDamage(amount: number, options: DamageOptions = {}): boolean {
    if (!this.active || this.hp <= 0) return false;
    const adjusted = this.eliteModifier === 'Armored' ? amount * 0.72 : amount;
    this.hp -= adjusted;
    this.lastDamagedAt = sceneTime(this.scene);
    if (options.knockback && this.body instanceof Phaser.Physics.Arcade.Body && this.kind !== 'slime') {
      this.body.velocity.add(options.knockback);
    }
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(55, () => this.active && (this.elite ? this.restoreEliteTint() : this.clearTint()));
    this.host.floatingText(
      this.x + Phaser.Math.Between(-5, 5),
      this.y - 18,
      options.critical ? `CRIT ${Math.round(adjusted)}` : `${Math.round(adjusted)}`,
      options.critical ? '#ffe67a' : '#fff4cf',
      options.critical,
    );
    this.host.burst(this.x, this.y, options.tint ?? 0x9bf3ce, options.critical ? 7 : 3, 70);
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  applySlow(multiplier: number, duration: number): void {
    this.slowMultiplier = Math.min(this.slowMultiplier, multiplier);
    this.slowedUntil = Math.max(this.slowedUntil, sceneTime(this.scene) + duration);
  }

  retire(): void {
    this.disableBody(true, true);
    this.setVelocity(0).clearTint();
  }

  private updateWolf(time: number, speed: number, direction: Phaser.Math.Vector2): void {
    if (this.aiState === 'pursue') {
      this.setVelocity(direction.x * speed, direction.y * speed);
      if (time >= this.nextActionAt) {
        this.aiState = 'warn';
        this.actionEndsAt = time + 520;
        this.setVelocity(0).setTint(0xffd27b);
        this.chargeVector.copy(direction);
        this.host.playSfx('wolf', 0.32);
      }
    } else if (this.aiState === 'warn') {
      this.setVelocity(0);
      if (time >= this.actionEndsAt) {
        this.aiState = 'charge';
        this.actionEndsAt = time + 720;
        this.clearTint();
      }
    } else if (this.aiState === 'charge') {
      this.setVelocity(this.chargeVector.x * speed * 2.8, this.chargeVector.y * speed * 2.8);
      if (time >= this.actionEndsAt) {
        this.aiState = 'recover';
        this.actionEndsAt = time + 700;
      }
    } else {
      this.setVelocity(direction.x * speed * 0.45, direction.y * speed * 0.45);
      if (time >= this.actionEndsAt) {
        this.aiState = 'pursue';
        this.nextActionAt = time + Phaser.Math.Between(1800, 3100);
      }
    }
  }

  private die(): void {
    if (this.kind === 'slime' && this.maxHp > 80 && Math.random() < 0.25) {
      this.host.spawnEnemy('slime', this.x - 16, this.y + 8);
      this.host.spawnEnemy('slime', this.x + 16, this.y - 8);
    }
    if (this.eliteModifier === 'Explosive') {
      this.host.createDangerCircle(this.x, this.y, 74, 500, Math.round(this.damage * 1.4), 0xffbf66);
    }
    this.host.enemyDied(this);
  }

  private restoreEliteTint(): void {
    this.setTint(this.eliteModifier === 'Armored' ? 0xc7d7db : this.eliteModifier === 'Vampiric' ? 0xff8ca5 : 0xffe27a);
  }
}

const sceneTime = (scene: Phaser.Scene): number => scene.time.now;
