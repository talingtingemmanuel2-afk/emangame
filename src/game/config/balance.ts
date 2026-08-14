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
  1: { spawnIntervalMs: 920, spawnGroupMin: 2, spawnGroupMax: 3, maxActiveEnemies: 54, maxRangedAttackers: 3, bossAtSeconds: 52 },
  2: { spawnIntervalMs: 800, spawnGroupMin: 3, spawnGroupMax: 4, maxActiveEnemies: 68, maxRangedAttackers: 4, bossAtSeconds: 54 },
  3: { spawnIntervalMs: 690, spawnGroupMin: 4, spawnGroupMax: 5, maxActiveEnemies: 82, maxRangedAttackers: 5, bossAtSeconds: 56 },
  4: { spawnIntervalMs: 600, spawnGroupMin: 5, spawnGroupMax: 6, maxActiveEnemies: 96, maxRangedAttackers: 6, bossAtSeconds: 58 },
  5: { spawnIntervalMs: 0, spawnGroupMin: 0, spawnGroupMax: 0, maxActiveEnemies: 0, maxRangedAttackers: 4, bossAtSeconds: 4 },
  6: { spawnIntervalMs: 620, spawnGroupMin: 5, spawnGroupMax: 6, maxActiveEnemies: 108, maxRangedAttackers: 7, bossAtSeconds: 58 },
  7: { spawnIntervalMs: 520, spawnGroupMin: 6, spawnGroupMax: 7, maxActiveEnemies: 120, maxRangedAttackers: 8, bossAtSeconds: 59 },
  8: { spawnIntervalMs: 440, spawnGroupMin: 7, spawnGroupMax: 8, maxActiveEnemies: 132, maxRangedAttackers: 9, bossAtSeconds: 60 },
  9: { spawnIntervalMs: 380, spawnGroupMin: 8, spawnGroupMax: 10, maxActiveEnemies: 140, maxRangedAttackers: 10, bossAtSeconds: 61 },
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
  golem:        { hp: 2200, damage: 18, hitboxRadius: 40, moveSpeed: 108, cadence: 1850, enragedCadence: 1380 },
  vampire:      { hp: 5500, damage: 22, hitboxRadius: 36, moveSpeed: 170, cadence: 1600, enragedCadence: 1150 },
  darkMage:     { hp: 5900, damage: 23, hitboxRadius: 36, moveSpeed: 138, cadence: 1650, enragedCadence: 1200 },
  rooster:      { hp: 4700, damage: 20, hitboxRadius: 34, moveSpeed: 175, cadence: 1480, enragedCadence: 1080 },
  troll:        { hp: 4600, damage: 22, hitboxRadius: 42, moveSpeed: 104, cadence: 1980, enragedCadence: 1450 },
  werewolf:     { hp: 3700, damage: 19, hitboxRadius: 38, moveSpeed: 205, cadence: 1420, enragedCadence: 1050 },
  minotaur:     { hp: 5400, damage: 21, hitboxRadius: 40, moveSpeed: 128, cadence: 1750, enragedCadence: 1300 },
  wyvern:       { hp: 6600, damage: 20, hitboxRadius: 40, moveSpeed: 165, cadence: 1850, enragedCadence: 1380 },
  ancientBeast: { hp: 20_000, damage: 30, hitboxRadius: 52, moveSpeed: 132, cadence: 1800, enragedCadence: 1280 },
  dragon:       { hp: 40_000, damage: 34, hitboxRadius: 58, moveSpeed: 175, cadence: 1550, enragedCadence: 1050 },
};

export const BOSS_SCALING = {
  hpPerWave: 0.105,
  damagePerWave: 0.024,
  enragedMoveSpeedMultiplier: 1.18,
  phaseBurstMoveSpeedMultiplier: 1.25,
  infernoCooldownMs: 14_000,
  infernoRecoveryMs: 5200,
  skillCooldownMultiplier: 0.78,
} as const;

// Offensive skill cadence is intentionally per-ability. `base` is the level-1
// delay, `perLevel` applies at levels 2-4, and `evolved` is the level-5 delay.
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
