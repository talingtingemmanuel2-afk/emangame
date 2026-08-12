import Phaser from 'phaser';
import type { PickupKind } from '../types';
import type { Player } from '../entities/Player';

export interface LootHost {
  player: Player;
  vacuumExperience(): void;
  addExperience(amount: number): void;
  burst(x: number, y: number, color: number, count: number, speed?: number): void;
  floatingText(x: number, y: number, text: string, color: string, large?: boolean): void;
  playSfx(key: string, volume?: number): void;
}

interface LootSprite extends Phaser.Physics.Arcade.Image {
  kind: PickupKind;
  bornAt: number;
}

const PICKUP_TEXTURE: Record<PickupKind, string> = {
  health: 'potion-green',
  magnet: 'pickup-magnet',
  damage: 'potion-red',
  speed: 'potion-blue',
  haste: 'potion-yellow',
  xp: 'xp-gem',
};

const PICKUP_COLOR: Record<PickupKind, number> = {
  health: 0x7fffa1,
  magnet: 0xff7e99,
  damage: 0xff655f,
  speed: 0x63cfff,
  haste: 0xffde59,
  xp: 0xb99cff,
};

export class LootSystem {
  readonly group: Phaser.Physics.Arcade.Group;
  private readonly host: LootHost;

  constructor(scene: Phaser.Scene, host: LootHost) {
    this.host = host;
    this.group = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 90 });
    scene.physics.add.overlap(host.player, this.group, (_player, object) => this.collect(object as LootSprite));
  }

  spawn(x: number, y: number, kind: PickupKind): void {
    const loot = this.group.get(x, y, PICKUP_TEXTURE[kind]) as LootSprite | null;
    if (!loot) return;
    loot.enableBody(true, x, y, true, true);
    loot.setTexture(PICKUP_TEXTURE[kind]).setScale(kind === 'magnet' ? 1.2 : 1).setTint(0xffffff).setDepth(y + 10);
    loot.kind = kind;
    loot.bornAt = loot.scene.time.now;
    loot.setVelocity(Phaser.Math.Between(-45, 45), Phaser.Math.Between(-85, -45)).setBounce(0.55).setDrag(90, 90);
    loot.body?.setCircle(7);
    loot.scene.tweens.add({
      targets: loot,
      scaleX: loot.scaleX * 1.18,
      scaleY: loot.scaleY * 1.18,
      yoyo: true,
      repeat: -1,
      duration: 620,
    });
  }

  spawnMinibossRewards(x: number, y: number): void {
    this.spawn(x - 32, y + 4, 'health');
    this.spawn(x + 32, y + 4, 'magnet');
    if (Math.random() < 0.44) this.spawn(x, y - 28, Phaser.Utils.Array.GetRandom(['damage', 'speed', 'haste'] as PickupKind[]));
  }

  rollBushDrop(x: number, y: number): void {
    const roll = Math.random();
    if (roll < 0.55) return;
    if (roll < 0.7) this.spawn(x, y, 'health');
    else if (roll < 0.8) this.spawn(x, y, 'speed');
    else if (roll < 0.9) this.spawn(x, y, 'damage');
    else if (roll < 0.95) this.spawn(x, y, 'magnet');
    else this.spawn(x, y, 'xp');
  }

  rollChestDrop(x: number, y: number): void {
    const choices: PickupKind[] = ['health', 'magnet', 'damage', 'speed', 'haste', 'xp'];
    this.spawn(x - 14, y, Phaser.Utils.Array.GetRandom(choices));
    this.spawn(x + 14, y, Phaser.Utils.Array.GetRandom(choices));
  }

  private collect(loot: LootSprite): void {
    if (!loot.active) return;
    const kind = loot.kind;
    const x = loot.x;
    const y = loot.y;
    loot.disableBody(true, true);
    this.host.burst(x, y, PICKUP_COLOR[kind], 14, 120);
    if (kind === 'health') this.host.player.heal(this.host.player.stats.maxHp * 0.26);
    else if (kind === 'magnet') this.host.vacuumExperience();
    else if (kind === 'damage') {
      this.host.player.addBuff('damage', 1.42, 12_000, loot.scene.time.now);
      this.host.floatingText(x, y - 20, 'POWER UP!', '#ff766d', true);
    } else if (kind === 'speed') {
      this.host.player.addBuff('speed', 1.34, 10_000, loot.scene.time.now);
      this.host.floatingText(x, y - 20, 'SWIFT!', '#71cfff', true);
    } else if (kind === 'haste') {
      this.host.player.addBuff('haste', 0.7, 11_000, loot.scene.time.now);
      this.host.floatingText(x, y - 20, 'HASTE!', '#ffe271', true);
    } else {
      this.host.addExperience(45);
      this.host.playSfx('xp', 0.6);
    }
  }
}
