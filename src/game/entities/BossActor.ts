import Phaser from 'phaser';
import { BOSS_BALANCE, BOSS_SCALING } from '../config/balance';
import type { BossKind, DamageOptions, EnemyKind } from '../types';
import type { Player } from './Player';
import { BossVisualRig } from './BossVisualRig';

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
  darkMage: 'Mordrath, Darkbone Magus',
  rooster: 'The Crimson Cockatrice',
  troll: 'Grumhild, Moss Troll',
  werewolf: 'Fenris, Moonfang',
  minotaur: 'Korvax, Horn of Ruin',
  wyvern: 'Ashwing Wyvern',
  ancientBeast: 'Ancient Beast — Zombie Dragon',
  dragon: 'Ancient Forest Dragon',
};

const BOSS_TEXTURE: Record<BossKind, string> = {
  golem: 'boss-golem', vampire: 'boss-vampire', darkMage: 'boss-vampire', rooster: 'boss-rooster', troll: 'boss-troll', werewolf: 'boss-werewolf',
  minotaur: 'boss-minotaur', wyvern: 'boss-wyvern', ancientBeast: 'boss-dragon', dragon: 'boss-dragon',
};

const BOSS_COLORS: Record<BossKind, number> = {
  golem: 0xd5b777, vampire: 0xd44773, darkMage: 0x7654d6, rooster: 0xff493f, troll: 0x83b65c, werewolf: 0xa690db,
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
  private nextMeleeAt = 0;
  private attackIndex = 0;
  private chargeWindupUntil = 0;
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
  private ultimateUsed = false;
  private dragonSecondHealthBarUsed = false;
  private phaseTransitionInvulnerableUntil = 0;
  private nextPressureDashAt = 0;
  private nextTrailAt = 0;
  private visualAlpha = 1;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly aura: Phaser.GameObjects.Arc;
  private readonly visual: BossVisualRig;

  get specialState(): string {
    const time = this.scene.time.now;
    if (this.dying) return 'dying';
    if (time < this.regenUntil) return 'regenerating';
    if (time < this.chargeWindupUntil || time < this.chargeUntil) return 'charging';
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
    this.visual = new BossVisualRig(scene);
    this.disableBody(true, true);
  }

  spawn(host: BossHost, kind: BossKind, x: number, y: number, wave: number): this {
    this.host = host;
    this.kind = kind;
    this.displayName = BOSS_NAMES[kind];
    this.phase = 1;
    this.generation += 1;
    const tuning = BOSS_BALANCE[kind];
    const hpScale = kind === 'dragon' || kind === 'ancientBeast' ? 1 : 1 + Math.max(0, wave - 1) * BOSS_SCALING.hpPerWave;
    this.maxHp = Math.round(tuning.hp * hpScale);
    this.hp = this.maxHp;
    this.damage = Math.round(tuning.damage * (1 + Math.max(0, wave - 1) * BOSS_SCALING.damagePerWave));
    this.nextAttackAt = this.scene.time.now + Math.max(1200, tuning.cadence * 0.58);
    this.attackIndex = 0;
    this.nextMeleeAt = this.scene.time.now + 1400;
    this.chargeWindupUntil = 0;
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
    this.ultimateUsed = false;
    this.dragonSecondHealthBarUsed = false;
    this.phaseTransitionInvulnerableUntil = 0;
    this.nextPressureDashAt = this.scene.time.now + 1600;
    this.visualAlpha = 1;
    this.lastAttack = 'Entrance';
    this.attacksUsed.clear();
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.aura);
    this.enableBody(true, x, y, true, true);
    this.setTexture(BOSS_TEXTURE[kind]).setScale(1).setAlpha(1).setAngle(0).setVisible(false).clearTint().setDepth(y + 30);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const radius = tuning.hitboxRadius;
    body.setCircle(radius, this.width / 2 - radius, this.height / 2 - radius);
    body.setVelocity(0).setEnable(true);
    this.visual.spawn(kind, x, y, y + 30);
    const metrics = this.visual.metrics;
    const flying = metrics.airborne;
    this.shadow.setVisible(true).setPosition(x, y + metrics.shadowOffsetY).setDisplaySize(metrics.shadowWidth, metrics.shadowHeight).setAlpha(flying ? 0.24 : 0.36).setDepth(y - 3);
    this.aura.setVisible(true).setPosition(x, y).setRadius(kind === 'dragon' ? 72 : kind === 'ancientBeast' ? 62 : 42).setScale(1).setAlpha(1).setStrokeStyle(3, BOSS_COLORS[kind], 0.28).setDepth(y - 2);
    this.scene.tweens.add({ targets: this.aura, alpha: { from: 0.08, to: 0.3 }, scale: { from: 0.9, to: 1.1 }, duration: 1100, yoyo: true, repeat: -1 });
    this.host.burst(x, y, BOSS_COLORS[kind], 24, 150);
    this.host.playSfx(kind === 'rooster' ? 'rooster-cry' : kind === 'troll' ? 'troll-roar' : kind === 'wyvern' ? 'wyvern-wing' : 'boss-charge', 0.72);
    this.host.bossHealthChanged(this);
    return this;
  }

  updateBoss(time: number): void {
    if (!this.active || !this.host.player.active) return;
    if (this.dying) {
      this.visual.sync(this.x, this.y, this.y + this.visual.metrics.shadowOffsetY, this.flipX, time, this.phase, 'dying');
      return;
    }
    this.updatePhase();
    const player = this.host.player;
    const toPlayer = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y);
    const distance = Math.max(1, toPlayer.length());
    toPlayer.scale(1 / distance);

    if (time < this.enteringUntil || time < this.regenUntil || time < this.chargeWindupUntil || (time >= this.chargeUntil && time < this.recoverUntil)) {
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
      const tuning = BOSS_BALANCE[this.kind];
      const speed = tuning.moveSpeed
        * (time < this.attackBuffUntil ? BOSS_SCALING.phaseBurstMoveSpeedMultiplier : 1)
        * (this.phase >= 2 ? BOSS_SCALING.enragedMoveSpeedMultiplier : 1);
      if (distance > (this.kind === 'dragon' ? 155 : 95)) this.setVelocity(toPlayer.x * speed, toPlayer.y * speed);
      else this.setVelocity(-toPlayer.y * speed * 0.25, toPlayer.x * speed * 0.25);
      if (time >= this.nextAttackAt) this.performAttack(time, toPlayer, distance);
    }
    this.setFlipX(this.body instanceof Phaser.Physics.Arcade.Body && this.body.velocity.x < 0);
    this.setDepth(this.y + 30);
    const metrics = this.visual.metrics;
    const flying = metrics.airborne;
    const hiddenAloft = this.visualAlpha < 0.5;
    const diveScale = hiddenAloft ? 0.66 : flying && this.specialState === 'charging' ? 1.08 : flying ? 0.82 + Math.sin(time * 0.004) * 0.04 : 1;
    this.shadow
      .setPosition(this.x, this.y + metrics.shadowOffsetY + (flying ? 5 : 0))
      .setDepth(this.y - 3)
      .setDisplaySize(metrics.shadowWidth * diveScale, metrics.shadowHeight * diveScale)
      .setAlpha(hiddenAloft ? 0.16 : flying ? (this.specialState === 'charging' ? 0.34 : 0.22) : 0.36);
    this.aura.setPosition(this.x, this.y).setDepth(this.y - 2);
    this.visual.sync(this.x, this.y, this.y + metrics.shadowOffsetY, this.flipX, time, this.phase, this.specialState);
  }

  takeDamage(amount: number, options: DamageOptions = {}): boolean {
    if (!this.active || this.hp <= 0 || this.scene.time.now < this.phaseTransitionInvulnerableUntil) return false;
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
    this.visual.flash();
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
    if (this.hp <= 0 && this.kind === 'dragon' && this.phase === 1 && !this.dragonSecondHealthBarUsed) {
      this.beginDragonSecondLife();
      return false;
    }
    this.host.bossHealthChanged(this);
    if (this.hp <= 0) {
      this.hp = 0;
      this.setVelocity(0);
      this.dying = true;
      (this.body as Phaser.Physics.Arcade.Body).setEnable(false);
      this.host.playSfx('boss-death', 0.82);
      if (this.kind === 'rooster') this.host.playSfx('rooster-cry', 0.46);
      this.host.burst(this.x, this.y, BOSS_COLORS[this.kind], 34, 230);
      this.setBossAlpha(1);
      this.visual.playDeath(680);
      const token = this.generation;
      this.scene.tweens.add({ targets: this, angle: this.flipX ? -88 : 88, y: this.y + 24, alpha: 0.15, scaleX: this.scaleX * 1.18, scaleY: this.scaleY * 0.72, duration: 680, ease: 'Quad.in' });
      this.scene.tweens.add({ targets: this.aura, alpha: 0, scale: 1.8, duration: 620 });
      this.scene.time.delayedCall(700, () => this.active && this.generation === token && this.host.bossDied(this));
      return true;
    }
    return false;
  }

  retire(): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.aura);
    this.disableBody(true, true);
    this.clearTint().setVelocity(0).setVisible(false);
    this.shadow.setVisible(false);
    this.aura.setVisible(false);
    this.visual.recycle();
    this.visualAlpha = 1;
  }

  private updatePhase(): void {
    const ratio = this.hp / this.maxHp;
    const calculatedPhase = this.kind === 'ancientBeast'
      ? (ratio > 0.5 ? 1 : ratio > 0.2 ? 2 : 3)
      : this.kind === 'dragon'
        ? (!this.dragonSecondHealthBarUsed ? 1 : ratio > 0.3 ? 2 : 3)
      : (ratio > (this.kind === 'rooster' ? 0.35 : this.kind === 'minotaur' ? 0.3 : 0.4) ? 1 : 2);
    const nextPhase = Math.max(this.phase, calculatedPhase);
    if (nextPhase !== this.phase) {
      this.phase = nextPhase;
      if (this.kind === 'dragon' && this.phase === 3) this.damage = Math.round(this.damage * 1.15);
      this.attackBuffUntil = this.scene.time.now + (this.kind === 'werewolf' ? 7500 : 3200);
      this.host.burst(this.x, this.y, BOSS_COLORS[this.kind], 32, 190);
      this.scene.cameras.main.shake(360, 0.009);
      this.aura.setStrokeStyle(this.phase >= 2 ? 4 : 2, BOSS_COLORS[this.kind], 0.45);
      if (this.kind === 'rooster') { this.setTint(0xff7566); this.host.floatingText(this.x, this.y - 58, 'CRIMSON FRENZY!', '#ff8d78', true); this.host.playSfx('rooster-cry', 0.9); }
      else if (this.kind === 'minotaur') { this.setTint(0xff7659); this.host.floatingText(this.x, this.y - 58, 'BLOOD RAGE!', '#ff8d78', true); }
      else if (this.kind === 'werewolf') { this.setTint(0xb99cff); this.host.floatingText(this.x, this.y - 58, 'BLOOD MOON!', '#e0c5ff', true); }
      else if (this.kind === 'wyvern') this.setTint(0xff9a67);
      else if (this.kind === 'troll') this.setTint(0xa4d768);
      else if (this.kind === 'darkMage') { this.setTint(0xb38cff); this.host.floatingText(this.x, this.y - 58, 'SOULSTORM!', '#d6bdff', true); }
      else if (this.kind === 'ancientBeast') this.host.floatingText(this.x, this.y - 62, this.phase === 2 ? 'CORRUPTED AWAKENING!' : 'UNDEAD FRENZY!', '#9bf77b', true);
      else if (this.kind === 'dragon') { this.setTint(0xff805a); this.host.floatingText(this.x, this.y - 62, this.phase === 2 ? "PHASE II — DRAGON'S FURY" : 'FINAL PHASE — ANCIENT INFERNO', '#ffb06a', true); this.host.playSfx('dragon-roar', 0.9); }
      this.host.bossHealthChanged(this);
    }
    if (this.kind === 'troll' && ratio < 0.62 && !this.regenUsed) this.beginTrollRegen();
  }

  private beginDragonSecondLife(): void {
    const time = this.scene.time.now;
    this.dragonSecondHealthBarUsed = true;
    this.phase = 2;
    this.hp = this.maxHp;
    this.damage = Math.round(this.damage * 1.3);
    this.phaseTransitionInvulnerableUntil = time + 1800;
    this.enteringUntil = time + 1800;
    this.recoverUntil = time + 2100;
    this.nextAttackAt = time + 2200;
    this.setVelocity(0).setTint(0xff805a);
    this.aura.setStrokeStyle(5, 0xff7045, 0.72);
    this.host.floatingText(this.x, this.y - 92, 'DEATH DENIED — PHASE II!', '#fff0a8', true);
    this.host.floatingText(this.x, this.y - 68, 'FULL HEALTH RESTORED', '#ff9a64', true);
    this.host.burst(this.x, this.y, 0xff713f, 58, 280);
    this.host.playSfx('dragon-roar', 1);
    this.scene.cameras.main.flash(420, 155, 42, 18);
    this.scene.cameras.main.shake(620, 0.018);
    this.host.bossHealthChanged(this);
  }

  private performAttack(time: number, direction: Phaser.Math.Vector2, distance: number): void {
    if (distance <= this.meleeRange() && time >= this.nextMeleeAt) {
      this.performMelee(time, direction);
      return;
    }
    this.attackIndex += 1;
    if (this.kind === 'rooster') this.roosterAttack(time, direction);
    else if (this.kind === 'golem' || this.kind === 'troll') this.golemAttack(time, direction);
    else if (this.kind === 'vampire') this.vampireAttack(time, direction, distance);
    else if (this.kind === 'darkMage') this.darkMageAttack(time, direction);
    else if (this.kind === 'werewolf') this.werewolfAttack(time, direction);
    else if (this.kind === 'minotaur') this.minotaurAttack(time, direction);
    else if (this.kind === 'wyvern') this.wyvernAttack(time, direction);
    else if (this.kind === 'ancientBeast') this.beastAttack(time, direction);
    else this.dragonAttack(time, direction, distance);
  }

  private meleeRange(): number {
    if (this.kind === 'dragon') return 180;
    if (this.kind === 'ancientBeast') return 165;
    if (this.kind === 'wyvern' || this.kind === 'troll' || this.kind === 'minotaur') return 130;
    return 112;
  }

  private performMelee(time: number, direction: Phaser.Math.Vector2): void {
    const profiles: Record<BossKind, { name: string; range: number; spread: number; warning: number; damage: number; color: number; cooldown: number }> = {
      rooster: { name: 'Talon Peck Combo', range: 138, spread: 1.35, warning: 430, damage: 1.18, color: 0xffbd69, cooldown: 1320 },
      troll: { name: 'Club Swing', range: 150, spread: 1.65, warning: 620, damage: 1.28, color: 0xb8d77a, cooldown: 1520 },
      minotaur: { name: 'Axe and Horn Combo', range: 155, spread: 1.5, warning: 520, damage: 1.3, color: 0xf0b46c, cooldown: 1400 },
      werewolf: { name: 'Moonclaw Combo', range: 140, spread: 1.35, warning: 360, damage: 1.12, color: 0xcf9bff, cooldown: 1160 },
      wyvern: { name: 'Bite and Wing Bash', range: 160, spread: 1.55, warning: 520, damage: 1.22, color: 0xff9a62, cooldown: 1440 },
      ancientBeast: { name: 'Ancient Claw', range: 185, spread: 1.55, warning: 650, damage: 1.32, color: 0x7ee46d, cooldown: 1560 },
      dragon: { name: 'Dragon Claw Combo', range: 205, spread: 1.55, warning: 520, damage: 1.35, color: 0xff8253, cooldown: 1000 },
      golem: { name: 'Runestone Fist', range: 145, spread: 1.6, warning: 600, damage: 1.25, color: 0xd5b777, cooldown: 1520 },
      vampire: { name: 'Crimson Rake', range: 135, spread: 1.3, warning: 400, damage: 1.16, color: 0xe45b83, cooldown: 1240 },
      darkMage: { name: 'Grave Scythe', range: 150, spread: 1.45, warning: 540, damage: 1.2, color: 0x9d7af0, cooldown: 1440 },
    };
    const profile = profiles[this.kind];
    this.announceAttack(profile.name, profile.color);
    this.host.createDangerCone(this.x, this.y, direction.angle(), profile.range, profile.spread, profile.warning, this.damage * profile.damage, profile.color);
    if (this.kind === 'rooster' || this.kind === 'werewolf' || this.kind === 'dragon') {
      this.scene.time.delayedCall(profile.warning + 260, () => this.active && this.host.createDangerCone(this.x, this.y, direction.angle() + 0.28, profile.range + 12, profile.spread, 280, this.damage * 0.7, profile.color));
    }
    if (this.kind === 'ancientBeast' || this.kind === 'dragon' || this.kind === 'wyvern') {
      this.scene.time.delayedCall(profile.warning + 520, () => this.active && this.host.createDangerRing(this.x, this.y, profile.range - 25, 38, 360, this.damage * 0.65, profile.color));
    }
    this.host.burst(this.x + direction.x * 55, this.y + direction.y * 55, profile.color, 14, 125);
    this.nextMeleeAt = time + profile.cooldown;
    this.recoverUntil = time + profile.warning + 850;
    this.nextAttackAt = this.recoverUntil + 350;
  }

  private roosterAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % 5;
    const player = this.host.player;
    const frenzy = this.phase >= 2;
    if (choice === 0) {
      this.announceAttack('Razor Peck', 0xffcf64);
      this.host.createDangerLine(this.x, this.y, direction.angle(), 168, 56, 360, this.damage * 1.42, 0xffd166);
      this.scene.time.delayedCall(360, () => this.active && this.host.burst(this.x + direction.x * 74, this.y + direction.y * 74, 0xffe2a0, 12, 120));
      this.host.playSfx('rooster-peck', 0.68);
      this.recoverUntil = time + 760;
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
      this.host.playSfx('feather-storm', 0.7);
      this.recoverUntil = time + 980;
    } else if (choice === 3) {
      this.announceAttack('Sky Pounce', 0xff9a5e);
      const leadX = player.x + (player.body instanceof Phaser.Physics.Arcade.Body ? player.body.velocity.x * 0.54 : 0);
      const leadY = player.y + (player.body instanceof Phaser.Physics.Arcade.Body ? player.body.velocity.y * 0.54 : 0);
      this.host.createDangerCircle(leadX, leadY, frenzy ? 98 : 84, 940, this.damage * 1.55, 0xff9a5e);
      this.setBossAlpha(0.16);
      const token = this.generation;
      this.scene.time.delayedCall(930, () => {
        if (!this.active || this.generation !== token) return;
        this.setPosition(leadX, leadY);
        this.setBossAlpha(1);
        this.host.burst(leadX, leadY, 0xffa45f, 28, 205);
        this.scene.cameras.main.shake(260, 0.01);
      });
      this.recoverUntil = time + 1850;
    } else {
      this.announceAttack('War Cry', 0xff5c4e);
      for (let i = 1; i <= 3; i += 1) this.host.createDangerRing(this.x, this.y, 52 + i * 38, 14, 360 + i * 150, this.damage * 0.36, 0xff6854);
      this.attackBuffUntil = time + (frenzy ? 6200 : 4200);
      if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 170) this.host.pushPlayerFrom(this.x, this.y, 68);
      this.host.playSfx('rooster-cry', 0.88);
      this.recoverUntil = time + 1100;
    }
    this.scheduleNextAttack(time, [0.75, 1.25, 1.4, 1.55, 1.8][choice]);
  }

  private golemAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % (this.kind === 'troll' ? 4 : this.host.wave >= 8 ? 4 : 3);
    if (choice === 0) {
      this.announceAttack(this.kind === 'troll' ? 'Earthbreaker' : 'Runestone Slam', 0xe1b66d);
      if (this.kind === 'troll') {
        for (let i = 1; i <= 3; i += 1) this.host.createDangerRing(this.x, this.y, 58 + i * 52, 18, 480 + i * 250, this.damage * 0.72, 0xd7ad68);
      } else this.host.createDangerCircle(this.x, this.y, 128, 850, this.damage * 1.25, 0xf3b85b);
      this.host.playSfx('slam', 0.7);
      this.recoverUntil = time + (this.kind === 'troll' ? 1900 : 1450);
    } else if (choice === 1) {
      this.announceAttack(this.kind === 'troll' ? 'Boulder Barrage' : 'Rune Boulder', 0xc99b60);
      const count = this.kind === 'troll' ? (this.phase >= 2 ? 5 : 3) : 1;
      for (let i = 0; i < count; i += 1) {
        const impactX = this.host.player.x + Phaser.Math.Between(-145, 145);
        const impactY = this.host.player.y + Phaser.Math.Between(-110, 110);
        this.scene.time.delayedCall(i * 130, () => this.active && this.host.createDangerCircle(impactX, impactY, 54, 720, this.damage * 0.92, 0xc69a62));
      }
      this.host.playSfx('rock', 0.58);
      this.recoverUntil = time + 1600;
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
      this.recoverUntil = time + 900;
    }
    this.scheduleNextAttack(time, [1.25, 1.1, 1.45, 0.95][choice]);
  }

  private werewolfAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % 4;
    if (choice === 0) {
      this.announceAttack('Savage Combo', 0xe35b72);
      this.host.createDangerCone(this.x, this.y, direction.angle(), 145, 1.45, 380, this.damage * 0.72, 0xe35b72);
      this.scene.time.delayedCall(430, () => this.active && this.host.createDangerCone(this.x, this.y, direction.angle() + 0.32, 165, 1.35, 340, this.damage * 0.76, 0xc74f67));
      this.scene.time.delayedCall(820, () => this.active && this.host.createDangerCircle(this.x, this.y, 112, 360, this.damage, 0x93475f));
      this.recoverUntil = time + 1750;
    }
    else if (choice === 1) {
      this.announceAttack('Shadow Pounce', 0x9c75cc);
      this.host.createDangerLine(this.x, this.y, direction.angle(), 430, 52, 520, this.damage * 1.18, 0x9c75cc);
      this.setBossAlpha(0.22);
      this.host.burst(this.x, this.y, 0x6f518f, 18, 130);
      this.telegraphCharge(direction, 480, 720, 420);
      this.scene.time.delayedCall(500, () => this.active && this.setBossAlpha(1));
    }
    else if (choice === 2) {
      this.announceAttack('Moonfang Howl', 0xd9d3ff);
      this.host.playSfx('werewolf-howl', 0.8); this.host.burst(this.x, this.y, 0xd9d3ff, 24, 160);
      for (let i = 1; i <= 3; i += 1) this.host.createDangerRing(this.x, this.y, i * 54, 12, 350 + i * 140, this.damage * 0.3, 0xc6b9f4);
      this.attackBuffUntil = time + (this.phase >= 2 ? 7200 : 4200);
      this.recoverUntil = time + 1150;
    }
    else {
      this.announceAttack('Miststep Ambush', 0x8260a4);
      this.setBossAlpha(0.12); this.host.burst(this.x, this.y, 0x715282, 14, 105);
      this.scene.time.delayedCall(260, () => {
        if (!this.active) return;
        this.setPosition(this.host.player.x - direction.x * 105, this.host.player.y - direction.y * 105);
        this.setBossAlpha(1);
      });
      this.recoverUntil = time + 820;
    }
    this.scheduleNextAttack(time, [0.95, 1.1, 1.25, 0.95][choice]);
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
      this.chargeUntil = time + 1150; this.chargeVelocity.copy(direction).scale(185);
      this.recoverUntil = time + 1850;
    }
    else if (choice === 2) {
      this.announceAttack('Horn Shockwave', 0xd2b07b);
      this.host.createDangerCone(this.x, this.y, direction.angle(), 275, 1.18, 760, this.damage * 1.25, 0xd2b07b);
      for (let i = 1; i <= 4; i += 1) this.scene.time.delayedCall(i * 90, () => this.active && this.host.burst(this.x + direction.x * i * 55, this.y + direction.y * i * 55, 0xb89c76, 6, 48));
      this.recoverUntil = time + 1500;
    }
    else {
      this.announceAttack('Bull Rush', 0xff6c43);
      this.host.burst(this.x, this.y, 0xff6c43, 28, 190); this.telegraphCharge(direction, 350, 650, 500);
    }
    this.scheduleNextAttack(time, [1, 0.9, 1, 0.9][choice]);
  }

  private wyvernAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % 5;
    if (choice === 0) {
      this.announceAttack('Fireball Fan', 0xff8b52);
      this.host.playSfx('fire', 0.66);
      this.host.fireEnemyProjectile(this.x, this.y, this.host.player.x, this.host.player.y, { texture: 'projectile-fireball', speed: 285, damage: this.damage, spread: 0.17, count: this.phase >= 2 ? 7 : 5, scale: 1.05 });
      this.recoverUntil = time + 900;
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
      this.recoverUntil = time + 1050;
    }
    else if (choice === 3) {
      this.announceAttack('Cinder Gale', 0xeb7151);
      this.host.playSfx('tornado-wind', 0.68);
      this.host.createMovingHazard(this.x, this.y, direction.clone().rotate(0.6).scale(105), this.damage * 0.7);
      this.recoverUntil = time + 950;
    }
    else {
      this.announceAttack('Inferno Dive', 0xff653f);
      this.host.playSfx('fire', 0.76);
      const targetX = this.host.player.x + Phaser.Math.Between(-40, 40);
      const targetY = this.host.player.y + Phaser.Math.Between(-40, 40);
      this.host.createDangerCircle(targetX, targetY, this.phase >= 2 ? 105 : 82, 920, this.damage * 1.38, 0xff693f);
      this.setBossAlpha(0.16);
      this.scene.time.delayedCall(910, () => {
        if (!this.active) return;
        this.setPosition(targetX, targetY);
        this.setBossAlpha(1);
        for (let i = 0; i < (this.phase >= 2 ? 10 : 7); i += 1) {
          const angle = i * Math.PI * 2 / (this.phase >= 2 ? 10 : 7);
          this.host.fireEnemyProjectile(this.x, this.y, this.x + Math.cos(angle) * 90, this.y + Math.sin(angle) * 90, { texture: 'projectile-fireball', speed: 270, damage: this.damage * 0.65, scale: 0.82 });
        }
      });
      this.recoverUntil = time + 1850;
    }
    this.scheduleNextAttack(time, [1, 1.25, 1, 1, 1.25][choice]);
  }

  private beastAttack(time: number, direction: Phaser.Math.Vector2): void {
    const player = this.host.player;
    const attacks = this.phase === 1 ? 5 : 8;
    const choice = this.attackIndex % attacks;
    if (choice === 0) {
      this.announceAttack('Rotten Fire Breath', 0x75e76a);
      this.host.createDangerCone(this.x, this.y, direction.angle(), 430, 0.9, 900, this.damage * 1.25, 0x75e76a);
      this.scene.time.delayedCall(900, () => this.active && this.host.createFireCone(this.x, this.y, direction.angle(), 430, 0.9, this.damage * 1.35));
      this.recoverUntil = time + 2350;
    } else if (choice === 1) {
      this.announceAttack('Bone Storm', 0xe7dfbb);
      const count = this.phase === 3 ? 22 : 16;
      for (let i = 0; i < count; i += 1) {
        if (i % 7 === 0) continue;
        const angle = i * Math.PI * 2 / count + this.attackIndex * 0.19;
        this.host.fireEnemyProjectile(this.x, this.y, this.x + Math.cos(angle) * 100, this.y + Math.sin(angle) * 100, { texture: 'projectile-rock', speed: 235 + (i % 3) * 18, damage: this.damage * 0.62, scale: 0.92 });
      }
      this.host.playSfx('bone', 0.7); this.recoverUntil = time + 1650;
    } else if (choice === 2) {
      this.announceAttack('Tail Sweep', 0x9bd66f);
      this.host.createDangerRing(this.x, this.y, 175, 58, 780, this.damage * 1.18, 0x78bd62);
      this.recoverUntil = time + 1550;
    } else if (choice === 3) {
      this.announceAttack('Death Grab', 0xc4df8b);
      this.host.createDangerCone(this.x, this.y, direction.angle(), 205, 0.82, 920, this.damage * 1.5, 0xb7d875);
      this.scene.time.delayedCall(940, () => this.active && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 215 && this.host.pushPlayerFrom(this.x, this.y, 150));
      this.recoverUntil = time + 1900;
    } else if (choice === 4) {
      this.announceAttack('Raise the Fallen', 0xa984d4);
      for (let i = 0; i < 4; i += 1) this.host.spawnEnemy(i === 3 ? 'skeleton' : 'zombie', this.x + Math.cos(i * 1.57) * 135, this.y + Math.sin(i * 1.57) * 135);
      this.recoverUntil = time + 1750;
    } else if (choice === 5) {
      this.announceAttack('Corrupted Meteors', 0x9a73cf);
      const count = this.phase === 3 ? 7 : 5;
      for (let i = 0; i < count; i += 1) { const angle = i * 2.4; this.host.createDangerCircle(player.x + Math.cos(angle) * (105 + i * 18), player.y + Math.sin(angle) * (85 + i * 14), 58, 900 + i * 130, this.damage, 0x64d35f); }
      this.recoverUntil = time + 2500;
    } else if (choice === 6) {
      this.announceAttack('Corruption Eruption', 0x69ce62);
      for (let lane = -2; lane <= 2; lane += 1) for (let step = 1; step <= 4; step += 1) if ((lane + step) % 3 !== 0) this.host.createDangerCircle(this.x + direction.x * step * 82 - direction.y * lane * 68, this.y + direction.y * step * 82 + direction.x * lane * 68, 34, 760 + step * 95, this.damage * 0.72, 0x69ce62);
      this.recoverUntil = time + 2100;
    } else {
      this.announceAttack('Rotting Charge', 0x9be16e); this.telegraphCharge(direction, 720, this.phase === 3 ? 690 : 570, 850);
    }
    this.scheduleNextAttack(time, [1.2, 1.05, 1, 1.2, 1.45, 1.55, 1.35, 1.25][choice]);
    if (choice !== 7 && time >= this.nextPressureDashAt) this.queuePressureDash(time, 620, this.phase === 3 ? 940 : 820, false);
  }

  private vampireAttack(time: number, direction: Phaser.Math.Vector2, distance: number): void {
    const choice = this.attackIndex % 5;
    const player = this.host.player;
    if (choice === 0) {
      this.announceAttack('Crimson Miststep', 0xe15b8b);
      this.setBossAlpha(0.12);
      this.host.playSfx('teleport', 0.62);
      const token = this.generation;
      this.scene.time.delayedCall(360, () => {
        if (!this.active || this.generation !== token) return;
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.setPosition(player.x + Math.cos(angle) * 155, player.y + Math.sin(angle) * 155);
        this.setBossAlpha(1);
        this.host.burst(this.x, this.y, 0xd44773, 16, 130);
      });
      this.recoverUntil = time + 900;
    } else if (choice === 1) {
      this.announceAttack('Bloodstar Fan', 0xff668e);
      this.host.fireEnemyProjectile(this.x, this.y, player.x, player.y, {
        texture: 'projectile-blood', speed: 245, damage: this.damage, spread: 0.18, count: 5, scale: 0.8,
      });
      this.recoverUntil = time + 850;
    } else if (choice === 2) {
      this.announceAttack('Nightwing Brood', 0xa36dda);
      for (let i = 0; i < 3; i += 1) this.host.spawnEnemy('bat', this.x + Phaser.Math.Between(-35, 35), this.y + Phaser.Math.Between(-35, 35));
      this.recoverUntil = time + 1050;
    } else if (choice === 3 && distance < 190) {
      this.announceAttack('Sanguine Drain', 0xe43f68);
      this.host.createDangerCircle(player.x, player.y, 78, 760, this.damage * 1.15, 0xbd3d68);
      const token = this.generation;
      this.scene.time.delayedCall(780, () => {
        if (!this.active || this.generation !== token) return;
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.025);
        this.host.bossHealthChanged(this);
      });
      this.recoverUntil = time + 1450;
    } else {
      this.announceAttack('Batwing Lunge', 0xb773dd);
      this.telegraphCharge(direction, 410, 510);
    }
    this.scheduleNextAttack(time, [0.9, 0.9, 1.15, 1.2, 1][choice]);
  }

  private darkMageAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % 5;
    const player = this.host.player;
    if (choice === 0) {
      this.announceAttack('Soul Lance Volley', 0xa98cff);
      this.host.fireEnemyProjectile(this.x, this.y - 24, player.x, player.y, {
        texture: 'projectile-blood', speed: 275, damage: this.damage * 0.82,
        spread: 0.16, count: this.phase >= 2 ? 7 : 5, scale: 1.15, tint: 0x8e68e8,
      });
      this.recoverUntil = time + 1050;
    } else if (choice === 1) {
      this.announceAttack('Bone Prison', 0xe6dfbd);
      for (let i = 0; i < 3; i += 1) {
        this.host.createDangerRing(player.x, player.y, 58 + i * 52, 18, 620 + i * 180, this.damage * 0.62, 0xded5b5);
      }
      this.recoverUntil = time + 1650;
    } else if (choice === 2) {
      this.announceAttack('Grave Portals', 0x7654d6);
      const count = this.phase >= 2 ? 4 : 3;
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count;
        this.host.spawnEnemy('skeleton', this.x + Math.cos(angle) * 120, this.y + Math.sin(angle) * 120, i === 0 && this.phase >= 2);
      }
      this.recoverUntil = time + 1800;
    } else if (choice === 3) {
      this.announceAttack('Doom Sigils', 0xc44fff);
      const count = this.phase >= 2 ? 6 : 4;
      for (let i = 0; i < count; i += 1) {
        const delay = 760 + i * 110;
        this.host.createDangerCircle(player.x + Phaser.Math.Between(-210, 210), player.y + Phaser.Math.Between(-150, 150), 58, delay, this.damage, 0x9e55d6);
      }
      this.recoverUntil = time + 1900;
    } else {
      this.announceAttack('Shadow Gate', 0x6f53b5);
      this.setBossAlpha(0.16);
      const token = this.generation;
      this.scene.time.delayedCall(420, () => {
        if (!this.active || this.generation !== token) return;
        this.setPosition(player.x - direction.x * 190, player.y - direction.y * 190);
        this.setBossAlpha(1);
        this.host.burst(this.x, this.y, 0x8f68dd, 22, 165);
        this.host.createDangerCone(this.x, this.y, direction.angle(), 245, 1.05, 520, this.damage * 1.25, 0x8f68dd);
      });
      this.recoverUntil = time + 1350;
    }
    this.scheduleNextAttack(time, [0.85, 1.05, 1.25, 1.15, 1][choice]);
  }

  private dragonAttack(time: number, direction: Phaser.Math.Vector2, distance: number): void {
    const player = this.host.player;
    type DragonAttack = 'fireball' | 'claw' | 'tail' | 'breath' | 'charge' | 'hurricane' | 'wildfire' | 'skyfall' | 'flameWall' | 'eruption' | 'hunting' | 'flameClaws' | 'meteor' | 'roar' | 'rush';
    const pool: DragonAttack[] = ['claw', 'charge', 'fireball', 'breath', 'hurricane', 'wildfire', 'tail'];
    if (this.phase >= 2) pool.push('charge', 'skyfall', 'flameWall', 'eruption', 'hunting', 'flameClaws', 'wildfire');
    if (this.phase >= 3) pool.push('meteor', 'roar', 'rush');
    if (this.phase === 3 && !this.ultimateUsed && this.hp / this.maxHp < 0.22 && time - this.lastInfernoAt > BOSS_SCALING.infernoCooldownMs) {
      this.ultimateUsed = true;
      this.lastInfernoAt = time;
      this.announceAttack('The End of the Forest', 0xff5b38);
      this.host.createInferno(this);
      this.nextAttackAt = time + BOSS_SCALING.infernoRecoveryMs;
      this.recoverUntil = this.nextAttackAt;
      return;
    }
    const attack = pool[this.attackIndex % pool.length];
    if (attack === 'fireball') {
      this.announceAttack('Elder Fireballs', 0xff8d52);
      this.host.fireEnemyProjectile(this.x, this.y - 15, player.x, player.y, {
        texture: 'projectile-fireball', speed: 255 + this.phase * 20, damage: this.damage,
        spread: 0.15, count: this.phase === 3 ? 11 : this.phase === 2 ? 8 : 6, scale: 1.15,
      });
      this.host.playSfx('fire', 0.65);
      this.recoverUntil = time + 900;
    } else if (attack === 'claw') {
      this.performMelee(time, direction); return;
    } else if (attack === 'tail') {
      this.announceAttack('Spiked Tail Sweep', 0xffad62);
      this.host.createDangerCircle(this.x, this.y, 175, 820, this.damage * 1.1, 0xffa058);
      this.recoverUntil = time + 1550;
    } else if (attack === 'breath') {
      this.announceAttack('Forestfire Breath', 0xff7145);
      this.host.createFireCone(this.x, this.y, direction.angle(), 380, 0.82, this.damage * 1.35);
      this.recoverUntil = time + 1900;
    } else if (attack === 'charge') {
      this.announceAttack('Dragon Charge', 0xffc06b);
      this.host.createDangerLine(this.x, this.y, direction.angle(), 720, 105, 850, this.damage * 1.35, 0xff9c52);
      this.telegraphCharge(direction, 850, 650, 950, true);
    } else if (attack === 'meteor') {
      this.announceAttack('Ancient Meteors', 0xff5f3d);
      const count = this.phase === 3 ? 9 : 6;
      for (let i = 0; i < count; i += 1) {
        this.scene.time.delayedCall(i * 190, () => {
          const px = player.x + Phaser.Math.Between(-210, 210);
          const py = player.y + Phaser.Math.Between(-150, 150);
          this.host.createDangerCircle(px, py, 70, 950, this.damage, 0xff663d);
        });
      }
      this.recoverUntil = time + 2400;
    } else if (attack === 'hurricane') {
      this.announceAttack('Wing Hurricane', 0xb9e5ce);
      for (let i = -2; i <= 2; i += 1) if (i !== 0) this.host.createMovingHazard(this.x, this.y, direction.clone().rotate(i * 0.28).scale(90), this.damage * 0.65);
      if (distance < 260) this.host.pushPlayerFrom(this.x, this.y, 90);
      this.recoverUntil = time + 1500;
    } else if (attack === 'wildfire') {
      this.announceAttack('All-Realm Flame Barrage', 0xff4f2f);
      this.host.playSfx('fire', 0.86);
      const gap = this.attackIndex % 4;
      for (let row = -2; row <= 2; row += 1) {
        for (let column = -3; column <= 3; column += 1) {
          if ((column + row + 12) % 4 === gap || (Math.abs(column) <= 1 && row === 0)) continue;
          const x = player.x + column * 105;
          const y = player.y + row * 88;
          this.host.createDangerCircle(x, y, 43, 1050 + (Math.abs(row) + Math.abs(column)) * 45, this.damage * 0.72, 0xff4f2f);
        }
      }
      this.host.floatingText(player.x, player.y - 95, 'FOLLOW THE OPEN FLAME LANE!', '#fff0a8', true);
      this.recoverUntil = time + 2450;
    } else if (attack === 'skyfall') {
      this.announceAttack('Skyfall', 0xffbd73);
      const x = player.x + Phaser.Math.Between(-55, 55); const y = player.y + Phaser.Math.Between(-55, 55);
      this.host.createDangerCircle(x, y, this.phase === 3 ? 125 : 105, 1200, this.damage * 1.48, 0xff7848);
      this.setBossAlpha(0.12); this.scene.time.delayedCall(1180, () => { if (!this.active) return; this.setPosition(x, y); this.setBossAlpha(1); this.host.burst(x, y, 0xff8b50, 36, 240); this.scene.cameras.main.shake(300, 0.012); });
      this.recoverUntil = time + 2600;
    } else if (attack === 'flameWall') {
      this.announceAttack('Flame Wall', 0xff6740);
      const angle = direction.angle() + Math.PI / 2;
      for (let lane = -3; lane <= 3; lane += 1) if (lane !== ((this.attackIndex % 3) - 1)) this.host.createDangerLine(player.x + Math.cos(angle) * lane * 95, player.y + Math.sin(angle) * lane * 95, direction.angle(), 520, 44, 1050, this.damage * 0.82, 0xff5d38);
      this.recoverUntil = time + 2300;
    } else if (attack === 'eruption') {
      this.announceAttack('Volcanic Eruption', 0xff7a39);
      for (let i = 0; i < 8; i += 1) { const angle = i * Math.PI / 4; this.host.createDangerCircle(this.x + Math.cos(angle) * (120 + (i % 2) * 95), this.y + Math.sin(angle) * (120 + (i % 2) * 95), 45, 980 + (i % 2) * 260, this.damage, 0xff733c); }
      this.recoverUntil = time + 2400;
    } else if (attack === 'hunting') {
      this.announceAttack('Hunting Fireball', 0xff9c48);
      this.host.createMovingHazard(this.x, this.y, direction.clone().scale(72), this.damage * 1.12);
      this.recoverUntil = time + 1500;
    } else if (attack === 'flameClaws') {
      this.announceAttack('Flame Claws', 0xff663d); this.attackBuffUntil = time + 6200;
      this.host.createDangerCone(this.x, this.y, direction.angle(), 220, 1.5, 720, this.damage * 1.25, 0xff663d);
      this.recoverUntil = time + 1550;
    } else if (attack === 'roar') {
      this.announceAttack('Dragon Roar', 0xffd18a); this.host.playSfx('dragon-roar', 0.88);
      for (let i = 1; i <= 3; i += 1) this.host.createDangerRing(this.x, this.y, 75 + i * 65, 20, 450 + i * 180, this.damage * 0.34, 0xffa45c);
      this.scene.time.delayedCall(700, () => this.active && this.host.pushPlayerFrom(this.x, this.y, 125)); this.recoverUntil = time + 1700;
    } else {
      this.announceAttack('Dragon Rush Combo', 0xff5937);
      this.host.createDangerLine(this.x, this.y, direction.angle(), 680, 92, 760, this.damage * 1.2, 0xff5937);
      this.telegraphCharge(direction, 760, 720, 1100, true);
      this.scene.time.delayedCall(1600, () => this.active && this.host.fireEnemyProjectile(this.x, this.y, player.x, player.y, { texture: 'projectile-fireball', speed: 330, damage: this.damage, spread: 0.2, count: 3, scale: 1.1 }));
    }
    const cadenceMultiplier: Record<DragonAttack, number> = {
      fireball: 0.9, claw: 0.75, tail: 1, breath: 1.2, charge: 0.78, hurricane: 1.1, wildfire: 1.35,
      skyfall: 1.55, flameWall: 1.35, eruption: 1.45, hunting: 1.05, flameClaws: 1.2, meteor: 1.7, roar: 1.25, rush: 1.65,
    };
    this.scheduleNextAttack(time, cadenceMultiplier[attack]);
    if (!['charge', 'rush', 'skyfall'].includes(attack) && time >= this.nextPressureDashAt) {
      this.queuePressureDash(time, 480, this.phase >= 2 ? 1080 : 940, true);
    }
  }

  private queuePressureDash(time: number, delayMs: number, speed: number, fireTrail: boolean): void {
    const token = this.generation;
    this.nextPressureDashAt = time + (this.kind === 'dragon' ? 1450 : 1850);
    this.scene.time.delayedCall(delayMs, () => {
      if (!this.active || this.dying || this.generation !== token || this.scene.time.now < this.chargeUntil) return;
      const direction = new Phaser.Math.Vector2(this.host.player.x - this.x, this.host.player.y - this.y).normalize();
      this.announceAttack(this.kind === 'dragon' ? 'Relentless Dragon Dash' : 'Undead Predator Dash', this.kind === 'dragon' ? 0xffa05a : 0x8fe76d);
      this.host.createDangerLine(this.x, this.y, direction.angle(), 690, this.kind === 'dragon' ? 96 : 82, 430, this.damage * 1.1, this.kind === 'dragon' ? 0xff7845 : 0x75d568);
      this.telegraphCharge(direction, 430, speed, 360, fireTrail);
    });
  }

  private scheduleNextAttack(time: number, multiplier = 1): void {
    const tuning = BOSS_BALANCE[this.kind];
    const cadence = this.phase >= 2 ? tuning.enragedCadence : tuning.cadence;
    const minimum = this.kind === 'ancientBeast' ? 750 : this.kind === 'dragon' ? (this.phase < 3 ? 650 : 750) : 750;
    this.nextAttackAt = time + Math.max(minimum, cadence * multiplier * BOSS_SCALING.skillCooldownMultiplier);
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
    const duration = /inferno|meteor|breath|pounce|dive|charge|earth|cyclone/i.test(name) ? 1250 : 820;
    this.visual.playAttack(name, duration);
    this.host.floatingText(this.x, this.y - 50, name.toUpperCase(), `#${color.toString(16).padStart(6, '0')}`, false);
  }

  private setBossAlpha(alpha: number): void {
    this.visualAlpha = Phaser.Math.Clamp(alpha, 0, 1);
    this.visual.setAlpha(this.visualAlpha);
  }

  private restoreBossTint(): void {
    if (this.kind === 'dragon' && this.phase === 3) this.setTint(0xff805a);
    else if (this.kind === 'ancientBeast') this.setTint(0x72d36f);
    else if (this.kind === 'rooster' && this.phase >= 2) this.setTint(0xff7566);
    else if (this.kind === 'minotaur' && this.phase >= 2) this.setTint(0xff7659);
    else if (this.kind === 'werewolf' && this.phase >= 2) this.setTint(0xb99cff);
    else if (this.kind === 'wyvern' && this.phase >= 2) this.setTint(0xff9a67);
    else if (this.kind === 'troll' && this.phase >= 2) this.setTint(0xa4d768);
    else if (this.kind === 'darkMage' && this.phase >= 2) this.setTint(0xb38cff);
    else this.clearTint();
  }

  private telegraphCharge(direction: Phaser.Math.Vector2, warningMs: number, speed: number, recoveryMs = 520, fireTrail = false): void {
    const token = this.generation;
    this.chargeWindupUntil = this.scene.time.now + warningMs;
    this.setTint(0xffd071).setVelocity(0);
    this.host.playSfx('boss-charge', 0.54);
    this.host.burst(this.x, this.y, 0xffd071, 12, 90);
    this.scene.time.delayedCall(warningMs, () => {
      if (!this.active || this.generation !== token || this.dying) return;
      this.chargeWindupUntil = 0;
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
