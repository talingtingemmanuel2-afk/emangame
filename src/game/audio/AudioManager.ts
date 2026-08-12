import Phaser from 'phaser';

export const MUSIC_KEYS = ['forest', 'boss', 'dragon', 'victory', 'gameover'] as const;
export const SFX_KEYS = [
  'bolt',
  'hit',
  'death',
  'xp',
  'levelup',
  'dash',
  'potion',
  'chest',
  'bush',
  'heal',
  'magnet',
  'slam',
  'rock',
  'teleport',
  'wolf',
  'dragon-roar',
  'fire',
  'web',
  'spore',
  'curse',
  'boss-charge',
  'bone',
  'rooster-cry',
  'rooster-peck',
  'feather-storm',
  'troll-roar',
  'wyvern-wing',
  'hoof-charge',
  'axe-spin',
  'werewolf-howl',
  'tornado-wind',
  'boss-death',
  'click',
] as const;

export type MusicKey = (typeof MUSIC_KEYS)[number];
export type SfxKey = (typeof SFX_KEYS)[number];

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
}

export interface MusicOptions {
  /** Crossfade duration in milliseconds. */
  fadeMs?: number;
}

export const AUDIO_STORAGE_KEY = 'glimmergrove-settings';

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.85,
  musicVolume: 0.55,
  sfxVolume: 0.78,
};

interface AudioAsset {
  cacheKey: string;
  filename: string;
}

const MUSIC_ASSETS: Record<MusicKey, AudioAsset> = {
  forest: { cacheKey: 'gg-music-forest', filename: 'music-forest.wav' },
  boss: { cacheKey: 'gg-music-boss', filename: 'music-boss.wav' },
  dragon: { cacheKey: 'gg-music-dragon', filename: 'music-dragon.wav' },
  victory: { cacheKey: 'gg-music-victory', filename: 'music-victory.wav' },
  gameover: { cacheKey: 'gg-music-gameover', filename: 'music-gameover.wav' },
};

const SFX_ASSETS: Record<SfxKey, AudioAsset> = {
  bolt: { cacheKey: 'gg-sfx-bolt', filename: 'sfx-bolt.wav' },
  hit: { cacheKey: 'gg-sfx-hit', filename: 'sfx-hit.wav' },
  death: { cacheKey: 'gg-sfx-death', filename: 'sfx-death.wav' },
  xp: { cacheKey: 'gg-sfx-xp', filename: 'sfx-xp.wav' },
  levelup: { cacheKey: 'gg-sfx-levelup', filename: 'sfx-levelup.wav' },
  dash: { cacheKey: 'gg-sfx-dash', filename: 'sfx-dash.wav' },
  potion: { cacheKey: 'gg-sfx-potion', filename: 'sfx-potion.wav' },
  chest: { cacheKey: 'gg-sfx-chest', filename: 'sfx-chest.wav' },
  bush: { cacheKey: 'gg-sfx-bush', filename: 'sfx-bush.wav' },
  heal: { cacheKey: 'gg-sfx-heal', filename: 'sfx-heal.wav' },
  magnet: { cacheKey: 'gg-sfx-magnet', filename: 'sfx-magnet.wav' },
  slam: { cacheKey: 'gg-sfx-slam', filename: 'sfx-slam.wav' },
  rock: { cacheKey: 'gg-sfx-rock', filename: 'sfx-rock.wav' },
  teleport: { cacheKey: 'gg-sfx-teleport', filename: 'sfx-teleport.wav' },
  wolf: { cacheKey: 'gg-sfx-wolf', filename: 'sfx-wolf.wav' },
  'dragon-roar': { cacheKey: 'gg-sfx-dragon-roar', filename: 'sfx-dragon-roar.wav' },
  fire: { cacheKey: 'gg-sfx-fire', filename: 'sfx-fire.wav' },
  web: { cacheKey: 'gg-sfx-web', filename: 'sfx-bush.wav' },
  spore: { cacheKey: 'gg-sfx-spore', filename: 'sfx-potion.wav' },
  curse: { cacheKey: 'gg-sfx-curse', filename: 'sfx-teleport.wav' },
  'boss-charge': { cacheKey: 'gg-sfx-boss-charge', filename: 'sfx-slam.wav' },
  bone: { cacheKey: 'gg-sfx-bone', filename: 'sfx-rock.wav' },
  'rooster-cry': { cacheKey: 'gg-sfx-rooster-cry', filename: 'sfx-rooster-cry.wav' },
  'rooster-peck': { cacheKey: 'gg-sfx-rooster-peck', filename: 'sfx-rooster-peck.wav' },
  'feather-storm': { cacheKey: 'gg-sfx-feather-storm', filename: 'sfx-feather-storm.wav' },
  'troll-roar': { cacheKey: 'gg-sfx-troll-roar', filename: 'sfx-troll-roar.wav' },
  'wyvern-wing': { cacheKey: 'gg-sfx-wyvern-wing', filename: 'sfx-wyvern-wing.wav' },
  'hoof-charge': { cacheKey: 'gg-sfx-hoof-charge', filename: 'sfx-hoof-charge.wav' },
  'axe-spin': { cacheKey: 'gg-sfx-axe-spin', filename: 'sfx-axe-spin.wav' },
  'werewolf-howl': { cacheKey: 'gg-sfx-werewolf-howl', filename: 'sfx-werewolf-howl.wav' },
  'tornado-wind': { cacheKey: 'gg-sfx-tornado-wind', filename: 'sfx-tornado-wind.wav' },
  'boss-death': { cacheKey: 'gg-sfx-boss-death', filename: 'sfx-boss-death.wav' },
  click: { cacheKey: 'gg-sfx-click', filename: 'sfx-click.wav' },
};

type VolumeSound = Phaser.Sound.BaseSound & {
  volume: number;
};

interface MusicVoice {
  semanticKey: MusicKey;
  sound: VolumeSound;
  gain: number;
}

interface MusicFade {
  elapsed: number;
  duration: number;
  from: number;
  to: number;
  destroyOnComplete: boolean;
}

interface PendingMusic {
  key: MusicKey;
  fadeMs: number;
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Phaser.Math.Clamp(value, 0, 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function storedVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clampVolume(value) : fallback;
}

/**
 * Game-wide Phaser audio service. It owns music instances, while SFX remain
 * fire-and-forget. Call `AudioManager.get(scene)` from any scene to reuse it.
 */
export class AudioManager {
  private static readonly instances = new WeakMap<Phaser.Game, AudioManager>();

  private readonly game: Phaser.Game;
  private readonly soundManager: Phaser.Sound.BaseSoundManager;
  private readonly audioCache: Phaser.Cache.BaseCache;
  private readonly voices = new Set<MusicVoice>();
  private readonly fades = new Map<MusicVoice, MusicFade>();
  private readonly warnedMissing = new Set<string>();
  private settings: AudioSettings;
  private currentVoice: MusicVoice | null = null;
  private pendingMusic: PendingMusic | null = null;
  private unlockInFlight: Promise<boolean> | null = null;
  private listeningForGesture = false;
  private disposed = false;

  private constructor(scene: Phaser.Scene) {
    this.game = scene.game;
    this.soundManager = scene.sound;
    this.audioCache = scene.cache.audio;
    this.settings = this.loadSettings();
    this.soundManager.volume = this.settings.masterVolume;
    this.game.events.on(Phaser.Core.Events.STEP, this.updateFades, this);
    this.soundManager.on(Phaser.Sound.Events.UNLOCKED, this.handleUnlocked, this);
    this.listenForUnlockGesture();
  }

  /** Returns the single audio service associated with this Phaser game. */
  static get(scene: Phaser.Scene): AudioManager {
    const existing = this.instances.get(scene.game);
    if (existing) return existing;
    const manager = new AudioManager(scene);
    this.instances.set(scene.game, manager);
    return manager;
  }

  /** Queue every generated WAV with a Scene Loader, normally from BootScene.preload. */
  static preload(scene: Phaser.Scene, basePath = 'assets/audio'): void {
    const root = basePath.replace(/\/$/, '');
    const assets: AudioAsset[] = [...Object.values(MUSIC_ASSETS), ...Object.values(SFX_ASSETS)];
    for (const asset of assets) {
      if (!scene.cache.audio.exists(asset.cacheKey)) {
        scene.load.audio(asset.cacheKey, `${root}/${asset.filename}`);
      }
    }
  }

  get masterVolume(): number {
    return this.settings.masterVolume;
  }

  get musicVolume(): number {
    return this.settings.musicVolume;
  }

  get sfxVolume(): number {
    return this.settings.sfxVolume;
  }

  get currentMusic(): MusicKey | null {
    return this.currentVoice?.semanticKey ?? this.pendingMusic?.key ?? null;
  }

  get locked(): boolean {
    return this.soundManager.locked;
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  setMasterVolume(value: number): void {
    this.settings.masterVolume = clampVolume(value);
    this.soundManager.volume = this.settings.masterVolume;
    this.persistSettings();
  }

  setMusicVolume(value: number): void {
    this.settings.musicVolume = clampVolume(value);
    this.applyMusicVolumes();
    this.persistSettings();
  }

  setSfxVolume(value: number): void {
    this.settings.sfxVolume = clampVolume(value);
    this.persistSettings();
  }

  setVolumes(values: Partial<AudioSettings>): void {
    if (values.masterVolume !== undefined) {
      this.settings.masterVolume = clampVolume(values.masterVolume);
      this.soundManager.volume = this.settings.masterVolume;
    }
    if (values.musicVolume !== undefined) {
      this.settings.musicVolume = clampVolume(values.musicVolume);
    }
    if (values.sfxVolume !== undefined) {
      this.settings.sfxVolume = clampVolume(values.sfxVolume);
    }
    this.applyMusicVolumes();
    this.persistSettings();
  }

  /**
   * Starts a looping track and crossfades from the previous track. If browser
   * audio is locked, the most recently requested track starts after unlock.
   */
  setMusic(key: MusicKey, options: MusicOptions = {}): boolean {
    const fadeMs = Math.max(0, options.fadeMs ?? 650);
    const asset = MUSIC_ASSETS[key];
    if (!this.hasAsset(asset, `music:${key}`)) return false;

    if (this.soundManager.locked) {
      this.pendingMusic = { key, fadeMs };
      this.listenForUnlockGesture();
      return true;
    }

    return this.startMusic(key, fadeMs);
  }

  crossfade(key: MusicKey, durationMs = 650): boolean {
    return this.setMusic(key, { fadeMs: durationMs });
  }

  stopMusic(fadeMs = 350): void {
    this.pendingMusic = null;
    this.currentVoice = null;
    const duration = Math.max(0, fadeMs);
    for (const voice of [...this.voices]) {
      if (duration === 0) {
        this.destroyVoice(voice);
      } else {
        this.scheduleFade(voice, 0, duration, true);
      }
    }
  }

  /** Plays a semantic one-shot SFX. Returns false when locked or unavailable. */
  playSfx(key: SfxKey, config: Phaser.Types.Sound.SoundConfig = {}): boolean {
    const asset = SFX_ASSETS[key];
    if (!this.hasAsset(asset, `sfx:${key}`)) return false;
    if (this.soundManager.locked) {
      this.listenForUnlockGesture();
      void this.unlock();
      return false;
    }
    const requestedVolume = typeof config.volume === 'number' ? config.volume : 1;
    return this.soundManager.play(asset.cacheKey, {
      ...config,
      loop: false,
      volume: clampVolume(requestedVolume) * this.settings.sfxVolume,
    });
  }

  /**
   * Call from a click, tap, or key handler when explicit control is preferred.
   * Phaser's own unlock listener still performs the platform-specific work.
   */
  unlock(): Promise<boolean> {
    if (!this.soundManager.locked) {
      this.handleUnlocked();
      return Promise.resolve(true);
    }
    if (this.unlockInFlight) return this.unlockInFlight;

    this.unlockInFlight = new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (success: boolean): void => {
        if (settled) return;
        settled = true;
        this.soundManager.off(Phaser.Sound.Events.UNLOCKED, onUnlocked);
        if (typeof window !== 'undefined') window.clearTimeout(timeoutId);
        this.unlockInFlight = null;
        resolve(success);
      };
      const onUnlocked = (): void => finish(true);
      this.soundManager.once(Phaser.Sound.Events.UNLOCKED, onUnlocked);
      const timeoutId = typeof window !== 'undefined'
        ? window.setTimeout(() => finish(!this.soundManager.locked), 1_500)
        : 0;

      const webAudioManager = this.soundManager as unknown as Partial<Phaser.Sound.WebAudioSoundManager>;
      const context = webAudioManager.context;
      if (context?.state === 'suspended') {
        void context.resume()
          .then(() => {
            if (!this.soundManager.locked) finish(true);
          })
          .catch(() => finish(false));
      }
    });
    return this.unlockInFlight;
  }

  /** Removes listeners and music owned by this service. SFX already playing are untouched. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopListeningForUnlockGesture();
    this.game.events.off(Phaser.Core.Events.STEP, this.updateFades, this);
    this.soundManager.off(Phaser.Sound.Events.UNLOCKED, this.handleUnlocked, this);
    for (const voice of [...this.voices]) this.destroyVoice(voice);
    this.fades.clear();
    this.pendingMusic = null;
    if (AudioManager.instances.get(this.game) === this) AudioManager.instances.delete(this.game);
  }

  private startMusic(key: MusicKey, fadeMs: number): boolean {
    const existing = this.currentVoice;
    if (existing?.semanticKey === key && existing.sound.isPlaying) {
      this.pendingMusic = null;
      this.scheduleFade(existing, 1, fadeMs, false);
      return true;
    }

    const sound = this.soundManager.add(MUSIC_ASSETS[key].cacheKey, {
      loop: true,
      volume: fadeMs > 0 ? 0 : this.settings.musicVolume,
    }) as VolumeSound;
    const voice: MusicVoice = { semanticKey: key, sound, gain: fadeMs > 0 ? 0 : 1 };
    if (!sound.play()) {
      sound.destroy();
      return false;
    }

    this.pendingMusic = null;
    this.voices.add(voice);
    this.currentVoice = voice;
    if (fadeMs > 0) this.scheduleFade(voice, 1, fadeMs, false);

    if (existing) {
      if (fadeMs > 0) this.scheduleFade(existing, 0, fadeMs, true);
      else this.destroyVoice(existing);
    }
    if (fadeMs === 0) {
      for (const other of [...this.voices]) {
        if (other !== voice) this.destroyVoice(other);
      }
    }
    return true;
  }

  private scheduleFade(voice: MusicVoice, target: number, durationMs: number, destroyOnComplete: boolean): void {
    const destination = clampVolume(target);
    if (durationMs <= 0) {
      voice.gain = destination;
      voice.sound.volume = destination * this.settings.musicVolume;
      if (destroyOnComplete) this.destroyVoice(voice);
      return;
    }
    this.fades.set(voice, {
      elapsed: 0,
      duration: durationMs,
      from: voice.gain,
      to: destination,
      destroyOnComplete,
    });
  }

  private updateFades(_time: number, delta: number): void {
    for (const [voice, fade] of this.fades) {
      fade.elapsed = Math.min(fade.duration, fade.elapsed + Math.max(0, delta));
      const progress = fade.duration === 0 ? 1 : fade.elapsed / fade.duration;
      const eased = Phaser.Math.Easing.Sine.InOut(progress);
      voice.gain = Phaser.Math.Linear(fade.from, fade.to, eased);
      voice.sound.volume = voice.gain * this.settings.musicVolume;
      if (progress >= 1) {
        this.fades.delete(voice);
        if (fade.destroyOnComplete) this.destroyVoice(voice);
      }
    }
  }

  private applyMusicVolumes(): void {
    for (const voice of this.voices) {
      voice.sound.volume = voice.gain * this.settings.musicVolume;
    }
  }

  private destroyVoice(voice: MusicVoice): void {
    this.fades.delete(voice);
    this.voices.delete(voice);
    if (this.currentVoice === voice) this.currentVoice = null;
    if (voice.sound.isPlaying || voice.sound.isPaused) voice.sound.stop();
    voice.sound.destroy();
  }

  private hasAsset(asset: AudioAsset, label: string): boolean {
    if (this.audioCache.exists(asset.cacheKey)) return true;
    if (!this.warnedMissing.has(label)) {
      this.warnedMissing.add(label);
      console.warn(`[AudioManager] ${label} is not loaded. Call AudioManager.preload(scene) in preload().`);
    }
    return false;
  }

  private handleUnlocked(): void {
    this.stopListeningForUnlockGesture();
    const pending = this.pendingMusic;
    if (pending && !this.soundManager.locked) this.startMusic(pending.key, pending.fadeMs);
  }

  private readonly handleUserGesture = (): void => {
    void this.unlock();
  };

  private listenForUnlockGesture(): void {
    if (this.listeningForGesture || !this.soundManager.locked || typeof window === 'undefined') return;
    this.listeningForGesture = true;
    this.game.canvas.addEventListener('pointerdown', this.handleUserGesture, { passive: true });
    window.addEventListener('keydown', this.handleUserGesture);
  }

  private stopListeningForUnlockGesture(): void {
    if (!this.listeningForGesture || typeof window === 'undefined') return;
    this.listeningForGesture = false;
    this.game.canvas.removeEventListener('pointerdown', this.handleUserGesture);
    window.removeEventListener('keydown', this.handleUserGesture);
  }

  private loadSettings(): AudioSettings {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(AUDIO_STORAGE_KEY) ?? '{}');
      if (!isRecord(parsed)) return { ...DEFAULT_SETTINGS };
      const nested = isRecord(parsed.audio) ? parsed.audio : parsed;
      return {
        masterVolume: storedVolume(
          nested.masterVolume ?? nested.master ?? parsed.masterVolume,
          DEFAULT_SETTINGS.masterVolume,
        ),
        musicVolume: storedVolume(
          nested.musicVolume ?? nested.music ?? parsed.musicVolume,
          DEFAULT_SETTINGS.musicVolume,
        ),
        sfxVolume: storedVolume(
          nested.sfxVolume ?? nested.sfx ?? parsed.sfxVolume,
          DEFAULT_SETTINGS.sfxVolume,
        ),
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private persistSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(AUDIO_STORAGE_KEY) ?? '{}');
      const root: Record<string, unknown> = isRecord(parsed) ? parsed : {};
      root.master = this.settings.masterVolume;
      root.music = this.settings.musicVolume;
      root.sfx = this.settings.sfxVolume;
      // Keep an existing nested audio block in sync without imposing one on new saves.
      if (isRecord(root.audio)) root.audio = { ...root.audio, ...this.settings };
      window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(root));
    } catch {
      // Storage may be disabled or quota-blocked; runtime audio still works.
    }
  }
}
