import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Deterministic, dependency-free PCM synthesis for Glimmergrove's original audio.
// Re-run with: node scripts/generate-audio.mjs
const SAMPLE_RATE = 22_050;
const TAU = Math.PI * 2;
const outputDirectory = fileURLToPath(new URL('../public/assets/audio/', import.meta.url));

let randomState = 0x47_4c_49_4d;

function random() {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 0x1_00_00_00_00;
}

function seconds(value) {
  return Math.max(0, Math.round(value * SAMPLE_RATE));
}

function buffer(duration) {
  return new Float64Array(seconds(duration));
}

function midi(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function smoothStep(value) {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
}

function waveAt(kind, phase) {
  const cycle = phase / TAU;
  switch (kind) {
    case 'triangle':
      return 2 * Math.abs(2 * (cycle - Math.floor(cycle + 0.5))) - 1;
    case 'square':
      return Math.sin(phase) >= 0 ? 1 : -1;
    case 'saw':
      return 2 * (cycle - Math.floor(cycle + 0.5));
    default:
      return Math.sin(phase);
  }
}

function addTone(target, options) {
  const {
    start = 0,
    duration,
    from,
    to = from,
    volume = 0.2,
    wave = 'sine',
    attack = 0.008,
    release = 0.08,
    harmonics = [[1, 1]],
    tremolo = 0,
    tremoloRate = 5,
  } = options;
  const first = seconds(start);
  const count = Math.min(seconds(duration), target.length - first);
  const attackSamples = Math.max(1, seconds(Math.min(attack, duration * 0.45)));
  const releaseSamples = Math.max(1, seconds(Math.min(release, duration * 0.45)));
  const harmonicTotal = harmonics.reduce((sum, harmonic) => sum + Math.abs(harmonic[1]), 0) || 1;
  let phase = 0;

  for (let i = 0; i < count; i += 1) {
    const progress = count <= 1 ? 1 : i / (count - 1);
    const frequency = from > 0 && to > 0 ? from * (to / from) ** progress : from;
    phase += (TAU * frequency) / SAMPLE_RATE;
    const fadeIn = smoothStep(i / attackSamples);
    const fadeOut = smoothStep((count - 1 - i) / releaseSamples);
    const tremoloGain = tremolo > 0
      ? 1 - tremolo * 0.5 + Math.sin(TAU * tremoloRate * (i / SAMPLE_RATE)) * tremolo * 0.5
      : 1;
    let value = 0;
    for (const [ratio, strength] of harmonics) {
      value += waveAt(wave, phase * ratio) * strength;
    }
    target[first + i] += (value / harmonicTotal) * volume * fadeIn * fadeOut * tremoloGain;
  }
}

function addNoise(target, options) {
  const {
    start = 0,
    duration,
    volume = 0.15,
    attack = 0.003,
    release = 0.08,
    color = 0,
    crackle = 0,
  } = options;
  const first = seconds(start);
  const count = Math.min(seconds(duration), target.length - first);
  const attackSamples = Math.max(1, seconds(Math.min(attack, duration * 0.45)));
  const releaseSamples = Math.max(1, seconds(Math.min(release, duration * 0.45)));
  let filtered = 0;

  for (let i = 0; i < count; i += 1) {
    const raw = random() * 2 - 1;
    filtered += (raw - filtered) * (1 - Math.max(0, Math.min(0.995, color)));
    const impulse = crackle > 0 && random() < crackle / SAMPLE_RATE ? (random() * 2 - 1) * 2.5 : 0;
    const fadeIn = smoothStep(i / attackSamples);
    const fadeOut = smoothStep((count - 1 - i) / releaseSamples);
    target[first + i] += (filtered + impulse) * volume * fadeIn * fadeOut;
  }
}

function addBell(target, start, duration, note, volume = 0.18) {
  addTone(target, {
    start,
    duration,
    from: midi(note),
    volume,
    wave: 'sine',
    attack: 0.004,
    release: duration * 0.78,
    harmonics: [[1, 1], [2, 0.32], [3, 0.13], [4.05, 0.08]],
  });
}

function addPluck(target, start, duration, note, volume = 0.15) {
  addTone(target, {
    start,
    duration,
    from: midi(note),
    to: midi(note) * 0.997,
    volume,
    wave: 'triangle',
    attack: 0.003,
    release: duration * 0.72,
    harmonics: [[1, 1], [2, 0.2], [3, 0.08]],
  });
}

function addDrum(target, start, volume = 0.35, low = 105) {
  addTone(target, {
    start,
    duration: 0.22,
    from: low,
    to: 42,
    volume,
    wave: 'sine',
    attack: 0.002,
    release: 0.16,
    harmonics: [[1, 1], [2, 0.12]],
  });
  addNoise(target, { start, duration: 0.055, volume: volume * 0.28, release: 0.05, color: 0.3 });
}

function addChord(target, start, duration, notes, volume, options = {}) {
  const perNote = volume / Math.sqrt(notes.length);
  for (const note of notes) {
    addTone(target, {
      start,
      duration,
      from: midi(note),
      volume: perNote,
      wave: options.wave ?? 'triangle',
      attack: options.attack ?? 0.22,
      release: options.release ?? 0.5,
      tremolo: options.tremolo ?? 0.08,
      tremoloRate: options.tremoloRate ?? 4,
      harmonics: options.harmonics ?? [[1, 1], [2, 0.13], [3, 0.04]],
    });
  }
}

function finish(target, peak = 0.86, edgeFade = 0.008) {
  let mean = 0;
  for (const sample of target) mean += sample;
  mean /= Math.max(1, target.length);
  let maximum = 0;
  for (let i = 0; i < target.length; i += 1) {
    target[i] -= mean;
    maximum = Math.max(maximum, Math.abs(target[i]));
  }
  const gain = maximum > 0 ? Math.min(1, peak / maximum) : 1;
  const fadeSamples = Math.min(seconds(edgeFade), Math.floor(target.length / 2));
  for (let i = 0; i < target.length; i += 1) {
    const edge = fadeSamples > 0
      ? Math.min(1, i / fadeSamples, (target.length - 1 - i) / fadeSamples)
      : 1;
    target[i] *= gain * smoothStep(edge);
  }
  return target;
}

function forestMusic() {
  const beat = 2 / 3;
  const target = buffer(beat * 16);
  const chords = [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59]];
  chords.forEach((notes, bar) => addChord(target, bar * beat * 4, beat * 4, notes, 0.19, {
    attack: 0.5,
    release: 0.72,
    tremolo: 0.13,
    tremoloRate: 2.1,
  }));
  const arpeggio = [72, 76, 79, 83, 69, 72, 76, 81, 65, 69, 72, 77, 67, 71, 74, 79];
  arpeggio.forEach((note, index) => addPluck(target, index * beat, beat * 0.82, note, 0.09));
  [[1, 79], [3, 81], [5, 76], [7, 72], [9, 77], [11, 76], [13, 74], [15, 72]].forEach(([step, note]) => {
    addTone(target, {
      start: step * beat,
      duration: beat * 1.45,
      from: midi(note),
      volume: 0.09,
      wave: 'sine',
      attack: 0.12,
      release: 0.42,
      tremolo: 0.18,
      tremoloRate: 5.3,
    });
  });
  addNoise(target, { duration: target.length / SAMPLE_RATE, volume: 0.018, attack: 0.8, release: 0.8, color: 0.985 });
  return finish(target, 0.74, 0.025);
}

function bossMusic() {
  const beat = 0.6;
  const target = buffer(beat * 16);
  const bass = [38, 38, 41, 36, 38, 43, 41, 36, 38, 38, 46, 45, 43, 41, 36, 37];
  bass.forEach((note, index) => addPluck(target, index * beat, beat * 0.82, note, 0.24));
  for (let i = 0; i < 16; i += 1) {
    addDrum(target, i * beat, i % 4 === 0 ? 0.42 : 0.27, 118);
    if (i % 4 === 2) addNoise(target, { start: i * beat, duration: 0.15, volume: 0.16, release: 0.13, color: 0.46 });
  }
  const ostinato = [62, 65, 68, 65, 62, 67, 70, 67];
  for (let i = 0; i < 32; i += 1) {
    addPluck(target, i * beat * 0.5, beat * 0.42, ostinato[i % ostinato.length], 0.085);
  }
  [[0, [50, 53, 56]], [4, [48, 53, 57]], [8, [46, 50, 55]], [12, [49, 53, 56]]].forEach(([step, notes]) => {
    addChord(target, Number(step) * beat, beat * 4, notes, 0.14, { wave: 'saw', attack: 0.06, release: 0.35 });
  });
  return finish(target, 0.82, 0.012);
}

function dragonMusic() {
  const beat = 0.625;
  const target = buffer(beat * 16);
  addChord(target, 0, target.length / SAMPLE_RATE, [31, 38, 43], 0.2, {
    wave: 'sine', attack: 0.7, release: 0.8, tremolo: 0.2, tremoloRate: 1.4,
  });
  const lowPattern = [31, 32, 31, 37, 31, 39, 37, 32];
  for (let i = 0; i < 16; i += 1) {
    const note = lowPattern[i % lowPattern.length];
    addTone(target, {
      start: i * beat,
      duration: beat * 0.9,
      from: midi(note),
      to: midi(note) * 0.98,
      volume: 0.26,
      wave: 'triangle',
      attack: 0.015,
      release: 0.22,
      harmonics: [[1, 1], [2, 0.3], [3, 0.12]],
    });
    if (i % 2 === 0) addDrum(target, i * beat, i % 4 === 0 ? 0.45 : 0.3, 82);
  }
  const brass = [[0, 55], [2, 56], [4, 55], [6, 61], [8, 55], [10, 63], [12, 61], [14, 56]];
  brass.forEach(([step, note]) => addTone(target, {
    start: step * beat,
    duration: beat * 1.65,
    from: midi(note),
    volume: 0.13,
    wave: 'saw',
    attack: 0.08,
    release: 0.33,
    harmonics: [[1, 1], [2, 0.18], [3, 0.09]],
  }));
  addNoise(target, { duration: target.length / SAMPLE_RATE, volume: 0.035, attack: 0.7, release: 0.7, color: 0.978, crackle: 16 });
  return finish(target, 0.84, 0.018);
}

function victoryMusic() {
  const beat = 0.5;
  const target = buffer(beat * 16);
  const chords = [[48, 55, 60, 64], [53, 57, 60, 65], [55, 59, 62, 67], [48, 55, 60, 67]];
  chords.forEach((notes, bar) => addChord(target, bar * beat * 4, beat * 4, notes, 0.2, {
    wave: 'triangle', attack: 0.035, release: 0.32, tremolo: 0.05,
  }));
  const melody = [72, 76, 79, 84, 83, 79, 81, 77, 79, 83, 86, 91, 88, 86, 84, 79];
  melody.forEach((note, index) => addBell(target, index * beat, beat * 0.9, note, index >= 12 ? 0.18 : 0.14));
  for (let i = 0; i < 16; i += 1) {
    if (i % 2 === 0) addDrum(target, i * beat, i % 4 === 0 ? 0.28 : 0.18, 105);
  }
  return finish(target, 0.78, 0.018);
}

function gameoverMusic() {
  const beat = 5 / 6;
  const target = buffer(beat * 12);
  const chords = [[45, 52, 57, 60], [43, 50, 55, 59], [41, 48, 53, 57]];
  chords.forEach((notes, bar) => addChord(target, bar * beat * 4, beat * 4, notes, 0.2, {
    wave: 'sine', attack: 0.42, release: 0.75, tremolo: 0.1, tremoloRate: 1.8,
  }));
  const melody = [[0, 69, 1.5], [1.5, 67, 1], [2.5, 64, 1.4], [4, 67, 1.5], [5.5, 62, 1], [6.5, 59, 1.4], [8, 60, 1.3], [9.3, 57, 2.1]];
  melody.forEach(([step, note, length]) => addTone(target, {
    start: step * beat,
    duration: length * beat,
    from: midi(note),
    to: midi(note) * 0.992,
    volume: 0.16,
    wave: 'triangle',
    attack: 0.08,
    release: 0.5,
    tremolo: 0.1,
    tremoloRate: 4.2,
  }));
  addNoise(target, { duration: target.length / SAMPLE_RATE, volume: 0.013, attack: 1, release: 1, color: 0.992 });
  return finish(target, 0.7, 0.025);
}

function boltSfx() {
  const target = buffer(0.34);
  addTone(target, { duration: 0.3, from: 1_900, to: 260, volume: 0.32, wave: 'saw', release: 0.12, harmonics: [[1, 1], [2, 0.18]] });
  addNoise(target, { duration: 0.2, volume: 0.23, release: 0.17, color: 0.34, crackle: 55 });
  return finish(target);
}

function hitSfx() {
  const target = buffer(0.19);
  addDrum(target, 0, 0.58, 165);
  addNoise(target, { duration: 0.13, volume: 0.38, release: 0.12, color: 0.42 });
  return finish(target);
}

function deathSfx() {
  const target = buffer(1.05);
  addTone(target, { duration: 0.95, from: 330, to: 72, volume: 0.35, wave: 'triangle', attack: 0.01, release: 0.38, tremolo: 0.2, tremoloRate: 8 });
  addTone(target, { start: 0.08, duration: 0.78, from: 510, to: 92, volume: 0.16, wave: 'sine', release: 0.35 });
  addNoise(target, { start: 0.12, duration: 0.75, volume: 0.12, release: 0.42, color: 0.88 });
  return finish(target, 0.78);
}

function xpSfx() {
  const target = buffer(0.28);
  addBell(target, 0, 0.24, 84, 0.3);
  addBell(target, 0.075, 0.19, 91, 0.22);
  return finish(target, 0.76);
}

function levelupSfx() {
  const target = buffer(0.95);
  [72, 76, 79, 84, 88].forEach((note, index) => addBell(target, index * 0.12, 0.48, note, 0.2));
  addChord(target, 0.48, 0.46, [72, 76, 79, 84], 0.27, { attack: 0.015, release: 0.36, tremolo: 0 });
  return finish(target, 0.78);
}

function dashSfx() {
  const target = buffer(0.38);
  addNoise(target, { duration: 0.34, volume: 0.32, attack: 0.015, release: 0.18, color: 0.75 });
  addTone(target, { duration: 0.3, from: 260, to: 1_350, volume: 0.18, wave: 'sine', attack: 0.01, release: 0.13 });
  return finish(target, 0.8);
}

function potionSfx() {
  const target = buffer(0.58);
  [[0.02, 76], [0.14, 81], [0.27, 88], [0.39, 93]].forEach(([start, note]) => {
    addTone(target, { start, duration: 0.2, from: midi(note) * 0.78, to: midi(note), volume: 0.2, wave: 'sine', release: 0.12 });
  });
  return finish(target, 0.74);
}

function chestSfx() {
  const target = buffer(0.82);
  addTone(target, { duration: 0.17, from: 190, to: 110, volume: 0.42, wave: 'triangle', release: 0.11 });
  addNoise(target, { duration: 0.14, volume: 0.24, release: 0.1, color: 0.7 });
  [76, 83, 88].forEach((note, index) => addBell(target, 0.24 + index * 0.11, 0.43, note, 0.17));
  return finish(target, 0.78);
}

function bushSfx() {
  const target = buffer(0.42);
  addNoise(target, { duration: 0.38, volume: 0.42, attack: 0.025, release: 0.12, color: 0.9, crackle: 90 });
  addTone(target, { start: 0.06, duration: 0.24, from: 360, to: 210, volume: 0.08, wave: 'triangle', release: 0.12 });
  return finish(target, 0.72);
}

function healSfx() {
  const target = buffer(0.86);
  [65, 69, 72, 77].forEach((note, index) => addTone(target, {
    start: index * 0.12,
    duration: 0.55,
    from: midi(note),
    to: midi(note) * 1.01,
    volume: 0.16,
    wave: 'sine',
    attack: 0.04,
    release: 0.36,
    tremolo: 0.12,
  }));
  return finish(target, 0.72);
}

function magnetSfx() {
  const target = buffer(0.66);
  addTone(target, { duration: 0.62, from: 180, to: 760, volume: 0.28, wave: 'sine', attack: 0.02, release: 0.22, tremolo: 0.65, tremoloRate: 18 });
  addTone(target, { start: 0.13, duration: 0.46, from: 240, to: 1_050, volume: 0.15, wave: 'triangle', release: 0.2, tremolo: 0.5, tremoloRate: 23 });
  return finish(target, 0.76);
}

function slamSfx() {
  const target = buffer(0.62);
  addDrum(target, 0.04, 0.75, 145);
  addTone(target, { start: 0.04, duration: 0.48, from: 82, to: 34, volume: 0.45, wave: 'sine', release: 0.36 });
  addNoise(target, { start: 0.04, duration: 0.43, volume: 0.37, release: 0.31, color: 0.76, crackle: 95 });
  return finish(target, 0.9);
}

function rockSfx() {
  const target = buffer(0.46);
  [0, 0.045, 0.105, 0.18].forEach((start, index) => {
    addTone(target, { start, duration: 0.19, from: 155 - index * 18, to: 70, volume: 0.23, wave: 'triangle', release: 0.14 });
    addNoise(target, { start, duration: 0.16, volume: 0.21, release: 0.13, color: 0.82, crackle: 110 });
  });
  return finish(target, 0.82);
}

function teleportSfx() {
  const target = buffer(0.92);
  addTone(target, { duration: 0.86, from: 170, to: 1_750, volume: 0.25, wave: 'sine', attack: 0.05, release: 0.26, tremolo: 0.7, tremoloRate: 15 });
  addTone(target, { start: 0.12, duration: 0.7, from: 1_200, to: 290, volume: 0.17, wave: 'triangle', attack: 0.12, release: 0.3, tremolo: 0.55, tremoloRate: 21 });
  addNoise(target, { start: 0.16, duration: 0.62, volume: 0.08, attack: 0.16, release: 0.22, color: 0.92 });
  return finish(target, 0.77);
}

function wolfSfx() {
  const target = buffer(1.2);
  addTone(target, { start: 0.04, duration: 1.1, from: 310, to: 470, volume: 0.31, wave: 'triangle', attack: 0.18, release: 0.38, tremolo: 0.3, tremoloRate: 6.5, harmonics: [[1, 1], [2, 0.24], [3, 0.08]] });
  addTone(target, { start: 0.22, duration: 0.82, from: 465, to: 390, volume: 0.18, wave: 'sine', attack: 0.12, release: 0.34, tremolo: 0.2, tremoloRate: 7.2 });
  return finish(target, 0.78);
}

function dragonRoarSfx() {
  const target = buffer(1.58);
  addTone(target, { start: 0.02, duration: 1.48, from: 128, to: 58, volume: 0.43, wave: 'saw', attack: 0.09, release: 0.48, tremolo: 0.52, tremoloRate: 13, harmonics: [[1, 1], [2, 0.35], [3, 0.16]] });
  addTone(target, { start: 0.13, duration: 1.25, from: 86, to: 48, volume: 0.32, wave: 'triangle', attack: 0.08, release: 0.46, tremolo: 0.4, tremoloRate: 9 });
  addNoise(target, { start: 0.06, duration: 1.4, volume: 0.24, attack: 0.12, release: 0.42, color: 0.88, crackle: 42 });
  return finish(target, 0.88);
}

function fireSfx() {
  const target = buffer(1.02);
  addNoise(target, { duration: 0.98, volume: 0.34, attack: 0.04, release: 0.2, color: 0.82, crackle: 185 });
  addTone(target, { start: 0.03, duration: 0.84, from: 155, to: 78, volume: 0.12, wave: 'triangle', attack: 0.08, release: 0.24, tremolo: 0.62, tremoloRate: 17 });
  return finish(target, 0.79);
}

function clickSfx() {
  const target = buffer(0.105);
  addTone(target, { duration: 0.09, from: 920, to: 520, volume: 0.34, wave: 'triangle', attack: 0.001, release: 0.07 });
  addNoise(target, { duration: 0.045, volume: 0.18, release: 0.04, color: 0.3 });
  return finish(target, 0.68, 0.002);
}

function toWav(samples) {
  const dataLength = samples.length * 2;
  const wav = Buffer.allocUnsafe(44 + dataLength);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataLength, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataLength, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    wav.writeInt16LE(Math.round(sample * (sample < 0 ? 32_768 : 32_767)), 44 + i * 2);
  }
  return wav;
}

const assets = [
  ['music-forest.wav', forestMusic],
  ['music-boss.wav', bossMusic],
  ['music-dragon.wav', dragonMusic],
  ['music-victory.wav', victoryMusic],
  ['music-gameover.wav', gameoverMusic],
  ['sfx-bolt.wav', boltSfx],
  ['sfx-hit.wav', hitSfx],
  ['sfx-death.wav', deathSfx],
  ['sfx-xp.wav', xpSfx],
  ['sfx-levelup.wav', levelupSfx],
  ['sfx-dash.wav', dashSfx],
  ['sfx-potion.wav', potionSfx],
  ['sfx-chest.wav', chestSfx],
  ['sfx-bush.wav', bushSfx],
  ['sfx-heal.wav', healSfx],
  ['sfx-magnet.wav', magnetSfx],
  ['sfx-slam.wav', slamSfx],
  ['sfx-rock.wav', rockSfx],
  ['sfx-teleport.wav', teleportSfx],
  ['sfx-wolf.wav', wolfSfx],
  ['sfx-dragon-roar.wav', dragonRoarSfx],
  ['sfx-fire.wav', fireSfx],
  ['sfx-click.wav', clickSfx],
];

await mkdir(outputDirectory, { recursive: true });
let totalBytes = 0;
for (const [filename, synthesize] of assets) {
  const wav = toWav(synthesize());
  await writeFile(new URL(filename, new URL('../public/assets/audio/', import.meta.url)), wav);
  totalBytes += wav.length;
  console.log(`${filename.padEnd(24)} ${(wav.length / 1024).toFixed(1).padStart(7)} KiB`);
}
console.log(`Generated ${assets.length} original WAV assets (${(totalBytes / 1024 / 1024).toFixed(2)} MiB total).`);
