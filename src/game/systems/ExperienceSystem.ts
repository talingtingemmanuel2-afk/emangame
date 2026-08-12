import Phaser from 'phaser';
import { COMBAT, XP } from '../config/balance';
import type { Player } from '../entities/Player';

export interface ExperienceHost {
  player: Player;
  onExperienceChanged(level: number, xp: number, required: number): void;
  requestLevelUp(): void;
  burst(x: number, y: number, color: number, count: number, speed?: number): void;
  playSfx(key: string, volume?: number): void;
}

interface Gem extends Phaser.Physics.Arcade.Image {
  value: number;
  vacuum: boolean;
  bornAt: number;
}

export class ExperienceSystem {
  readonly group: Phaser.Physics.Arcade.Group;
  level = 1;
  xp = 0;
  required: number = XP.baseRequirement;
  private readonly host: ExperienceHost;
  private pendingLevels = 0;

  constructor(scene: Phaser.Scene, host: ExperienceHost) {
    this.host = host;
    this.group = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: COMBAT.maxGems,
    });
    scene.physics.add.overlap(host.player, this.group, (_player, object) => this.collect(object as Gem));
  }

  spawn(x: number, y: number, value: number, color = 0x72e6d2): void {
    const gem = this.group.get(x, y, 'xp-gem') as Gem | null;
    if (!gem) {
      this.xp += value;
      this.checkLevelUps();
      return;
    }
    gem.enableBody(true, x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8), true, true);
    gem.setTexture('xp-gem').setTint(color).setScale(value >= 20 ? 1.3 : 0.85).setDepth(y + 8).setAlpha(1);
    gem.value = value;
    gem.vacuum = false;
    gem.bornAt = gem.scene.time.now;
    gem.setVelocity(Phaser.Math.Between(-55, 55), Phaser.Math.Between(-90, -40));
    gem.setBounce(0.62).setDrag(100, 100);
    gem.body?.setCircle(6);
  }

  update(time: number): void {
    const player = this.host.player;
    for (const rawGem of this.group.getChildren()) {
      const gem = rawGem as Gem;
      if (!gem.active) continue;
      gem.setDepth(gem.y + 6);
      const distance = Phaser.Math.Distance.Between(gem.x, gem.y, player.x, player.y);
      const attractionRadius = gem.vacuum ? 5000 : player.stats.pickupRadius;
      if (distance < attractionRadius && time - gem.bornAt > 260) {
        const speed = gem.vacuum ? 900 : Phaser.Math.Linear(220, 560, 1 - distance / Math.max(1, attractionRadius));
        const velocity = new Phaser.Math.Vector2(player.x - gem.x, player.y - gem.y).normalize().scale(speed);
        gem.setVelocity(velocity.x, velocity.y);
      }
      gem.angle += 2.2;
    }
  }

  vacuumAll(): void {
    for (const rawGem of this.group.getChildren()) {
      const gem = rawGem as Gem;
      if (gem.active) gem.vacuum = true;
    }
    this.host.burst(this.host.player.x, this.host.player.y, 0xff6f8e, 28, 240);
    this.host.playSfx('magnet', 0.78);
  }

  addBundle(amount: number): void {
    this.xp += amount;
    this.checkLevelUps();
  }

  completeOneLevelUp(): void {
    this.pendingLevels = Math.max(0, this.pendingLevels - 1);
    if (this.pendingLevels > 0) this.host.requestLevelUp();
  }

  hasPendingLevel(): boolean {
    return this.pendingLevels > 0;
  }

  private collect(gem: Gem): void {
    if (!gem.active) return;
    this.xp += gem.value;
    const x = gem.x;
    const y = gem.y;
    gem.disableBody(true, true);
    this.host.burst(x, y, 0x72e6d2, 3, 60);
    this.host.playSfx('xp', 0.16);
    this.checkLevelUps();
  }

  private checkLevelUps(): void {
    let gained = 0;
    while (this.xp >= this.required) {
      this.xp -= this.required;
      this.level += 1;
      gained += 1;
      this.required = Math.round(XP.baseRequirement * Math.pow(this.level, XP.growth));
    }
    this.pendingLevels += gained;
    this.host.onExperienceChanged(this.level, this.xp, this.required);
    if (gained > 0 && this.pendingLevels === gained) this.host.requestLevelUp();
  }
}
