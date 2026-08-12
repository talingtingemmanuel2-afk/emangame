import type Phaser from 'phaser';

export type EnemyKind =
  | 'slime' | 'goblin' | 'bat' | 'skeleton' | 'wolf'
  | 'spider' | 'zombie' | 'mushroom' | 'plant' | 'darkKnight' | 'lizardman' | 'witch';
export type BossKind =
  | 'golem' | 'vampire' | 'rooster' | 'troll' | 'werewolf' | 'minotaur' | 'wyvern'
  | 'ancientBeast' | 'dragon';
export type FoeKind = EnemyKind | BossKind;
export type Faction = 'player' | 'enemy';
export type EliteModifier = 'Swift' | 'Armored' | 'Explosive' | 'Vampiric' | 'Frenzied';

export type AbilityId =
  | 'bolt'
  | 'orb'
  | 'meteor'
  | 'poison'
  | 'shuriken'
  | 'laser'
  | 'arrow'
  | 'lightning'
  | 'fireRing'
  | 'iceStorm'
  | 'blackHole';

export type PickupKind = 'health' | 'magnet' | 'damage' | 'speed' | 'haste' | 'xp';

export interface EnemyDefinition {
  kind: EnemyKind;
  name: string;
  texture: string;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  scale: number;
  bodyRadius: number;
  firstWave: number;
  color: number;
}

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  icon: string;
  description: string;
  accent: number;
  maxLevel: number;
  rare?: boolean;
  evolution?: string;
}

export interface AbilityState {
  id: AbilityId;
  level: number;
  evolved: boolean;
  cooldownProgress: number;
}

export interface PlayerStats {
  maxHp: number;
  hp: number;
  speed: number;
  damageMultiplier: number;
  cooldownMultiplier: number;
  critChance: number;
  critMultiplier: number;
  armor: number;
  pickupRadius: number;
  projectileSpeed: number;
  extraProjectiles: number;
}

export interface RunStats {
  wave: number;
  elapsedMs: number;
  kills: number;
  level: number;
  xp: number;
  xpRequired: number;
  damageDealt: number;
  bossesDefeated: number;
}

export interface UpgradeChoice {
  id: string;
  title: string;
  icon: string;
  currentLevel: number;
  description: string;
  accent: number;
  apply: () => void;
}

export interface ActiveBuff {
  kind: 'damage' | 'speed' | 'haste';
  multiplier: number;
  expiresAt: number;
}

export interface DamageOptions {
  critical?: boolean;
  knockback?: Phaser.Math.Vector2;
  source?: AbilityId | 'contact' | 'enemyProjectile' | 'hazard';
  tint?: number;
}

export interface SaveData {
  version: 1;
  settings: {
    master: number;
    music: number;
    sfx: number;
  };
  highScore: {
    wave: number;
    kills: number;
    elapsedMs: number;
    level: number;
    damageDealt: number;
    victory: boolean;
  } | null;
}
