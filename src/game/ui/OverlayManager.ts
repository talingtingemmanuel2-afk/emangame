import Phaser from 'phaser';
import { ABILITY_DEFINITIONS } from '../content/definitions';
import type { AudioManager } from '../audio/AudioManager';
import type { UpgradeChoice } from '../types';

export interface OverlayHost {
  resumeGame(): void;
  restartGame(): void;
  returnToMenu(): void;
}

export class OverlayManager {
  private readonly scene: Phaser.Scene;
  private readonly host: OverlayHost;
  private readonly audio: AudioManager;
  private active: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, host: OverlayHost, audio: AudioManager) {
    this.scene = scene;
    this.host = host;
    this.audio = audio;
  }

  showUpgrade(choices: UpgradeChoice[], onSelect: (choice: UpgradeChoice) => void, title = 'LEVEL UP', subtitle = 'Choose one blessing of the grove'): void {
    this.clear();
    const { width, height } = this.scene.scale;
    const root = this.createBackdrop(title, subtitle);
    const cardWidth = Math.min(280, width * 0.26);
    const cardHeight = Math.min(330, height * 0.49);
    const spacing = cardWidth + 24;
    choices.forEach((choice, index) => {
      const x = width / 2 + (index - (choices.length - 1) / 2) * spacing;
      const y = height / 2 + 25;
      const abilityId = choice.id.startsWith('ability-') ? choice.id.slice('ability-'.length) as keyof typeof ABILITY_DEFINITIONS : null;
      const ability = abilityId ? ABILITY_DEFINITIONS[abilityId] : undefined;
      const isLearnedSkill = Boolean(ability && choice.currentLevel > 0);
      const isEvolutionChoice = Boolean(ability && choice.currentLevel + 1 >= ability.maxLevel);
      const frameColor = isEvolutionChoice ? 0xffe58a : choice.accent;
      const card = this.scene.add.rectangle(x, y, cardWidth, cardHeight, isEvolutionChoice ? 0x252039 : 0x102c26, 0.98)
        .setStrokeStyle(isEvolutionChoice ? 4 : 3, frameColor, isLearnedSkill ? 1 : 0.76)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      const glow = this.scene.add.rectangle(x, y, cardWidth + 10, cardHeight + 10, frameColor, isEvolutionChoice ? 0.1 : isLearnedSkill ? 0.05 : 0)
        .setStrokeStyle(isEvolutionChoice ? 3 : 2, frameColor, isEvolutionChoice ? 0.55 : isLearnedSkill ? 0.3 : 0.15);
      const accentRail = this.scene.add.rectangle(x, y - cardHeight / 2 + 6, cardWidth - 20, isEvolutionChoice ? 6 : 4, frameColor, 1);
      const statusWidth = Math.min(cardWidth - 40, isEvolutionChoice ? 154 : 120);
      const statusPlate = this.scene.add.rectangle(x, y - cardHeight * 0.41, statusWidth, 24, frameColor, isEvolutionChoice ? 0.22 : 0.13)
        .setStrokeStyle(1, frameColor, isEvolutionChoice ? 0.95 : 0.65);
      const status = this.scene.add.text(x, y - cardHeight * 0.41,
        isEvolutionChoice ? 'EVOLUTION READY' : isLearnedSkill ? `OWNED / LV ${choice.currentLevel}` : ability ? 'NEW SKILL' : 'PASSIVE BLESSING', {
          fontFamily: 'Nunito, sans-serif', fontSize: '10px', fontStyle: 'bold', color: isEvolutionChoice ? '#fff3b0' : '#f2ffe9', letterSpacing: 1,
        }).setOrigin(0.5);
      const iconPlate = this.scene.add.circle(x, y - cardHeight * 0.25, isEvolutionChoice ? 47 : 42, 0x071b18, 0.95)
        .setStrokeStyle(isEvolutionChoice ? 4 : isLearnedSkill ? 3 : 2, frameColor, isEvolutionChoice ? 1 : 0.85);
      const icon = this.scene.add.image(x, y - cardHeight * 0.25, choice.icon).setScale(isEvolutionChoice ? 1.55 : isLearnedSkill ? 1.43 : 1.35);
      const title = this.scene.add.text(x, y - cardHeight * 0.04, choice.title, {
        fontFamily: 'Cinzel, serif', fontSize: `${Math.min(20, cardWidth * 0.08)}px`, fontStyle: 'bold', color: isEvolutionChoice ? '#fff0a0' : '#fff1b5', align: 'center', wordWrap: { width: cardWidth - 34 },
      }).setOrigin(0.5);
      const rank = this.scene.add.text(x, y + cardHeight * 0.08, ability && choice.currentLevel === 0
        ? 'UNLOCK SKILL'
        : isEvolutionChoice
          ? `LEVEL ${choice.currentLevel}  >  EVOLVED`
          : choice.currentLevel > 0 ? `LEVEL ${choice.currentLevel}  >  ${choice.currentLevel + 1}` : 'PERMANENT UPGRADE', {
        fontFamily: 'Nunito, sans-serif', fontSize: '12px', fontStyle: 'bold', color: Phaser.Display.Color.IntegerToColor(frameColor).rgba,
      }).setOrigin(0.5);
      const description = this.scene.add.text(x, y + cardHeight * 0.22, choice.description, {
        fontFamily: 'Nunito, sans-serif', fontSize: `${Math.min(15, cardWidth * 0.057)}px`, color: '#d8e5cf', align: 'center', lineSpacing: 5, wordWrap: { width: cardWidth - 36 },
      }).setOrigin(0.5, 0);
      root.add([glow, card, accentRail, statusPlate, status, iconPlate, icon, title, rank, description]);
      card.on('pointerover', () => {
        card.setFillStyle(isEvolutionChoice ? 0x3a3154 : 0x1d473a, 1);
        glow.setAlpha(isEvolutionChoice ? 1 : 0.7);
        this.audio.playSfx('click', { volume: 0.12, detune: 180 });
      });
      card.on('pointerout', () => {
        card.setFillStyle(isEvolutionChoice ? 0x252039 : 0x102c26, 0.98);
        glow.setAlpha(1);
      });
      card.on('pointerup', () => {
        this.audio.playSfx('levelup', { volume: 0.72 });
        this.clear();
        onSelect(choice);
      });
    });
    this.active = root;
  }

  showPause(): void {
    this.clear();
    const root = this.createBackdrop('PAUSED', 'The forest holds its breath');
    const { width, height } = this.scene.scale;
    const buttons: Array<[string, () => void]> = [
      ['RESUME', () => { this.clear(); this.host.resumeGame(); }],
      ['SETTINGS', () => this.showSettings()],
      ['RESTART RUN', () => { this.clear(); this.host.restartGame(); }],
      ['MAIN MENU', () => { this.clear(); this.host.returnToMenu(); }],
    ];
    buttons.forEach(([label, action], index) => root.add(this.makeButton(width / 2, height * 0.42 + index * 60, label, action)));
    this.active = root;
  }

  showSettings(onBack?: () => void): void {
    this.clear();
    const root = this.createBackdrop('SETTINGS', 'Stored on this device');
    const { width, height } = this.scene.scale;
    const settings = this.audio.getSettings();
    const rows: Array<[string, keyof typeof settings]> = [
      ['MASTER VOLUME', 'masterVolume'],
      ['MUSIC VOLUME', 'musicVolume'],
      ['SFX VOLUME', 'sfxVolume'],
    ];
    rows.forEach(([label, key], index) => {
      const y = height * 0.4 + index * 86;
      const text = this.scene.add.text(width / 2 - 200, y, label, this.bodyStyle()).setOrigin(0, 0.5);
      const back = this.scene.add.rectangle(width / 2 + 70, y, 250, 12, 0x081b18, 1).setStrokeStyle(2, 0xb99cff, 0.5);
      const fill = this.scene.add.rectangle(width / 2 - 55, y, 250 * settings[key], 8, 0x9e87ec, 1).setOrigin(0, 0.5);
      const handle = this.scene.add.circle(width / 2 - 55 + 250 * settings[key], y, 9, 0xffefae, 1).setStrokeStyle(2, 0x3d2e55, 1);
      const zone = this.scene.add.zone(width / 2 + 70, y, 270, 40).setScrollFactor(0).setInteractive({ draggable: true, useHandCursor: true });
      const update = (pointer: Phaser.Input.Pointer): void => {
        const value = Phaser.Math.Clamp((pointer.x - (width / 2 - 55)) / 250, 0, 1);
        fill.displayWidth = 250 * value;
        handle.setX(width / 2 - 55 + 250 * value);
        if (key === 'masterVolume') this.audio.setMasterVolume(value);
        else if (key === 'musicVolume') this.audio.setMusicVolume(value);
        else this.audio.setSfxVolume(value);
      };
      zone.on('pointerdown', update).on('drag', (pointer: Phaser.Input.Pointer) => update(pointer));
      root.add([text, back, fill, handle, zone]);
    });
    root.add(this.makeButton(width / 2, height * 0.75, 'BACK', () => onBack ? onBack() : this.showPause()));
    this.active = root;
  }

  showHowToPlay(onBack: () => void): void {
    this.clear();
    const root = this.createBackdrop('HOW TO PLAY', 'Survive. Grow stronger. Save the grove.');
    const { width, height } = this.scene.scale;
    const copy = [
      ['WASD / ARROW KEYS', 'Move through the forest'],
      ['Q', 'Dash with brief invulnerability'],
      ['AUTOMATIC MAGIC', 'Your abilities seek nearby enemies'],
      ['XP CRYSTALS', 'Level up and choose one of three blessings'],
      ['10 HARD WAVES', 'Defeat each boss and survive two ancient dragons'],
    ];
    copy.forEach(([key, detail], index) => {
      const y = height * 0.35 + index * 50;
      root.add(this.scene.add.text(width / 2 - 250, y, key, { ...this.bodyStyle(), color: '#ffe397' }).setOrigin(0, 0.5));
      root.add(this.scene.add.text(width / 2 + 250, y, detail, this.bodyStyle()).setOrigin(1, 0.5));
    });
    root.add(this.makeButton(width / 2, height * 0.76, 'BACK', () => { this.clear(); onBack(); }));
    this.active = root;
  }

  showEnd(victory: boolean, stats: { wave: number; kills: number; elapsedMs: number; level: number; damage: number; bosses: number }): void {
    this.clear();
    const root = this.createBackdrop(victory ? 'FOREST SAVED' : 'GAME OVER', victory ? 'The Glimmergrove blooms again' : 'The grove remembers your courage');
    const { width, height } = this.scene.scale;
    const seconds = Math.floor(stats.elapsedMs / 1000);
    const rows = [
      ['WAVE', `${stats.wave} / 10`],
      ['TIME', `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`],
      ['ENEMIES DEFEATED', stats.kills.toLocaleString()],
      ['FINAL LEVEL', `${stats.level}`],
      ['DAMAGE DEALT', Math.round(stats.damage).toLocaleString()],
      ['BOSSES DEFEATED', `${stats.bosses}`],
    ];
    rows.forEach(([label, value], index) => {
      const y = height * 0.34 + index * 36;
      root.add(this.scene.add.text(width / 2 - 190, y, label, this.bodyStyle()).setOrigin(0, 0.5));
      root.add(this.scene.add.text(width / 2 + 190, y, value, { ...this.bodyStyle(), color: '#ffe396' }).setOrigin(1, 0.5));
    });
    root.add(this.makeButton(width / 2 - 110, height * 0.76, 'PLAY AGAIN', () => { this.clear(); this.host.restartGame(); }, 190));
    root.add(this.makeButton(width / 2 + 110, height * 0.76, 'MAIN MENU', () => { this.clear(); this.host.returnToMenu(); }, 190));
    this.active = root;
  }

  clear(): void {
    this.active?.destroy(true);
    this.active = null;
  }

  private createBackdrop(title: string, subtitle: string): Phaser.GameObjects.Container {
    const { width, height } = this.scene.scale;
    const root = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(50_000);
    const dim = this.scene.add.rectangle(0, 0, width, height, 0x020b0a, 0.83).setOrigin(0);
    const panel = this.scene.add.rectangle(width / 2, height / 2, Math.min(980, width - 42), Math.min(610, height - 42), 0x0b241f, 0.96).setStrokeStyle(3, 0xc9a957, 0.55);
    const heading = this.scene.add.text(width / 2, height * 0.16, title, {
      fontFamily: 'Cinzel, serif', fontSize: `${Math.min(44, width * 0.05)}px`, fontStyle: 'bold', color: '#fff0ad', stroke: '#25180f', strokeThickness: 6,
    }).setOrigin(0.5);
    const sub = this.scene.add.text(width / 2, height * 0.235, subtitle, { ...this.bodyStyle(), color: '#9fd8c0', fontSize: '15px' }).setOrigin(0.5);
    root.add([dim, panel, heading, sub]);
    return root;
  }

  private makeButton(x: number, y: number, label: string, action: () => void, width = 260): Phaser.GameObjects.Container {
    const plate = this.scene.add.rectangle(0, 0, width, 46, 0x173c32, 0.98).setStrokeStyle(2, 0xe1be63, 0.68);
    const text = this.scene.add.text(0, 0, label, { fontFamily: 'Cinzel, serif', fontSize: '16px', fontStyle: 'bold', color: '#fff0ad' }).setOrigin(0.5);
    const button = this.scene.add.container(x, y, [plate, text]).setScrollFactor(0).setSize(width, 46).setInteractive({ useHandCursor: true });
    button.on('pointerover', () => plate.setFillStyle(0x28594a, 1));
    button.on('pointerout', () => plate.setFillStyle(0x173c32, 0.98));
    button.on('pointerup', () => { this.audio.playSfx('click', { volume: 0.35 }); action(); });
    return button;
  }

  private bodyStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'Nunito, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#dce8d5', stroke: '#071512', strokeThickness: 2 };
  }
}

export const makeAbilityUpgradeChoice = (id: keyof typeof ABILITY_DEFINITIONS, currentLevel: number, apply: () => void): UpgradeChoice => {
  const definition = ABILITY_DEFINITIONS[id];
  return {
    id: `ability-${id}`,
    title: definition.name,
    icon: definition.icon,
    currentLevel,
    description: currentLevel + 1 >= definition.maxLevel && definition.evolution
      ? `EVOLVE: ${definition.evolution}. ${definition.description}`
      : definition.description,
    accent: definition.accent,
    apply,
  };
};
