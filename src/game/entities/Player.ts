import Phaser from 'phaser';
import { PLAYER } from '../config/balance';
import type { ActiveBuff, PlayerStats } from '../types';

export type FacingDirection = 'down' | 'up' | 'left' | 'right';

export interface PlayerHost {
  onPlayerHealthChanged(hp: number, maxHp: number): void;
  onDashChanged(remainingMs: number): void;
  spawnDashAfterimage(player: Player): void;
  burst(x: number, y: number, color: number, count: number, speed?: number): void;
  floatingText(x: number, y: number, text: string, color: string, large?: boolean): void;
  playSfx(key: string, volume?: number): void;
  gameOver(): void;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly stats: PlayerStats = {
    maxHp: PLAYER.maxHp,
    hp: PLAYER.maxHp,
    speed: PLAYER.speed,
    damageMultiplier: 1,
    cooldownMultiplier: 1,
    critChance: 0.08,
    critMultiplier: 1.85,
    armor: 0,
    pickupRadius: PLAYER.pickupRadius,
    projectileSpeed: 1,
    extraProjectiles: 0,
  };

  facing: FacingDirection = 'down';
  isDashing = false;
  private readonly host: PlayerHost;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: Record<'up' | 'down' | 'left' | 'right' | 'dash', Phaser.Input.Keyboard.Key>;
  private readonly movement = new Phaser.Math.Vector2();
  private readonly dashVector = new Phaser.Math.Vector2(0, 1);
  private dashEndsAt = 0;
  private dashReadyAt = 0;
  private invulnerableUntil = 0;
  private lastAfterimageAt = 0;
  private readonly buffs = new Map<ActiveBuff['kind'], ActiveBuff>();
  private hinderedUntil = 0;
  private hinderMultiplier = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, host: PlayerHost) {
    super(scene, x, y, 'girl', 0);
    this.host = host;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(2.5).setCollideWorldBounds(true).setDepth(y + 24);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 10).setOffset(7, 13);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = scene.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      dash: Phaser.Input.Keyboard.KeyCodes.Q,
    }) as typeof this.keys;
    this.play('girl-idle-down');
  }

  updatePlayer(time: number): void {
    if (this.stats.hp <= 0) {
      this.setVelocity(0);
      this.host.onDashChanged(Math.max(0, this.dashReadyAt - time));
      return;
    }
    this.expireBuffs(time);
    this.movement.set(
      Number(this.keys.right.isDown || this.cursors.right.isDown) - Number(this.keys.left.isDown || this.cursors.left.isDown),
      Number(this.keys.down.isDown || this.cursors.down.isDown) - Number(this.keys.up.isDown || this.cursors.up.isDown),
    );
    if (this.movement.lengthSq() > 0) this.movement.normalize();

    if (Phaser.Input.Keyboard.JustDown(this.keys.dash) && time >= this.dashReadyAt) {
      this.beginDash(time);
    }

    if (time < this.dashEndsAt) {
      this.isDashing = true;
      this.setVelocity(this.dashVector.x * PLAYER.dashSpeed, this.dashVector.y * PLAYER.dashSpeed);
      if (time - this.lastAfterimageAt >= 42) {
        this.lastAfterimageAt = time;
        this.host.spawnDashAfterimage(this);
      }
    } else {
      this.isDashing = false;
      const speed = this.stats.speed * this.getBuffMultiplier('speed') * (time < this.hinderedUntil ? this.hinderMultiplier : 1);
      this.setVelocity(this.movement.x * speed, this.movement.y * speed);
      this.updateAnimation();
    }

    this.setDepth(this.y + 24);
    this.host.onDashChanged(Math.max(0, this.dashReadyAt - time));
  }

  takeDamage(rawAmount: number, time: number): boolean {
    if (!this.active || time < this.invulnerableUntil || this.isDashing) return false;
    const amount = Math.max(1, Math.round(rawAmount * (1 - Math.min(0.65, this.stats.armor))));
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.invulnerableUntil = time + PLAYER.invulnerabilityAfterHit;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.active && this.clearTint());
    this.host.floatingText(this.x, this.y - 28, `-${amount}`, '#ff8178', true);
    this.host.burst(this.x, this.y, 0xff8178, 7, 80);
    this.host.playSfx('hit', 0.48);
    this.host.onPlayerHealthChanged(this.stats.hp, this.stats.maxHp);
    if (this.stats.hp <= 0) {
      this.setVelocity(0).play('girl-death');
      this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.host.gameOver());
    }
    return true;
  }

  heal(amount: number): number {
    const before = this.stats.hp;
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + Math.round(amount));
    const restored = this.stats.hp - before;
    if (restored > 0) {
      this.host.floatingText(this.x, this.y - 30, `+${restored}`, '#8effa9', true);
      this.host.burst(this.x, this.y, 0x8effa9, 10, 90);
      this.host.playSfx('heal', 0.65);
      this.host.onPlayerHealthChanged(this.stats.hp, this.stats.maxHp);
    }
    return restored;
  }

  addBuff(kind: ActiveBuff['kind'], multiplier: number, durationMs: number, time: number): void {
    this.buffs.set(kind, { kind, multiplier, expiresAt: time + durationMs });
    const colors: Record<ActiveBuff['kind'], number> = { damage: 0xff655f, speed: 0x63cfff, haste: 0xffde59 };
    this.host.burst(this.x, this.y, colors[kind], 16, 120);
    this.host.playSfx('potion', 0.65);
  }

  getBuffMultiplier(kind: ActiveBuff['kind']): number {
    return this.buffs.get(kind)?.multiplier ?? 1;
  }

  getActiveBuffs(): ActiveBuff[] {
    return [...this.buffs.values()];
  }

  extendMaxHp(amount: number): void {
    this.stats.maxHp += amount;
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
    this.host.onPlayerHealthChanged(this.stats.hp, this.stats.maxHp);
  }

  applyMovementSlow(multiplier: number, durationMs: number, time: number): void {
    this.hinderMultiplier = time >= this.hinderedUntil ? multiplier : Math.min(this.hinderMultiplier, multiplier);
    this.hinderedUntil = Math.max(this.hinderedUntil, time + durationMs);
    this.setTint(0xbda4ff);
    this.scene.time.delayedCall(durationMs, () => this.active && this.clearTint());
  }

  getMovementModifier(time: number): number {
    return time < this.hinderedUntil ? this.hinderMultiplier : 1;
  }

  grantInvulnerability(durationMs: number, time: number): void {
    this.invulnerableUntil = Math.max(this.invulnerableUntil, time + durationMs);
  }

  private beginDash(time: number): void {
    if (this.movement.lengthSq() > 0) {
      this.dashVector.copy(this.movement);
    } else {
      const directions: Record<FacingDirection, Phaser.Math.Vector2> = {
        down: new Phaser.Math.Vector2(0, 1),
        up: new Phaser.Math.Vector2(0, -1),
        left: new Phaser.Math.Vector2(-1, 0),
        right: new Phaser.Math.Vector2(1, 0),
      };
      this.dashVector.copy(directions[this.facing]);
    }
    this.dashEndsAt = time + PLAYER.dashDuration;
    this.dashReadyAt = time + PLAYER.dashCooldown;
    this.invulnerableUntil = time + PLAYER.dashInvulnerability;
    this.host.playSfx('dash', 0.62);
    this.host.burst(this.x, this.y, 0x72e6d2, 12, 140);
    this.scene.cameras.main.shake(90, 0.0025);
  }

  private updateAnimation(): void {
    if (this.movement.lengthSq() === 0) {
      this.play(`girl-idle-${this.facing}`, true);
      return;
    }
    if (Math.abs(this.movement.x) > Math.abs(this.movement.y)) {
      this.facing = this.movement.x < 0 ? 'left' : 'right';
    } else {
      this.facing = this.movement.y < 0 ? 'up' : 'down';
    }
    this.setFlipX(false).play(`girl-walk-${this.facing}`, true);
  }

  private expireBuffs(time: number): void {
    for (const [kind, buff] of this.buffs) {
      if (time >= buff.expiresAt) this.buffs.delete(kind);
    }
  }
}
