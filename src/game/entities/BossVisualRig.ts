import Phaser from 'phaser';
import type { BossKind } from '../types';

export type BossVisualState =
  | 'entering'
  | 'normal'
  | 'moving'
  | 'charging'
  | 'recovering'
  | 'regenerating'
  | 'enraged'
  | 'dying';

export interface BossVisualMetrics {
  /** Composite scale before the optional multiplier passed to configure/spawn. */
  readonly scale: number;
  /** Approximate visible width in world pixels at the default scale. */
  readonly width: number;
  /** Approximate visible height in world pixels at the default scale. */
  readonly height: number;
  /** Suggested world-space torso radius for an independently configured physics body. */
  readonly bodyRadius: number;
  /** Suggested external shadow dimensions. BossVisualRig intentionally does not own shadows. */
  readonly shadowWidth: number;
  readonly shadowHeight: number;
  readonly shadowOffsetY: number;
  readonly airborne: boolean;
}

type PartRole =
  | 'body' | 'head' | 'jaw' | 'neck' | 'snout' | 'comb' | 'beak'
  | 'wingLeft' | 'wingRight' | 'armLeft' | 'armRight'
  | 'legLeft' | 'legRight' | 'talonLeft' | 'talonRight'
  | 'tail1' | 'tail2' | 'tail3' | 'weapon' | 'hornLeft' | 'hornRight'
  | 'vine' | 'crystal' | 'detail';

interface PartBlueprint {
  readonly id: string;
  readonly texture: string;
  readonly role: PartRole;
  readonly x: number;
  readonly y: number;
  readonly angle?: number;
  readonly originX?: number;
  readonly originY?: number;
  readonly scaleX?: number;
  readonly scaleY?: number;
  readonly flipX?: boolean;
  readonly alpha?: number;
}

interface RigSpec extends BossVisualMetrics {
  readonly parts: readonly PartBlueprint[];
}

interface RuntimePart {
  readonly blueprint: PartBlueprint;
  readonly image: Phaser.GameObjects.Image;
}

const part = (
  id: string,
  texture: string,
  role: PartRole,
  x: number,
  y: number,
  options: Omit<PartBlueprint, 'id' | 'texture' | 'role' | 'x' | 'y'> = {},
): PartBlueprint => ({ id, texture, role, x, y, ...options });

const RIG_SPECS: Record<BossKind, RigSpec> = {
  rooster: {
    scale: 1.75, width: 202, height: 192, bodyRadius: 34,
    shadowWidth: 122, shadowHeight: 30, shadowOffsetY: 84, airborne: false,
    parts: [
      part('tail', 'rig-rooster-tail', 'tail1', -18, -9, { originX: 0.86, originY: 0.5, angle: -7 }),
      part('farWing', 'rig-rooster-wing', 'wingLeft', -5, -12, { originX: 0.78, originY: 0.2, flipX: true, alpha: 0.82 }),
      part('leftLeg', 'rig-rooster-leg', 'legLeft', -8, 18, { originX: 0.5, originY: 0.1, angle: 4 }),
      part('leftTalon', 'rig-rooster-talon', 'talonLeft', -9, 42, { originX: 0.52, originY: 0.38, flipX: true }),
      part('body', 'rig-rooster-body', 'body', 0, -4),
      part('rightLeg', 'rig-rooster-leg', 'legRight', 9, 18, { originX: 0.5, originY: 0.1, angle: -4 }),
      part('rightTalon', 'rig-rooster-talon', 'talonRight', 11, 43, { originX: 0.48, originY: 0.38 }),
      part('nearWing', 'rig-rooster-wing', 'wingRight', 5, -12, { originX: 0.22, originY: 0.2 }),
      part('neck', 'rig-rooster-neck', 'neck', 15, -24, { originX: 0.45, originY: 0.75, angle: -6 }),
      part('head', 'rig-rooster-head', 'head', 27, -39, { originX: 0.45, originY: 0.58 }),
      part('beak', 'rig-rooster-beak', 'beak', 42, -38, { originX: 0.08, originY: 0.5 }),
      part('comb', 'rig-rooster-comb', 'comb', 23, -53, { originX: 0.5, originY: 0.82 }),
    ],
  },
  troll: {
    scale: 1.8, width: 174, height: 198, bodyRadius: 42,
    shadowWidth: 132, shadowHeight: 34, shadowOffsetY: 90, airborne: false,
    parts: [
      part('leftLeg', 'rig-troll-leg', 'legLeft', -14, 20, { originX: 0.5, originY: 0.12, angle: 3 }),
      part('rightLeg', 'rig-troll-leg', 'legRight', 14, 20, { originX: 0.5, originY: 0.12, angle: -3, flipX: true }),
      part('body', 'rig-troll-body', 'body', 0, -5),
      part('farArm', 'rig-troll-arm', 'armLeft', -24, -14, { originX: 0.5, originY: 0.12, angle: 8, flipX: true }),
      part('head', 'rig-troll-head', 'head', 8, -32, { originX: 0.5, originY: 0.58, angle: 4 }),
      part('jaw', 'rig-troll-jaw', 'jaw', 10, -23, { originX: 0.5, originY: 0.16 }),
      part('nearArm', 'rig-troll-arm', 'armRight', 24, -13, { originX: 0.5, originY: 0.12, angle: -10 }),
      part('club', 'rig-troll-club', 'weapon', 31, 4, { originX: 0.5, originY: 0.82, angle: 24 }),
    ],
  },
  minotaur: {
    scale: 1.95, width: 172, height: 204, bodyRadius: 40,
    shadowWidth: 124, shadowHeight: 31, shadowOffsetY: 100, airborne: false,
    parts: [
      part('leftLeg', 'rig-minotaur-leg', 'legLeft', -13, 19, { originX: 0.5, originY: 0.1, angle: 3 }),
      part('rightLeg', 'rig-minotaur-leg', 'legRight', 13, 19, { originX: 0.5, originY: 0.1, angle: -3, flipX: true }),
      part('body', 'rig-minotaur-body', 'body', 0, -5),
      part('farArm', 'rig-minotaur-arm', 'armLeft', -21, -12, { originX: 0.5, originY: 0.1, angle: 8, flipX: true }),
      part('head', 'rig-minotaur-head', 'head', 2, -34, { originX: 0.5, originY: 0.56 }),
      part('leftHorn', 'rig-minotaur-horn', 'hornLeft', -14, -44, { originX: 0.88, originY: 0.7, flipX: true, angle: -8 }),
      part('rightHorn', 'rig-minotaur-horn', 'hornRight', 17, -44, { originX: 0.88, originY: 0.7, angle: 8 }),
      part('snout', 'rig-minotaur-snout', 'snout', 7, -27, { originX: 0.5, originY: 0.45 }),
      part('nearArm', 'rig-minotaur-arm', 'armRight', 22, -12, { originX: 0.5, originY: 0.1, angle: -8 }),
      part('axe', 'rig-minotaur-axe', 'weapon', 28, 5, { originX: 0.5, originY: 0.84, angle: 18 }),
    ],
  },
  werewolf: {
    scale: 2, width: 174, height: 194, bodyRadius: 38,
    shadowWidth: 116, shadowHeight: 29, shadowOffsetY: 108, airborne: false,
    parts: [
      part('tail', 'rig-werewolf-tail', 'tail1', -19, 7, { originX: 0.88, originY: 0.5, angle: -9 }),
      part('leftLeg', 'rig-werewolf-leg', 'legLeft', -12, 18, { originX: 0.5, originY: 0.08, angle: 5 }),
      part('rightLeg', 'rig-werewolf-leg', 'legRight', 12, 18, { originX: 0.5, originY: 0.08, angle: -5, flipX: true }),
      part('body', 'rig-werewolf-body', 'body', 0, -7, { angle: 4 }),
      part('farArm', 'rig-werewolf-arm', 'armLeft', -21, -15, { originX: 0.5, originY: 0.08, angle: 15, flipX: true }),
      part('head', 'rig-werewolf-head', 'head', 8, -35, { originX: 0.5, originY: 0.55, angle: 5 }),
      part('muzzle', 'rig-werewolf-muzzle', 'snout', 22, -29, { originX: 0.12, originY: 0.5 }),
      part('nearArm', 'rig-werewolf-arm', 'armRight', 21, -14, { originX: 0.5, originY: 0.08, angle: -15 }),
    ],
  },
  wyvern: {
    scale: 1.7, width: 252, height: 174, bodyRadius: 40,
    shadowWidth: 158, shadowHeight: 40, shadowOffsetY: 64, airborne: true,
    parts: [
      part('tailTip', 'rig-wyvern-tail', 'tail3', -64, 9, { originX: 0.92, originY: 0.5, scaleX: 0.82, scaleY: 0.82, angle: 12 }),
      part('tailBase', 'rig-wyvern-tail', 'tail2', -37, 6, { originX: 0.92, originY: 0.5, angle: 4 }),
      part('farWing', 'rig-wyvern-wing', 'wingLeft', -6, -10, { originX: 0.84, originY: 0.82, angle: -11, flipX: true, alpha: 0.82 }),
      part('leftClaw', 'rig-wyvern-leg', 'legLeft', -8, 11, { originX: 0.5, originY: 0.08, angle: 7 }),
      part('body', 'rig-wyvern-body', 'body', 0, 0),
      part('rightClaw', 'rig-wyvern-leg', 'legRight', 11, 11, { originX: 0.5, originY: 0.08, angle: -7, flipX: true }),
      part('nearWing', 'rig-wyvern-wing', 'wingRight', 6, -9, { originX: 0.16, originY: 0.82, angle: 11 }),
      part('neck', 'rig-wyvern-neck', 'neck', 23, -13, { originX: 0.18, originY: 0.72, angle: -20 }),
      part('head', 'rig-wyvern-head', 'head', 42, -27, { originX: 0.35, originY: 0.55, angle: 3 }),
      part('jaw', 'rig-wyvern-jaw', 'jaw', 51, -21, { originX: 0.08, originY: 0.18 }),
    ],
  },
  ancientBeast: {
    scale: 1.72, width: 356, height: 226, bodyRadius: 52,
    shadowWidth: 220, shadowHeight: 54, shadowOffsetY: 78, airborne: true,
    parts: [
      part('tailTip', 'rig-ancient-tail', 'tail3', -88, 11, { originX: 0.92, originY: 0.5, scaleX: 0.78, scaleY: 0.78, angle: 14 }),
      part('tailMiddle', 'rig-ancient-tail', 'tail2', -61, 7, { originX: 0.92, originY: 0.5, scaleX: 0.9, scaleY: 0.9, angle: 7 }),
      part('tailBase', 'rig-ancient-tail', 'tail1', -34, 3, { originX: 0.92, originY: 0.5 }),
      part('farWing', 'rig-ancient-wing', 'wingLeft', -8, -16, { originX: 0.88, originY: 0.84, angle: -8, flipX: true, alpha: 0.76 }),
      part('leftLeg', 'rig-ancient-leg', 'legLeft', -14, 14, { originX: 0.5, originY: 0.08, angle: 7 }),
      part('ribcage', 'rig-ancient-body', 'body', 0, 0),
      part('rightLeg', 'rig-ancient-leg', 'legRight', 17, 14, { originX: 0.5, originY: 0.08, angle: -7, flipX: true }),
      part('nearWing', 'rig-ancient-wing', 'wingRight', 9, -15, { originX: 0.12, originY: 0.84, angle: 8 }),
      part('neck', 'rig-ancient-neck', 'neck', 27, -13, { originX: 0.16, originY: 0.72, angle: -24 }),
      part('skull', 'rig-ancient-skull', 'head', 51, -33, { originX: 0.32, originY: 0.55, angle: 4 }),
      part('jaw', 'rig-ancient-jaw', 'jaw', 62, -25, { originX: 0.08, originY: 0.14 }),
      part('vines', 'rig-ancient-vines', 'vine', -5, 7, { alpha: 0.92 }),
      part('crystal', 'rig-ancient-crystal', 'crystal', 12, -22, { originX: 0.5, originY: 0.82 }),
    ],
  },
  dragon: {
    scale: 1.72, width: 414, height: 268, bodyRadius: 58,
    shadowWidth: 260, shadowHeight: 62, shadowOffsetY: 88, airborne: true,
    parts: [
      part('tailTip', 'rig-dragon-tail', 'tail3', -101, 13, { originX: 0.94, originY: 0.5, scaleX: 0.72, scaleY: 0.72, angle: 15 }),
      part('tailMiddle', 'rig-dragon-tail', 'tail2', -72, 8, { originX: 0.94, originY: 0.5, scaleX: 0.86, scaleY: 0.86, angle: 8 }),
      part('tailBase', 'rig-dragon-tail', 'tail1', -40, 3, { originX: 0.94, originY: 0.5 }),
      part('farWing', 'rig-dragon-wing', 'wingLeft', -9, -20, { originX: 0.9, originY: 0.86, angle: -7, flipX: true, alpha: 0.82 }),
      part('leftRearLeg', 'rig-dragon-rear-leg', 'legLeft', -15, 15, { originX: 0.5, originY: 0.08, angle: 7 }),
      part('body', 'rig-dragon-body', 'body', 0, 0),
      part('rightRearLeg', 'rig-dragon-rear-leg', 'legRight', 17, 15, { originX: 0.5, originY: 0.08, angle: -7, flipX: true }),
      part('nearWing', 'rig-dragon-wing', 'wingRight', 10, -19, { originX: 0.1, originY: 0.86, angle: 7 }),
      part('leftClaw', 'rig-dragon-foreleg', 'armLeft', 18, 3, { originX: 0.5, originY: 0.08, angle: 11, flipX: true }),
      part('neck', 'rig-dragon-neck', 'neck', 31, -17, { originX: 0.15, originY: 0.75, angle: -25 }),
      part('head', 'rig-dragon-head', 'head', 57, -39, { originX: 0.31, originY: 0.57, angle: 3 }),
      part('jaw', 'rig-dragon-jaw', 'jaw', 70, -30, { originX: 0.08, originY: 0.14 }),
      part('leftHorn', 'rig-dragon-horn', 'hornLeft', 49, -52, { originX: 0.82, originY: 0.84, angle: -18, flipX: true }),
      part('rightHorn', 'rig-dragon-horn', 'hornRight', 61, -51, { originX: 0.82, originY: 0.84, angle: 2 }),
      part('rightClaw', 'rig-dragon-foreleg', 'armRight', 28, 4, { originX: 0.5, originY: 0.08, angle: -11 }),
    ],
  },
  golem: {
    scale: 2.25, width: 153, height: 171, bodyRadius: 40,
    shadowWidth: 118, shadowHeight: 30, shadowOffsetY: 82, airborne: false,
    parts: [part('legacy', 'boss-golem', 'body', 0, 0)],
  },
  vampire: {
    scale: 2.35, width: 122, height: 150, bodyRadius: 30,
    shadowWidth: 92, shadowHeight: 25, shadowOffsetY: 72, airborne: false,
    parts: [part('legacy', 'boss-vampire', 'body', 0, 0)],
  },
};

const clamp01 = (value: number): number => Phaser.Math.Clamp(value, 0, 1);

export class BossVisualRig {
  readonly container: Phaser.GameObjects.Container;
  private parts: RuntimePart[] = [];
  private kind: BossKind = 'golem';
  private spec: RigSpec = RIG_SPECS.golem;
  private scaleMultiplier = 1;
  private baseAlpha = 1;
  private activeAttack = '';
  private attackStartedAt = 0;
  private attackDuration = 1;
  private deathStartedAt = -1;
  private deathDuration = 720;
  private lastX = Number.NaN;
  private lastY = Number.NaN;
  private flashGeneration = 0;
  private destroyed = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(-10_000, -10_000).setVisible(false);
  }

  get metrics(): BossVisualMetrics {
    return this.spec;
  }

  get currentKind(): BossKind {
    return this.kind;
  }

  configure(kind: BossKind, visualScale = 1): this {
    if (this.destroyed) return this;
    const kindChanged = kind !== this.kind || this.parts.length === 0;
    this.kind = kind;
    this.spec = RIG_SPECS[kind];
    this.scaleMultiplier = Math.max(0.35, visualScale);
    if (kindChanged) this.buildParts();
    this.resetPose();
    return this;
  }

  spawn(kind: BossKind, x: number, y: number, depth: number, visualScale = 1): this {
    this.configure(kind, visualScale);
    this.container.setPosition(x, y).setDepth(depth).setVisible(true).setAlpha(1);
    this.baseAlpha = 1;
    this.lastX = x;
    this.lastY = y;
    return this;
  }

  sync(
    x: number,
    y: number,
    depth: number,
    flipX: boolean,
    time: number,
    phase: number,
    state: BossVisualState | string = 'normal',
  ): this {
    if (this.destroyed || !this.container.visible) return this;
    const moved = Number.isFinite(this.lastX)
      ? Phaser.Math.Clamp(Math.hypot(x - this.lastX, y - this.lastY) * 0.55, 0, 1)
      : 0;
    this.lastX = x;
    this.lastY = y;

    const baseScale = this.spec.scale * this.scaleMultiplier;
    const entering = state === 'entering';
    const charging = state === 'charging';
    const regenerating = state === 'regenerating';
    const enraged = state === 'enraged' || phase >= 2;
    const stride = Math.sin(time * (charging ? 0.026 : 0.012));
    const idle = Math.sin(time * 0.0045);
    const flight = Math.sin(time * 0.0062);
    const attackProgress = this.attackProgress(time);
    const deathProgress = this.deathStartedAt >= 0 ? clamp01((time - this.deathStartedAt) / this.deathDuration) : 0;

    const entryScale = entering ? 0.96 + Math.sin(time * 0.01) * 0.015 : 1;
    const rageScale = enraged ? 1 + Math.sin(time * 0.009) * 0.012 : 1;
    this.container
      .setPosition(x, y)
      .setDepth(depth)
      .setScale((flipX ? -1 : 1) * baseScale * entryScale * rageScale, baseScale * entryScale * rageScale)
      .setRotation(deathProgress * (flipX ? -0.42 : 0.42))
      .setAlpha(this.baseAlpha * (1 - deathProgress * 0.9));

    for (const runtime of this.parts) {
      const blueprint = runtime.blueprint;
      const image = runtime.image;
      const basePartScaleX = blueprint.scaleX ?? 1;
      const basePartScaleY = blueprint.scaleY ?? 1;
      let partX = blueprint.x;
      let partY = blueprint.y;
      let partAngle = blueprint.angle ?? 0;
      let partScaleX = basePartScaleX;
      let partScaleY = basePartScaleY;
      let partAlpha = blueprint.alpha ?? 1;

      if (blueprint.role === 'body') {
        partY += idle * (this.spec.airborne ? 1.5 : 0.7);
        if (charging) { partX += 3; partY += 3; partAngle += 7; }
        if (regenerating) {
          const pulse = 1 + Math.sin(time * 0.012) * 0.035;
          partScaleX *= pulse;
          partScaleY *= pulse;
        }
      } else if (blueprint.role === 'head' || blueprint.role === 'neck' || blueprint.role === 'snout' || blueprint.role === 'beak') {
        partY += idle * 0.65;
        if (charging) { partX += 4; partY += 2; partAngle += 7; }
      } else if (blueprint.role === 'legLeft' || blueprint.role === 'talonLeft') {
        partAngle += stride * (charging ? 16 : 7) * Math.max(0.35, moved);
        partY += Math.max(0, -stride) * (charging ? 3 : 1.2);
      } else if (blueprint.role === 'legRight' || blueprint.role === 'talonRight') {
        partAngle -= stride * (charging ? 16 : 7) * Math.max(0.35, moved);
        partY += Math.max(0, stride) * (charging ? 3 : 1.2);
      } else if (blueprint.role === 'armLeft') {
        partAngle -= stride * 5 * Math.max(0.25, moved);
      } else if (blueprint.role === 'armRight') {
        partAngle += stride * 5 * Math.max(0.25, moved);
      } else if (blueprint.role === 'wingLeft') {
        partAngle += flight * (this.spec.airborne ? 12 : 3);
        partScaleY *= 1 - flight * 0.025;
      } else if (blueprint.role === 'wingRight') {
        partAngle -= flight * (this.spec.airborne ? 12 : 3);
        partScaleY *= 1 + flight * 0.025;
      } else if (blueprint.role === 'tail1' || blueprint.role === 'tail2' || blueprint.role === 'tail3') {
        const segment = blueprint.role === 'tail1' ? 0 : blueprint.role === 'tail2' ? 0.7 : 1.35;
        partAngle += Math.sin(time * 0.005 + segment) * (charging ? 9 : 4.5);
      } else if ((blueprint.role === 'vine' || blueprint.role === 'crystal') && (regenerating || enraged)) {
        partAlpha *= 0.78 + Math.sin(time * 0.01) * 0.22;
        partScaleX *= 1 + Math.sin(time * 0.008) * 0.04;
        partScaleY *= 1 + Math.sin(time * 0.008) * 0.04;
      }

      if (attackProgress >= 0) {
        const attackPose = this.attackEnvelope(attackProgress);
        ({ x: partX, y: partY, angle: partAngle, scaleX: partScaleX, scaleY: partScaleY } = this.applyAttackPose(
          blueprint.role, partX, partY, partAngle, partScaleX, partScaleY, attackProgress, attackPose,
        ));
      }

      if (deathProgress > 0) {
        const scatter = this.partScatter(blueprint.role);
        partX += scatter.x * deathProgress;
        partY += (scatter.y + 18 * deathProgress) * deathProgress;
        partAngle += scatter.angle * deathProgress;
        partAlpha *= 1 - deathProgress * 0.72;
      }

      image
        .setPosition(partX, partY)
        .setAngle(partAngle)
        .setScale(partScaleX, partScaleY)
        .setAlpha(partAlpha);
    }
    return this;
  }

  setAlpha(alpha: number): this {
    this.baseAlpha = Phaser.Math.Clamp(alpha, 0, 1);
    this.container.setAlpha(this.baseAlpha);
    return this;
  }

  setVisible(visible: boolean): this {
    this.container.setVisible(visible);
    return this;
  }

  playAttack(cue: string, durationMs = 680): this {
    this.activeAttack = cue.trim().toLowerCase();
    this.attackStartedAt = this.scene.time.now;
    this.attackDuration = Math.max(120, durationMs);
    return this;
  }

  flash(tint = 0xffffff, durationMs = 75): this {
    if (this.destroyed) return this;
    const token = ++this.flashGeneration;
    for (const runtime of this.parts) runtime.image.setTintFill(tint);
    this.scene.time.delayedCall(Math.max(16, durationMs), () => {
      if (this.destroyed || token !== this.flashGeneration) return;
      for (const runtime of this.parts) runtime.image.clearTint();
    });
    return this;
  }

  playDeath(durationMs = 720): this {
    this.deathStartedAt = this.scene.time.now;
    this.deathDuration = Math.max(240, durationMs);
    this.activeAttack = '';
    return this;
  }

  recycle(): this {
    if (this.destroyed) return this;
    this.flashGeneration += 1;
    for (const runtime of this.parts) runtime.image.clearTint();
    this.container.setVisible(false).setAlpha(1).setRotation(0).setPosition(-10_000, -10_000);
    this.baseAlpha = 1;
    this.activeAttack = '';
    this.deathStartedAt = -1;
    this.lastX = Number.NaN;
    this.lastY = Number.NaN;
    return this;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.flashGeneration += 1;
    this.parts = [];
    this.container.destroy(true);
  }

  private buildParts(): void {
    this.container.removeAll(true);
    this.parts = this.spec.parts.map((blueprint) => {
      const image = this.scene.add.image(blueprint.x, blueprint.y, blueprint.texture)
        .setOrigin(blueprint.originX ?? 0.5, blueprint.originY ?? 0.5)
        .setFlipX(blueprint.flipX ?? false)
        .setAlpha(blueprint.alpha ?? 1);
      this.container.add(image);
      return { blueprint, image };
    });
  }

  private resetPose(): void {
    this.flashGeneration += 1;
    this.baseAlpha = 1;
    this.activeAttack = '';
    this.attackStartedAt = 0;
    this.attackDuration = 1;
    this.deathStartedAt = -1;
    this.lastX = Number.NaN;
    this.lastY = Number.NaN;
    this.container.setAlpha(1).setRotation(0);
    for (const runtime of this.parts) {
      const blueprint = runtime.blueprint;
      runtime.image
        .clearTint()
        .setPosition(blueprint.x, blueprint.y)
        .setAngle(blueprint.angle ?? 0)
        .setScale(blueprint.scaleX ?? 1, blueprint.scaleY ?? 1)
        .setAlpha(blueprint.alpha ?? 1);
    }
  }

  private attackProgress(time: number): number {
    if (!this.activeAttack) return -1;
    const progress = (time - this.attackStartedAt) / this.attackDuration;
    if (progress >= 1) {
      this.activeAttack = '';
      return -1;
    }
    return clamp01(progress);
  }

  private attackEnvelope(progress: number): number {
    return Math.sin(progress * Math.PI);
  }

  private applyAttackPose(
    role: PartRole,
    x: number,
    y: number,
    angle: number,
    scaleX: number,
    scaleY: number,
    progress: number,
    pose: number,
  ): { x: number; y: number; angle: number; scaleX: number; scaleY: number } {
    const cue = this.activeAttack;
    const isHead = role === 'head' || role === 'neck' || role === 'snout' || role === 'beak' || role === 'jaw';
    const isWing = role === 'wingLeft' || role === 'wingRight';
    const isTail = role === 'tail1' || role === 'tail2' || role === 'tail3';

    if (cue.includes('peck')) {
      if (isHead) { x += pose * 13; y += pose * 5; angle += pose * 18; }
      if (role === 'body') { x += pose * 3; scaleX *= 1 + pose * 0.05; scaleY *= 1 - pose * 0.05; }
    } else if (cue.includes('cry') || cue.includes('howl')) {
      if (isHead) { y -= pose * 5; angle -= pose * 15; }
      if (isWing || role === 'armLeft' || role === 'armRight') angle += (role === 'wingLeft' || role === 'armLeft' ? -1 : 1) * pose * 24;
      if (role === 'body') { scaleX *= 1 + pose * 0.035; scaleY *= 1 + pose * 0.045; }
    } else if (cue.includes('feather') || cue.includes('storm') || cue.includes('gale')) {
      if (isWing) angle += (role === 'wingLeft' ? -1 : 1) * pose * 44;
      if (role === 'body') angle += Math.sin(progress * Math.PI * 4) * 5;
    } else if (cue.includes('pounce') || cue.includes('dive')) {
      if (isWing) angle += (role === 'wingLeft' ? 1 : -1) * pose * 32;
      if (isHead || role === 'body') { x += pose * 4; angle += pose * 9; }
      if (role === 'legLeft' || role === 'legRight' || role === 'talonLeft' || role === 'talonRight') y -= pose * 5;
    } else if (cue.includes('earth') || cue.includes('slam') || cue.includes('boulder')) {
      if (role === 'weapon') angle += -88 + progress * 176;
      if (role === 'armRight') angle += -45 + progress * 90;
      if (role === 'body') { y += pose * 3; angle += pose * 4; }
    } else if (cue.includes('cyclone')) {
      if (role === 'weapon') angle += progress * 720;
      if (role === 'armRight') angle += progress * 360;
      if (role === 'body') angle += Math.sin(progress * Math.PI * 4) * 4;
    } else if (cue.includes('savage') || cue.includes('claw')) {
      if (role === 'armLeft') angle += Math.sin(progress * Math.PI * 3) * 54;
      if (role === 'armRight') angle -= Math.sin(progress * Math.PI * 3) * 54;
      if (isHead) x += pose * 4;
    } else if (cue.includes('shock') || cue.includes('horn')) {
      if (isHead || role === 'hornLeft' || role === 'hornRight') { x += pose * 6; y += pose * 3; angle += pose * 8; }
      if (role === 'body') y += pose * 2;
    } else if (cue.includes('rush') || cue.includes('charge') || cue.includes('sweep')) {
      if (isHead || role === 'body') { x += pose * 5; y += pose * 3; angle += pose * 8; }
      if (isWing) angle += (role === 'wingLeft' ? 1 : -1) * pose * 24;
      if (isTail) angle -= pose * 7;
      if (role === 'weapon') angle += pose * 18;
    } else if (cue.includes('breath') || cue.includes('fireball') || cue.includes('inferno')) {
      if (role === 'jaw') angle += pose * 24;
      if (role === 'head' || role === 'neck') { x += pose * 5; angle += pose * 5; }
      if (isWing && cue.includes('inferno')) angle += (role === 'wingLeft' ? -1 : 1) * pose * 38;
      if (role === 'crystal') { scaleX *= 1 + pose * 0.18; scaleY *= 1 + pose * 0.18; }
    } else if (cue.includes('tail')) {
      if (isTail) angle += Math.sin(progress * Math.PI * 2) * (role === 'tail1' ? 18 : role === 'tail2' ? 28 : 38);
      if (role === 'body') angle -= Math.sin(progress * Math.PI * 2) * 5;
    } else if (cue.includes('meteor')) {
      if (isWing) angle += (role === 'wingLeft' ? -1 : 1) * pose * 28;
      if (isHead) y -= pose * 4;
    }

    return { x, y, angle, scaleX, scaleY };
  }

  private partScatter(role: PartRole): { x: number; y: number; angle: number } {
    if (role === 'wingLeft' || role === 'armLeft' || role === 'legLeft' || role === 'hornLeft') return { x: -12, y: 5, angle: -36 };
    if (role === 'wingRight' || role === 'armRight' || role === 'legRight' || role === 'hornRight' || role === 'weapon') return { x: 13, y: 7, angle: 42 };
    if (role === 'head' || role === 'jaw' || role === 'comb' || role === 'beak' || role === 'snout') return { x: 7, y: -5, angle: 24 };
    if (role === 'tail1' || role === 'tail2' || role === 'tail3') return { x: -10, y: 9, angle: -28 };
    return { x: 0, y: 8, angle: 10 };
  }
}
