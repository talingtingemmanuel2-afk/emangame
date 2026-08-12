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
  magicBoltCooldown: 620,
  projectileSpeed: 520,
  criticalChance: 0.08,
  criticalMultiplier: 1.85,
  maxEnemies: 155,
  maxProjectiles: 96,
  maxGems: 180,
} as const;

export const WAVES = {
  total: 20,
  duration: 34,
  bossAtSeconds: 25,
  restDuration: 4,
} as const;

export const XP = {
  baseRequirement: 24,
  growth: 1.24,
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
