export const WORLD_SIZE = 4096;

export const PLAYER = {
  maxHp: 120,
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
  maxEnemies: 155,
  maxProjectiles: 96,
  maxGems: 180,
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
  duration: 72,
  bossAtSeconds: 58,
  restDuration: 4,
} as const;

export const XP = {
  baseRequirement: 22,
  growth: 1.18,
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
