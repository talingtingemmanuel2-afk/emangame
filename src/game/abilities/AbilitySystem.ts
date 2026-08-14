import Phaser from 'phaser';
import { ABILITY_DEFINITIONS, STANDARD_ABILITY_IDS } from '../content/definitions';
import type { AbilityId, AbilityState } from '../types';
import type { EnemyActor } from '../entities/EnemyActor';
import type { BossActor } from '../entities/BossActor';
import type { Player } from '../entities/Player';
import { ABILITY_COOLDOWNS, COMBAT } from '../config/balance';

const EVOLUTION_LEVEL = 5;

export type Foe = EnemyActor | BossActor;

export interface AbilityHost {
  player: Player;
  getActiveFoes(): Foe[];
  findNearestFoe(x: number, y: number, maxDistance?: number): Foe | null;
  findDenseFoe(): Foe | null;
  firePlayerProjectile(options: {
    x: number; y: number; targetX?: number; targetY?: number; angle?: number; texture: string; speed: number;
    damage: number; lifespan?: number; pierce?: number; scale?: number; tint?: number; critical?: boolean;
    ability: AbilityId; rotate?: number; bounce?: boolean;
  }): void;
  dealDamage(foe: Foe, amount: number, ability: AbilityId, options?: { tint?: number; canCrit?: boolean; knockback?: number }): void;
  areaDamage(x: number, y: number, radius: number, damage: number, ability: AbilityId, options?: { slow?: number; slowDuration?: number; tint?: number }): void;
  createPoisonPool(x: number, y: number, radius: number, duration: number, damage: number): void;
  createBlackHole(x: number, y: number, radius: number, duration: number, damage: number): void;
  burst(x: number, y: number, color: number, count: number, speed?: number): void;
  playSfx(key: string, volume?: number): void;
}

interface Cooldowns {
  bolt: number;
  meteor: number;
  poison: number;
  shuriken: number;
  laser: number;
  arrow: number;
  lightning: number;
  fireRing: number;
  iceStorm: number;
  blackHole: number;
}

export class AbilitySystem {
  private readonly host: AbilityHost;
  private readonly scene: Phaser.Scene;
  private readonly levels = new Map<AbilityId, number>([['bolt', 1]]);
  private readonly nextUse: Cooldowns = {
    bolt: 0, meteor: 0, poison: 0, shuriken: 0, laser: 0,
    arrow: 0, lightning: 0, fireRing: 0, iceStorm: 0, blackHole: 0,
  };
  private readonly lastCooldown = new Map<keyof Cooldowns, number>();
  private readonly orbs: Phaser.GameObjects.Image[] = [];
  private orbAngle = 0;
  private readonly orbHitTimes = new Map<number, number>();
  private readonly ancient = { orbSize: 1, orbRadius: 1, orbExtra: 0, meteorSize: 1, meteorExtra: 0, poisonSize: 1, arrowLife: 1, arrowExtra: 0, laserWidth: 1, laserDamage: 1 };

  constructor(scene: Phaser.Scene, host: AbilityHost) {
    this.scene = scene;
    this.host = host;
  }

  update(time: number, delta: number): void {
    const cooldownMultiplier = this.host.player.stats.cooldownMultiplier * this.host.player.getBuffMultiplier('haste');
    this.updateOrbs(time, delta);
    this.useBolt(time, cooldownMultiplier);
    this.useMeteor(time, cooldownMultiplier);
    this.usePoison(time, cooldownMultiplier);
    this.useShuriken(time, cooldownMultiplier);
    this.useLaser(time, cooldownMultiplier);
    this.useArrow(time, cooldownMultiplier);
    this.useLightning(time, cooldownMultiplier);
    this.useFireRing(time, cooldownMultiplier);
    this.useIceStorm(time, cooldownMultiplier);
    this.useBlackHole(time, cooldownMultiplier);
  }

  getLevel(id: AbilityId): number {
    return this.levels.get(id) ?? 0;
  }

  upgrade(id: AbilityId): number {
    const definition = ABILITY_DEFINITIONS[id];
    const next = Math.min(definition.maxLevel, this.getLevel(id) + 1);
    this.levels.set(id, next);
    if (id === 'orb') this.syncOrbs();
    return next;
  }

  applyAncientPower(id: 'giantOrbit' | 'fallingHeavens' | 'toxicWorld' | 'endlessRicochet' | 'deathRay'): void {
    if (id === 'giantOrbit') { this.ancient.orbSize *= 1.6; this.ancient.orbRadius *= 1.35; this.ancient.orbExtra += 2; this.syncOrbs(); }
    else if (id === 'fallingHeavens') { this.ancient.meteorSize *= 1.65; this.ancient.meteorExtra += 1; }
    else if (id === 'toxicWorld') this.ancient.poisonSize *= 1.6;
    else if (id === 'endlessRicochet') { this.ancient.arrowLife *= 1.8; this.ancient.arrowExtra += 1; }
    else { this.ancient.laserWidth *= 1.7; this.ancient.laserDamage *= 1.35; }
  }

  getOwnedStates(time: number): AbilityState[] {
    return [...this.levels.entries()].map(([id, level]) => ({
      id,
      level,
      evolved: level >= ABILITY_DEFINITIONS[id].maxLevel,
      cooldownProgress: this.cooldownProgress(id, time),
    }));
  }

  getUpgradeableIds(): AbilityId[] {
    return (Object.keys(ABILITY_DEFINITIONS) as AbilityId[]).filter((id) => {
      const definition = ABILITY_DEFINITIONS[id];
      const level = this.getLevel(id);
      if (definition.rare && level === 0 && Math.random() > 0.16) return false;
      return level < definition.maxLevel;
    });
  }

  randomAbilityChoices(count: number): AbilityId[] {
    const valid = this.getUpgradeableIds();
    Phaser.Utils.Array.Shuffle(valid);
    return valid.slice(0, count);
  }

  private useBolt(time: number, cooldownMultiplier: number): void {
    const level = this.getLevel('bolt');
    if (level === 0 || time < this.nextUse.bolt) return;
    const target = this.host.findNearestFoe(this.host.player.x, this.host.player.y, 820);
    if (!target) return;
    const count = 1 + this.host.player.stats.extraProjectiles + Math.floor(level / 4);
    const baseAngle = Phaser.Math.Angle.Between(this.host.player.x, this.host.player.y, target.x, target.y);
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * 0.11;
      this.host.firePlayerProjectile({
        x: this.host.player.x, y: this.host.player.y - 4, angle: baseAngle + offset,
        texture: 'projectile-bolt', speed: 520 * this.host.player.stats.projectileSpeed,
        damage: 20 * (1 + level * 0.22), lifespan: 1600, pierce: level >= 6 ? 2 : level >= 3 ? 1 : 0,
        scale: 0.9 * this.visualScale(level), tint: level >= EVOLUTION_LEVEL ? 0xfff1a6 : 0x72e6d2, ability: 'bolt',
      });
    }
    this.host.playSfx('bolt', 0.22);
    this.setNextUse('bolt', time, level, cooldownMultiplier);
  }

  private updateOrbs(time: number, delta: number): void {
    const level = this.getLevel('orb');
    if (level === 0) return;
    this.syncOrbs();
    this.orbAngle += delta * (0.0019 + level * 0.00011);
    const radius = (58 + Math.floor(level / 2) * 9) * this.visualScale(level) * this.ancient.orbRadius;
    for (let i = 0; i < this.orbs.length; i += 1) {
      const ring = level >= EVOLUTION_LEVEL && i >= Math.ceil(this.orbs.length / 2) ? 0.72 : 1;
      const angle = this.orbAngle * (ring < 1 ? -1 : 1) + (Math.PI * 2 * i) / Math.ceil(this.orbs.length / 2);
      const orb = this.orbs[i];
      orb.setPosition(this.host.player.x + Math.cos(angle) * radius * ring, this.host.player.y + Math.sin(angle) * radius * ring);
      orb.setDepth(this.host.player.y + Math.sin(angle) * radius + 3).setScale((0.9 + level * 0.05) * this.visualScale(level) * this.ancient.orbSize);
      orb.angle += 3.5;
      for (const foe of this.host.getActiveFoes()) {
        if (!foe.active || Phaser.Math.Distance.Between(orb.x, orb.y, foe.x, foe.y) > 22 + level * 2) continue;
        const lastHit = this.orbHitTimes.get(foe instanceof Phaser.GameObjects.GameObject && 'enemyId' in foe ? foe.enemyId : -1) ?? 0;
        if (time - lastHit < 380) continue;
        const id = 'enemyId' in foe ? foe.enemyId : -1;
        this.orbHitTimes.set(id, time);
        this.host.dealDamage(foe, 10 + level * 6, 'orb', { tint: 0xb99cff, knockback: 70 });
      }
    }
  }

  private useMeteor(time: number, cooldownMultiplier: number): void {
    const level = this.getLevel('meteor');
    if (!level || time < this.nextUse.meteor) return;
    const target = this.host.findDenseFoe();
    if (!target) return;
    const count = 1 + Math.floor(level / 4) + (level >= EVOLUTION_LEVEL ? 2 : 0) + this.ancient.meteorExtra;
    for (let i = 0; i < count; i += 1) {
      const x = target.x + Phaser.Math.Between(-80, 80);
      const y = target.y + Phaser.Math.Between(-80, 80);
      this.createMeteor(x, y, level, i * 150);
    }
    this.setNextUse('meteor', time, level, cooldownMultiplier);
  }

  private createMeteor(x: number, y: number, level: number, extraDelay: number): void {
    const visual = this.visualScale(level) * this.ancient.meteorSize;
    const ring = this.scene.add.circle(x, y, (45 + level * 4) * visual, 0xff6b3c, 0.13).setStrokeStyle(4 + level * 0.4, 0xffb357, 0.9).setDepth(6800);
    this.scene.tweens.add({ targets: ring, scale: 0.55, alpha: 0.55, duration: 760 + extraDelay, onComplete: () => {
      const meteor = this.scene.add.image(x - 130 * visual, y - 210 * visual, 'meteor').setScale((1.15 + level * 0.06) * visual).setDepth(9000).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: meteor, x, y, angle: 180, duration: 260, ease: 'Quad.in', onComplete: () => {
        meteor.destroy();
        ring.destroy();
        this.host.areaDamage(x, y, (70 + level * 7) * Math.min(visual, 2.4), 42 + level * 18, 'meteor', { tint: 0xff8a4d });
        this.host.burst(x, y, 0xff8a4d, level >= EVOLUTION_LEVEL ? 36 : 24, 220 * visual);
        this.host.playSfx('slam', 0.45);
        this.scene.cameras.main.shake(110, 0.0038);
      }});
    }});
  }

  private usePoison(time: number, cooldownMultiplier: number): void {
    const level = this.getLevel('poison');
    if (!level || time < this.nextUse.poison) return;
    const target = this.host.findDenseFoe();
    if (!target) return;
    const flask = this.scene.add.image(this.host.player.x, this.host.player.y - 12, 'potion-green').setScale(1.05 * this.visualScale(level)).setDepth(9000);
    this.scene.tweens.add({
      targets: flask,
      x: target.x, y: target.y, angle: 540,
      duration: 480,
      ease: 'Quad.out',
      onComplete: () => {
        flask.destroy();
        this.host.createPoisonPool(target.x, target.y, (55 + level * 7) * this.visualScale(level) * this.ancient.poisonSize, 3800 + level * 420, 8 + level * 5);
      },
    });
    this.setNextUse('poison', time, level, cooldownMultiplier);
  }

  private useShuriken(time: number, cooldownMultiplier: number): void {
    const level = this.getLevel('shuriken');
    if (!level || time < this.nextUse.shuriken) return;
    const target = this.host.findNearestFoe(this.host.player.x, this.host.player.y, 900);
    if (!target) return;
    const count = level >= EVOLUTION_LEVEL ? 12 : 1 + Math.floor(level / 3);
    const base = Phaser.Math.Angle.Between(this.host.player.x, this.host.player.y, target.x, target.y);
    for (let i = 0; i < count; i += 1) {
      this.host.firePlayerProjectile({
        x: this.host.player.x, y: this.host.player.y, angle: level >= EVOLUTION_LEVEL ? base + (Math.PI * 2 * i) / count : base + (i - (count - 1) / 2) * 0.19,
        texture: 'projectile-shuriken', speed: 430 + level * 20, damage: 18 + level * 9,
        lifespan: 2100, pierce: 1 + Math.floor(level / 2), scale: (0.8 + level * 0.035) * this.visualScale(level),
        tint: 0xffe496, ability: 'shuriken', rotate: 800,
      });
    }
    this.setNextUse('shuriken', time, level, cooldownMultiplier);
  }

  private useLaser(time: number, cooldownMultiplier: number): void {
    const level = this.getLevel('laser');
    if (!level || time < this.nextUse.laser) return;
    const target = this.host.findNearestFoe(this.host.player.x, this.host.player.y, 760);
    if (!target) return;
    const origin = this.host.player;
    const angle = Phaser.Math.Angle.Between(origin.x, origin.y, target.x, target.y);
    const length = 720;
    const beamScale = this.visualScale(level) * this.ancient.laserWidth;
    const beams = level >= EVOLUTION_LEVEL ? [-0.24, 0, 0.24] : [0];
    for (const offset of beams) {
      const beamAngle = angle + offset;
      const end = new Phaser.Math.Vector2(origin.x + Math.cos(beamAngle) * length, origin.y + Math.sin(beamAngle) * length);
      const graphics = this.scene.add.graphics().setDepth(9100);
      graphics.lineStyle((10 + level * 1.2) * beamScale, 0x72bfff, 0.18).lineBetween(origin.x, origin.y, end.x, end.y);
      graphics.lineStyle((3 + level * 0.45) * beamScale, 0xffffff, 0.96).lineBetween(origin.x, origin.y, end.x, end.y);
      this.scene.tweens.add({ targets: graphics, alpha: 0, duration: 250 + level * 18, onComplete: () => graphics.destroy() });
      const beamLine = new Phaser.Geom.Line(origin.x, origin.y, end.x, end.y);
      for (const foe of this.host.getActiveFoes()) {
        const closest = Phaser.Geom.Line.GetNearestPoint(beamLine, new Phaser.Math.Vector2(foe.x, foe.y));
        if (Phaser.Math.Distance.Between(closest.x, closest.y, foe.x, foe.y) < (14 + level * 2) * beamScale) {
          this.host.dealDamage(foe, (32 + level * 13) * this.ancient.laserDamage, 'laser', { tint: 0xfff2a2 });
        }
      }
    }
    this.setNextUse('laser', time, level, cooldownMultiplier);
  }

  private useArrow(time: number, cooldownMultiplier: number): void {
    const level = this.getLevel('arrow');
    if (!level || time < this.nextUse.arrow) return;
    const count = 1 + Math.floor(level / 4) + (level >= EVOLUTION_LEVEL ? 2 : 0) + this.ancient.arrowExtra;
    for (let i = 0; i < count; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      this.host.firePlayerProjectile({
        x: this.host.player.x, y: this.host.player.y, angle, texture: 'projectile-arrow',
        speed: 330 + level * 18, damage: 20 + level * 10, lifespan: (6500 + level * 900) * this.ancient.arrowLife,
        pierce: 1 + Math.floor(level / 3), scale: (0.86 + level * 0.04) * this.visualScale(level), tint: 0x75dfff,
        ability: 'arrow', bounce: true,
      });
    }
    this.setNextUse('arrow', time, level, cooldownMultiplier);
  }

  private useLightning(time: number, cooldownMultiplier: number): void {
    const level = this.getLevel('lightning');
    if (!level || time < this.nextUse.lightning) return;
    const first = this.host.findNearestFoe(this.host.player.x, this.host.player.y, 650);
    if (!first) return;
    const visited = new Set<Foe>();
    let current: Foe | null = first;
    let from = new Phaser.Math.Vector2(this.host.player.x, this.host.player.y);
    const chains = 2 + level;
    for (let i = 0; i < chains && current; i += 1) {
      visited.add(current);
      const graphics = this.scene.add.graphics().setDepth(9200);
      const points = [from.clone()];
      for (let j = 1; j < 5; j += 1) {
        const t = j / 5;
        points.push(new Phaser.Math.Vector2(
          Phaser.Math.Linear(from.x, current.x, t) + Phaser.Math.Between(-12, 12),
          Phaser.Math.Linear(from.y, current.y, t) + Phaser.Math.Between(-12, 12),
        ));
      }
      points.push(new Phaser.Math.Vector2(current.x, current.y));
      graphics.lineStyle(7 * this.visualScale(level), 0x6db8ff, 0.2).strokePoints(points);
      graphics.lineStyle(2.2 * this.visualScale(level), 0xdffaff, 1).strokePoints(points);
      this.scene.tweens.add({ targets: graphics, alpha: 0, duration: 180, onComplete: () => graphics.destroy() });
      this.host.dealDamage(current, 22 + level * 10, 'lightning', { tint: 0x9de7ff });
      from = new Phaser.Math.Vector2(current.x, current.y);
      current = this.host.getActiveFoes().filter((foe) => !visited.has(foe) && Phaser.Math.Distance.Between(from.x, from.y, foe.x, foe.y) < 115 + level * 10)
        .sort((a, b) => Phaser.Math.Distance.Squared(from.x, from.y, a.x, a.y) - Phaser.Math.Distance.Squared(from.x, from.y, b.x, b.y))[0] ?? null;
    }
    this.setNextUse('lightning', time, level, cooldownMultiplier);
  }

  private useFireRing(time: number, cooldownMultiplier: number): void {
    const level = this.getLevel('fireRing');
    if (!level || time < this.nextUse.fireRing) return;
    const radius = (92 + level * 12) * this.visualScale(level);
    const ring = this.scene.add.circle(this.host.player.x, this.host.player.y, 18, 0xff6f3d, 0).setStrokeStyle(9 * this.visualScale(level), 0xff8a4f, 0.8).setDepth(8800);
    this.scene.tweens.add({ targets: ring, radius, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
    this.host.areaDamage(this.host.player.x, this.host.player.y, radius, 26 + level * 12, 'fireRing', { tint: 0xff804d });
    this.host.burst(this.host.player.x, this.host.player.y, 0xff804d, 22, 180);
    this.setNextUse('fireRing', time, level, cooldownMultiplier);
  }

  private useIceStorm(time: number, cooldownMultiplier: number): void {
    const level = this.getLevel('iceStorm');
    if (!level || time < this.nextUse.iceStorm) return;
    const foes = this.host.getActiveFoes().sort((a, b) => Phaser.Math.Distance.Squared(this.host.player.x, this.host.player.y, a.x, a.y) - Phaser.Math.Distance.Squared(this.host.player.x, this.host.player.y, b.x, b.y));
    for (const foe of foes.slice(0, 2 + Math.floor(level / 2))) {
      const shard = this.scene.add.image(foe.x, foe.y - 90, 'ice-shard').setDepth(9000).setScale(0.9 * this.visualScale(level));
      this.scene.tweens.add({ targets: shard, y: foe.y, angle: 180, duration: 320, onComplete: () => {
        shard.destroy();
        this.host.areaDamage(foe.x, foe.y, (35 + level * 4) * this.visualScale(level), 18 + level * 8, 'iceStorm', { slow: 0.55, slowDuration: 1900 + level * 180, tint: 0xa8efff });
      }});
    }
    this.setNextUse('iceStorm', time, level, cooldownMultiplier);
  }

  private useBlackHole(time: number, cooldownMultiplier: number): void {
    const level = this.getLevel('blackHole');
    if (!level || time < this.nextUse.blackHole) return;
    const target = this.host.findDenseFoe();
    if (!target) return;
    this.host.createBlackHole(target.x, target.y, (95 + level * 8) * this.visualScale(level), 2600 + level * 220, 8 + level * 5);
    this.setNextUse('blackHole', time, level, cooldownMultiplier);
  }

  private syncOrbs(): void {
    const level = this.getLevel('orb');
    const desired = (level >= EVOLUTION_LEVEL ? 10 : 1 + Math.floor((level - 1) / 2)) + this.ancient.orbExtra;
    while (this.orbs.length < desired) {
      this.orbs.push(this.scene.add.image(this.host.player.x, this.host.player.y, 'orb').setBlendMode(Phaser.BlendModes.ADD));
    }
    while (this.orbs.length > desired) this.orbs.pop()?.destroy();
  }

  private cooldownProgress(id: AbilityId, time: number): number {
    if (id === 'orb') return 1;
    const next = this.nextUse[id as keyof Cooldowns];
    const duration = this.lastCooldown.get(id as keyof Cooldowns) ?? 1000;
    return next == null ? 1 : Phaser.Math.Clamp(1 - Math.max(0, next - time) / duration, 0, 1);
  }

  private setNextUse(id: keyof Cooldowns, time: number, level: number, multiplier: number): void {
    const tuning = ABILITY_COOLDOWNS[id];
    const raw = level >= EVOLUTION_LEVEL ? tuning.evolved : tuning.base * Math.pow(tuning.perLevel, Math.max(0, level - 1));
    const duration = Math.max(tuning.minimum, raw * multiplier);
    this.lastCooldown.set(id, duration);
    this.nextUse[id] = time + duration;
  }

  private visualScale(level: number): number {
    const progression = level <= 1 ? 1 : 1 + Math.pow((level - 1) / 7, 1.12) * 1.65;
    return progression * COMBAT.playerAbilityVisualMultiplier;
  }
}

export const allAbilityIds = (): AbilityId[] => ['bolt', ...STANDARD_ABILITY_IDS];
