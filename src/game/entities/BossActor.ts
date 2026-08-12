import Phaser from 'phaser';
import type { BossKind, DamageOptions, EnemyKind } from '../types';
import type { Player } from './Player';

export interface BossHost {
  player: Player;
  wave: number;
  spawnEnemy(kind: EnemyKind, x?: number, y?: number, forcedElite?: boolean): unknown;
  fireEnemyProjectile(x: number, y: number, targetX: number, targetY: number, options?: {
    texture?: string; speed?: number; damage?: number; spread?: number; count?: number; scale?: number;
  }): void;
  createDangerCircle(x: number, y: number, radius: number, delay: number, damage: number, color?: number): void;
  createDangerLine(x: number, y: number, angle: number, length: number, width: number, delay: number, damage: number, color?: number): void;
  createFireCone(x: number, y: number, angle: number, range: number, spread: number, damage: number): void;
  createMovingHazard(x: number, y: number, velocity: Phaser.Math.Vector2, damage: number): void;
  createInferno(boss: BossActor): void;
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
  troll: 'Grumhild, Moss Troll',
  werewolf: 'Fenris, Moonfang',
  snake: 'Ssyrak, the Giant Coil',
  minotaur: 'Korvax, Horn of Ruin',
  wyvern: 'Ashwing Wyvern',
  ancientBeast: 'Ancient Beast — Zombie Dragon',
  dragon: 'Ancient Forest Dragon',
};

const BOSS_TEXTURE: Record<BossKind, string> = {
  golem: 'boss-golem', vampire: 'boss-vampire', troll: 'boss-golem', werewolf: 'enemy-wolf',
  snake: 'boss-snake', minotaur: 'boss-minotaur', wyvern: 'boss-dragon', ancientBeast: 'boss-dragon', dragon: 'boss-dragon',
};

export class BossActor extends Phaser.Physics.Arcade.Sprite {
  kind: BossKind = 'golem';
  displayName = BOSS_NAMES.golem;
  maxHp = 1;
  hp = 1;
  damage = 20;
  phase = 1;
  generation = 0;
  private host!: BossHost;
  private nextAttackAt = 0;
  private attackIndex = 0;
  private chargeUntil = 0;
  private chargeVelocity = new Phaser.Math.Vector2();
  private lastInfernoAt = -100_000;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'boss-golem');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.disableBody(true, true);
  }

  spawn(host: BossHost, kind: BossKind, x: number, y: number, wave: number): this {
    this.host = host;
    this.kind = kind;
    this.displayName = BOSS_NAMES[kind];
    this.phase = 1;
    this.generation += 1;
    const scale = kind === 'dragon' ? 4.45 : kind === 'ancientBeast' ? 3.7 : kind === 'wyvern' ? 2.85 : kind === 'werewolf' ? 3.2 : 2.55;
    const baseHp: Record<BossKind, number> = { golem: 680, vampire: 620, troll: 920, werewolf: 1120, snake: 1450, minotaur: 1750, wyvern: 2350, ancientBeast: 5400, dragon: 12_500 };
    this.maxHp = Math.round(baseHp[kind] * (kind === 'dragon' || kind === 'ancientBeast' ? 1 : 1 + wave * 0.18));
    this.hp = this.maxHp;
    this.damage = Math.round((kind === 'dragon' ? 31 : kind === 'ancientBeast' ? 26 : 17) * (1 + wave * 0.04));
    this.nextAttackAt = this.scene.time.now + (kind === 'dragon' ? 2200 : 1600);
    this.attackIndex = 0;
    this.chargeUntil = 0;
    this.lastInfernoAt = -100_000;
    this.enableBody(true, x, y, true, true);
    this.setTexture(BOSS_TEXTURE[kind]).setScale(scale).setAlpha(1).setAngle(0).setTint(kind === 'ancientBeast' ? 0x7acb76 : kind === 'wyvern' ? 0xca8564 : 0xffffff).setDepth(y + 30);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const radius = kind === 'dragon' || kind === 'ancientBeast' ? 25 : 17;
    body.setCircle(radius, Math.max(0, this.width / 2 - radius), Math.max(0, this.height / 2 - radius));
    body.setVelocity(0).setEnable(true);
    this.host.bossHealthChanged(this);
    return this;
  }

  updateBoss(time: number): void {
    if (!this.active || !this.host.player.active) return;
    this.updatePhase();
    const player = this.host.player;
    const toPlayer = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y);
    const distance = Math.max(1, toPlayer.length());
    toPlayer.scale(1 / distance);

    if (time < this.chargeUntil) {
      this.setVelocity(this.chargeVelocity.x, this.chargeVelocity.y);
    } else {
      const speed = (this.kind === 'dragon' ? 68 + this.phase * 10 : this.kind === 'ancientBeast' ? 55 + this.phase * 10 : this.kind === 'werewolf' ? 118 : this.kind === 'wyvern' ? 92 : this.kind === 'vampire' ? 88 : 58) * (1 + this.host.wave * 0.008);
      if (distance > (this.kind === 'dragon' ? 155 : 95)) this.setVelocity(toPlayer.x * speed, toPlayer.y * speed);
      else this.setVelocity(-toPlayer.y * speed * 0.25, toPlayer.x * speed * 0.25);
      if (time >= this.nextAttackAt) this.performAttack(time, toPlayer, distance);
    }
    this.setFlipX(this.body instanceof Phaser.Physics.Arcade.Body && this.body.velocity.x < 0);
    this.setDepth(this.y + 30);
  }

  takeDamage(amount: number, options: DamageOptions = {}): boolean {
    if (!this.active || this.hp <= 0) return false;
    const adjusted = this.kind === 'dragon' ? amount * 0.82 : this.kind === 'ancientBeast' ? amount * 0.88 : amount;
    this.hp -= adjusted;
    this.setTintFill(0xffffff);
    const token = this.generation;
    this.scene.time.delayedCall(65, () => {
      if (this.active && this.generation === token) this.setTint(this.kind === 'dragon' && this.phase === 4 ? 0xff6545 : this.kind === 'ancientBeast' ? 0x72d36f : 0xffffff);
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
      this.host.bossDied(this);
      return true;
    }
    return false;
  }

  retire(): void {
    this.disableBody(true, true);
    this.clearTint().setVelocity(0);
  }

  private updatePhase(): void {
    if (this.kind !== 'dragon' && this.kind !== 'ancientBeast') return;
    const ratio = this.hp / this.maxHp;
    const nextPhase = this.kind === 'ancientBeast'
      ? (ratio > 0.7 ? 1 : ratio > 0.4 ? 2 : 3)
      : (ratio > 0.75 ? 1 : ratio > 0.5 ? 2 : ratio > 0.25 ? 3 : 4);
    if (nextPhase !== this.phase) {
      this.phase = nextPhase;
      this.host.burst(this.x, this.y, this.kind === 'ancientBeast' ? 0x69e06c : this.phase === 4 ? 0xff5e3d : 0xffaa5e, 32, 190);
      this.scene.cameras.main.shake(360, 0.009);
      if (this.phase === 4) this.setTint(0xff805a);
      this.host.bossHealthChanged(this);
    }
  }

  private performAttack(time: number, direction: Phaser.Math.Vector2, distance: number): void {
    this.attackIndex += 1;
    if (this.kind === 'golem' || this.kind === 'troll') this.golemAttack(time, direction);
    else if (this.kind === 'vampire') this.vampireAttack(time, direction, distance);
    else if (this.kind === 'werewolf') this.werewolfAttack(time, direction);
    else if (this.kind === 'snake') this.snakeAttack(time, direction);
    else if (this.kind === 'minotaur') this.minotaurAttack(time, direction);
    else if (this.kind === 'wyvern') this.wyvernAttack(time, direction);
    else if (this.kind === 'ancientBeast') this.beastAttack(time, direction);
    else this.dragonAttack(time, direction, distance);
  }

  private golemAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % (this.kind === 'troll' ? 4 : this.host.wave >= 8 ? 4 : 3);
    if (choice === 0) {
      this.host.createDangerCircle(this.x, this.y, this.kind === 'troll' ? 160 : 128, 850, this.damage * 1.25, 0xf3b85b);
      this.host.playSfx('slam', 0.7);
    } else if (choice === 1) {
      this.host.fireEnemyProjectile(this.x, this.y - 15, this.host.player.x, this.host.player.y, {
        texture: 'projectile-rock', speed: 275, damage: this.damage, scale: 1.15,
      });
      this.host.playSfx('rock', 0.58);
    } else if (choice === 2) {
      this.telegraphCharge(direction, 720, 370);
    } else {
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8;
        this.host.fireEnemyProjectile(this.x, this.y, this.x + Math.cos(angle) * 100, this.y + Math.sin(angle) * 100, {
          texture: 'projectile-rock', speed: 225, damage: this.damage * 0.72, scale: 0.74,
        });
      }
    }
    this.nextAttackAt = time + Math.max(1900, 3300 - this.host.wave * 32);
  }

  private werewolfAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % 4;
    if (choice === 0) this.host.createDangerCircle(this.x, this.y, 112, 430, this.damage * 1.15, 0xd75a68);
    else if (choice === 1) this.telegraphCharge(direction, 420, 650);
    else if (choice === 2) { this.host.playSfx('wolf', 0.8); this.host.burst(this.x, this.y, 0xd9d3ff, 24, 160); this.chargeUntil = time + 900; this.chargeVelocity.copy(direction).scale(390); }
    else { this.setAlpha(0.18); this.scene.time.delayedCall(240, () => this.active && this.setPosition(this.host.player.x - direction.x * 105, this.host.player.y - direction.y * 105).setAlpha(1)); }
    this.nextAttackAt = time + (this.hp / this.maxHp < 0.45 ? 1200 : 1850);
  }

  private snakeAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % 4;
    if (choice === 0) this.host.fireEnemyProjectile(this.x, this.y, this.host.player.x, this.host.player.y, { texture: 'projectile-blood', speed: 235, damage: this.damage, spread: 0.16, count: 3, scale: 0.9 });
    else if (choice === 1) this.host.createDangerCircle(this.x, this.y, 170, 700, this.damage * 1.2, 0x9bd466);
    else if (choice === 2) { this.setAlpha(0.12); this.host.createDangerLine(this.x, this.y, direction.angle(), 450, 65, 900, this.damage * 1.25, 0x79c86a); this.scene.time.delayedCall(900, () => this.active && this.setPosition(this.host.player.x + Phaser.Math.Between(-80, 80), this.host.player.y + Phaser.Math.Between(-80, 80)).setAlpha(1)); }
    else this.host.createDangerCircle(this.host.player.x, this.host.player.y, 92, 620, this.damage * 1.3, 0x6fb957);
    this.nextAttackAt = time + 1900;
  }

  private minotaurAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % 4;
    if (choice === 0) { this.host.createDangerLine(this.x, this.y, direction.angle(), 620, 92, 900, this.damage * 1.4, 0xffa253); this.telegraphCharge(direction, 900, 720); }
    else if (choice === 1) this.host.createFireCone(this.x, this.y, direction.angle(), 220, 1.4, this.damage * 1.25);
    else if (choice === 2) this.host.createDangerCircle(this.x, this.y, 185, 620, this.damage * 1.2, 0xffb15c);
    else { this.host.burst(this.x, this.y, 0xff6c43, 28, 190); this.telegraphCharge(direction, 350, 620); }
    this.nextAttackAt = time + 2200;
  }

  private wyvernAttack(time: number, direction: Phaser.Math.Vector2): void {
    const choice = this.attackIndex % 5;
    if (choice === 0) this.host.fireEnemyProjectile(this.x, this.y, this.host.player.x, this.host.player.y, { texture: 'projectile-fireball', speed: 285, damage: this.damage, spread: 0.18, count: 5, scale: 1.05 });
    else if (choice === 1) this.telegraphCharge(direction, 500, 720);
    else if (choice === 2) this.host.createDangerLine(this.x, this.y, direction.angle(), 520, 74, 780, this.damage * 1.25, 0xff7948);
    else if (choice === 3) this.host.createMovingHazard(this.x, this.y, direction.clone().rotate(0.6).scale(105), this.damage * 0.7);
    else for (let i = 0; i < (this.hp / this.maxHp < 0.35 ? 7 : 4); i += 1) this.host.createDangerCircle(this.host.player.x + Phaser.Math.Between(-190, 190), this.host.player.y + Phaser.Math.Between(-150, 150), 55, 760 + i * 80, this.damage, 0xff693f);
    this.nextAttackAt = time + 1650;
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

  private telegraphCharge(direction: Phaser.Math.Vector2, warningMs: number, speed: number): void {
    const token = this.generation;
    this.setTint(0xffd071).setVelocity(0);
    this.host.playSfx('boss-charge', 0.54);
    this.host.burst(this.x, this.y, 0xffd071, 12, 90);
    this.scene.time.delayedCall(warningMs, () => {
      if (!this.active || this.generation !== token) return;
      this.clearTint();
      this.chargeVelocity.copy(direction).scale(speed);
      this.chargeUntil = this.scene.time.now + 720;
      this.scene.cameras.main.shake(160, 0.005);
    });
  }
}
