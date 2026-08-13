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
} as const;

export const ENEMY_BALANCE = {
  hpPerWave: 0.09,
  damagePerWave: 0.02,
  xpPerWave: 0.045,
  eliteFirstWave: 6,
  eliteBaseChance: 0.014,
  eliteChancePerWave: 0.005,
  eliteMaxChance: 0.15,
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
  maxActiveEnemies: number;
  maxRangedAttackers: number;
  bossAtSeconds: number;
}

export const WAVE_TUNING: Record<number, WaveTuning> = {
  1: { spawnIntervalMs: 1200, maxActiveEnemies: 38, maxRangedAttackers: 3, bossAtSeconds: 54 },
  2: { spawnIntervalMs: 1100, maxActiveEnemies: 44, maxRangedAttackers: 3, bossAtSeconds: 55 },
  3: { spawnIntervalMs: 1000, maxActiveEnemies: 50, maxRangedAttackers: 4, bossAtSeconds: 56 },
  4: { spawnIntervalMs: 920, maxActiveEnemies: 58, maxRangedAttackers: 4, bossAtSeconds: 57 },
  5: { spawnIntervalMs: 0, maxActiveEnemies: 0, maxRangedAttackers: 4, bossAtSeconds: 4 },
  6: { spawnIntervalMs: 1050, maxActiveEnemies: 52, maxRangedAttackers: 4, bossAtSeconds: 58 },
  7: { spawnIntervalMs: 850, maxActiveEnemies: 65, maxRangedAttackers: 5, bossAtSeconds: 59 },
  8: { spawnIntervalMs: 760, maxActiveEnemies: 75, maxRangedAttackers: 5, bossAtSeconds: 60 },
  9: { spawnIntervalMs: 690, maxActiveEnemies: 85, maxRangedAttackers: 6, bossAtSeconds: 60 },
  10: { spawnIntervalMs: 0, maxActiveEnemies: 0, maxRangedAttackers: 6, bossAtSeconds: 4 },
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
  golem:        { hp: 760, damage: 14, hitboxRadius: 40, moveSpeed: 58, cadence: 3100, enragedCadence: 2500 },
  vampire:      { hp: 720, damage: 14, hitboxRadius: 30, moveSpeed: 88, cadence: 2800, enragedCadence: 2200 },
  rooster:      { hp: 1800, damage: 15, hitboxRadius: 34, moveSpeed: 98, cadence: 2500, enragedCadence: 1900 },
  troll:        { hp: 1700, damage: 17, hitboxRadius: 42, moveSpeed: 48, cadence: 3400, enragedCadence: 2600 },
  werewolf:     { hp: 1350, damage: 14, hitboxRadius: 38, moveSpeed: 118, cadence: 2500, enragedCadence: 1950 },
  minotaur:     { hp: 2000, damage: 16, hitboxRadius: 40, moveSpeed: 62, cadence: 3000, enragedCadence: 2350 },
  wyvern:       { hp: 2500, damage: 15, hitboxRadius: 40, moveSpeed: 88, cadence: 3200, enragedCadence: 2500 },
  ancientBeast: { hp: 6000, damage: 20, hitboxRadius: 52, moveSpeed: 54, cadence: 3500, enragedCadence: 2800 },
  dragon:       { hp: 12_000, damage: 22, hitboxRadius: 58, moveSpeed: 70, cadence: 3400, enragedCadence: 2450 },
};

export const BOSS_SCALING = {
  hpPerWave: 0.09,
  damagePerWave: 0.02,
  enragedMoveSpeedMultiplier: 1.08,
  phaseBurstMoveSpeedMultiplier: 1.12,
  infernoCooldownMs: 18_000,
  infernoRecoveryMs: 6200,
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
