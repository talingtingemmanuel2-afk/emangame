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
  maxEnemies: 110,
  maxProjectiles: 96,
  maxGems: 180,
  playerAbilityDamageMultiplier: 1.16,
  playerAbilityVisualMultiplier: 1.24,
} as const;

export const ENEMY_BALANCE = {
  hpPerWave: 0.085,
  damagePerWave: 0.028,
  speedPerWave: 0.018,
  attackCooldownPerWave: 0.022,
  minimumAttackCooldownMultiplier: 0.80,
  xpPerWave: 0.045,
  eliteFirstWave: 2,
  eliteBaseChance: 0,
  eliteChancePerWave: 0.018,
  eliteMaxChance: 0.19,
  eliteHpMultiplier: 1.9,
  armoredHpMultiplier: 2.45,
  eliteDamageMultiplier: 1.2,
  eliteXpMultiplier: 2.3,
  separationRadius: 34,
  separationStrength: 0.48,
  maxRangedAttackers: 6,
  rangedAttackLeaseMs: 1250,
  maxEnemyProjectiles: 96,
  maxDangerWarnings: 24,
  contactCooldownMs: 760,
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
  1: { spawnIntervalMs: 1120, spawnGroupMin: 1, spawnGroupMax: 1, maxActiveEnemies: 38, maxRangedAttackers: 2, bossAtSeconds: 52 },
  2: { spawnIntervalMs: 980, spawnGroupMin: 1, spawnGroupMax: 2, maxActiveEnemies: 48, maxRangedAttackers: 3, bossAtSeconds: 54 },
  3: { spawnIntervalMs: 860, spawnGroupMin: 2, spawnGroupMax: 2, maxActiveEnemies: 58, maxRangedAttackers: 4, bossAtSeconds: 56 },
  4: { spawnIntervalMs: 760, spawnGroupMin: 2, spawnGroupMax: 3, maxActiveEnemies: 70, maxRangedAttackers: 5, bossAtSeconds: 58 },
  5: { spawnIntervalMs: 0, spawnGroupMin: 0, spawnGroupMax: 0, maxActiveEnemies: 0, maxRangedAttackers: 4, bossAtSeconds: 4 },
  6: { spawnIntervalMs: 820, spawnGroupMin: 2, spawnGroupMax: 2, maxActiveEnemies: 68, maxRangedAttackers: 5, bossAtSeconds: 58 },
  7: { spawnIntervalMs: 690, spawnGroupMin: 2, spawnGroupMax: 3, maxActiveEnemies: 82, maxRangedAttackers: 6, bossAtSeconds: 59 },
  8: { spawnIntervalMs: 590, spawnGroupMin: 3, spawnGroupMax: 4, maxActiveEnemies: 96, maxRangedAttackers: 7, bossAtSeconds: 60 },
  9: { spawnIntervalMs: 520, spawnGroupMin: 4, spawnGroupMax: 5, maxActiveEnemies: 108, maxRangedAttackers: 8, bossAtSeconds: 61 },
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
  golem:        { hp: 1100, damage: 14, hitboxRadius: 40, moveSpeed: 68, cadence: 2350, enragedCadence: 1800 },
  vampire:      { hp: 2900, damage: 17, hitboxRadius: 36, moveSpeed: 112, cadence: 2050, enragedCadence: 1500 },
  darkMage:     { hp: 3100, damage: 18, hitboxRadius: 36, moveSpeed: 84, cadence: 2100, enragedCadence: 1580 },
  rooster:      { hp: 2500, damage: 15, hitboxRadius: 34, moveSpeed: 114, cadence: 1900, enragedCadence: 1400 },
  troll:        { hp: 2400, damage: 17, hitboxRadius: 42, moveSpeed: 58, cadence: 2550, enragedCadence: 1900 },
  werewolf:     { hp: 1900, damage: 14, hitboxRadius: 38, moveSpeed: 136, cadence: 1850, enragedCadence: 1380 },
  minotaur:     { hp: 2800, damage: 16, hitboxRadius: 40, moveSpeed: 74, cadence: 2250, enragedCadence: 1700 },
  wyvern:       { hp: 3450, damage: 15, hitboxRadius: 40, moveSpeed: 102, cadence: 2400, enragedCadence: 1820 },
  ancientBeast: { hp: 8000, damage: 20, hitboxRadius: 52, moveSpeed: 64, cadence: 2550, enragedCadence: 1950 },
  dragon:       { hp: 16_500, damage: 22, hitboxRadius: 58, moveSpeed: 84, cadence: 2450, enragedCadence: 1750 },
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
