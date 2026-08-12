import Phaser from 'phaser';
import type { BossKind, DamageOptions, EnemyKind } from '../types';
import type { Player } from './Player';

export interface BossHost {
  player: Player;
  wave: number;
  spawnEnemy(kind: EnemyKind, x?: number, y?: number, forcedElite?: boolean): unknown;
  fireEnemyProjectile(x: number, y: number, targetX: number, targetY: number, options?: {
    texture?: string; speed?: number; damage?: number; spread?: number; count?: number; scale?: number;
    tint?: number; rotate?: number; lifespan?: number;
  }): void;
  createDangerCircle(x: number, y: number, radius: number, delay: number, damage: number, color?: number): void;
  createDangerLine(x: number, y: number, angle: number, length: number, width: number, delay: number, damage: number, color?: number): void;
  createDangerRing(x: number, y: number, radius: number, thickness: number, delay: number, damage: number, color?: number): void;
  createDangerCone(x: number, y: number, angle: number, range: number, spread: number, delay: number, damage: number, color?: number): void;
  createFireCone(x: number, y: number, angle: number, range: number, spread: number, damage: number): void;
  createMovingHazard(x: number, y: number, velocity: Phaser.Math.Vector2, damage: number): void;
  createHostileBurningGround(x: number, y: number, damage: number): void;
  createInferno(boss: BossActor): void;
  pushPlayerFrom(x: number, y: number, distance: number): void;
  damagePlayer(amount: number): void;
  bossHealthChanged(boss: BossActor): void;
  bossDied(boss: BossActor): void;
  burst(x: number, y: number, color: number, count: number, speed?: number): void;
  floatingText(x: number, y: number, text: string, color: string, large?: boolean): void;
  playSfx(key: string, volume?: number): void;
}

const BOSS_NAMES: Record<BossKind, string> = {
  golem: 'Garruk, the Runestone',
  vampire: 'Lady Vespera',
  rooster: 'The Crimson Cockatrice',
  troll: 'Grumhild, Moss Troll',
  werewolf: 'Fenris, Moonfang',
  minotaur: 'Korvax, Horn of Ruin',
  wyvern: 'Ashwing Wyvern',
  ancientBeast: 'Ancient Beast — Zombie Dragon',
  dragon: 'Ancient Forest Dragon',
};

const BOSS_TEXTURE: Record<BossKind, string> = {
  golem: 'boss-golem', vampire: 'boss-vampire', rooster: 'boss-rooster', troll: 'boss-troll', werewolf: 'boss-werewolf',
  minotaur: 'boss-minotaur', wyvern: 'boss-wyvern', ancientBeast: 'boss-dragon', dragon: 'boss-dragon',
};

const BOSS_COLORS: Record<BossKind, number> = {
  golem: 0xd5b777, vampire: 0xd44773, rooster: 0xff493f, troll: 0x83b65c, werewolf: 0xa690db,
  minotaur: 0xd99755, wyvern: 0xe87846, ancientBeast: 0x69d36d, dragon: 0xff7045,
};

export class BossActor extends Phaser.Physics.Arcade.Sprite {
  kind: BossKind = 'golem';
  displayName = BOSS_NAMES.golem;
  maxHp = 1;
  hp = 1;
  damage = 20;
  phase = 1;
  generation = 0;
  lastAttack = 'Entrance';
  readonly attacksUsed = new Set<string>();
  private host!: BossHost;
  private nextAttackAt = 0;
  private attackIndex = 0;
  private chargeUntil = 0;
  private chargeVelocity = new Phaser.Math.Vector2();
  private lastInfernoAt = -100_000;
  private enteringUntil = 0;
  private recoverUntil = 0;
  private attackBuffUntil = 0;
  private regenUsed = false;
  private regenUntil = 0;
  private regenDamage = 0;
  private nextRegenTick = 0;
  private dying = false;
  private leavingFireTrail = false;
  private nextTrailAt = 0;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly aura: Phaser.GameObjects.Arc;

  get specialState(): string {
    const time = this.scene.time.now;
    if (this.dying) return 'dying';
    if (time < this.regenUntil) return 'regenerating';
    if (time < this.chargeUntil) return 'charging';
    if (time < this.recoverUntil) return 'recovering';
    if (time < this.enteringUntil) return 'entering';
    return this.phase >= 2 ? 'enraged' : 'normal';
  }

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'boss-golem');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.shadow = scene.add.ellipse(-100, -100, 76, 25, 0x07120e, 0.42).setVisible(false);
    this.aura = scene.add.circle(-100, -100, 38, 0xffffff, 0).setStrokeStyle(3, 0xffffff, 0).setVisible(false);
    this.disableBody(true, true);
  }

  spawn(host: BossHost, kind: BossKind, x: number, y: number, wave: number): this {
    this.host = host;
    this.kind = kind;
    this.displayName = BOSS_NAMES[kind];
    this.phase = 1;
    this.generation += 1;
    const scale = kind === 'dragon' ? 4.45 : kind === 'ancientBeast' ? 3.7 : kind === 'wyvern' ? 3.15 : kind === 'werewolf' ? 3.05 : kind === 'rooster' ? 3.25 : kind === 'troll' ? 2.95 : 2.65;
    const baseHp: Record<BossKind, number> = { golem: 680, vampire: 620, rooster: 1180, troll: 1320, werewolf: 1420, minotaur: 1880, wyvern: 2450, ancientBeast: 5400, dragon: 12_500 };
    this.maxHp = Math.round(baseHp[kind] * (kind === 'dragon' || kind === 'ancientBeast' ? 1 : 1 + wave * 0.18));
    this.hp = this.maxHp;
    this.damage = Math.round((kind === 'dragon' ? 31 : kind === 'ancientBeast' ? 26 : kind === 'rooster' ? 18 : 17) * (1 + wave * 0.04));
    this.nextAttackAt = this.scene.time.now + (kind === 'dragon' ? 2200 : 1600);
    this.attackIndex = 0;
    this.chargeUntil = 0;
    this.lastInfernoAt = -100_000;
    this.enteringUntil = this.scene.time.now + 1050;
    this.recoverUntil = 0;
    this.attackBuffUntil = 0;
    this.regenUsed = false;
    this.regenUntil = 0;
    this.regenDamage = 0;
    this.dying = false;
    this.leavingFireTrail = false;
    this.lastAttack = 'Entrance';
    this.attacksUsed.clear();
    this.enableBody(true, x, y, true, true);
    this.setTexture(BOSS_TEXTURE[kind]).setScale(scale * 0.58).setAlpha(0.12).setAngle(0).setTint(kind === 'ancientBeast' ? 0x7acb76 : 0xffffff).setDepth(y + 30);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const radius = kind === 'dragon' || kind === 'ancientBeast' ? 25 : kind === 'rooster' || kind === 'wyvern' ? 20 : 18;
    body.setCircle(radius, Math.max(0, this.width / 2 - radius), Math.max(0, this.height / 2 - radius));
    body.setVelocity(0).setEnable(true);
    const flying = kind === 'wyvern' || kind === 'ancientBeast' || kind === 'dragon';
    this.shadow.setVisible(true).setPosition(x + (flying ? 10 : 0), y + (flying ? 34 : 20)).setScale(flying ? 1.35 : 1).setAlpha(flying ? 0.28 : 0.42).setDepth(y - 3);
    this.aura.setVisible(true).setPosition(x, y).setRadius(kind === 'dragon' ? 72 : kind === 'ancientBeast' ? 62 : 42).setStrokeStyle(3, BOSS_COLORS[kind], 0.28).setDepth(y - 2);
    this.scene.tweens.add({ targets: this, alpha: 1, scaleX: scale, scaleY: scale, duration: 900, ease: 'Back.out' });
    this.scene.tweens.add({ targets: this.aura, alpha: { from: 0.22, to: 0.72 }, scale: { from: 0.8, to: 1.18 }, duration: 950, yoyo: true, repeat: -1 });
    this.host.burst(x, y, BOSS_COLORS[kind], 24, 150);
    this.host.playSfx(kind === 'rooster' ? 'rooster-cry' : kind === 'troll' ? 'troll-roar' : kind === 'wyvern' ? 'wyvern-wing' : 'boss-charge', 0.72);
    this.host.bossHealthChanged(this);
    return this;
  }

  updateBoss(time: number): void {
    if (!this.active || !this.host.player.active || this.dying) return;
    this.updatePhase();
    const player = this.host.player;
    const toPlayer = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y);
    const distance = Math.max(1, toPlayer.length());
    toPlayer.scale(1 / distance);

    if (time < this.enteringUntil || time < this.regenUntil || (time >= this.chargeUntil && time < this.recoverUntil)) {
      this.setVelocity(0);
      if (time < this.regenUntil && time >= this.nextRegenTick) {
        this.nextRegenTick = time + 420;
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.018);
        this.host.burst(this.x, this.y, 0x8be35e, 6, 70);
        this.host.bossHealthChanged(this);
      }
    } else if (time < this.chargeUntil) {
      this.setVelocity(this.chargeVelocity.x, this.chargeVelocity.y);
      if (this.leavingFireTrail && time >= this.nextTrailAt) {
        this.nextTrailAt = time + 130;
        this.host.createHostileBurningGround(this.x, this.y + 18, this.damage * 0.16);
      }
    } else {
      this.leavingFireTrail = false;
      const speed = (this.kind === 'dragon' ? 68 + this.phase * 10 : this.kind === 'ancientBeast' ? 55 + this.phase * 10 : this.kind === 'rooster' ? 105 : this.kind === 'werewolf' ? 118 : this.kind === 'wyvern' ? 92 : this.kind === 'vampire' ? 88 : this.kind === 'troll' ? 52 : 62) * (1 + this.host.wave * 0.008) * (time < this.attackBuffUntil ? 1.32 : 1) * (this.phase >= 2 ? 1.08 : 1);
      if (distance > (this.kind === 'dragon' ? 155 : 95)) this.setVelocity(toPlayer.x * speed, toPlayer.y * speed);
      else this.setVelocity(-toPlayer.y * speed * 0.25, toPlayer.x * speed * 0.25);
      if (time >= this.nextAttackAt) this.performAttack(time, toPlayer, distance);
    }
    this.setFlipX(this.body instanceof Phaser.Physics.Arcade.Body && this.body.velocity.x < 0);
    this.setDepth(this.y + 30);
    const flying = this.kind === 'wyvern' || this.kind === 'ancientBeast' || this.kind === 'dragon';
    this.shadow.setPosition(this.x + (flying ? 10 : 0), this.y + (flying ? 34 + Math.sin(time * 0.004) * 4 : 20)).setDepth(this.y - 3).setScale(flying ? 1.25 + Math.sin(time * 0.004) * 0.08 : 1);
    this.aura.setPosition(this.x, this.y).setDepth(this.y - 2);
  }

  takeDamage(amount: number, options: DamageOptions = {}): boolean {
    if (!this.active || this.hp <= 0) return false;
    const adjusted = this.kind === 'dragon' ? amount * 0.82 : this.kind === 'ancientBeast' ? amount * 0.88 : this.kind === 'minotaur' && this.phase >= 2 ? amount * 1.18 : amount;
    this.hp -= adjusted;
    if (this.regenUntil > this.scene.time.now) {
      this.regenDamage += adjusted;
      if (this.regenDamage >= this.maxHp * 0.1) {
        this.regenUntil = 0;
        this.recoverUntil = this.scene.time.now + 420;
        this.host.floatingText(this.x, this.y - 54, 'REGEN BROKEN!', '#fff09b', true);
        this.host.burst(this.x, this.y, 0xf4d96a, 20, 145);
      }
    }
    this.setTintFill(0xffffff);
    const token = this.generation;
    this.scene.time.delayedCall(65, () => {
      if (this.active && this.generation === token) this.restoreBossTint();
    });
    this.host.floatingText(
      this.x + Phaser.Math.Between(-14, 14),
      this.y - 38,
      options.critical ? `CRIT ${Math.round(adjusted)}` : `${Math.round(adjusted)}`,
      options.critical ? '#ffe26e' : '#fff4cf',
      options.critical,
    );
    this.host.burst(this.x, this.y, options.tint ?? 0x9bf3ce, options.critical ? 10 : 5, 90);
    this.host.bossHealthChanged(this);
    if (this.hp <= 0) {
      this.hp = 0;
      this.setVelocity(0);
      this.dying = true;
      (this.body as Phaser.Physics.Arcade.Body).setEnable(false);
      this.host.playSfx('boss-death', 0.82);
      if (this.kind === 'rooster') this.host.playSfx('rooster-cry', 0.46);
      this.host.burst(this.x, this.y, BOSS_COLORS[this.kind], 34, 230);
      const token = this.generation;
      this.scene.tweens.add({ targets: this, angle: this.flipX ? -88 : 88, y: this.y + 24, alpha: 0.15, scaleX: this.scaleX * 1.18, scaleY: this.scaleY * 0.72, duration: 680, ease: 'Quad.in' });
      this.scene.tweens.add({ targets: this.aura, alpha: 0, scale: 1.8, duration: 620 });
      this.scene.time.delayedCall(700, () => this.active && this.generation === token && this.host.bossDied(this));
      return true;
    }
    return false;
  }

  retire(): void {
    this.disableBody(true, true);
    this.clearTint().setVelocity(0);
    this.shadow.setVisible(false);
    this.aura.setVisible(false);
  }

  private updatePhase(): void {
    const ratio = this.hp / this.maxHp;
    const nextPhase = this.kind === 'ancientBeast'
      ? (ratio > 0.7 ? 1 : ratio > 0.4 ? 2 : 3)
      : this.kind === 'dragon'
        ? (ratio > 0.75 ? 1 : ratio > 0.5 ? 2 : ratio > 0.25 ? 3 : 4)
        : (ratio > (this.kind === 'rooster' ? 0.35 : this.kind === 'minotaur' ? 0.3 : 0.4) ? 1 : 2);
    if (nextPhase !== this.phase) {
      this.phase = nextPhase;
      this.attackBuffUntil = this.scene.time.now + (this.kind === 'werewolf' ? 7500 : 3200);
      this.host.burst(this.x, this.y, BOSS_COLORS[this.kind], 32, 190);
      this.scene.cameras.main.shake(360, 0.009);
      this.aura.setStrokeStyle(this.phase >= 2 ? 6 : 3, BOSS_COLORS[this.kind], 0.78);
      if (this.kind === 'rooster') { this.setTint(0xff7566); this.host.floatingText(this.x, this.y - 58, 'CRIMSON FRENZY!', '#ff8d78', true); this.host.playSfx('rooster-cry', 0.9); }
      else if (this.kind === 'minotaur') { this.setTint(0xff7659); this.host.floatingText(this.x, this.y - 58, 'BLOOD RAGE!', '#ff8d78', true); }
      else if (this.kind === 'werewolf') { this.setTint(0xb99cff); this.host.floatingText(this.x, this.y - 58, 'BLOOD MOON!', '#e0c5ff', true); }
      else if (this.kind === 'wyvern') this.setTint(0xff9a67);
      else if (this.kind === 'troll') this.setTint(0xa4d768);
      else if (this.phase === 4) this.setTint(0xff805a);
      this.host.bossHealthChanged(this);
    }
    if (this.kind === 'troll' && ratio < 0.62 && !this.regenUsed) this.beginTrollRegen();
  }

  private performAttack(time: number, direction: Phaser.Math.Vector2, distance: number): void {
    this.attackIndex += 1;
    if (this.kind === 'rooster') this.roosterAttack(time, direction);
    else if (this.kind === 'golem' || this.kind === 'troll') this.golemAttack(time, direction);
    else if (this.kind === 'vampire') this.vampireAttack(time, direction, distance);
    else if (this.kind === 'werewolf') this.werewolfAttack(time, direction);
    else if (this.kind === 'minotaur') this.minotaurAttack(time, direction);
    else if (this.kind === 'wyvern') this.wyvernAttack(time, direction);
    else if (this.kind === 'ancientBeast') this.beastAttack(time, direction);
    else this.dragonAttack(time, direction, distance);
  }

  private roosterAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % 5;
    const player = this.host.player;
    const frenzy = this.phase >= 2;
    if (choice === 0) {
      this.announceAttack('Razor Peck', 0xffcf64);
      this.host.createDangerLine(this.x, this.y, direction.angle(), 168, 56, 360, this.damage * 1.42, 0xffd166);
      this.scene.tweens.add({ targets: this, scaleX: this.scaleX * 1.16, scaleY: this.scaleY * 0.84, duration: 180, yoyo: true });
      this.scene.time.delayedCall(360, () => this.active && this.host.burst(this.x + direction.x * 74, this.y + direction.y * 74, 0xffe2a0, 12, 120));
      this.host.playSfx('rooster-peck', 0.68);
    } else if (choice === 1) {
      this.announceAttack('Talon Rush', 0xff7c55);
      this.host.createDangerLine(this.x, this.y, direction.angle(), 610, 68, 720, this.damage * 1.35, 0xff7c55);
      this.telegraphCharge(direction, 720, frenzy ? 820 : 720, 680);
    } else if (choice === 2) {
      this.announceAttack('Feather Blade Storm', 0xffe5ba);
      const count = frenzy ? 20 : 13;
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + this.attackIndex * 0.17;
        this.host.fireEnemyProjectile(this.x, this.y - 12, this.x + Math.cos(angle) * 100, this.y + Math.sin(angle) * 100, {
          texture: 'projectile-feather', speed: frenzy ? 330 : 270, damage: this.damage * 0.72, scale: 0.88, rotate: 520, tint: i % 2 ? 0xfff1c2 : 0xff7b67,
        });
      }
      this.scene.tweens.add({ targets: this, angle: this.flipX ? -360 : 360, duration: 620, onComplete: () => this.active && this.setAngle(0) });
      this.host.playSfx('feather-storm', 0.7);
    } else if (choice === 3) {
      this.announceAttack('Sky Pounce', 0xff9a5e);
      const leadX = player.x + (player.body instanceof Phaser.Physics.Arcade.Body ? player.body.velocity.x * 0.54 : 0);
      const leadY = player.y + (player.body instanceof Phaser.Physics.Arcade.Body ? player.body.velocity.y * 0.54 : 0);
      this.host.createDangerCircle(leadX, leadY, frenzy ? 98 : 84, 940, this.damage * 1.55, 0xff9a5e);
      this.setAlpha(0.16);
      this.shadow.setScale(1.8).setAlpha(0.48);
      const token = this.generation;
      this.scene.time.delayedCall(930, () => {
        if (!this.active || this.generation !== token) return;
        this.setPosition(leadX, leadY).setAlpha(1);
        this.shadow.setScale(1).setAlpha(0.42);
        this.host.burst(leadX, leadY, 0xffa45f, 28, 205);
        this.scene.cameras.main.shake(260, 0.01);
      });
    } else {
      this.announceAttack('War Cry', 0xff5c4e);
      for (let i = 1; i <= 3; i += 1) this.host.createDangerRing(this.x, this.y, 52 + i * 38, 14, 360 + i * 150, this.damage * 0.36, 0xff6854);
      this.attackBuffUntil = time + (frenzy ? 6200 : 4200);
      if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 170) this.host.pushPlayerFrom(this.x, this.y, 68);
      this.host.playSfx('rooster-cry', 0.88);
    }
    this.nextAttackAt = time + (frenzy ? 820 : 1420);
  }

  private golemAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % (this.kind === 'troll' ? 4 : this.host.wave >= 8 ? 4 : 3);
    if (choice === 0) {
      this.announceAttack(this.kind === 'troll' ? 'Earthbreaker' : 'Runestone Slam', 0xe1b66d);
      if (this.kind === 'troll') {
        for (let i = 1; i <= 3; i += 1) this.host.createDangerRing(this.x, this.y, 58 + i * 52, 18, 480 + i * 250, this.damage * 0.72, 0xd7ad68);
      } else this.host.createDangerCircle(this.x, this.y, 128, 850, this.damage * 1.25, 0xf3b85b);
      this.host.playSfx('slam', 0.7);
    } else if (choice === 1) {
      this.announceAttack(this.kind === 'troll' ? 'Boulder Barrage' : 'Rune Boulder', 0xc99b60);
      const count = this.kind === 'troll' ? (this.phase >= 2 ? 5 : 3) : 1;
      for (let i = 0; i < count; i += 1) {
        const impactX = this.host.player.x + Phaser.Math.Between(-145, 145);
        const impactY = this.host.player.y + Phaser.Math.Between(-110, 110);
        this.scene.time.delayedCall(i * 130, () => this.active && this.host.createDangerCircle(impactX, impactY, 54, 720, this.damage * 0.92, 0xc69a62));
      }
      this.host.playSfx('rock', 0.58);
    } else if (choice === 2) {
      this.announceAttack(this.kind === 'troll' ? 'Rampage Combo' : 'Granite Rush', 0xa7ca70);
      if (this.kind === 'troll') this.host.playSfx('troll-roar', 0.54);
      this.telegraphCharge(direction, 620, this.kind === 'troll' && this.phase >= 2 ? 510 : 390, 520);
      if (this.kind === 'troll') {
        this.scene.time.delayedCall(900, () => this.active && this.host.createDangerCone(this.x, this.y, direction.angle(), 190, 1.55, 460, this.damage, 0xa7ca70));
        this.scene.time.delayedCall(1450, () => this.active && this.host.createDangerCircle(this.x, this.y, 128, 430, this.damage, 0xd7ad68));
      }
    } else {
      this.announceAttack(this.kind === 'troll' ? 'Stoneburst' : 'Runic Shards', 0xe2c68c);
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8;
        this.host.fireEnemyProjectile(this.x, this.y, this.x + Math.cos(angle) * 100, this.y + Math.sin(angle) * 100, {
          texture: 'projectile-rock', speed: 225, damage: this.damage * 0.72, scale: 0.74,
        });
      }
    }
    this.nextAttackAt = time + (this.kind === 'troll' && this.phase >= 2 ? 1300 : Math.max(1900, 3150 - this.host.wave * 30));
  }

  private werewolfAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % 4;
    if (choice === 0) {
      this.announceAttack('Savage Combo', 0xe35b72);
      this.host.createDangerCone(this.x, this.y, direction.angle(), 145, 1.45, 380, this.damage * 0.72, 0xe35b72);
      this.scene.time.delayedCall(430, () => this.active && this.host.createDangerCone(this.x, this.y, direction.angle() + 0.32, 165, 1.35, 340, this.damage * 0.76, 0xc74f67));
      this.scene.time.delayedCall(820, () => this.active && this.host.createDangerCircle(this.x, this.y, 112, 360, this.damage, 0x93475f));
    }
    else if (choice === 1) {
      this.announceAttack('Shadow Pounce', 0x9c75cc);
      this.host.createDangerLine(this.x, this.y, direction.angle(), 430, 52, 520, this.damage * 1.18, 0x9c75cc);
      this.setAlpha(0.22);
      this.host.burst(this.x, this.y, 0x6f518f, 18, 130);
      this.telegraphCharge(direction, 480, 720, 420);
      this.scene.time.delayedCall(500, () => this.active && this.setAlpha(1));
    }
    else if (choice === 2) {
      this.announceAttack('Moonfang Howl', 0xd9d3ff);
      this.host.playSfx('werewolf-howl', 0.8); this.host.burst(this.x, this.y, 0xd9d3ff, 24, 160);
      for (let i = 1; i <= 3; i += 1) this.host.createDangerRing(this.x, this.y, i * 54, 12, 350 + i * 140, this.damage * 0.3, 0xc6b9f4);
      this.attackBuffUntil = time + (this.phase >= 2 ? 7200 : 4200);
    }
    else {
      this.announceAttack('Miststep Ambush', 0x8260a4);
      this.setAlpha(0.12); this.host.burst(this.x, this.y, 0x715282, 14, 105);
      this.scene.time.delayedCall(260, () => this.active && this.setPosition(this.host.player.x - direction.x * 105, this.host.player.y - direction.y * 105).setAlpha(1));
    }
    this.nextAttackAt = time + (this.hp / this.maxHp < 0.45 ? 1200 : 1850);
  }

  private minotaurAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % 4;
    if (choice === 0) {
      this.announceAttack('Labyrinth Charge', 0xffa253);
      this.host.playSfx('hoof-charge', 0.72);
      this.host.createDangerLine(this.x, this.y, direction.angle(), 660, 92, 900, this.damage * 1.4, 0xffa253);
      this.telegraphCharge(direction, 900, this.phase >= 2 ? 820 : 720, 720);
    }
    else if (choice === 1) {
      this.announceAttack('Axe Cyclone', 0xf7c172);
      this.host.playSfx('axe-spin', 0.72);
      for (let i = 0; i < 3; i += 1) this.scene.time.delayedCall(i * 260, () => this.active && this.host.createDangerRing(this.x, this.y, 105 + i * 20, 52, 420, this.damage * 0.72, 0xf7c172));
      this.scene.tweens.add({ targets: this, angle: this.flipX ? -720 : 720, duration: 1250, onComplete: () => this.active && this.setAngle(0) });
      this.chargeUntil = time + 1150; this.chargeVelocity.copy(direction).scale(185);
    }
    else if (choice === 2) {
      this.announceAttack('Horn Shockwave', 0xd2b07b);
      this.host.createDangerCone(this.x, this.y, direction.angle(), 275, 1.18, 760, this.damage * 1.25, 0xd2b07b);
      for (let i = 1; i <= 4; i += 1) this.scene.time.delayedCall(i * 90, () => this.active && this.host.burst(this.x + direction.x * i * 55, this.y + direction.y * i * 55, 0xb89c76, 6, 48));
    }
    else {
      this.announceAttack('Bull Rush', 0xff6c43);
      this.host.burst(this.x, this.y, 0xff6c43, 28, 190); this.telegraphCharge(direction, 350, 650, 500);
    }
    this.nextAttackAt = time + (this.phase >= 2 ? 1450 : 2100);
  }

  private wyvernAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % 5;
    if (choice === 0) {
      this.announceAttack('Fireball Fan', 0xff8b52);
      this.host.playSfx('fire', 0.66);
      this.host.fireEnemyProjectile(this.x, this.y, this.host.player.x, this.host.player.y, { texture: 'projectile-fireball', speed: 285, damage: this.damage, spread: 0.17, count: this.phase >= 2 ? 7 : 5, scale: 1.05 });
    }
    else if (choice === 1) {
      this.announceAttack('Sky Sweep', 0xffad5e);
      this.host.playSfx('wyvern-wing', 0.72);
      this.host.createDangerLine(this.x, this.y, direction.angle(), 620, 82, 720, this.damage * 1.18, 0xffad5e);
      this.telegraphCharge(direction, 700, 780, 420, true);
    }
    else if (choice === 2) {
      this.announceAttack('Wing Cyclone', 0xbce4d7);
      for (let i = 0; i < 6; i += 1) {
        const angle = i * Math.PI / 3;
        this.host.createMovingHazard(this.x, this.y, new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)).scale(120), this.damage * 0.55);
      }
      if (Phaser.Math.Distance.Between(this.x, this.y, this.host.player.x, this.host.player.y) < 205) this.host.pushPlayerFrom(this.x, this.y, 86);
      this.host.playSfx('wyvern-wing', 0.74);
    }
    else if (choice === 3) {
      this.announceAttack('Cinder Gale', 0xeb7151);
      this.host.playSfx('tornado-wind', 0.68);
      this.host.createMovingHazard(this.x, this.y, direction.clone().rotate(0.6).scale(105), this.damage * 0.7);
    }
    else {
      this.announceAttack('Inferno Dive', 0xff653f);
      this.host.playSfx('fire', 0.76);
      const targetX = this.host.player.x + Phaser.Math.Between(-40, 40);
      const targetY = this.host.player.y + Phaser.Math.Between(-40, 40);
      this.host.createDangerCircle(targetX, targetY, this.phase >= 2 ? 105 : 82, 920, this.damage * 1.38, 0xff693f);
      this.setAlpha(0.16);
      this.scene.time.delayedCall(910, () => {
        if (!this.active) return;
        this.setPosition(targetX, targetY).setAlpha(1);
        for (let i = 0; i < (this.phase >= 2 ? 10 : 7); i += 1) {
          const angle = i * Math.PI * 2 / (this.phase >= 2 ? 10 : 7);
          this.host.fireEnemyProjectile(this.x, this.y, this.x + Math.cos(angle) * 90, this.y + Math.sin(angle) * 90, { texture: 'projectile-fireball', speed: 270, damage: this.damage * 0.65, scale: 0.82 });
        }
      });
    }
    this.nextAttackAt = time + (this.phase >= 2 ? 1180 : 1640);
  }

  private beastAttack(time: number, direction: Phaser.Math.Vector2): void {
    const player = this.host.player;
    const choice = this.attackIndex % (this.phase === 1 ? 4 : 6);
    if (choice === 0) this.host.createFireCone(this.x, this.y, direction.angle(), 410, 0.82, this.damage * 1.35);
    else if (choice === 1) { this.host.fireEnemyProjectile(this.x, this.y, player.x, player.y, { texture: 'projectile-rock', speed: 260, damage: this.damage, spread: 0.2, count: 5, scale: 1.15 }); this.host.playSfx('bone', 0.65); }
    else if (choice === 2) this.host.createDangerCircle(this.x, this.y, 175, 650, this.damage * 1.2, 0x69ce62);
    else if (choice === 3) this.telegraphCharge(direction, 620, this.phase === 3 ? 720 : 560);
    else if (choice === 4) { for (let i = 0; i < 4; i += 1) this.host.spawnEnemy(i % 2 ? 'skeleton' : 'zombie', this.x + Phaser.Math.Between(-130, 130), this.y + Phaser.Math.Between(-130, 130)); }
    else for (let i = 0; i < (this.phase === 3 ? 8 : 5); i += 1) this.host.createDangerCircle(player.x + Phaser.Math.Between(-220, 220), player.y + Phaser.Math.Between(-160, 160), 64, 850 + i * 80, this.damage, 0x64d35f);
    if (this.phase >= 2 && choice === 3) for (let i = 1; i <= 3; i += 1) this.scene.time.delayedCall(i * 260, () => this.active && this.host.createDangerCircle(this.x - direction.x * i * 70, this.y - direction.y * i * 70, 42, 360, this.damage * 0.6, 0x5fbd54));
    this.nextAttackAt = time + (this.phase === 3 ? 1250 : 1900);
  }

  private vampireAttack(time: number, direction: Phaser.Math.Vector2, distance: number): void {
    const choice = this.attackIndex % 5;
    const player = this.host.player;
    if (choice === 0) {
      this.setAlpha(0.12);
      this.host.playSfx('teleport', 0.62);
      const token = this.generation;
      this.scene.time.delayedCall(360, () => {
        if (!this.active || this.generation !== token) return;
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.setPosition(player.x + Math.cos(angle) * 155, player.y + Math.sin(angle) * 155).setAlpha(1);
        this.host.burst(this.x, this.y, 0xd44773, 16, 130);
      });
    } else if (choice === 1) {
      this.host.fireEnemyProjectile(this.x, this.y, player.x, player.y, {
        texture: 'projectile-blood', speed: 245, damage: this.damage, spread: 0.18, count: 5, scale: 0.8,
      });
    } else if (choice === 2) {
      for (let i = 0; i < 3; i += 1) this.host.spawnEnemy('bat', this.x + Phaser.Math.Between(-35, 35), this.y + Phaser.Math.Between(-35, 35));
    } else if (choice === 3 && distance < 190) {
      this.host.createDangerCircle(player.x, player.y, 78, 760, this.damage * 1.15, 0xbd3d68);
      this.scene.time.delayedCall(780, () => {
        if (!this.active) return;
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.025);
        this.host.bossHealthChanged(this);
      });
    } else {
      this.telegraphCharge(direction, 410, 510);
    }
    this.nextAttackAt = time + Math.max(1550, 2850 - this.host.wave * 27);
  }

  private dragonAttack(time: number, direction: Phaser.Math.Vector2, distance: number): void {
    const player = this.host.player;
    const cadence = this.phase === 4 ? 1550 : 2350 - this.phase * 120;
    const pool: Array<'fireball' | 'claw' | 'tail' | 'breath' | 'dash' | 'meteor' | 'tornado' | 'summon'> = ['fireball', 'claw', 'tail'];
    if (this.phase >= 2) pool.push('breath', 'dash');
    if (this.phase >= 3) pool.push('meteor', 'tornado', 'summon');
    if (this.phase === 4 && time - this.lastInfernoAt > 14_000) {
      this.lastInfernoAt = time;
      this.host.createInferno(this);
      this.nextAttackAt = time + 5200;
      return;
    }
    const attack = pool[this.attackIndex % pool.length];
    if (attack === 'fireball') {
      this.host.fireEnemyProjectile(this.x, this.y - 15, player.x, player.y, {
        texture: 'projectile-fireball', speed: 255 + this.phase * 20, damage: this.damage,
        spread: 0.13, count: this.phase === 4 ? 5 : 3, scale: 1.15,
      });
      this.host.playSfx('fire', 0.65);
    } else if (attack === 'claw') {
      this.host.createDangerCircle(this.x, this.y, distance < 130 ? 135 : 105, 620, this.damage * 1.15, 0xff814f);
    } else if (attack === 'tail') {
      this.host.createDangerCircle(this.x, this.y, 175, 820, this.damage * 1.1, 0xffa058);
    } else if (attack === 'breath') {
      this.host.createFireCone(this.x, this.y, direction.angle(), 380, 0.82, this.damage * 1.35);
    } else if (attack === 'dash') {
      this.telegraphCharge(direction, 680, 590);
    } else if (attack === 'meteor') {
      const count = this.phase === 4 ? 7 : 4;
      for (let i = 0; i < count; i += 1) {
        this.scene.time.delayedCall(i * 190, () => {
          const px = player.x + Phaser.Math.Between(-210, 210);
          const py = player.y + Phaser.Math.Between(-150, 150);
          this.host.createDangerCircle(px, py, 70, 950, this.damage, 0xff663d);
        });
      }
    } else if (attack === 'tornado') {
      const velocity = new Phaser.Math.Vector2(direction.x, direction.y).rotate(Phaser.Math.FloatBetween(-0.8, 0.8)).scale(85);
      this.host.createMovingHazard(this.x, this.y, velocity, this.damage * 0.8);
    } else {
      const summonKinds: EnemyKind[] = ['wolf', 'bat', 'skeleton'];
      for (let i = 0; i < (this.phase === 4 ? 5 : 3); i += 1) {
        this.host.spawnEnemy(summonKinds[i % summonKinds.length], this.x + Phaser.Math.Between(-120, 120), this.y + Phaser.Math.Between(-120, 120));
      }
    }
    this.nextAttackAt = time + cadence;
  }

  onObstacleCollision(): void {
    if (!this.active || this.scene.time.now >= this.chargeUntil) return;
    this.chargeUntil = 0;
    this.leavingFireTrail = false;
    this.setVelocity(0);
    if (this.kind === 'minotaur' && this.lastAttack === 'Labyrinth Charge') {
      this.recoverUntil = this.scene.time.now + 1150;
      this.setTint(0xffe6a2);
      this.host.floatingText(this.x, this.y - 52, 'STUNNED!', '#ffe69a', true);
      this.host.burst(this.x, this.y, 0xe9c27c, 22, 155);
      this.scene.cameras.main.shake(220, 0.008);
    } else this.recoverUntil = this.scene.time.now + 360;
  }

  private beginTrollRegen(): void {
    this.regenUsed = true;
    this.regenDamage = 0;
    this.regenUntil = this.scene.time.now + 4200;
    this.nextRegenTick = this.scene.time.now;
    this.announceAttack('Rootbound Regeneration', 0x95df69);
    this.host.floatingText(this.x, this.y - 58, 'BREAK THE ROOTS!', '#bfff91', true);
    this.host.burst(this.x, this.y, 0x75c35a, 26, 150);
    this.host.playSfx('troll-roar', 0.72);
  }

  private announceAttack(name: string, color: number): void {
    this.lastAttack = name;
    this.attacksUsed.add(name);
    this.host.floatingText(this.x, this.y - 50, name.toUpperCase(), `#${color.toString(16).padStart(6, '0')}`, false);
  }

  private restoreBossTint(): void {
    if (this.kind === 'dragon' && this.phase === 4) this.setTint(0xff805a);
    else if (this.kind === 'ancientBeast') this.setTint(0x72d36f);
    else if (this.kind === 'rooster' && this.phase >= 2) this.setTint(0xff7566);
    else if (this.kind === 'minotaur' && this.phase >= 2) this.setTint(0xff7659);
    else if (this.kind === 'werewolf' && this.phase >= 2) this.setTint(0xb99cff);
    else if (this.kind === 'wyvern' && this.phase >= 2) this.setTint(0xff9a67);
    else if (this.kind === 'troll' && this.phase >= 2) this.setTint(0xa4d768);
    else this.clearTint();
  }

  private telegraphCharge(direction: Phaser.Math.Vector2, warningMs: number, speed: number, recoveryMs = 520, fireTrail = false): void {
    const token = this.generation;
    this.setTint(0xffd071).setVelocity(0);
    this.host.playSfx('boss-charge', 0.54);
    this.host.burst(this.x, this.y, 0xffd071, 12, 90);
    this.scene.time.delayedCall(warningMs, () => {
      if (!this.active || this.generation !== token) return;
      this.restoreBossTint();
      this.chargeVelocity.copy(direction).scale(speed);
      this.chargeUntil = this.scene.time.now + 720;
      this.recoverUntil = this.chargeUntil + recoveryMs;
      this.leavingFireTrail = fireTrail;
      this.nextTrailAt = this.scene.time.now;
      this.scene.cameras.main.shake(160, 0.005);
    });
  }
}
