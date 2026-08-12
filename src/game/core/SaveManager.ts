import type { SaveData } from '../types';

const SAVE_KEY = 'glimmergrove-save';

const DEFAULT_SAVE: SaveData = {
  version: 1,
  settings: { master: 0.75, music: 0.55, sfx: 0.8 },
  highScore: null,
};

export class SaveManager {
  static load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return structuredClone(DEFAULT_SAVE);
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (parsed.version !== 1) return structuredClone(DEFAULT_SAVE);
      return {
        ...structuredClone(DEFAULT_SAVE),
        ...parsed,
        settings: { ...DEFAULT_SAVE.settings, ...parsed.settings },
      };
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }

  static save(data: SaveData): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Storage can be unavailable in hardened browser contexts; gameplay continues.
    }
  }

  static recordRun(result: NonNullable<SaveData['highScore']>): void {
    const save = this.load();
    const score = result.wave * 100_000 + result.kills * 100 + result.level * 500 + (result.victory ? 1_000_000 : 0);
    const previous = save.highScore;
    const previousScore = previous
      ? previous.wave * 100_000 + previous.kills * 100 + previous.level * 500 + (previous.victory ? 1_000_000 : 0)
      : -1;
    if (score > previousScore) {
      save.highScore = result;
      this.save(save);
    }
  }
}
