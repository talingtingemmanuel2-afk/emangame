import Phaser from 'phaser';
import { ABILITY_DEFINITIONS } from '../content/definitions';
import type { AbilityState, ActiveBuff } from '../types';
import type { AbilityId } from '../types';

export class HUD {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly xpBack: Phaser.GameObjects.Rectangle;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly xpFill: Phaser.GameObjects.Rectangle;
  private readonly xpText: Phaser.GameObjects.Text;
  private readonly waveText: Phaser.GameObjects.Text;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly killsText: Phaser.GameObjects.Text;
  private readonly dashFill: Phaser.GameObjects.Rectangle;
  private readonly dashBack: Phaser.GameObjects.Rectangle;
  private readonly dashText: Phaser.GameObjects.Text;
  private readonly bossGroup: Phaser.GameObjects.Container;
  private readonly bossFill: Phaser.GameObjects.Rectangle;
  private readonly bossName: Phaser.GameObjects.Text;
  private readonly bossPhase: Phaser.GameObjects.Text;
  private readonly abilityGroup: Phaser.GameObjects.Container;
  private readonly buffText: Phaser.GameObjects.Text;
  private abilitySignature = '';
  private readonly abilityCooldownBars = new Map<AbilityId, Phaser.GameObjects.Rectangle>();
  private lastRunSignature = '';
  private lastBuffLabel = '';
  private lastDashLabel = '';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(25_000);
    const portraitFrame = scene.add.circle(48, 46, 31, 0x102c26, 0.96).setStrokeStyle(3, 0xf2c85b, 0.82);
    const portrait = scene.add.sprite(48, 48, 'girl', 0).setScale(2.2);
    this.hpFill = scene.add.rectangle(90, 36, 192, 15, 0xe86668, 1).setOrigin(0, 0.5);
    const hpBack = scene.add.rectangle(88, 36, 198, 21, 0x061713, 0.94).setOrigin(0, 0.5).setStrokeStyle(2, 0xd4b45d, 0.65);
    this.hpText = scene.add.text(187, 36, '120 / 120', this.smallStyle()).setOrigin(0.5);
    this.levelText = scene.add.text(89, 53, 'LEVEL 1', { ...this.smallStyle(), fontSize: '13px', color: '#f8e6a5' });
    this.root.add([portraitFrame, portrait, hpBack, this.hpFill, this.hpText, this.levelText]);

    this.xpBack = scene.add.rectangle(0, 18, 430, 18, 0x061713, 0.94).setOrigin(0.5).setStrokeStyle(2, 0xb8a5ff, 0.66);
    this.xpFill = scene.add.rectangle(-212, 18, 424, 12, 0x8f78de, 1).setOrigin(0, 0.5);
    this.xpText = scene.add.text(0, 18, '0 / 24  ✦', this.smallStyle()).setOrigin(0.5);
    this.root.add([this.xpBack, this.xpFill, this.xpText]);

    this.waveText = scene.add.text(0, 24, 'WAVE 1 / 10', { ...this.smallStyle(), fontFamily: 'Cinzel, serif', fontSize: '17px', color: '#fff0ac' }).setOrigin(1, 0);
    this.timerText = scene.add.text(0, 48, '00:00', this.smallStyle()).setOrigin(1, 0);
    this.killsText = scene.add.text(0, 68, 'Kills  0', this.smallStyle()).setOrigin(1, 0);
    this.root.add([this.waveText, this.timerText, this.killsText]);

    this.dashBack = scene.add.rectangle(25, 0, 138, 22, 0x061713, 0.9).setOrigin(0, 1).setStrokeStyle(2, 0x72e6d2, 0.55);
    this.dashFill = scene.add.rectangle(28, -4, 132, 14, 0x4fcbb8, 0.92).setOrigin(0, 1);
    this.dashText = scene.add.text(94, -12, 'Q  DASH READY', { ...this.smallStyle(), fontSize: '12px' }).setOrigin(0.5);
    this.root.add([this.dashBack, this.dashFill, this.dashText]);

    this.abilityGroup = scene.add.container(0, 0);
    this.root.add(this.abilityGroup);
    this.buffText = scene.add.text(0, 0, '', { ...this.smallStyle(), fontSize: '12px', color: '#ffe599' }).setOrigin(1, 1);
    this.root.add(this.buffText);

    const bossBack = scene.add.rectangle(0, 0, 520, 22, 0x090a0d, 0.94).setOrigin(0.5).setStrokeStyle(2, 0xff9c62, 0.72);
    this.bossFill = scene.add.rectangle(-257, 0, 514, 16, 0xd25153, 1).setOrigin(0, 0.5);
    this.bossName = scene.add.text(0, -17, '', { ...this.smallStyle(), fontFamily: 'Cinzel, serif', fontSize: '16px', color: '#ffe4ae' }).setOrigin(0.5, 1);
    this.bossPhase = scene.add.text(0, 0, '', { ...this.smallStyle(), fontSize: '11px' }).setOrigin(0.5);
    this.bossGroup = scene.add.container(0, 84, [bossBack, this.bossFill, this.bossName, this.bossPhase]).setVisible(false);
    this.root.add(this.bossGroup);
    this.layout(scene.scale.width, scene.scale.height);
    scene.scale.on('resize', (size: Phaser.Structs.Size) => this.layout(size.width, size.height));
  }

  setHealth(hp: number, maxHp: number): void {
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.hpFill.displayWidth = 192 * ratio;
    this.hpText.setText(`${Math.ceil(hp)} / ${maxHp}`);
  }

  setExperience(level: number, xp: number, required: number): void {
    this.levelText.setText(`LEVEL ${level}`);
    this.xpFill.displayWidth = 424 * Phaser.Math.Clamp(xp / required, 0, 1);
    this.xpText.setText(`${xp} / ${required}  ✦`);
  }

  setRun(wave: number, elapsedMs: number, kills: number): void {
    const seconds = Math.floor(elapsedMs / 1000);
    const signature = `${wave}:${seconds}:${kills}`;
    if (signature === this.lastRunSignature) return;
    this.lastRunSignature = signature;
    this.waveText.setText(`WAVE ${wave} / 10`);
    this.timerText.setText(`${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`);
    this.killsText.setText(`Kills  ${kills}`);
  }

  setDash(remainingMs: number): void {
    const progress = Phaser.Math.Clamp(1 - remainingMs / 1900, 0, 1);
    this.dashFill.displayWidth = 132 * progress;
    const label = remainingMs > 0 ? `Q  ${(remainingMs / 1000).toFixed(1)}s` : 'Q  DASH READY';
    if (label !== this.lastDashLabel) {
      this.lastDashLabel = label;
      this.dashText.setText(label);
    }
    this.dashFill.setFillStyle(remainingMs > 0 ? 0x426f68 : 0x4fcbb8, 0.92);
  }

  setBoss(name: string, hp: number, maxHp: number, phase?: number, theme: 'normal' | 'corrupted' | 'fire' = 'normal'): void {
    this.bossGroup.setVisible(true);
    this.bossFill.displayWidth = 514 * Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.bossName.setText(name);
    this.bossFill.setFillStyle(theme === 'corrupted' ? 0x52a84f : theme === 'fire' ? 0xe14e32 : 0xd25153, 1);
    this.bossPhase.setText(phase ? `PHASE ${phase}  •  ${Math.max(0, Math.ceil(hp)).toLocaleString()} HP` : `${Math.max(0, Math.ceil(hp)).toLocaleString()} HP`);
    const hpText = `${Math.max(0, Math.ceil(hp)).toLocaleString()} HP`;
    if (phase && name === 'Ancient Forest Dragon') {
      const phaseName = phase === 1 ? 'PHASE I' : phase === 2 ? "PHASE II - DRAGON'S FURY" : 'FINAL PHASE - ANCIENT INFERNO';
      this.bossPhase.setText(`${phaseName}  |  ${hpText}  |  I : 65% II : 30% III`);
    } else if (phase && name.includes('Ancient Beast')) {
      const phaseName = phase === 1 ? 'PHASE I' : phase === 2 ? 'CORRUPTED AWAKENING' : 'UNDEAD FRENZY';
      this.bossPhase.setText(`${phaseName}  |  ${hpText}`);
    }
  }

  hideBoss(): void {
    this.bossGroup.setVisible(false);
  }

  setAbilities(states: AbilityState[]): void {
    const visibleStates = states.slice(0, 11);
    const signature = visibleStates.map((state) => `${state.id}:${state.level}:${Number(state.evolved)}`).join('|');
    if (signature === this.abilitySignature) {
      for (const state of visibleStates) {
        const bar = this.abilityCooldownBars.get(state.id);
        if (bar) bar.displayWidth = 38 * state.cooldownProgress;
      }
      return;
    }
    this.abilitySignature = signature;
    this.abilityGroup.removeAll(true);
    this.abilityCooldownBars.clear();
    const spacing = 47;
    visibleStates.forEach((state, index) => {
      const definition = ABILITY_DEFINITIONS[state.id];
      const x = (index - (visibleStates.length - 1) / 2) * spacing;
      const frameColor = state.evolved ? 0xffe58a : definition.accent;
      const glow = this.scene.add.rectangle(x, 0, state.evolved ? 50 : 48, state.evolved ? 50 : 48, definition.accent, state.evolved ? 0.2 : 0.09)
        .setStrokeStyle(state.evolved ? 2 : 1, frameColor, state.evolved ? 0.72 : 0.32);
      const plate = this.scene.add.rectangle(x, 0, 44, 44, state.evolved ? 0x26213b : 0x09211d, 0.97)
        .setStrokeStyle(state.evolved ? 3 : 2, frameColor, state.evolved ? 1 : 0.88);
      const accentRail = this.scene.add.rectangle(x, -20, state.evolved ? 34 : 26, 3, frameColor, 1);
      const icon = this.scene.add.image(x, -2, definition.icon).setScale(state.evolved ? 0.92 : 0.84);
      const levelBadge = this.scene.add.circle(x + 15, 15, 8, state.evolved ? 0xffe58a : definition.accent, 1)
        .setStrokeStyle(1, 0x071512, 0.9);
      const level = this.scene.add.text(x + 15, 15, `${state.level}`, {
        ...this.smallStyle(), fontSize: '9px', color: state.evolved ? '#2b2133' : '#071512', strokeThickness: 0,
      }).setOrigin(0.5);
      const evolved = state.evolved
        ? this.scene.add.text(x - 17, -17, 'MAX', { ...this.smallStyle(), fontSize: '7px', color: '#fff1a8', strokeThickness: 2 }).setOrigin(0, 0.5)
        : null;
      const cooldownBack = this.scene.add.rectangle(x - 19, 19, 38, 3, 0x020b0a, 0.9).setOrigin(0, 0.5);
      const cooldown = this.scene.add.rectangle(x - 19, 19, 38 * state.cooldownProgress, 3, definition.accent, 1).setOrigin(0, 0.5);
      this.abilityCooldownBars.set(state.id, cooldown);
      this.abilityGroup.add([glow, plate, accentRail, icon, levelBadge, level, cooldownBack, cooldown]);
      if (evolved) this.abilityGroup.add(evolved);
    });
  }

  setBuffs(buffs: ActiveBuff[], time: number): void {
    const label = buffs.map((buff) => `${buff.kind.toUpperCase()} ${Math.max(0, Math.ceil((buff.expiresAt - time) / 1000))}s`).join('   ');
    if (label !== this.lastBuffLabel) {
      this.lastBuffLabel = label;
      this.buffText.setText(label);
    }
  }

  destroy(): void {
    this.root.destroy(true);
  }

  private layout(width: number, height: number): void {
    this.xpFill.setX(width / 2 - 212);
    this.xpText.setX(width / 2);
    this.xpBack.setX(width / 2);
    this.waveText.setX(width - 25);
    this.timerText.setX(width - 25);
    this.killsText.setX(width - 25);
    this.dashFill.setY(height - 4);
    this.dashText.setY(height - 12);
    this.dashBack.setY(height);
    this.abilityGroup.setPosition(width / 2, height - 32);
    this.buffText.setPosition(width - 25, height - 18);
    this.bossGroup.setX(width / 2);
  }

  private smallStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Nunito, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#f7f2d3',
      stroke: '#071512',
      strokeThickness: 3,
    };
  }
}
