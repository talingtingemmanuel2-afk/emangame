import type { BossKind } from '../types';

export const WORLD_SIZE = 4096;

export const PLAYER = {
  maxHp: 140,
  speed: 205,
  dashSpeed: 640,
  dashDuration: 210,
  dashCooldown: 1900,
  dashInvulnerability: 340,
  invulnerabilityAfterHit: 620,
  pickupRadius: 86,
  magnetRadius: 170,
} as const;

export const COMBAT = {
  magicBoltDamage: 22,
  magicBoltCooldown: 390,
  projectileSpeed: 520,
  criticalChance: 0.08,
  criticalMultiplier: 1.85,
  maxEnemies: 140,
  maxProjectiles: 96,
  maxGems: 180,
  playerAbilityDamageMultiplier: 1.16,
  playerAbilityVisualMultiplier: 1.24,
} as const;

export const ENEMY_BALANCE = {
  hpPerWave: 0.12,
  damagePerWave: 0.045,
  speedPerWave: 0.03,
  attackCooldownPerWave: 0.032,
  minimumAttackCooldownMultiplier: 0.68,
  xpPerWave: 0.045,
  eliteFirstWave: 2,
  eliteBaseChance: 0,
  eliteChancePerWave: 0.03,
  eliteMaxChance: 0.32,
  eliteHpMultiplier: 2.2,
  armoredHpMultiplier: 2.8,
  eliteDamageMultiplier: 1.35,
  eliteXpMultiplier: 2.3,
  separationRadius: 34,
  separationStrength: 0.48,
  maxRangedAttackers: 6,
  rangedAttackLeaseMs: 1250,
  maxEnemyProjectiles: 112,
  maxDangerWarnings: 28,
  contactCooldownMs: 660,
} as const;

export const SPAWN_BALANCE = {
  firstSpawnDelayMs: 850,
  minimumDistanceFromPlayer: 420,
  bossSummonMinimumDistance: 250,
  stopSpawningBeforeBossSeconds: 3,
} as const;

export interface WaveTuning {
  spawnIntervalMs: number;
  spawnGroupMin: number;
  spawnGroupMax: number;
  maxActiveEnemies: number;
  maxRangedAttackers: number;
  bossAtSeconds: number;
}

export const WAVE_TUNING: Record<number, WaveTuning> = {
  1: { spawnIntervalMs: 980, spawnGroupMin: 1, spawnGroupMax: 2, maxActiveEnemies: 48, maxRangedAttackers: 3, bossAtSeconds: 52 },
  2: { spawnIntervalMs: 850, spawnGroupMin: 2, spawnGroupMax: 3, maxActiveEnemies: 62, maxRangedAttackers: 4, bossAtSeconds: 54 },
  3: { spawnIntervalMs: 740, spawnGroupMin: 3, spawnGroupMax: 4, maxActiveEnemies: 76, maxRangedAttackers: 5, bossAtSeconds: 56 },
  4: { spawnIntervalMs: 650, spawnGroupMin: 4, spawnGroupMax: 4, maxActiveEnemies: 90, maxRangedAttackers: 6, bossAtSeconds: 58 },
  5: { spawnIntervalMs: 0, spawnGroupMin: 0, spawnGroupMax: 0, maxActiveEnemies: 0, maxRangedAttackers: 4, bossAtSeconds: 4 },
  6: { spawnIntervalMs: 680, spawnGroupMin: 4, spawnGroupMax: 4, maxActiveEnemies: 100, maxRangedAttackers: 7, bossAtSeconds: 58 },
  7: { spawnIntervalMs: 570, spawnGroupMin: 4, spawnGroupMax: 5, maxActiveEnemies: 112, maxRangedAttackers: 8, bossAtSeconds: 59 },
  8: { spawnIntervalMs: 480, spawnGroupMin: 5, spawnGroupMax: 6, maxActiveEnemies: 126, maxRangedAttackers: 9, bossAtSeconds: 60 },
  9: { spawnIntervalMs: 410, spawnGroupMin: 6, spawnGroupMax: 8, maxActiveEnemies: 138, maxRangedAttackers: 10, bossAtSeconds: 61 },
  10: { spawnIntervalMs: 0, spawnGroupMin: 0, spawnGroupMax: 0, maxActiveEnemies: 0, maxRangedAttackers: 6, bossAtSeconds: 4 },
};

export interface BossTuning {
  hp: number;
  damage: number;
  hitboxRadius: number;
  moveSpeed: number;
  cadence: number;
  enragedCadence: number;
}

export const BOSS_BALANCE: Record<BossKind, BossTuning> = {
  golem:        { hp: 1700, damage: 16, hitboxRadius: 40, moveSpeed: 68, cadence: 2100, enragedCadence: 1600 },
  vampire:      { hp: 4300, damage: 19, hitboxRadius: 36, moveSpeed: 112, cadence: 1850, enragedCadence: 1350 },
  darkMage:     { hp: 4650, damage: 20, hitboxRadius: 36, moveSpeed: 84, cadence: 1900, enragedCadence: 1420 },
  rooster:      { hp: 3700, damage: 17, hitboxRadius: 34, moveSpeed: 114, cadence: 1700, enragedCadence: 1250 },
  troll:        { hp: 3600, damage: 19, hitboxRadius: 42, moveSpeed: 58, cadence: 2300, enragedCadence: 1700 },
  werewolf:     { hp: 2900, damage: 16, hitboxRadius: 38, moveSpeed: 136, cadence: 1650, enragedCadence: 1220 },
  minotaur:     { hp: 4200, damage: 18, hitboxRadius: 40, moveSpeed: 74, cadence: 2020, enragedCadence: 1520 },
  wyvern:       { hp: 5200, damage: 17, hitboxRadius: 40, moveSpeed: 102, cadence: 2150, enragedCadence: 1620 },
  ancientBeast: { hp: 12_500, damage: 23, hitboxRadius: 52, moveSpeed: 64, cadence: 2300, enragedCadence: 1750 },
  dragon:       { hp: 25_000, damage: 25, hitboxRadius: 58, moveSpeed: 84, cadence: 2200, enragedCadence: 1550 },
};

export const BOSS_SCALING = {
  hpPerWave: 0.105,
  damagePerWave: 0.024,
  enragedMoveSpeedMultiplier: 1.12,
  phaseBurstMoveSpeedMultiplier: 1.18,
  infernoCooldownMs: 14_000,
  infernoRecoveryMs: 5200,
} as const;

// Offensive skill cadence is intentionally per-ability. `base` is the level-1
// delay, `perLevel` applies at levels 2-7, and `evolved` is the level-8 delay.
export const ABILITY_COOLDOWNS = {
  bolt:      { base: 390,  perLevel: 0.945, evolved: 245,  minimum: 190 },
  meteor:    { base: 5100, perLevel: 0.925, evolved: 2450, minimum: 1900 },
  poison:    { base: 4400, perLevel: 0.930, evolved: 2250, minimum: 1750 },
  shuriken:  { base: 1200, perLevel: 0.920, evolved: 480,  minimum: 340 },
  laser:     { base: 3700, perLevel: 0.925, evolved: 1650, minimum: 1250 },
  arrow:     { base: 4450, perLevel: 0.930, evolved: 2100, minimum: 1550 },
  lightning: { base: 3100, perLevel: 0.920, evolved: 1325, minimum: 1000 },
  fireRing:  { base: 4200, perLevel: 0.930, evolved: 1950, minimum: 1450 },
  iceStorm:  { base: 4000, perLevel: 0.925, evolved: 1750, minimum: 1350 },
  blackHole: { base: 8700, perLevel: 0.940, evolved: 4600, minimum: 3500 },
} as const;

export const WAVES = {
  total: 10,
  bossAtSeconds: 54,
  restDuration: 5,
  majorBossRestDuration: 7,
} as const;

export const XP = {
  baseRequirement: 70,
  growth: 0.88,
} as const;

export const COLORS = {
  ink: 0x071b18,
  deepForest: 0x0d2b25,
  forest: 0x174638,
  moss: 0x39734f,
  fern: 0x61a85f,
  parchment: 0xfff2c2,
  gold: 0xf4c95d,
  coral: 0xff756b,
  cyan: 0x72e6d2,
  violet: 0xb99cff,
} as const;
