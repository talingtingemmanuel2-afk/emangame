import type { AbilityDefinition, AbilityId, EnemyDefinition, EnemyKind, EliteModifier } from '../types';

export const ENEMY_DEFINITIONS: Record<EnemyKind, EnemyDefinition> = {
  slime: {
    kind: 'slime', name: 'Moss Slime', texture: 'enemy-slime', hp: 34, speed: 54,
    damage: 9, xp: 5, scale: 1.35, bodyRadius: 9, firstWave: 1, color: 0x8edb75,
  },
  goblin: {
    kind: 'goblin', name: 'Briar Goblin', texture: 'enemy-goblin', hp: 27, speed: 88,
    damage: 11, xp: 6, scale: 1.3, bodyRadius: 8, firstWave: 2, color: 0xc4de6a,
  },
  bat: {
    kind: 'bat', name: 'Dusk Bat', texture: 'enemy-bat', hp: 19, speed: 126,
    damage: 8, xp: 5, scale: 1.25, bodyRadius: 7, firstWave: 3, color: 0xb8a2df,
  },
  skeleton: {
    kind: 'skeleton', name: 'Rootbound Skeleton', texture: 'enemy-skeleton', hp: 42, speed: 66,
    damage: 13, xp: 8, scale: 1.35, bodyRadius: 8, firstWave: 4, color: 0xeee1b8,
  },
  wolf: {
    kind: 'wolf', name: 'Thorn Wolf', texture: 'enemy-wolf', hp: 48, speed: 96,
    damage: 15, xp: 9, scale: 1.4, bodyRadius: 9, firstWave: 5, color: 0xb8c8bb,
  },
};

export const ABILITY_DEFINITIONS: Record<AbilityId, AbilityDefinition> = {
  bolt: {
    id: 'bolt', name: 'Starlight Bolt', icon: 'icon-bolt', maxLevel: 8, accent: 0x72e6d2,
    description: 'Fires at the nearest threat. Upgrades add power, bolts, and piercing.', evolution: 'Prismatic Volley',
  },
  orb: {
    id: 'orb', name: 'Moon Orbs', icon: 'icon-orb', maxLevel: 8, accent: 0xc5b3ff,
    description: 'Orbiting wisps damage and push back nearby enemies.', evolution: 'Celestial Barrier',
  },
  meteor: {
    id: 'meteor', name: 'Starfall', icon: 'icon-meteor', maxLevel: 8, accent: 0xff9f55,
    description: 'Marks dense groups before crashing explosive meteors.', evolution: 'Meteor Apocalypse',
  },
  poison: {
    id: 'poison', name: 'Witchbloom Flask', icon: 'icon-poison', maxLevel: 8, accent: 0x75d86b,
    description: 'Throws flasks that leave slowing poison pools.', evolution: 'Plague Garden',
  },
  shuriken: {
    id: 'shuriken', name: 'Fae Shuriken', icon: 'icon-shuriken', maxLevel: 8, accent: 0xf5d57c,
    description: 'Spinning blades pierce through enemy lines.', evolution: 'Thousand Petals',
  },
  laser: {
    id: 'laser', name: 'Dawn Ray', icon: 'icon-laser', maxLevel: 8, accent: 0xfff3a1,
    description: 'A piercing ray links the heroine to distant prey.', evolution: 'Aurora Lance',
  },
  arrow: {
    id: 'arrow', name: 'Rebound Arrowhead', icon: 'icon-arrow', maxLevel: 8, accent: 0x76d7ff,
    description: 'Ancient arrowheads ricochet from the world and monsters.', evolution: 'Endless Hunt',
  },
  lightning: {
    id: 'lightning', name: 'Chain Lightning', icon: 'icon-lightning', maxLevel: 8, accent: 0x9ddcff,
    description: 'Lightning leaps through tightly packed foes.', evolution: 'Stormcrown',
  },
  fireRing: {
    id: 'fireRing', name: 'Ember Halo', icon: 'icon-fire-ring', maxLevel: 8, accent: 0xff7f5b,
    description: 'A periodic ring of fire clears breathing room.', evolution: 'Solar Corona',
  },
  iceStorm: {
    id: 'iceStorm', name: 'Winterglass', icon: 'icon-ice', maxLevel: 8, accent: 0xa8efff,
    description: 'Ice shards seek nearby enemies and slow their advance.', evolution: 'Absolute Bloom',
  },
  blackHole: {
    id: 'blackHole', name: 'Night Vortex', icon: 'icon-black-hole', maxLevel: 8, accent: 0xb17cff, rare: true,
    description: 'A rare singularity pulls, wounds, then detonates.', evolution: 'Eventide Collapse',
  },
};

export const STANDARD_ABILITY_IDS = (Object.keys(ABILITY_DEFINITIONS) as AbilityId[]).filter((id) => id !== 'bolt');

export const ELITE_MODIFIERS: EliteModifier[] = ['Swift', 'Armored', 'Explosive', 'Vampiric', 'Frenzied'];

export const getWaveEnemyWeights = (wave: number): Array<{ kind: EnemyKind; weight: number }> => {
  if (wave === 1) return [{ kind: 'slime', weight: 1 }];
  if (wave === 2) return [{ kind: 'slime', weight: 0.55 }, { kind: 'goblin', weight: 0.45 }];
  if (wave === 3) return [{ kind: 'goblin', weight: 0.65 }, { kind: 'bat', weight: 0.35 }];
  const available = (Object.keys(ENEMY_DEFINITIONS) as EnemyKind[]).filter(
    (kind) => ENEMY_DEFINITIONS[kind].firstWave <= wave,
  );
  return available.map((kind) => {
    const lateBias = kind === 'skeleton' || kind === 'wolf' ? 0.06 * Math.max(0, wave - 7) : 0;
    return { kind, weight: 1 + lateBias };
  });
};
