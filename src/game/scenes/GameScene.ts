import Phaser from 'phaser';
import { AudioManager, type MusicKey, type SfxKey } from '../audio/AudioManager';
import { AbilitySystem, type Foe } from '../abilities/AbilitySystem';
import { getWaveEnemyWeights } from '../content/definitions';
import { COMBAT, ENEMY_BALANCE, SPAWN_BALANCE, WAVE_TUNING, WAVES, WORLD_SIZE } from '../config/balance';
import { SaveManager } from '../core/SaveManager';
import { BossActor, type BossHost } from '../entities/BossActor';
import { EnemyActor, type EnemyHost } from '../entities/EnemyActor';
import { Player, type PlayerHost } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { ExperienceSystem, type ExperienceHost } from '../systems/ExperienceSystem';
import { LootSystem, type LootHost } from '../systems/LootSystem';
import type { AbilityId, BossKind, EnemyKind, Faction, PickupKind, RunStats, UpgradeChoice } from '../types';
import { HUD } from '../ui/HUD';
import { makeAbilityUpgradeChoice, OverlayManager, type OverlayHost } from '../ui/OverlayManager';
import { ForestGenerator, type ForestWorld } from '../world/ForestGenerator';

const PLAYER_PROJECTILE_CAPS: Partial<Record<AbilityId, number>> = {
  bolt: 36,
  shuriken: 44,
  arrow: 42,
  iceStorm: 34,
};

interface Hazard extends Phaser.GameObjects.Container {
  kind: 'poison' | 'blackHole' | 'tornado' | 'burning';
  owner: Faction;
  source: AbilityId | 'enemyPoison' | 'bossFire' | 'bossWind';
  radius: number;
  damage: number;
  expiresAt: number;
  nextTickAt: number;
  velocityX: number;
  velocityY: number;
}

interface PickupDebugState {
  scene: string;
  player: { x: number; y: number; hp: number; maxHp: number; dashing: boolean; movementModifier: number };
  wave: number;
  enemies: number;
  enemyKinds: EnemyKind[];
  bosses: number;
  boss: { kind: BossKind; x: number; y: number; distanceToPlayer: number; phase: number; hp: number; maxHp: number; lastAttack: string; attacksUsed: string[]; specialState: string } | null;
  hazards: { total: number; player: number; enemy: number };
  projectiles: { player: number; enemy: number };
  level: number;
  xp: number;
  abilities: string[];
  fps: number;
  paused: boolean;
  waveElapsed: number;
  waveEnemyCap: number;
  rangedAttackers: number;
  activeWarnings: number;
}

declare global {
  interface Window {
    __GLIMMERGROVE_STATE__?: () => PickupDebugState;
  }
}

export class GameScene extends Phaser.Scene implements PlayerHost, EnemyHost, BossHost, ExperienceHost, LootHost, OverlayHost {
  player!: Player;
  wave = 1;
  private audio!: AudioManager;
  private worldData!: ForestWorld;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bosses!: Phaser.Physics.Arcade.Group;
  private playerProjectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private xpSystem!: ExperienceSystem;
  private lootSystem!: LootSystem;
  private abilities!: AbilitySystem;
  private hud!: HUD;
  private overlays!: OverlayManager;
  private hazards: Hazard[] = [];
  private run: RunStats = { wave: 1, elapsedMs: 0, kills: 0, level: 1, xp: 0, xpRequired: 24, damageDealt: 0, bossesDefeated: 0 };
  private runStartedAt = 0;
  private pausedDuration = 0;
  private pauseStartedAt = 0;
  private isSimulationPaused = false;
  private isRunEnded = false;
  private isLeveling = false;
  private waveStartedAt = 0;
  private nextSpawnAt = 0;
  private minibossSpawned = false;
  private minibossDefeated = false;
  private transitionAt = 0;
  private currentBoss: BossActor | null = null;
  private lastMinibossKind: BossKind | null = null;
  private spawnSerial = 0;
  private nextDebugWriteAt = 0;
  private corruptionOverlay: Phaser.GameObjects.Rectangle | null = null;
  private activeWarnings = 0;
  private readonly rangedAttackLeases = new Map<number, number>();
  private readonly contactDamageReadyAt = new Map<string, number>();

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.resetState();
    this.audio = AudioManager.get(this);
    this.audio.setMusic('forest', { fadeMs: 850 });
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.worldData = new ForestGenerator(this, `run-${Date.now()}`).generate();
    this.createPools();
    this.player = new Player(this, WORLD_SIZE / 2, WORLD_SIZE / 2, this);
    this.xpSystem = new ExperienceSystem(this, this);
    this.lootSystem = new LootSystem(this, this);
    this.abilities = new AbilitySystem(this, this);
    this.hud = new HUD(this);
    this.onPlayerHealthChanged(this.player.stats.hp, this.player.stats.maxHp);
    this.onExperienceChanged(this.xpSystem.level, this.xpSystem.xp, this.xpSystem.required);
    this.overlays = new OverlayManager(this, this, this.audio);
    this.setupPhysics();
    this.setupCamera();
    this.startWave(1);
    this.runStartedAt = this.time.now;
    this.input.keyboard?.on('keydown-ESC', this.togglePause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    window.__GLIMMERGROVE_STATE__ = () => this.debugState();
    this.setupDevelopmentShortcuts();
  }

  update(time: number, delta: number): void {
    if (this.isSimulationPaused || this.isRunEnded) return;
    const safeDelta = Math.min(delta, 50);
    this.run.elapsedMs = Math.max(0, time - this.runStartedAt - this.pausedDuration);
    this.player.updatePlayer(time);
    for (const object of this.enemies.getChildren()) (object as EnemyActor).updateEnemy(time, safeDelta);
    for (const object of this.bosses.getChildren()) (object as BossActor).updateBoss(time);
    for (const object of this.playerProjectiles.getChildren()) (object as Projectile).updateProjectile(time, safeDelta);
    for (const object of this.enemyProjectiles.getChildren()) (object as Projectile).updateProjectile(time, safeDelta);
    this.xpSystem.update(time);
    this.abilities.update(time, safeDelta);
    this.updateHazards(time, safeDelta);
    this.updateWave(time);
    this.hud.setRun(this.wave, this.run.elapsedMs, this.run.kills);
    this.hud.setAbilities(this.abilities.getOwnedStates(time));
    this.hud.setBuffs(this.player.getActiveBuffs(), time);
    if (time >= this.nextDebugWriteAt) {
      this.nextDebugWriteAt = time + 250;
      this.game.canvas.dataset.gameState = JSON.stringify(this.debugState());
    }
  }

  onPlayerHealthChanged(hp: number, maxHp: number): void {
    this.hud?.setHealth(hp, maxHp);
  }

  onDashChanged(remainingMs: number): void {
    this.hud?.setDash(remainingMs);
  }

  spawnDashAfterimage(player: Player): void {
    const echo = this.add.sprite(player.x, player.y, 'girl', player.frame.name)
      .setScale(player.scaleX, player.scaleY)
      .setTint(0x72e6d2)
      .setAlpha(0.34)
      .setDepth(player.depth - 1);
    this.tweens.add({ targets: echo, alpha: 0, scaleX: player.scaleX * 0.84, scaleY: player.scaleY * 0.84, duration: 220, onComplete: () => echo.destroy() });
  }

  damagePlayer(amount: number): void {
    this.player.takeDamage(amount, this.time.now);
  }

  private damagePlayerFromContact(source: string, amount: number): void {
    const time = this.time.now;
    if ((this.contactDamageReadyAt.get(source) ?? 0) > time) return;
    this.contactDamageReadyAt.set(source, time + ENEMY_BALANCE.contactCooldownMs);
    this.damagePlayer(amount);
  }

  applyPlayerSlow(multiplier: number, duration: number): void {
    this.player.applyMovementSlow(multiplier, duration, this.time.now);
  }

  pushPlayerFrom(x: number, y: number, distance: number): void {
    const direction = new Phaser.Math.Vector2(this.player.x - x, this.player.y - y);
    if (direction.lengthSq() === 0) direction.set(1, 0);
    direction.normalize().scale(distance);
    this.player.setPosition(
      Phaser.Math.Clamp(this.player.x + direction.x, 32, WORLD_SIZE - 32),
      Phaser.Math.Clamp(this.player.y + direction.y, 32, WORLD_SIZE - 32),
    );
  }

  gameOver(): void {
    if (this.isRunEnded) return;
    this.isRunEnded = true;
    this.physics.pause();
    this.audio.crossfade('gameover', 850);
    SaveManager.recordRun({ wave: this.wave, kills: this.run.kills, elapsedMs: this.run.elapsedMs, level: this.xpSystem.level, damageDealt: this.run.damageDealt, victory: false });
    this.time.delayedCall(700, () => this.overlays.showEnd(false, this.endStats()));
  }

  playSfx(key: string, volume = 0.5): void {
    this.audio.playSfx(key as SfxKey, { volume });
  }

  burst(x: number, y: number, color: number, count: number, speed = 100): void {
    const capped = Math.min(36, count);
    for (let i = 0; i < capped; i += 1) {
      const particle = this.add.image(x, y, 'orb').setTint(color).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(Phaser.Math.FloatBetween(0.08, 0.24)).setAlpha(0.9).setDepth(10_000);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(speed * 0.25, speed);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(260, 620),
        ease: 'Quad.out',
        onComplete: () => particle.destroy(),
      });
    }
  }

  floatingText(x: number, y: number, text: string, color: string, large = false): void {
    const label = this.add.text(x, y, text, {
      fontFamily: 'Nunito, sans-serif', fontSize: large ? '17px' : '13px', fontStyle: 'bold', color,
      stroke: '#07120f', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20_000);
    this.tweens.add({ targets: label, y: y - (large ? 42 : 30), alpha: 0, duration: large ? 780 : 560, ease: 'Quad.out', onComplete: () => label.destroy() });
  }

  spawnEnemy(kind: EnemyKind, x?: number, y?: number, forcedElite = false): EnemyActor | null {
    const isSummon = x != null && y != null;
    const waveCap = WAVE_TUNING[this.wave]?.maxActiveEnemies ?? COMBAT.maxEnemies;
    const activeCap = isSummon ? Math.min(COMBAT.maxEnemies, Math.max(8, waveCap + 8)) : waveCap;
    if (this.enemies.countActive(true) >= activeCap) return null;
    const enemy = this.enemies.get(-100, -100) as EnemyActor | null;
    if (!enemy) return null;
    const position = isSummon ? new Phaser.Math.Vector2(x, y) : this.offscreenSpawnPoint();
    const minimumDistance = isSummon ? SPAWN_BALANCE.bossSummonMinimumDistance : SPAWN_BALANCE.minimumDistanceFromPlayer;
    const away = position.clone().subtract(new Phaser.Math.Vector2(this.player.x, this.player.y));
    if (away.lengthSq() < minimumDistance * minimumDistance) {
      if (away.lengthSq() < 1) away.setToPolar(Phaser.Math.FloatBetween(0, Math.PI * 2), minimumDistance);
      else away.setLength(minimumDistance);
      position.set(
        Phaser.Math.Clamp(this.player.x + away.x, 45, WORLD_SIZE - 45),
        Phaser.Math.Clamp(this.player.y + away.y, 45, WORLD_SIZE - 45),
      );
    }
    return enemy.spawn(this, kind, position.x, position.y, this.wave, forcedElite);
  }

  requestRangedAttack(enemy: EnemyActor): boolean {
    const time = this.time.now;
    for (const [enemyId, expiresAt] of this.rangedAttackLeases) {
      if (expiresAt <= time) this.rangedAttackLeases.delete(enemyId);
    }
    const rangedLimit = WAVE_TUNING[this.wave]?.maxRangedAttackers ?? ENEMY_BALANCE.maxRangedAttackers;
    if (this.rangedAttackLeases.has(enemy.enemyId) || this.rangedAttackLeases.size >= rangedLimit) return false;
    this.rangedAttackLeases.set(enemy.enemyId, time + ENEMY_BALANCE.rangedAttackLeaseMs);
    return true;
  }

  getEnemySeparation(enemy: EnemyActor): Phaser.Math.Vector2 {
    const push = new Phaser.Math.Vector2();
    let neighbors = 0;
    const radiusSq = ENEMY_BALANCE.separationRadius * ENEMY_BALANCE.separationRadius;
    for (const object of this.enemies.getChildren()) {
      const other = object as EnemyActor;
      if (!other.active || other === enemy) continue;
      const dx = enemy.x - other.x;
      const dy = enemy.y - other.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq <= 0 || distanceSq >= radiusSq) continue;
      const strength = 1 - Math.sqrt(distanceSq) / ENEMY_BALANCE.separationRadius;
      push.x += dx * strength;
      push.y += dy * strength;
      neighbors += 1;
      if (neighbors >= 8) break;
    }
    if (push.lengthSq() > 1) push.normalize();
    return push;
  }

  enemyDied(enemy: EnemyActor): void {
    if (!enemy.active) return;
    const x = enemy.x;
    const y = enemy.y;
    const elite = enemy.elite;
    const kind = enemy.kind;
    const color = enemy.elite ? 0xffdb75 : 0x88e6b1;
    const xp = enemy.xpValue;
    enemy.retire();
    this.run.kills += 1;
    this.xpSystem.spawn(x, y, xp, color);
    this.enemyDeathEffect(kind, x, y, elite);
    if (Math.random() < 0.012 || (elite && Math.random() < 0.09)) {
      this.lootSystem.spawn(x, y, Phaser.Utils.Array.GetRandom(['health', 'damage', 'speed', 'haste'] as PickupKind[]));
    }
    this.playSfx('death', elite ? 0.38 : 0.12);
  }

  private enemyDeathEffect(kind: EnemyKind, x: number, y: number, elite: boolean): void {
    const themes: Record<EnemyKind, { color: number; texture: string; pieces: number }> = {
      slime: { color: 0x56d6df, texture: 'orb', pieces: 7 },
      goblin: { color: 0xa4d768, texture: 'projectile-shuriken', pieces: 5 },
      bat: { color: 0x9d6cc9, texture: 'projectile-feather', pieces: 7 },
      skeleton: { color: 0xe1d9b9, texture: 'projectile-rock', pieces: 8 },
      wolf: { color: 0x8b91a5, texture: 'projectile-feather', pieces: 6 },
      spider: { color: 0xc479d6, texture: 'projectile-blood', pieces: 7 },
      zombie: { color: 0x789566, texture: 'projectile-rock', pieces: 6 },
      mushroom: { color: 0xd273a5, texture: 'orb', pieces: 9 },
      plant: { color: 0x70c95f, texture: 'projectile-feather', pieces: 8 },
      darkKnight: { color: 0x7e89ad, texture: 'projectile-rock', pieces: 7 },
      lizardman: { color: 0x95c764, texture: 'projectile-shuriken', pieces: 6 },
      witch: { color: 0xb77adb, texture: 'projectile-blood', pieces: 8 },
    };
    const theme = themes[kind];
    this.burst(x, y, theme.color, elite ? 15 : 8, elite ? 150 : 95);
    const count = Math.min(elite ? 12 : 8, theme.pieces + (elite ? 3 : 0));
    for (let i = 0; i < count; i += 1) {
      const fragment = this.add.image(x, y, theme.texture).setTint(theme.color).setScale(Phaser.Math.FloatBetween(0.18, 0.42)).setDepth(10_200);
      const angle = i / count * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const distance = Phaser.Math.Between(28, elite ? 100 : 68);
      this.tweens.add({ targets: fragment, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance + 22, angle: Phaser.Math.Between(-260, 260), alpha: 0, duration: Phaser.Math.Between(360, 680), ease: 'Quad.out', onComplete: () => fragment.destroy() });
    }
  }

  fireEnemyProjectile(x: number, y: number, targetX: number, targetY: number, options: {
    texture?: string; speed?: number; damage?: number; spread?: number; count?: number; scale?: number;
    tint?: number; rotate?: number; lifespan?: number;
  } = {}): void {
    const count = options.count ?? 1;
    const base = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    for (let i = 0; i < count; i += 1) {
      const projectile = this.enemyProjectiles.get(-100, -100) as Projectile | null;
      if (!projectile) continue;
      const offset = (i - (count - 1) / 2) * (options.spread ?? 0);
      const velocity = this.physics.velocityFromRotation(base + offset, options.speed ?? 240);
      projectile.launch({
        x, y, texture: options.texture ?? 'projectile-rock', owner: 'enemy', velocity,
        damage: options.damage ?? 10, lifespan: options.lifespan ?? 3400, scale: options.scale ?? 0.8,
        tint: options.tint, rotate: options.rotate, bodyRadius: 5,
      }, this.time.now);
    }
  }

  spawnBoss(kind: BossKind): BossActor | null {
    if (this.bosses.countActive(true) > 0) return null;
    const boss = this.bosses.get(-100, -100) as BossActor | null;
    if (!boss) return null;
    const position = this.offscreenSpawnPoint(kind === 'dragon' ? 680 : 560);
    this.currentBoss = boss.spawn(this, kind, position.x, position.y, this.wave);
    if (kind !== 'dragon' && kind !== 'ancientBeast') this.lastMinibossKind = kind;
    const ancient = kind === 'ancientBeast';
    this.hud.setBoss(boss.displayName, boss.hp, boss.maxHp, kind === 'dragon' || ancient ? boss.phase : undefined, ancient ? 'corrupted' : kind === 'dragon' ? 'fire' : 'normal');
    const subtitles: Partial<Record<BossKind, string>> = {
      rooster: 'THE WAR-CRY OF THE RED DAWN', troll: 'ROOT AND STONE AWAKEN', minotaur: 'THE LABYRINTH BREAKS FREE',
      werewolf: 'THE BLOOD MOON HUNTS', wyvern: 'WINGS IGNITE THE SKY',
    };
    this.showBossTitle(kind === 'dragon' ? 'ANCIENT FOREST DRAGON' : ancient ? 'ANCIENT BEAST' : boss.displayName, kind === 'dragon' ? 'THE FINAL FLAME AWAKENS' : ancient ? 'ROTTEN WINGS ECLIPSE THE GROVE' : subtitles[kind] ?? 'MINIBOSS');
    this.audio.crossfade(kind === 'dragon' || ancient ? 'dragon' : 'boss', 900);
    if (kind === 'dragon' || ancient) {
      this.playSfx('dragon-roar', 0.9);
      this.cameras.main.shake(900, 0.014);
      if (ancient) this.cameras.main.flash(500, 38, 92, 35);
    }
    return boss;
  }

  bossHealthChanged(boss: BossActor): void {
    if (this.currentBoss !== boss) return;
    this.hud.setBoss(boss.displayName, boss.hp, boss.maxHp, boss.kind === 'dragon' || boss.kind === 'ancientBeast' ? boss.phase : undefined, boss.kind === 'ancientBeast' ? 'corrupted' : boss.kind === 'dragon' ? 'fire' : 'normal');
  }

  bossDied(boss: BossActor): void {
    if (!boss.active) return;
    const x = boss.x;
    const y = boss.y;
    const isDragon = boss.kind === 'dragon';
    const isBeast = boss.kind === 'ancientBeast';
    boss.retire();
    this.currentBoss = null;
    this.run.bossesDefeated += 1;
    this.hud.hideBoss();
    this.burst(x, y, isDragon ? 0xffd46f : isBeast ? 0x63df70 : 0xb99cff, isDragon || isBeast ? 36 : 24, isDragon || isBeast ? 270 : 180);
    this.cameras.main.shake(isDragon || isBeast ? 1000 : 420, isDragon || isBeast ? 0.02 : 0.008);
    if (isDragon) {
      this.winRun(x, y);
    } else if (isBeast) {
      this.playSfx('dragon-roar', 0.68);
      this.player.heal(this.player.stats.maxHp);
      this.vacuumExperience();
      this.lootSystem.spawn(x - 42, y, 'health');
      this.lootSystem.spawn(x + 42, y, 'magnet');
      for (let i = 0; i < 16; i += 1) this.xpSystem.spawn(x + Phaser.Math.Between(-80, 80), y + Phaser.Math.Between(-60, 60), 20, 0x71e66f);
      this.abilities.upgrade('blackHole');
      this.cameras.main.flash(700, 62, 170, 70);
      this.showAncientPowerChoices();
    } else {
      this.minibossDefeated = true;
      this.transitionAt = this.time.now + WAVES.restDuration * 1000;
      this.lootSystem.spawnMinibossRewards(x, y);
      for (let i = 0; i < 8; i += 1) this.xpSystem.spawn(x + Phaser.Math.Between(-55, 55), y + Phaser.Math.Between(-45, 45), 14, 0xb99cff);
      this.audio.crossfade('forest', 700);
    }
  }

  getActiveFoes(): Foe[] {
    const result: Foe[] = [];
    for (const object of this.enemies.getChildren()) if ((object as EnemyActor).active) result.push(object as EnemyActor);
    for (const object of this.bosses.getChildren()) if ((object as BossActor).active) result.push(object as BossActor);
    return result;
  }

  findNearestFoe(x: number, y: number, maxDistance = Infinity): Foe | null {
    let best: Foe | null = null;
    let bestDistance = maxDistance * maxDistance;
    for (const foe of this.getActiveFoes()) {
      const distance = Phaser.Math.Distance.Squared(x, y, foe.x, foe.y);
      if (distance < bestDistance) { bestDistance = distance; best = foe; }
    }
    return best;
  }

  findDenseFoe(): Foe | null {
    const foes = this.getActiveFoes();
    if (foes.length === 0) return null;
    const candidates = foes.length > 45 ? Phaser.Utils.Array.Shuffle([...foes]).slice(0, 28) : foes;
    let best: Foe | null = null;
    let bestScore = -1;
    for (const candidate of candidates) {
      let score = 0;
      for (const other of foes) if (Phaser.Math.Distance.Squared(candidate.x, candidate.y, other.x, other.y) < 130 * 130) score += 1;
      if (score > bestScore) { bestScore = score; best = candidate; }
    }
    return best;
  }

  firePlayerProjectile(options: {
    x: number; y: number; targetX?: number; targetY?: number; angle?: number; texture: string; speed: number;
    damage: number; lifespan?: number; pierce?: number; scale?: number; tint?: number; critical?: boolean;
    ability: AbilityId; rotate?: number; bounce?: boolean;
  }): void {
    const abilityCap = PLAYER_PROJECTILE_CAPS[options.ability];
    if (abilityCap != null) {
      let activeForAbility = 0;
      for (const object of this.playerProjectiles.getChildren()) {
        const projectile = object as Projectile;
        if (projectile.active && projectile.ability === options.ability) activeForAbility += 1;
      }
      if (activeForAbility >= abilityCap) return;
    }
    const projectile = this.playerProjectiles.get(-100, -100) as Projectile | null;
    if (!projectile) return;
    const angle = options.angle ?? Phaser.Math.Angle.Between(options.x, options.y, options.targetX ?? options.x + 1, options.targetY ?? options.y);
    const velocity = this.physics.velocityFromRotation(angle, options.speed);
    projectile.launch({
      x: options.x, y: options.y, texture: options.texture, owner: 'player', velocity,
      damage: options.damage * this.player.stats.damageMultiplier * this.player.getBuffMultiplier('damage'),
      lifespan: options.lifespan, pierce: options.pierce, scale: options.scale, tint: options.tint,
      critical: options.critical, ability: options.ability, rotate: options.rotate, bounce: options.bounce,
    }, this.time.now);
  }

  dealDamage(foe: Foe, amount: number, ability: AbilityId, options: { tint?: number; canCrit?: boolean; knockback?: number } = {}): void {
    if (!foe.active) return;
    const critical = options.canCrit !== false && Math.random() < this.player.stats.critChance;
    const finalDamage = amount * this.player.stats.damageMultiplier * this.player.getBuffMultiplier('damage') * (critical ? this.player.stats.critMultiplier : 1);
    const direction = new Phaser.Math.Vector2(foe.x - this.player.x, foe.y - this.player.y).normalize().scale(options.knockback ?? 0);
    foe.takeDamage(finalDamage, { critical, tint: options.tint, knockback: direction, source: ability });
    this.run.damageDealt += finalDamage;
  }

  areaDamage(x: number, y: number, radius: number, damage: number, ability: AbilityId, options: { slow?: number; slowDuration?: number; tint?: number } = {}): void {
    const radiusSquared = radius * radius;
    for (const foe of this.getActiveFoes()) {
      if (Phaser.Math.Distance.Squared(x, y, foe.x, foe.y) > radiusSquared) continue;
      this.dealDamage(foe, damage, ability, { tint: options.tint, knockback: ability === 'fireRing' ? 150 : 45 });
      if (options.slow != null && foe instanceof EnemyActor) foe.applySlow(options.slow, options.slowDuration ?? 1500);
    }
    for (const object of this.worldData.breakables.getChildren()) {
      const breakable = object as Phaser.Physics.Arcade.Image;
      if (breakable.active && Phaser.Math.Distance.Squared(x, y, breakable.x, breakable.y) <= radiusSquared) {
        this.damageBreakable(breakable, damage);
      }
    }
  }

  createPoisonPool(x: number, y: number, radius: number, duration: number, damage: number): void {
    const outer = this.add.circle(0, 0, radius, 0x37c65c, 0.2).setStrokeStyle(4, 0xb6ff8b, 0.72);
    const center = this.add.circle(0, 0, radius * 0.48, 0xb8ff63, 0.2).setBlendMode(Phaser.BlendModes.ADD);
    const runes = this.add.image(0, 0, 'black-hole').setTint(0x9dff73).setAlpha(0.58).setScale(radius / 45).setBlendMode(Phaser.BlendModes.ADD);
    const mist = this.add.image(0, -radius * 0.12, 'orb').setTint(0xaaffc5).setAlpha(0.25).setScale(radius / 16, radius / 28).setBlendMode(Phaser.BlendModes.ADD);
    const children: Phaser.GameObjects.GameObject[] = [outer, center, runes, mist];
    for (let i = 0; i < Math.min(6, 3 + Math.floor(radius / 55)); i += 1) {
      const angle = i / 6 * Math.PI * 2;
      children.push(this.add.circle(Math.cos(angle) * radius * 0.52, Math.sin(angle) * radius * 0.4, 3 + i % 2, 0xd8ff95, 0.74));
    }
    const hazard = this.add.container(x, y, children) as Hazard;
    Object.assign(hazard, { kind: 'poison', owner: 'player', source: 'poison', radius, damage, expiresAt: this.time.now + duration, nextTickAt: this.time.now + 250, velocityX: 0, velocityY: 0 });
    hazard.setDepth(y - 4);
    this.registerHazard(hazard);
    this.tweens.add({ targets: runes, angle: 360, duration: 2400, repeat: -1 });
    this.tweens.add({ targets: [center, mist], alpha: { from: 0.12, to: 0.42 }, scaleX: '+=0.14', scaleY: '+=0.14', duration: 720, yoyo: true, repeat: -1 });
    if (radius >= 145) {
      for (let i = 0; i < 3; i += 1) {
        this.time.delayedCall(i * 140, () => hazard.active && this.burst(x + Phaser.Math.Between(-radius / 2, radius / 2), y + Phaser.Math.Between(-radius / 3, radius / 3), 0xbaff76, 8, 125));
      }
    }
  }

  createEnemyPoisonPool(x: number, y: number, radius: number, duration: number, damage: number): void {
    const outer = this.add.circle(0, 0, radius, 0x42113f, 0.32).setStrokeStyle(4, 0xd25b9d, 0.78);
    const core = this.add.image(0, 0, 'black-hole').setTint(0x7d315f).setAlpha(0.65).setScale(radius / 48).setBlendMode(Phaser.BlendModes.ADD);
    const vein = this.add.circle(0, 0, radius * 0.42, 0x9d263f, 0.2).setStrokeStyle(2, 0xff596d, 0.58);
    const hazard = this.add.container(x, y, [outer, vein, core]) as Hazard;
    Object.assign(hazard, { kind: 'poison', owner: 'enemy', source: 'enemyPoison', radius, damage, expiresAt: this.time.now + duration, nextTickAt: this.time.now + 300, velocityX: 0, velocityY: 0 });
    hazard.setDepth(y - 3);
    this.registerHazard(hazard);
    this.tweens.add({ targets: core, angle: -360, alpha: { from: 0.35, to: 0.8 }, duration: 1650, yoyo: true, repeat: -1 });
  }

  createBlackHole(x: number, y: number, radius: number, duration: number, damage: number): void {
    const outer = this.add.circle(0, 0, radius, 0x4c2f76, 0.2).setStrokeStyle(3, 0xb387ff, 0.7);
    const core = this.add.image(0, 0, 'black-hole').setScale(radius / 32).setBlendMode(Phaser.BlendModes.ADD);
    const hazard = this.add.container(x, y, [outer, core]) as Hazard;
    Object.assign(hazard, { kind: 'blackHole', owner: 'player', source: 'blackHole', radius, damage, expiresAt: this.time.now + duration, nextTickAt: this.time.now + 200, velocityX: 0, velocityY: 0 });
    hazard.setDepth(8500);
    this.registerHazard(hazard);
    this.tweens.add({ targets: core, angle: 360, scaleX: core.scaleX * 1.2, scaleY: core.scaleY * 1.2, duration: 700, yoyo: true, repeat: -1 });
  }

  createDangerCircle(x: number, y: number, radius: number, delay: number, damage: number, color = 0xff7657): void {
    if (this.activeWarnings >= ENEMY_BALANCE.maxDangerWarnings) return;
    this.activeWarnings += 1;
    const warning = this.add.circle(x, y, radius, color, 0.11).setStrokeStyle(4, color, 0.85).setDepth(7000);
    this.tweens.add({ targets: warning, scale: 0.6, alpha: 0.52, duration: delay, ease: 'Sine.in', onComplete: () => {
      if (!warning.active) return;
      const playerDistance = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
      if (playerDistance <= radius) this.damagePlayer(damage);
      this.burst(x, y, color, 18, radius * 1.4);
      warning.destroy();
      this.activeWarnings = Math.max(0, this.activeWarnings - 1);
      this.cameras.main.shake(120, 0.004);
    }});
  }

  createDangerLine(x: number, y: number, angle: number, length: number, width: number, delay: number, damage: number, color = 0xff7657): void {
    if (this.activeWarnings >= ENEMY_BALANCE.maxDangerWarnings) return;
    this.activeWarnings += 1;
    const centerX = x + Math.cos(angle) * length * 0.5;
    const centerY = y + Math.sin(angle) * length * 0.5;
    const warning = this.add.rectangle(centerX, centerY, length, width, color, 0.12).setStrokeStyle(3, color, 0.86).setRotation(angle).setDepth(7100);
    this.tweens.add({ targets: warning, alpha: 0.48, scaleY: 0.72, duration: delay, onComplete: () => {
      if (!warning.active) return;
      const line = new Phaser.Geom.Line(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      const nearest = Phaser.Geom.Line.GetNearestPoint(line, new Phaser.Math.Vector2(this.player.x, this.player.y));
      if (Phaser.Math.Distance.Between(nearest.x, nearest.y, this.player.x, this.player.y) <= width * 0.5) this.damagePlayer(damage);
      this.burst(nearest.x, nearest.y, color, 18, width * 1.4);
      warning.destroy();
      this.activeWarnings = Math.max(0, this.activeWarnings - 1);
    }});
  }

  createDangerRing(x: number, y: number, radius: number, thickness: number, delay: number, damage: number, color = 0xe0a45f): void {
    if (this.activeWarnings >= ENEMY_BALANCE.maxDangerWarnings) return;
    this.activeWarnings += 1;
    const warning = this.add.circle(x, y, radius, color, 0.035).setStrokeStyle(thickness, color, 0.76).setDepth(7050);
    this.tweens.add({ targets: warning, alpha: 0.65, scale: { from: 0.82, to: 1 }, duration: delay, ease: 'Sine.in', onComplete: () => {
      if (!warning.active) return;
      const distance = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
      if (Math.abs(distance - radius) <= thickness * 0.65) this.damagePlayer(damage);
      this.burst(x + radius, y, color, 12, thickness * 2);
      warning.destroy();
      this.activeWarnings = Math.max(0, this.activeWarnings - 1);
    }});
  }

  createDangerCone(x: number, y: number, angle: number, range: number, spread: number, delay: number, damage: number, color = 0xc89b66): void {
    if (this.activeWarnings >= ENEMY_BALANCE.maxDangerWarnings) return;
    this.activeWarnings += 1;
    const graphics = this.add.graphics().setDepth(7150);
    graphics.fillStyle(color, 0.12).slice(x, y, range, angle - spread / 2, angle + spread / 2, false).fillPath();
    graphics.lineStyle(3, color, 0.78).slice(x, y, range, angle - spread / 2, angle + spread / 2, false).strokePath();
    this.tweens.add({ targets: graphics, alpha: 0.68, duration: delay, onComplete: () => {
      if (!graphics.active) return;
      const playerAngle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
      if (Math.abs(Phaser.Math.Angle.Wrap(playerAngle - angle)) <= spread / 2 && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= range) this.damagePlayer(damage);
      this.burst(x + Math.cos(angle) * range * 0.68, y + Math.sin(angle) * range * 0.68, color, 16, range * 0.32);
      graphics.destroy();
      this.activeWarnings = Math.max(0, this.activeWarnings - 1);
    }});
  }

  createFireCone(x: number, y: number, angle: number, range: number, spread: number, damage: number): void {
    const graphics = this.add.graphics().setDepth(7200);
    graphics.fillStyle(0xff6b3a, 0.13);
    graphics.slice(x, y, range, angle - spread / 2, angle + spread / 2, false).fillPath();
    graphics.lineStyle(3, 0xffa65a, 0.72).slice(x, y, range, angle - spread / 2, angle + spread / 2, false).strokePath();
    const tokenX = x;
    this.tweens.add({ targets: graphics, alpha: 0.65, duration: 1050, onComplete: () => {
      if (!graphics.active) return;
      this.playSfx('fire', 0.85);
      const playerAngle = Phaser.Math.Angle.Between(tokenX, y, this.player.x, this.player.y);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(playerAngle - angle));
      if (diff <= spread / 2 && Phaser.Math.Distance.Between(tokenX, y, this.player.x, this.player.y) <= range) this.damagePlayer(damage);
      graphics.clear().fillStyle(0xff6a30, 0.34).slice(tokenX, y, range, angle - spread / 2, angle + spread / 2, false).fillPath();
      this.time.delayedCall(650, () => graphics.destroy());
      for (let i = 1; i <= 4; i += 1) {
        const distance = range * i / 5;
        const burnX = tokenX + Math.cos(angle + Phaser.Math.FloatBetween(-spread / 3, spread / 3)) * distance;
        const burnY = y + Math.sin(angle + Phaser.Math.FloatBetween(-spread / 3, spread / 3)) * distance;
        this.createHostileBurningGround(burnX, burnY, damage * 0.18);
      }
    }});
  }

  createMovingHazard(x: number, y: number, velocity: Phaser.Math.Vector2, damage: number): void {
    const core = this.add.image(0, 0, 'projectile-fireball').setScale(2.2).setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add.circle(0, 0, 36, 0xff6b3d, 0.19).setStrokeStyle(3, 0xffb363, 0.62);
    const hazard = this.add.container(x, y, [ring, core]) as Hazard;
    Object.assign(hazard, { kind: 'tornado', owner: 'enemy', source: 'bossWind', radius: 44, damage, expiresAt: this.time.now + 6200, nextTickAt: this.time.now + 300, velocityX: velocity.x, velocityY: velocity.y });
    hazard.setDepth(9000);
    this.registerHazard(hazard);
    this.tweens.add({ targets: core, angle: 720, scaleX: 2.8, scaleY: 2.8, duration: 900, yoyo: true, repeat: -1 });
  }

  createInferno(boss: BossActor): void {
    this.showBossTitle('INFERNO', 'SEEK THE GLIMMERING SANCTUARIES');
    this.playSfx('dragon-roar', 0.9);
    const safeZones: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 3; i += 1) {
      const angle = (Math.PI * 2 * i) / 3 + Math.random() * 0.3;
      const radius = 165;
      safeZones.push(this.add.circle(this.player.x + Math.cos(angle) * radius, this.player.y + Math.sin(angle) * radius, 82, 0x64e9c8, 0.13).setStrokeStyle(4, 0xb8ffe8, 0.9).setDepth(9000));
    }
    this.cameras.main.flash(300, 75, 18, 10);
    const darkness = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x2b0704, 0.38).setOrigin(0).setScrollFactor(0).setDepth(24_000);
    this.time.delayedCall(3400, () => {
      const safe = safeZones.some((zone) => Phaser.Math.Distance.Between(zone.x, zone.y, this.player.x, this.player.y) <= zone.radius);
      if (!safe) this.damagePlayer(boss.damage * 1.45);
      for (let i = 0; i < 28; i += 1) {
        const x = this.player.x + Phaser.Math.Between(-420, 420);
        const y = this.player.y + Phaser.Math.Between(-280, 280);
        if (!safeZones.some((zone) => Phaser.Math.Distance.Between(zone.x, zone.y, x, y) < zone.radius)) this.burst(x, y, 0xff592f, 7, 100);
      }
      this.cameras.main.shake(650, 0.018);
      safeZones.forEach((zone) => zone.destroy());
      darkness.destroy();
    });
  }

  onExperienceChanged(level: number, xp: number, required: number): void {
    this.run.level = level;
    this.run.xp = xp;
    this.run.xpRequired = required;
    this.hud?.setExperience(level, xp, required);
  }

  requestLevelUp(): void {
    if (this.isRunEnded || this.isLeveling) return;
    this.isLeveling = true;
    this.pauseSimulation();
    this.burst(this.player.x, this.player.y, 0xffe37e, 28, 210);
    const choices = this.buildUpgradeChoices();
    this.overlays.showUpgrade(choices, (choice) => {
      choice.apply();
      this.xpSystem.completeOneLevelUp();
      this.isLeveling = false;
      if (!this.xpSystem.hasPendingLevel()) this.resumeSimulation();
      else this.time.delayedCall(80, () => this.requestLevelUp());
    });
  }

  vacuumExperience(): void {
    this.xpSystem.vacuumAll();
  }

  addExperience(amount: number): void {
    this.xpSystem.addBundle(amount);
  }

  resumeGame(): void {
    this.resumeSimulation();
  }

  restartGame(): void {
    this.scene.restart();
  }

  returnToMenu(): void {
    this.audio.crossfade('forest', 500);
    this.scene.start('MenuScene');
  }

  private resetState(): void {
    this.wave = 1;
    this.run = { wave: 1, elapsedMs: 0, kills: 0, level: 1, xp: 0, xpRequired: 24, damageDealt: 0, bossesDefeated: 0 };
    this.pausedDuration = 0;
    this.pauseStartedAt = 0;
    this.isSimulationPaused = false;
    this.isRunEnded = false;
    this.isLeveling = false;
    this.hazards = [];
    this.currentBoss = null;
    this.lastMinibossKind = null;
    this.activeWarnings = 0;
    this.rangedAttackLeases.clear();
    this.contactDamageReadyAt.clear();
  }

  private createPools(): void {
    this.enemies = this.physics.add.group({ classType: EnemyActor, maxSize: COMBAT.maxEnemies, runChildUpdate: false });
    this.bosses = this.physics.add.group({ classType: BossActor, maxSize: 2, runChildUpdate: false });
    this.playerProjectiles = this.physics.add.group({ classType: Projectile, maxSize: COMBAT.maxProjectiles, runChildUpdate: false });
    this.enemyProjectiles = this.physics.add.group({ classType: Projectile, maxSize: ENEMY_BALANCE.maxEnemyProjectiles, runChildUpdate: false });
  }

  private setupPhysics(): void {
    this.physics.add.collider(this.player, this.worldData.obstacles);
    this.physics.add.collider(this.player, this.worldData.breakables);
    this.physics.add.collider(this.player, this.enemies, (_player, object) => {
      const enemy = object as EnemyActor;
      this.damagePlayerFromContact(`enemy-${enemy.enemyId}`, enemy.damage);
    });
    this.physics.add.collider(this.player, this.bosses, (_player, object) => {
      const boss = object as BossActor;
      this.damagePlayerFromContact(`boss-${boss.generation}`, boss.damage);
    });
    this.physics.add.collider(this.bosses, this.worldData.obstacles, (bossObject) => (bossObject as BossActor).onObstacleCollision());
    this.physics.add.collider(this.bosses, this.worldData.breakables, (bossObject) => (bossObject as BossActor).onObstacleCollision());
    this.physics.add.overlap(this.player, this.enemyProjectiles, (_player, object) => {
      const projectile = object as Projectile;
      if (!projectile.active) return;
      this.damagePlayer(projectile.damage);
      projectile.retire();
    });
    this.physics.add.overlap(this.playerProjectiles, this.enemies, (projectileObject, enemyObject) => {
      const projectile = projectileObject as Projectile;
      const enemy = enemyObject as EnemyActor;
      if (!projectile.active || !enemy.active || !projectile.canHit(enemy.enemyId)) return;
      const critical = Math.random() < this.player.stats.critChance;
      const damage = projectile.damage * (critical ? this.player.stats.critMultiplier : 1);
      enemy.takeDamage(damage, { critical, tint: projectile.tintTopLeft, source: projectile.ability });
      this.run.damageDealt += damage;
      projectile.registerHit(enemy.enemyId);
    });
    this.physics.add.overlap(this.playerProjectiles, this.bosses, (projectileObject, bossObject) => {
      const projectile = projectileObject as Projectile;
      const boss = bossObject as BossActor;
      if (!projectile.active || !boss.active || !projectile.canHit(-boss.generation - 1)) return;
      const critical = Math.random() < this.player.stats.critChance;
      const damage = projectile.damage * (critical ? this.player.stats.critMultiplier : 1);
      boss.takeDamage(damage, { critical, tint: projectile.tintTopLeft, source: projectile.ability });
      this.run.damageDealt += damage;
      projectile.registerHit(-boss.generation - 1);
    });
    this.physics.add.overlap(this.playerProjectiles, this.worldData.breakables, (projectileObject, breakableObject) => {
      const projectile = projectileObject as Projectile;
      const breakable = breakableObject as Phaser.Physics.Arcade.Image;
      if (!projectile.active || !breakable.active) return;
      const breakableId = -Math.round(breakable.x + breakable.y);
      if (!projectile.canHit(breakableId)) return;
      this.damageBreakable(breakable, projectile.damage);
      projectile.registerHit(breakableId);
    });
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setDeadzone(60, 42);
    this.cameras.main.setZoom(1);
    this.cameras.main.fadeIn(480, 6, 21, 19);
  }

  private startWave(wave: number): void {
    this.wave = wave;
    this.run.wave = wave;
    this.waveStartedAt = this.time.now;
    this.nextSpawnAt = this.time.now + SPAWN_BALANCE.firstSpawnDelayMs;
    this.minibossSpawned = false;
    this.minibossDefeated = false;
    this.transitionAt = 0;
    if (wave >= 4 && !this.corruptionOverlay) this.corruptionOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x16232b, wave === 5 ? 0.24 : 0.12).setOrigin(0).setScrollFactor(0).setDepth(22_500).setBlendMode(Phaser.BlendModes.MULTIPLY);
    if (this.corruptionOverlay) this.corruptionOverlay.setAlpha(wave === 5 ? 0.42 : wave >= 10 ? 0.25 : 0.16);
    this.showBossTitle(wave === 5 ? 'WAVE 5 — BOSS WAVE' : wave === 10 ? 'WAVE 10 — FINAL WAVE' : `WAVE ${wave}`, wave === 5 ? 'THE ANCIENT BEAST STIRS' : wave === 10 ? 'THE FOREST DRAGON DESCENDS' : this.waveSubtitle(wave));
    if (wave >= 6) this.audio.crossfade('boss', 850);
  }

  private updateWave(time: number): void {
    const elapsed = (time - this.waveStartedAt) / 1000;
    const tuning = WAVE_TUNING[this.wave];
    const bossThreshold = tuning?.bossAtSeconds ?? WAVES.bossAtSeconds;
    if (tuning.spawnIntervalMs > 0 && !this.minibossSpawned && elapsed < bossThreshold - SPAWN_BALANCE.stopSpawningBeforeBossSeconds && time >= this.nextSpawnAt) {
      this.spawnWaveEnemy();
      this.nextSpawnAt = time + tuning.spawnIntervalMs;
    }
    if (!this.minibossSpawned && elapsed >= bossThreshold) {
      this.minibossSpawned = true;
      this.spawnBoss(this.bossForWave(this.wave));
    }
    if (this.minibossDefeated && this.transitionAt > 0 && time >= this.transitionAt) {
      if (this.wave < WAVES.total) this.startWave(this.wave + 1);
    }
  }

  private spawnWaveEnemy(): void {
    const weights = getWaveEnemyWeights(this.wave);
    const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    let kind = weights[0].kind;
    for (const entry of weights) {
      roll -= entry.weight;
      if (roll <= 0) { kind = entry.kind; break; }
    }
    this.spawnEnemy(kind);
  }

  private offscreenSpawnPoint(extra = 180): Phaser.Math.Vector2 {
    const camera = this.cameras.main;
    const view = camera.worldView;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const side = this.spawnSerial++ % 4;
      let x = this.player.x;
      let y = this.player.y;
      if (side === 0) { x = Phaser.Math.Between(view.left - extra - 110, view.left - extra); y = Phaser.Math.Between(view.top - 100, view.bottom + 100); }
      else if (side === 1) { x = Phaser.Math.Between(view.right + extra, view.right + extra + 110); y = Phaser.Math.Between(view.top - 100, view.bottom + 100); }
      else if (side === 2) { x = Phaser.Math.Between(view.left - 100, view.right + 100); y = Phaser.Math.Between(view.top - extra - 110, view.top - extra); }
      else { x = Phaser.Math.Between(view.left - 100, view.right + 100); y = Phaser.Math.Between(view.bottom + extra, view.bottom + extra + 110); }
      const candidate = new Phaser.Math.Vector2(Phaser.Math.Clamp(x, 45, WORLD_SIZE - 45), Phaser.Math.Clamp(y, 45, WORLD_SIZE - 45));
      if (candidate.distance(this.player) >= SPAWN_BALANCE.minimumDistanceFromPlayer) return candidate;
    }
    const radius = SPAWN_BALANCE.minimumDistanceFromPlayer + 100;
    const fallbackCandidates = [
      new Phaser.Math.Vector2(Phaser.Math.Clamp(this.player.x + radius, 45, WORLD_SIZE - 45), this.player.y),
      new Phaser.Math.Vector2(Phaser.Math.Clamp(this.player.x - radius, 45, WORLD_SIZE - 45), this.player.y),
      new Phaser.Math.Vector2(this.player.x, Phaser.Math.Clamp(this.player.y + radius, 45, WORLD_SIZE - 45)),
      new Phaser.Math.Vector2(this.player.x, Phaser.Math.Clamp(this.player.y - radius, 45, WORLD_SIZE - 45)),
    ];
    return fallbackCandidates.sort((a, b) => b.distanceSq(this.player) - a.distanceSq(this.player))[0];
  }

  private buildUpgradeChoices(): UpgradeChoice[] {
    const choices: UpgradeChoice[] = this.abilities.randomAbilityChoices(3).map((id) => makeAbilityUpgradeChoice(id, this.abilities.getLevel(id), () => this.abilities.upgrade(id)));
    const statChoices: UpgradeChoice[] = [
      { id: 'vitality', title: 'Heart of Oak', icon: 'pickup-health', currentLevel: 0, description: '+18 maximum health and restore it immediately.', accent: 0x7fffa1, apply: () => this.player.extendMaxHp(18) },
      { id: 'power', title: 'Wild Magic', icon: 'potion-red', currentLevel: 0, description: '+12% permanent damage to every ability.', accent: 0xff746d, apply: () => { this.player.stats.damageMultiplier *= 1.12; } },
      { id: 'haste', title: 'Firefly Tempo', icon: 'potion-yellow', currentLevel: 0, description: 'Abilities recharge 8% faster.', accent: 0xffdf66, apply: () => { this.player.stats.cooldownMultiplier *= 0.92; } },
      { id: 'speed', title: 'Deerstep', icon: 'potion-blue', currentLevel: 0, description: '+7% movement speed and a wider pickup aura.', accent: 0x69ceff, apply: () => { this.player.stats.speed *= 1.07; this.player.stats.pickupRadius += 8; } },
      { id: 'crit', title: 'Moonlit Edge', icon: 'icon-shuriken', currentLevel: 0, description: '+4% critical hit chance.', accent: 0xffe493, apply: () => { this.player.stats.critChance = Math.min(0.5, this.player.stats.critChance + 0.04); } },
    ];
    Phaser.Utils.Array.Shuffle(statChoices);
    while (choices.length < 3) choices.push(statChoices.shift()!);
    if (Math.random() < 0.22) choices[Phaser.Math.Between(0, 2)] = statChoices[0];
    return choices.slice(0, 3);
  }

  private showAncientPowerChoices(): void {
    this.pauseSimulation();
    const powers: UpgradeChoice[] = [
      { id: 'giantOrbit', title: 'Giant Orbit', icon: 'icon-orb', currentLevel: 0, description: '+60% orb size, +35% radius, and +2 orbiting moons.', accent: 0xc5b3ff, apply: () => this.abilities.applyAncientPower('giantOrbit') },
      { id: 'fallingHeavens', title: 'Falling Heavens', icon: 'icon-meteor', currentLevel: 0, description: '+65% meteor size and one additional falling star.', accent: 0xff9f55, apply: () => this.abilities.applyAncientPower('fallingHeavens') },
      { id: 'toxicWorld', title: 'Toxic World', icon: 'icon-poison', currentLevel: 0, description: '+60% poison pool size. The forest becomes your plague garden.', accent: 0x75d86b, apply: () => this.abilities.applyAncientPower('toxicWorld') },
      { id: 'endlessRicochet', title: 'Endless Ricochet', icon: 'icon-arrow', currentLevel: 0, description: '+80% arrow life and one additional rebound arrowhead.', accent: 0x76d7ff, apply: () => this.abilities.applyAncientPower('endlessRicochet') },
      { id: 'deathRay', title: 'Death Ray', icon: 'icon-laser', currentLevel: 0, description: '+70% beam width and +35% Dawn Ray damage.', accent: 0xfff3a1, apply: () => this.abilities.applyAncientPower('deathRay') },
    ];
    Phaser.Utils.Array.Shuffle(powers);
    this.overlays.showUpgrade(powers.slice(0, 3), (choice) => {
      choice.apply();
      this.minibossDefeated = true;
      this.transitionAt = this.time.now + WAVES.majorBossRestDuration * 1000;
      this.resumeSimulation();
      this.audio.crossfade('boss', 700);
    }, 'ANCIENT POWER', 'Choose one relic from the fallen beast');
  }

  private bossForWave(wave: number): BossKind {
    if (wave === 1) return 'troll';
    if (wave === 2) return 'werewolf';
    if (wave === 3) return 'rooster';
    if (wave === 4) return 'minotaur';
    if (wave === 5) return 'ancientBeast';
    if (wave === 6) return 'wyvern';
    if (wave === 7) return 'troll';
    if (wave === 8) return 'werewolf';
    if (wave === 9) {
      const choices: BossKind[] = ['minotaur', 'wyvern', 'werewolf'];
      return Phaser.Utils.Array.GetRandom(choices.filter((kind) => kind !== this.lastMinibossKind));
    }
    return 'dragon';
  }

  private damageBreakable(breakable: Phaser.Physics.Arcade.Image, damage: number): void {
    const key = Number(breakable.getData('breakableKey'));
    const data = this.worldData.breakableData.get(key);
    if (!data) return;
    data.hp -= damage;
    this.tweens.add({ targets: breakable, x: breakable.x + Phaser.Math.Between(-3, 3), duration: 45, yoyo: true });
    breakable.setTintFill(0xffffff);
    this.time.delayedCall(65, () => breakable.active && breakable.clearTint());
    if (data.hp > 0) return;
    const x = breakable.x;
    const y = breakable.y;
    const glow = breakable.getData('glow') as Phaser.GameObjects.Image | undefined;
    glow?.destroy();
    breakable.disableBody(true, true);
    this.worldData.breakableData.delete(key);
    const color = data.kind === 'chest' ? 0xd49555 : 0x6fbd67;
    this.burst(x, y, color, data.kind === 'chest' ? 18 : 10, 150);
    if (data.kind === 'chest') { this.lootSystem.rollChestDrop(x, y); this.playSfx('chest', 0.66); }
    else { this.lootSystem.rollBushDrop(x, y); this.playSfx('bush', 0.42); }
  }

  private updateHazards(time: number, delta: number): void {
    for (let i = this.hazards.length - 1; i >= 0; i -= 1) {
      const hazard = this.hazards[i];
      if (!hazard.active || time >= hazard.expiresAt) {
        if (hazard.kind === 'blackHole' && hazard.owner === 'player') {
          this.areaDamage(hazard.x, hazard.y, hazard.radius * 1.2, hazard.damage * 4, 'blackHole', { tint: 0xb387ff });
          this.burst(hazard.x, hazard.y, 0xb387ff, 26, 220);
        }
        this.destroyHazard(hazard);
        this.hazards.splice(i, 1);
        continue;
      }
      hazard.x += hazard.velocityX * delta / 1000;
      hazard.y += hazard.velocityY * delta / 1000;
      if (hazard.kind === 'blackHole') {
        for (const foe of this.getActiveFoes()) {
          const distance = Phaser.Math.Distance.Between(hazard.x, hazard.y, foe.x, foe.y);
          if (distance < hazard.radius * 1.8 && foe.body instanceof Phaser.Physics.Arcade.Body) {
            const bossResistance = foe instanceof BossActor ? 0.08 : 1;
            const pull = new Phaser.Math.Vector2(hazard.x - foe.x, hazard.y - foe.y).normalize().scale(90 * bossResistance * (1 - distance / (hazard.radius * 1.8)));
            foe.body.velocity.add(pull);
          }
        }
      }
      if (time >= hazard.nextTickAt) {
        hazard.nextTickAt = time + (hazard.kind === 'poison' ? 500 : 420);
        if (hazard.kind === 'poison' && hazard.owner === 'player') this.areaDamage(hazard.x, hazard.y, hazard.radius, hazard.damage, 'poison', { slow: 0.62, slowDuration: 700, tint: 0x75d86b });
        else if (hazard.kind === 'poison' && hazard.owner === 'enemy' && Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y) < hazard.radius) {
          this.damagePlayer(hazard.damage);
          this.applyPlayerSlow(0.72, 760);
        }
        else if (hazard.kind === 'blackHole') this.areaDamage(hazard.x, hazard.y, hazard.radius, hazard.damage, 'blackHole', { tint: 0xb387ff });
        else if (Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y) < hazard.radius) this.damagePlayer(hazard.damage);
      }
      hazard.setDepth(hazard.y + 10);
    }
  }

  createHostileBurningGround(x: number, y: number, damage: number): void {
    const core = this.add.circle(0, 0, 26, 0xff642f, 0.25).setStrokeStyle(2, 0xffa154, 0.5);
    const hazard = this.add.container(x, y, [core]) as Hazard;
    Object.assign(hazard, { kind: 'burning', owner: 'enemy', source: 'bossFire', radius: 30, damage, expiresAt: this.time.now + 4200, nextTickAt: this.time.now + 400, velocityX: 0, velocityY: 0 });
    hazard.setDepth(y - 2);
    this.registerHazard(hazard);
  }

  private registerHazard(hazard: Hazard): void {
    const limit = 42;
    if (this.hazards.length >= limit) {
      const oldest = this.hazards.shift();
      if (oldest) this.destroyHazard(oldest);
    }
    this.hazards.push(hazard);
  }

  private destroyHazard(hazard: Hazard): void {
    this.tweens.killTweensOf(hazard);
    this.tweens.killTweensOf(hazard.list);
    hazard.destroy(true);
  }

  private togglePause(): void {
    if (this.isRunEnded || this.isLeveling) return;
    if (this.isSimulationPaused) { this.overlays.clear(); this.resumeSimulation(); }
    else { this.pauseSimulation(); this.overlays.showPause(); }
  }

  private pauseSimulation(): void {
    if (this.isSimulationPaused) return;
    this.isSimulationPaused = true;
    this.pauseStartedAt = this.time.now;
    this.physics.pause();
    this.tweens.pauseAll();
    this.game.canvas.dataset.gameState = JSON.stringify(this.debugState());
  }

  private resumeSimulation(): void {
    if (!this.isSimulationPaused || this.isRunEnded) return;
    this.pausedDuration += this.time.now - this.pauseStartedAt;
    this.isSimulationPaused = false;
    this.physics.resume();
    this.tweens.resumeAll();
  }

  private showBossTitle(title: string, subtitle: string): void {
    const heading = this.add.text(this.scale.width / 2, this.scale.height * 0.29, title, {
      fontFamily: 'Cinzel, serif', fontSize: `${Math.min(40, this.scale.width * 0.042)}px`, fontStyle: 'bold', color: '#fff0ad', stroke: '#25170f', strokeThickness: 7,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(23_000).setAlpha(0);
    const sub = this.add.text(this.scale.width / 2, this.scale.height * 0.36, subtitle, {
      fontFamily: 'Nunito, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#9fe4ca', letterSpacing: 2, stroke: '#071512', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(23_000).setAlpha(0);
    this.tweens.add({ targets: [heading, sub], alpha: 1, duration: 350, hold: 1000, yoyo: true, onComplete: () => { heading.destroy(); sub.destroy(); } });
  }

  private waveSubtitle(wave: number): string {
    if (wave === 1) return 'THE FIRST STIRRING';
    if (wave <= 4) return 'SHADOWS GATHER';
    if (wave <= 8) return 'ELITES AWAKEN';
    return 'THE WILD HUNT';
  }

  private winRun(x: number, y: number): void {
    this.isRunEnded = true;
    this.game.canvas.dataset.gameState = JSON.stringify(this.debugState());
    this.audio.crossfade('victory', 900);
    this.playSfx('dragon-roar', 0.6);
    const crystal = this.add.image(x, y, 'xp-gem').setScale(4).setBlendMode(Phaser.BlendModes.ADD).setDepth(15_000);
    this.tweens.add({ targets: crystal, y: y - 90, angle: 360, scaleX: 5.2, scaleY: 5.2, duration: 1500, ease: 'Sine.inOut' });
    SaveManager.recordRun({ wave: 10, kills: this.run.kills, elapsedMs: this.run.elapsedMs, level: this.xpSystem.level, damageDealt: this.run.damageDealt, victory: true });
    this.time.timeScale = 0.45;
    this.time.delayedCall(850, () => {
      this.time.timeScale = 1;
      this.physics.pause();
      this.overlays.showEnd(true, this.endStats());
    });
  }

  private endStats(): { wave: number; kills: number; elapsedMs: number; level: number; damage: number; bosses: number } {
    return { wave: this.wave, kills: this.run.kills, elapsedMs: this.run.elapsedMs, level: this.xpSystem.level, damage: this.run.damageDealt, bosses: this.run.bossesDefeated };
  }

  private debugState(): PickupDebugState {
    return {
      scene: this.scene.key,
      player: { x: this.player.x, y: this.player.y, hp: this.player.stats.hp, maxHp: this.player.stats.maxHp, dashing: this.player.isDashing, movementModifier: this.player.getMovementModifier(this.time.now) },
      wave: this.wave,
      enemies: this.enemies.countActive(true),
      enemyKinds: [...new Set(this.enemies.getChildren().filter((object) => (object as EnemyActor).active).map((object) => (object as EnemyActor).kind))],
      bosses: this.bosses.countActive(true),
      boss: this.currentBoss?.active ? {
        kind: this.currentBoss.kind,
        x: Math.round(this.currentBoss.x),
        y: Math.round(this.currentBoss.y),
        distanceToPlayer: Math.round(Phaser.Math.Distance.Between(this.player.x, this.player.y, this.currentBoss.x, this.currentBoss.y)),
        phase: this.currentBoss.phase,
        hp: this.currentBoss.hp,
        maxHp: this.currentBoss.maxHp,
        lastAttack: this.currentBoss.lastAttack,
        attacksUsed: [...this.currentBoss.attacksUsed],
        specialState: this.currentBoss.specialState,
      } : null,
      hazards: {
        total: this.hazards.length,
        player: this.hazards.filter((hazard) => hazard.owner === 'player').length,
        enemy: this.hazards.filter((hazard) => hazard.owner === 'enemy').length,
      },
      projectiles: { player: this.playerProjectiles.countActive(true), enemy: this.enemyProjectiles.countActive(true) },
      level: this.xpSystem.level,
      xp: this.xpSystem.xp,
      abilities: this.abilities.getOwnedStates(this.time.now).map((state) => `${state.id}:${state.level}`),
      fps: Math.round(this.game.loop.actualFps),
      paused: this.isSimulationPaused,
      waveElapsed: Math.max(0, (this.time.now - this.waveStartedAt) / 1000),
      waveEnemyCap: WAVE_TUNING[this.wave]?.maxActiveEnemies ?? COMBAT.maxEnemies,
      rangedAttackers: this.rangedAttackLeases.size,
      activeWarnings: this.activeWarnings,
    };
  }

  private shutdown(): void {
    this.input.keyboard?.off('keydown-ESC', this.togglePause, this);
    this.overlays?.clear();
    this.hud?.destroy();
    this.hazards.forEach((hazard) => this.destroyHazard(hazard));
    this.hazards = [];
    this.corruptionOverlay?.destroy();
    this.corruptionOverlay = null;
    if (window.__GLIMMERGROVE_STATE__) delete window.__GLIMMERGROVE_STATE__;
    delete this.game.canvas.dataset.gameState;
    this.audio.setMusic('forest' as MusicKey, { fadeMs: 500 });
  }

  private setupDevelopmentShortcuts(): void {
    if (!import.meta.env.DEV) return;
    this.input.keyboard?.on('keydown-F2', () => this.xpSystem.addBundle(this.xpSystem.required));
    this.input.keyboard?.on('keydown-F3', () => !this.currentBoss && this.spawnBoss('troll'));
    this.input.keyboard?.on('keydown-F4', () => !this.currentBoss && this.spawnBoss('ancientBeast'));
    this.input.keyboard?.on('keydown-F5', () => !this.currentBoss && this.spawnBoss('dragon'));
    this.input.keyboard?.on('keydown-F6', () => this.currentBoss?.takeDamage(this.currentBoss.maxHp * 3, { source: 'bolt' }));
    this.input.keyboard?.on('keydown-F7', () => this.currentBoss?.takeDamage(this.currentBoss.maxHp * 0.26, { source: 'bolt' }));
    this.input.keyboard?.on('keydown-F8', () => {
      if (!this.currentBoss) return;
      this.currentBoss.hp = this.currentBoss.maxHp * 0.2;
      this.currentBoss.takeDamage(0, { source: 'bolt' });
    });
    this.input.keyboard?.on('keydown-F9', () => {
      const kinds: EnemyKind[] = ['slime', 'goblin', 'bat', 'skeleton', 'wolf', 'spider', 'zombie', 'mushroom', 'plant', 'darkKnight', 'lizardman', 'witch'];
      for (let i = 0; i < 120; i += 1) this.spawnEnemy(kinds[i % kinds.length]);
    });
    this.input.keyboard?.on('keydown-F10', () => this.debugStartWave(5));
    this.input.keyboard?.on('keydown-F11', () => this.debugStartWave(10));
    this.input.keyboard?.on('keydown-R', () => !this.currentBoss && this.spawnBoss('rooster'));
    this.input.keyboard?.on('keydown-T', () => !this.currentBoss && this.spawnBoss('troll'));
    this.input.keyboard?.on('keydown-M', () => !this.currentBoss && this.spawnBoss('minotaur'));
    this.input.keyboard?.on('keydown-V', () => !this.currentBoss && this.spawnBoss('werewolf'));
    this.input.keyboard?.on('keydown-Y', () => !this.currentBoss && this.spawnBoss('wyvern'));
    this.input.keyboard?.on('keydown-P', () => this.createPoisonPool(this.player.x, this.player.y, 126, 5200, 18));
    this.input.keyboard?.on('keydown-O', () => this.createEnemyPoisonPool(this.player.x, this.player.y, 110, 5200, 8));
    this.input.keyboard?.on('keydown-H', () => {
      this.player.heal(this.player.stats.maxHp);
      this.player.grantInvulnerability(30_000, this.time.now);
    });
    this.input.keyboard?.on('keydown-G', () => this.debugStartWave(3));
    this.input.keyboard?.on('keydown-N', () => this.debugStartWave(Math.min(WAVES.total, this.wave + 1)));
    this.input.keyboard?.on('keydown-B', () => !this.currentBoss && this.spawnBoss(this.bossForWave(this.wave)));
    this.input.keyboard?.on('keydown-K', () => {
      const targets: Partial<Record<AbilityId, number>> = { bolt: 5, orb: 3, meteor: 3, poison: 3, shuriken: 2, lightning: 2, fireRing: 2 };
      for (const [id, target] of Object.entries(targets) as Array<[AbilityId, number]>) {
        while (this.abilities.getLevel(id) < target) this.abilities.upgrade(id);
      }
    });
    this.input.keyboard?.on('keydown-J', () => {
      if (!this.currentBoss?.active) return;
      this.player.setPosition(
        Phaser.Math.Clamp(this.currentBoss.x - 230, 32, WORLD_SIZE - 32),
        Phaser.Math.Clamp(this.currentBoss.y, 32, WORLD_SIZE - 32),
      );
      this.cameras.main.centerOn(this.player.x, this.player.y);
    });
    this.input.keyboard?.on('keydown-U', () => {
      const ids: AbilityId[] = ['bolt', 'orb', 'meteor', 'poison', 'shuriken', 'laser', 'arrow', 'lightning', 'fireRing', 'iceStorm', 'blackHole'];
      for (const id of ids) while (this.abilities.getLevel(id) < 8) this.abilities.upgrade(id);
    });
  }

  private debugStartWave(wave: number): void {
    if (!import.meta.env.DEV) return;
    for (const object of this.enemies.getChildren()) (object as EnemyActor).retire();
    if (this.currentBoss?.active) this.currentBoss.retire();
    this.currentBoss = null;
    this.hazards.forEach((hazard) => this.destroyHazard(hazard));
    this.hazards = [];
    this.startWave(Phaser.Math.Clamp(wave, 1, WAVES.total));
  }
}
