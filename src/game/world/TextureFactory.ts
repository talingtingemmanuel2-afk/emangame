import Phaser from 'phaser';

type PixelPoint = readonly [x: number, y: number];
type TexturePainter = (context: CanvasRenderingContext2D) => void;

const PALETTE = {
  ink: '#161627',
  inkSoft: '#25213a',
  grassDark: '#173f35',
  grass: '#28634a',
  grassLight: '#4b8b5a',
  grassGlow: '#78b867',
  barkDark: '#3b2430',
  bark: '#70413b',
  barkLight: '#a66346',
  leafDark: '#194a3e',
  leaf: '#27765a',
  leafLight: '#4da85f',
  leafGlow: '#83c968',
  stoneDark: '#34394b',
  stone: '#596276',
  stoneLight: '#8992a3',
  bone: '#ddd6b2',
  boneShadow: '#978f79',
  leather: '#8d543c',
  goldDark: '#9c5a36',
  gold: '#e4a73e',
  goldLight: '#ffe78a',
  redDark: '#822f45',
  red: '#d94b55',
  redLight: '#ff8a6b',
  blueDark: '#28507b',
  blue: '#3b9dd0',
  blueLight: '#8de7e7',
  cyan: '#5ce1d1',
  purpleDark: '#49316f',
  purple: '#8d5bc7',
  purpleLight: '#d59cff',
  yellow: '#f3c84b',
  yellowLight: '#fff1a6',
  poisonDark: '#35713c',
  poison: '#6fcf4f',
  poisonLight: '#c6f36b',
  ice: '#b9f3ff',
  white: '#fff8df',
  waterDark: '#245c72',
  water: '#338ba0',
  waterLight: '#76d0c0',
} as const;

function rect(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function polygon(
  context: CanvasRenderingContext2D,
  color: string,
  points: readonly PixelPoint[],
): void {
  if (points.length < 3) {
    return;
  }

  context.fillStyle = color;
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1]);
  }
  context.closePath();
  context.fill();
}

function pixelLine(
  context: CanvasRenderingContext2D,
  color: string,
  width: number,
  points: readonly PixelPoint[],
): void {
  if (points.length < 2) {
    return;
  }

  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = 'square';
  context.lineJoin = 'miter';
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1]);
  }
  context.stroke();
}

function steppedBox(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
  step = 2,
): void {
  rect(context, color, x + step, y, width - step * 2, height);
  rect(context, color, x, y + step, width, height - step * 2);
}

function createTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  painter: TexturePainter,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) {
    return;
  }

  const context = texture.context;
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;
  painter(context);
  texture.refresh();
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

function drawPotion(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  liquid: string,
  highlight: string,
): void {
  rect(context, PALETTE.ink, x + 6, y, 8, 4);
  rect(context, PALETTE.gold, x + 7, y + 1, 6, 3);
  rect(context, PALETTE.ink, x + 4, y + 4, 12, 3);
  polygon(context, PALETTE.ink, [
    [x + 4, y + 7],
    [x + 1, y + 12],
    [x + 1, y + 19],
    [x + 5, y + 23],
    [x + 15, y + 23],
    [x + 19, y + 19],
    [x + 19, y + 12],
    [x + 16, y + 7],
  ]);
  polygon(context, liquid, [
    [x + 5, y + 9],
    [x + 3, y + 13],
    [x + 3, y + 18],
    [x + 6, y + 21],
    [x + 14, y + 21],
    [x + 17, y + 18],
    [x + 17, y + 13],
    [x + 15, y + 9],
  ]);
  rect(context, highlight, x + 5, y + 12, 3, 6);
  rect(context, PALETTE.white, x + 7, y + 10, 2, 2);
}

function drawGem(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  dark: string,
  middle: string,
  light: string,
): void {
  polygon(context, PALETTE.ink, [
    [x + 8, y],
    [x + 15, y + 6],
    [x + 12, y + 17],
    [x + 8, y + 22],
    [x + 3, y + 17],
    [x, y + 6],
  ]);
  polygon(context, dark, [
    [x + 8, y + 2],
    [x + 13, y + 7],
    [x + 10, y + 17],
    [x + 8, y + 20],
    [x + 5, y + 16],
    [x + 2, y + 7],
  ]);
  polygon(context, middle, [
    [x + 8, y + 3],
    [x + 8, y + 17],
    [x + 4, y + 8],
  ]);
  polygon(context, light, [
    [x + 9, y + 4],
    [x + 12, y + 7],
    [x + 10, y + 11],
  ]);
}

function drawShuriken(context: CanvasRenderingContext2D, x: number, y: number): void {
  polygon(context, PALETTE.ink, [
    [x + 9, y],
    [x + 13, y + 6],
    [x + 20, y + 4],
    [x + 16, y + 10],
    [x + 20, y + 16],
    [x + 13, y + 14],
    [x + 9, y + 20],
    [x + 7, y + 13],
    [x, y + 11],
    [x + 6, y + 7],
    [x + 4, y],
  ]);
  polygon(context, PALETTE.stoneLight, [
    [x + 9, y + 2],
    [x + 12, y + 8],
    [x + 18, y + 6],
    [x + 14, y + 10],
    [x + 17, y + 14],
    [x + 11, y + 12],
    [x + 9, y + 18],
    [x + 8, y + 11],
    [x + 2, y + 10],
    [x + 8, y + 8],
    [x + 6, y + 2],
  ]);
  rect(context, PALETTE.inkSoft, x + 8, y + 8, 4, 4);
  rect(context, PALETTE.white, x + 9, y + 8, 2, 2);
}

function drawArrowhead(context: CanvasRenderingContext2D, x: number, y: number): void {
  polygon(context, PALETTE.ink, [
    [x + 18, y + 8],
    [x + 5, y],
    [x + 7, y + 6],
    [x, y + 8],
    [x + 7, y + 10],
    [x + 5, y + 16],
  ]);
  polygon(context, PALETTE.goldLight, [
    [x + 15, y + 8],
    [x + 7, y + 3],
    [x + 9, y + 7],
    [x + 3, y + 8],
    [x + 9, y + 9],
    [x + 7, y + 13],
  ]);
  rect(context, PALETTE.white, x + 8, y + 6, 4, 2);
}

function drawLightning(context: CanvasRenderingContext2D, x: number, y: number): void {
  polygon(context, PALETTE.ink, [
    [x + 12, y],
    [x + 3, y + 12],
    [x + 9, y + 12],
    [x + 5, y + 24],
    [x + 19, y + 9],
    [x + 12, y + 9],
    [x + 17, y],
  ]);
  polygon(context, PALETTE.yellowLight, [
    [x + 12, y + 2],
    [x + 6, y + 10],
    [x + 12, y + 10],
    [x + 9, y + 19],
    [x + 16, y + 11],
    [x + 10, y + 11],
    [x + 15, y + 2],
  ]);
}

function drawFlame(context: CanvasRenderingContext2D, x: number, y: number): void {
  polygon(context, PALETTE.ink, [
    [x + 11, y],
    [x + 15, y + 8],
    [x + 19, y + 5],
    [x + 21, y + 15],
    [x + 17, y + 22],
    [x + 5, y + 22],
    [x + 1, y + 16],
    [x + 5, y + 7],
    [x + 8, y + 11],
  ]);
  polygon(context, PALETTE.red, [
    [x + 11, y + 3],
    [x + 14, y + 11],
    [x + 18, y + 9],
    [x + 18, y + 16],
    [x + 15, y + 20],
    [x + 7, y + 20],
    [x + 4, y + 16],
    [x + 6, y + 10],
    [x + 9, y + 14],
  ]);
  polygon(context, PALETTE.yellowLight, [
    [x + 11, y + 10],
    [x + 14, y + 16],
    [x + 12, y + 19],
    [x + 8, y + 18],
    [x + 8, y + 14],
  ]);
}

function drawIceShard(context: CanvasRenderingContext2D, x: number, y: number): void {
  polygon(context, PALETTE.ink, [
    [x + 11, y],
    [x + 19, y + 7],
    [x + 14, y + 24],
    [x + 7, y + 27],
    [x + 2, y + 12],
  ]);
  polygon(context, PALETTE.blue, [
    [x + 11, y + 2],
    [x + 17, y + 8],
    [x + 13, y + 21],
    [x + 8, y + 24],
    [x + 4, y + 12],
  ]);
  polygon(context, PALETTE.ice, [
    [x + 11, y + 3],
    [x + 14, y + 8],
    [x + 10, y + 17],
    [x + 7, y + 11],
  ]);
  rect(context, PALETTE.white, x + 9, y + 6, 2, 5);
}

function drawIconFrame(
  context: CanvasRenderingContext2D,
  accent: string,
): void {
  steppedBox(context, PALETTE.ink, 0, 0, 32, 32, 3);
  steppedBox(context, PALETTE.inkSoft, 2, 2, 28, 28, 2);
  rect(context, accent, 4, 4, 24, 2);
  rect(context, '#34304d', 4, 26, 24, 2);
  rect(context, '#312c47', 4, 6, 2, 20);
  rect(context, '#211e35', 26, 6, 2, 20);
  rect(context, '#4d4567', 6, 6, 4, 2);
}

function createIcon(
  scene: Phaser.Scene,
  key: string,
  accent: string,
  painter: TexturePainter,
): void {
  createTexture(scene, key, 32, 32, (context) => {
    drawIconFrame(context, accent);
    painter(context);
  });
}

function createBossRigTextures(scene: Phaser.Scene): void {
  // Monster Rooster: separate tail, torso, wings, neck, head, and talons keep the
  // assembled creature readable during attack poses.
  createTexture(scene, 'rig-rooster-tail', 48, 42, (context) => {
    polygon(context, PALETTE.ink, [[45, 18], [32, 2], [25, 4], [30, 18], [14, 5], [7, 9], [22, 23], [1, 18], [0, 25], [24, 33], [11, 38], [17, 42], [38, 30], [47, 27]]);
    polygon(context, '#6f294d', [[43, 20], [32, 6], [29, 8], [34, 22], [15, 9], [12, 12], [27, 26], [5, 22], [5, 25], [29, 30], [17, 37], [21, 38], [40, 27]]);
    pixelLine(context, '#e65950', 3, [[42, 23], [16, 12]]);
    pixelLine(context, '#f28b52', 3, [[42, 25], [7, 24]]);
    pixelLine(context, '#b96ac4', 2, [[40, 28], [18, 37]]);
  });
  createTexture(scene, 'rig-rooster-body', 40, 44, (context) => {
    polygon(context, PALETTE.ink, [[12, 1], [28, 1], [38, 10], [40, 29], [31, 42], [20, 44], [8, 40], [0, 28], [2, 11]]);
    polygon(context, '#b72f3e', [[13, 4], [27, 4], [35, 12], [36, 28], [29, 38], [19, 41], [10, 37], [4, 27], [5, 13]]);
    polygon(context, '#e65347', [[17, 5], [29, 10], [31, 28], [23, 36], [12, 31], [9, 15]]);
    polygon(context, '#6c2943', [[5, 28], [15, 31], [20, 42], [9, 38]]);
    rect(context, PALETTE.gold, 7, 20, 27, 4);
    rect(context, PALETTE.goldLight, 17, 19, 7, 3);
    polygon(context, '#f69b58', [[12, 35], [19, 39], [15, 41]]);
    polygon(context, '#f69b58', [[27, 34], [22, 39], [27, 40]]);
  });
  createTexture(scene, 'rig-rooster-wing', 32, 34, (context) => {
    polygon(context, PALETTE.ink, [[4, 0], [19, 4], [31, 13], [28, 26], [17, 34], [7, 29], [0, 15]]);
    polygon(context, '#d94842', [[5, 4], [18, 7], [27, 14], [25, 23], [17, 30], [9, 26], [4, 15]]);
    polygon(context, '#f27d4d', [[8, 10], [23, 14], [18, 18], [25, 21], [17, 24], [21, 28], [11, 25], [5, 16]]);
    pixelLine(context, PALETTE.gold, 2, [[7, 7], [24, 17]]);
  });
  createTexture(scene, 'rig-rooster-neck', 18, 30, (context) => {
    polygon(context, PALETTE.ink, [[5, 0], [15, 1], [18, 24], [12, 30], [3, 26], [0, 8]]);
    polygon(context, '#d34442', [[6, 3], [13, 4], [15, 23], [11, 27], [5, 24], [3, 8]]);
    rect(context, PALETTE.gold, 4, 19, 11, 3); rect(context, '#f8914f', 5, 8, 3, 8);
  });
  createTexture(scene, 'rig-rooster-head', 32, 26, (context) => {
    polygon(context, PALETTE.ink, [[4, 2], [20, 0], [30, 8], [31, 18], [22, 25], [8, 24], [0, 16], [0, 7]]);
    polygon(context, '#c5323e', [[5, 5], [19, 3], [27, 9], [27, 17], [20, 22], [8, 21], [3, 15], [3, 8]]);
    polygon(context, '#ec6550', [[7, 5], [19, 4], [25, 9], [19, 12], [6, 10]]);
    rect(context, PALETTE.yellowLight, 20, 10, 5, 4); rect(context, PALETTE.ink, 21, 11, 2, 2);
    polygon(context, '#7b2138', [[8, 18], [14, 23], [5, 22]]);
  });
  createTexture(scene, 'rig-rooster-beak', 22, 12, (context) => {
    polygon(context, PALETTE.ink, [[0, 1], [13, 0], [22, 5], [14, 11], [1, 10]]);
    polygon(context, '#f1bd4e', [[2, 3], [13, 2], [19, 5], [13, 6], [2, 6]]);
    polygon(context, '#cf793d', [[2, 7], [14, 7], [18, 6], [13, 9], [3, 9]]);
  });
  createTexture(scene, 'rig-rooster-comb', 18, 15, (context) => {
    polygon(context, PALETTE.ink, [[1, 14], [0, 7], [3, 1], [7, 7], [10, 0], [12, 7], [17, 2], [18, 14]]);
    polygon(context, '#ef4b50', [[3, 12], [3, 7], [4, 4], [7, 10], [10, 3], [11, 10], [15, 5], [15, 12]]);
  });
  createTexture(scene, 'rig-rooster-leg', 10, 30, (context) => {
    polygon(context, PALETTE.ink, [[2, 0], [9, 0], [8, 19], [6, 29], [1, 29], [3, 18]]);
    polygon(context, '#d99b45', [[4, 2], [7, 2], [6, 18], [5, 26], [3, 26], [5, 17]]);
    rect(context, PALETTE.goldLight, 3, 8, 4, 2); rect(context, PALETTE.goldLight, 3, 15, 4, 2);
  });
  createTexture(scene, 'rig-rooster-talon', 22, 10, (context) => {
    pixelLine(context, PALETTE.ink, 4, [[11, 2], [5, 7], [0, 8]]); pixelLine(context, PALETTE.ink, 4, [[11, 2], [12, 8], [17, 9]]);
    pixelLine(context, PALETTE.ink, 3, [[11, 3], [17, 5], [21, 3]]); pixelLine(context, PALETTE.goldLight, 2, [[11, 3], [5, 7], [1, 8]]);
    pixelLine(context, PALETTE.goldLight, 2, [[12, 3], [13, 7], [17, 8]]);
  });

  // Troll: a small head and short legs sit apart from giant shoulders, hands,
  // and club, avoiding the former rock-circle silhouette.
  createTexture(scene, 'rig-troll-body', 54, 52, (context) => {
    polygon(context, PALETTE.ink, [[8, 5], [22, 0], [39, 3], [52, 14], [54, 36], [42, 51], [16, 52], [2, 40], [0, 17]]);
    polygon(context, '#42633b', [[10, 8], [23, 4], [37, 6], [48, 16], [50, 35], [39, 47], [17, 48], [6, 38], [4, 18]]);
    polygon(context, '#6e8b4a', [[13, 12], [29, 6], [44, 16], [42, 35], [31, 43], [14, 38], [8, 23]]);
    polygon(context, PALETTE.stone, [[5, 13], [17, 5], [23, 15], [15, 24], [5, 22]]);
    polygon(context, PALETTE.stoneDark, [[37, 8], [48, 16], [46, 25], [36, 19]]);
    pixelLine(context, '#8fc56b', 3, [[11, 35], [22, 42], [35, 42]]); rect(context, '#d79c56', 17, 26, 12, 3);
  });
  createTexture(scene, 'rig-troll-arm', 20, 50, (context) => {
    polygon(context, PALETTE.ink, [[5, 0], [16, 1], [20, 27], [18, 44], [13, 50], [3, 48], [0, 41], [2, 19]]);
    polygon(context, '#557544', [[7, 3], [14, 4], [17, 27], [15, 40], [11, 46], [5, 44], [3, 39], [5, 19]]);
    polygon(context, '#789450', [[7, 7], [12, 5], [14, 25], [9, 31], [5, 22]]);
    rect(context, PALETTE.stone, 3, 12, 14, 7); pixelLine(context, '#b1d272', 2, [[6, 35], [14, 38]]);
    rect(context, PALETTE.ink, 3, 44, 3, 5); rect(context, PALETTE.ink, 8, 45, 3, 5); rect(context, PALETTE.ink, 13, 43, 3, 5);
  });
  createTexture(scene, 'rig-troll-leg', 20, 34, (context) => {
    polygon(context, PALETTE.ink, [[3, 0], [17, 0], [18, 22], [20, 31], [14, 34], [1, 33], [0, 28], [3, 20]]);
    polygon(context, '#4b6b3f', [[5, 3], [15, 3], [15, 21], [17, 28], [13, 30], [3, 30], [3, 27], [6, 20]]);
    rect(context, PALETTE.stoneDark, 3, 22, 13, 6); rect(context, '#80a15a', 5, 10, 8, 3);
  });
  createTexture(scene, 'rig-troll-head', 34, 28, (context) => {
    polygon(context, PALETTE.ink, [[5, 2], [23, 0], [33, 8], [34, 19], [26, 27], [8, 28], [0, 20], [1, 8]]);
    polygon(context, '#668049', [[7, 5], [22, 3], [30, 9], [30, 18], [24, 23], [9, 24], [4, 18], [4, 9]]);
    polygon(context, '#8ba85b', [[8, 6], [20, 4], [25, 9], [8, 12]]);
    rect(context, PALETTE.yellowLight, 9, 13, 5, 4); rect(context, PALETTE.yellowLight, 22, 12, 5, 4);
    rect(context, PALETTE.ink, 11, 14, 2, 2); rect(context, PALETTE.ink, 23, 13, 2, 2);
    rect(context, '#bb6f51', 2, 4, 7, 3); rect(context, '#75a85a', 25, 20, 5, 4);
  });
  createTexture(scene, 'rig-troll-jaw', 26, 12, (context) => {
    polygon(context, PALETTE.ink, [[1, 0], [25, 0], [22, 10], [5, 12], [0, 7]]);
    polygon(context, '#3c4b34', [[3, 2], [23, 2], [20, 8], [6, 9], [3, 6]]);
    rect(context, PALETTE.bone, 5, 2, 4, 5); rect(context, PALETTE.bone, 16, 2, 4, 5);
  });
  createTexture(scene, 'rig-troll-club', 20, 66, (context) => {
    rect(context, PALETTE.ink, 7, 18, 7, 48); rect(context, '#755036', 9, 18, 4, 48);
    polygon(context, PALETTE.ink, [[2, 0], [16, 2], [20, 14], [14, 24], [2, 21], [0, 10]]);
    polygon(context, PALETTE.stoneDark, [[4, 3], [14, 5], [17, 13], [12, 20], [4, 18], [3, 10]]);
    rect(context, PALETTE.stoneLight, 5, 5, 7, 4); pixelLine(context, '#91b45f', 2, [[11, 28], [9, 44]]);
  });

  // Minotaur: bull head parts sit above a separate armored humanoid torso.
  createTexture(scene, 'rig-minotaur-body', 48, 50, (context) => {
    polygon(context, PALETTE.ink, [[7, 4], [18, 0], [33, 1], [45, 8], [48, 31], [39, 49], [11, 50], [1, 34], [0, 12]]);
    polygon(context, '#6f432e', [[9, 7], [19, 4], [32, 4], [41, 10], [44, 30], [36, 45], [13, 46], [5, 32], [4, 14]]);
    polygon(context, '#4a3440', [[9, 16], [39, 15], [41, 37], [32, 44], [15, 43], [7, 34]]);
    rect(context, PALETTE.gold, 7, 27, 35, 5); rect(context, PALETTE.goldLight, 19, 26, 10, 3);
    polygon(context, '#9b6742', [[14, 7], [24, 4], [34, 8], [30, 16], [17, 16]]);
  });
  createTexture(scene, 'rig-minotaur-arm', 16, 40, (context) => {
    polygon(context, PALETTE.ink, [[3, 0], [13, 1], [16, 24], [13, 39], [5, 40], [0, 34], [2, 18]]);
    polygon(context, '#8f5d3c', [[5, 3], [11, 3], [13, 23], [11, 35], [6, 36], [3, 32], [5, 18]]);
    rect(context, '#3e3540', 2, 12, 12, 8); rect(context, PALETTE.gold, 3, 18, 10, 3);
  });
  createTexture(scene, 'rig-minotaur-leg', 18, 38, (context) => {
    polygon(context, PALETTE.ink, [[3, 0], [15, 0], [15, 22], [18, 33], [14, 38], [3, 37], [0, 32], [4, 21]]);
    polygon(context, '#70442f', [[5, 3], [13, 3], [12, 22], [15, 31], [12, 34], [4, 34], [3, 31], [7, 21]]);
    polygon(context, '#2b2630', [[3, 30], [15, 30], [15, 36], [9, 38], [2, 35]]); rect(context, PALETTE.gold, 4, 17, 9, 3);
  });
  createTexture(scene, 'rig-minotaur-head', 42, 30, (context) => {
    polygon(context, PALETTE.ink, [[7, 3], [18, 0], [31, 2], [41, 9], [39, 21], [31, 29], [13, 29], [2, 21], [0, 10]]);
    polygon(context, '#815038', [[8, 6], [18, 3], [29, 5], [37, 10], [35, 20], [29, 25], [13, 25], [5, 19], [4, 11]]);
    polygon(context, '#ac744b', [[9, 6], [21, 3], [31, 8], [26, 12], [10, 12]]);
    rect(context, PALETTE.yellowLight, 9, 14, 6, 4); rect(context, PALETTE.yellowLight, 28, 14, 6, 4);
    rect(context, PALETTE.redLight, 11, 15, 3, 2); rect(context, PALETTE.redLight, 29, 15, 3, 2);
    polygon(context, '#68402e', [[1, 11], [7, 8], [7, 16], [1, 18]]); polygon(context, '#68402e', [[40, 10], [35, 8], [35, 16], [41, 18]]);
  });
  createTexture(scene, 'rig-minotaur-horn', 26, 18, (context) => {
    polygon(context, PALETTE.ink, [[24, 17], [15, 17], [6, 13], [0, 5], [1, 0], [8, 7], [17, 10], [26, 11]]);
    polygon(context, PALETTE.bone, [[23, 14], [16, 14], [8, 11], [3, 5], [3, 3], [9, 8], [18, 11], [24, 12]]);
    rect(context, PALETTE.boneShadow, 15, 12, 7, 3);
  });
  createTexture(scene, 'rig-minotaur-snout', 26, 14, (context) => {
    polygon(context, PALETTE.ink, [[3, 1], [21, 0], [26, 6], [22, 13], [5, 14], [0, 8]]);
    polygon(context, '#a8734f', [[4, 3], [20, 3], [23, 6], [20, 10], [6, 11], [3, 8]]);
    rect(context, PALETTE.ink, 6, 6, 4, 3); rect(context, PALETTE.ink, 17, 5, 4, 3); rect(context, '#d19864', 10, 3, 6, 2);
  });
  createTexture(scene, 'rig-minotaur-axe', 28, 70, (context) => {
    rect(context, PALETTE.ink, 12, 16, 6, 54); rect(context, '#7a4b36', 14, 16, 3, 54);
    polygon(context, PALETTE.ink, [[0, 3], [12, 0], [27, 7], [24, 22], [16, 18], [8, 23], [1, 18]]);
    polygon(context, '#a8afb8', [[3, 5], [12, 3], [24, 8], [22, 18], [16, 14], [8, 20], [3, 16]]);
    pixelLine(context, PALETTE.white, 2, [[5, 6], [20, 10]]); rect(context, PALETTE.gold, 10, 15, 10, 4);
  });

  // Werewolf: long muzzle, tail, claws, and digitigrade legs replace the old mask-like body.
  createTexture(scene, 'rig-werewolf-tail', 42, 16, (context) => {
    polygon(context, PALETTE.ink, [[41, 4], [28, 1], [13, 0], [0, 5], [8, 10], [22, 15], [36, 13], [42, 9]]);
    polygon(context, '#4f4a62', [[39, 6], [27, 4], [14, 3], [5, 6], [10, 8], [23, 12], [35, 10]]);
    pixelLine(context, '#8a819e', 2, [[34, 6], [12, 6]]);
  });
  createTexture(scene, 'rig-werewolf-body', 46, 48, (context) => {
    polygon(context, PALETTE.ink, [[6, 6], [17, 0], [32, 2], [43, 10], [46, 30], [37, 47], [12, 48], [1, 34], [0, 15]]);
    polygon(context, '#403b52', [[8, 8], [18, 4], [30, 5], [39, 12], [42, 29], [34, 43], [14, 44], [5, 32], [4, 16]]);
    polygon(context, '#6c657d', [[12, 8], [26, 5], [36, 15], [34, 31], [24, 39], [11, 33], [7, 18]]);
    polygon(context, '#8f86a4', [[14, 12], [27, 8], [31, 14], [14, 20]]); pixelLine(context, '#bd5d6f', 2, [[9, 29], [20, 37]]);
  });
  createTexture(scene, 'rig-werewolf-arm', 18, 46, (context) => {
    polygon(context, PALETTE.ink, [[3, 0], [14, 1], [18, 25], [15, 39], [18, 45], [13, 44], [10, 40], [9, 46], [5, 44], [4, 39], [0, 34], [2, 18]]);
    polygon(context, '#554f69', [[5, 3], [12, 4], [15, 24], [12, 35], [8, 39], [3, 33], [5, 18]]);
    polygon(context, '#8d84a4', [[5, 6], [11, 4], [13, 16], [6, 19]]);
    pixelLine(context, PALETTE.bone, 2, [[7, 38], [5, 44]]); pixelLine(context, PALETTE.bone, 2, [[11, 38], [10, 45]]); pixelLine(context, PALETTE.bone, 2, [[13, 37], [16, 43]]);
  });
  createTexture(scene, 'rig-werewolf-leg', 18, 42, (context) => {
    polygon(context, PALETTE.ink, [[3, 0], [15, 0], [14, 19], [8, 27], [16, 34], [18, 40], [11, 42], [3, 39], [0, 33], [5, 22]]);
    polygon(context, '#484359', [[5, 3], [13, 3], [11, 18], [6, 26], [13, 34], [14, 38], [10, 39], [4, 36], [3, 33], [8, 21]]);
    pixelLine(context, PALETTE.bone, 2, [[9, 38], [4, 41]]); pixelLine(context, PALETTE.bone, 2, [[12, 38], [16, 40]]);
  });
  createTexture(scene, 'rig-werewolf-head', 34, 30, (context) => {
    polygon(context, PALETTE.ink, [[3, 10], [5, 0], [13, 8], [24, 7], [31, 0], [32, 11], [34, 20], [25, 29], [10, 28], [0, 20]]);
    polygon(context, '#5a536d', [[5, 11], [7, 5], [13, 11], [23, 10], [29, 5], [29, 13], [31, 20], [24, 25], [11, 25], [4, 19]]);
    polygon(context, '#827992', [[9, 12], [20, 10], [25, 15], [11, 18]]);
    rect(context, PALETTE.redLight, 9, 17, 5, 3); rect(context, PALETTE.redLight, 23, 16, 5, 3);
    rect(context, PALETTE.white, 11, 17, 2, 1); rect(context, PALETTE.white, 24, 16, 2, 1);
  });
  createTexture(scene, 'rig-werewolf-muzzle', 22, 14, (context) => {
    polygon(context, PALETTE.ink, [[0, 2], [14, 0], [22, 5], [18, 13], [4, 14], [0, 9]]);
    polygon(context, '#70677f', [[2, 4], [13, 3], [18, 5], [16, 9], [5, 11], [2, 8]]);
    rect(context, PALETTE.ink, 16, 4, 6, 4);
    polygon(context, PALETTE.bone, [[5, 10], [8, 14], [10, 9]]); polygon(context, PALETTE.bone, [[12, 9], [15, 13], [17, 8]]);
  });

  // Wyvern: wings are the broad front limbs; only two rear claws and a long tail remain.
  createTexture(scene, 'rig-wyvern-tail', 46, 16, (context) => {
    polygon(context, PALETTE.ink, [[45, 3], [30, 1], [16, 0], [0, 5], [9, 9], [20, 15], [35, 12], [46, 8]]);
    polygon(context, '#98473f', [[43, 5], [29, 4], [17, 3], [5, 6], [11, 7], [21, 12], [34, 9], [43, 7]]);
    polygon(context, '#ef9a58', [[12, 4], [17, 0], [19, 5]]); polygon(context, '#ef9a58', [[25, 6], [31, 2], [30, 8]]);
  });
  createTexture(scene, 'rig-wyvern-body', 52, 36, (context) => {
    polygon(context, PALETTE.ink, [[5, 8], [19, 1], [36, 3], [50, 13], [52, 25], [39, 35], [19, 36], [2, 27], [0, 15]]);
    polygon(context, '#9d493e', [[7, 10], [20, 4], [35, 6], [46, 14], [47, 24], [37, 31], [20, 32], [6, 25], [4, 15]]);
    polygon(context, '#d76a44', [[15, 8], [30, 6], [42, 15], [38, 26], [23, 29], [11, 22]]);
    rect(context, '#efb65e', 16, 25, 22, 3); pixelLine(context, '#f18b50', 2, [[12, 14], [35, 10]]);
  });
  createTexture(scene, 'rig-wyvern-wing', 62, 54, (context) => {
    polygon(context, PALETTE.ink, [[55, 50], [42, 38], [21, 51], [26, 32], [4, 42], [17, 22], [0, 17], [25, 8], [36, 0], [38, 22], [60, 30], [62, 48]]);
    polygon(context, '#773441', [[54, 46], [42, 34], [25, 46], [30, 28], [10, 36], [22, 18], [7, 17], [27, 11], [34, 5], [35, 25], [57, 32]]);
    polygon(context, '#df7049', [[35, 25], [27, 12], [22, 19], [30, 29]]); polygon(context, '#c25745', [[35, 27], [30, 30], [25, 44], [41, 33]]);
    pixelLine(context, '#f4a15e', 3, [[57, 45], [35, 25], [27, 12]]); pixelLine(context, '#f4a15e', 2, [[35, 25], [11, 35]]);
  });
  createTexture(scene, 'rig-wyvern-leg', 16, 32, (context) => {
    polygon(context, PALETTE.ink, [[3, 0], [13, 0], [14, 19], [10, 26], [16, 31], [11, 32], [7, 28], [4, 32], [0, 30], [5, 23]]);
    polygon(context, '#b35a40', [[5, 3], [11, 3], [11, 18], [8, 24], [6, 26], [3, 29], [8, 25], [11, 29], [13, 30], [9, 25]]);
    pixelLine(context, PALETTE.goldLight, 2, [[7, 26], [3, 30]]); pixelLine(context, PALETTE.goldLight, 2, [[9, 26], [13, 30]]);
  });
  createTexture(scene, 'rig-wyvern-neck', 30, 20, (context) => {
    polygon(context, PALETTE.ink, [[0, 9], [8, 1], [23, 0], [30, 8], [25, 17], [11, 20], [2, 16]]);
    polygon(context, '#ad5140', [[3, 9], [9, 4], [22, 3], [27, 8], [23, 14], [11, 16], [4, 14]]);
    pixelLine(context, '#ef9956', 2, [[7, 7], [21, 5]]);
  });
  createTexture(scene, 'rig-wyvern-head', 38, 24, (context) => {
    polygon(context, PALETTE.ink, [[2, 5], [11, 0], [26, 2], [38, 9], [34, 20], [18, 24], [4, 19], [0, 12]]);
    polygon(context, '#b94f40', [[5, 6], [12, 3], [25, 5], [34, 10], [31, 17], [18, 21], [6, 17], [3, 11]]);
    polygon(context, '#ef8c4e', [[6, 6], [14, 2], [13, 8]]); polygon(context, '#ef8c4e', [[17, 4], [23, 0], [23, 6]]);
    rect(context, PALETTE.yellowLight, 25, 10, 5, 3); rect(context, PALETTE.ink, 27, 10, 2, 2);
    rect(context, '#772d35', 31, 16, 5, 2);
  });
  createTexture(scene, 'rig-wyvern-jaw', 26, 11, (context) => {
    polygon(context, PALETTE.ink, [[0, 0], [25, 1], [22, 8], [7, 11], [0, 7]]);
    polygon(context, '#7b3438', [[2, 2], [22, 3], [20, 6], [7, 8], [2, 6]]);
    polygon(context, PALETTE.bone, [[7, 2], [10, 7], [12, 2]]); polygon(context, PALETTE.bone, [[15, 2], [18, 6], [20, 2]]);
  });

  // Ancient Beast: skeletal pieces, open ribs, torn membranes, vines, and a
  // corruption crystal give it an unmistakably undead silhouette.
  createTexture(scene, 'rig-ancient-tail', 42, 16, (context) => {
    polygon(context, PALETTE.ink, [[41, 4], [29, 0], [17, 2], [0, 7], [12, 12], [26, 15], [40, 10]]);
    pixelLine(context, PALETTE.bone, 5, [[39, 7], [28, 5], [18, 7], [5, 9]]);
    rect(context, PALETTE.boneShadow, 25, 3, 3, 8); rect(context, PALETTE.boneShadow, 15, 5, 3, 7); rect(context, PALETTE.boneShadow, 7, 7, 3, 5);
    polygon(context, '#6ad866', [[22, 4], [25, 0], [28, 5]]);
  });
  createTexture(scene, 'rig-ancient-body', 64, 50, (context) => {
    polygon(context, PALETTE.ink, [[7, 8], [20, 1], [42, 2], [59, 12], [64, 31], [48, 48], [19, 50], [2, 37], [0, 17]]);
    polygon(context, '#3c583b', [[9, 10], [20, 5], [40, 6], [55, 14], [59, 29], [46, 43], [20, 45], [6, 35], [4, 18]]);
    polygon(context, '#6c3d69', [[7, 11], [19, 5], [21, 16], [10, 23]]); polygon(context, '#4b7a42', [[43, 7], [55, 15], [53, 25], [42, 19]]);
    pixelLine(context, PALETTE.boneShadow, 5, [[20, 11], [18, 38]]); pixelLine(context, PALETTE.bone, 3, [[21, 12], [42, 12]]);
    pixelLine(context, PALETTE.bone, 3, [[20, 17], [43, 18]]); pixelLine(context, PALETTE.bone, 3, [[19, 23], [43, 25]]);
    pixelLine(context, PALETTE.bone, 3, [[19, 30], [40, 34]]); pixelLine(context, PALETTE.bone, 3, [[19, 37], [34, 42]]);
    rect(context, PALETTE.ink, 24, 14, 5, 4); rect(context, PALETTE.ink, 31, 20, 6, 4); rect(context, PALETTE.ink, 24, 27, 5, 4);
    rect(context, '#6ee96c', 47, 29, 5, 5); rect(context, '#c279df', 8, 30, 4, 5);
  });
  createTexture(scene, 'rig-ancient-wing', 74, 62, (context) => {
    polygon(context, PALETTE.ink, [[69, 58], [52, 45], [40, 58], [34, 40], [20, 53], [23, 31], [6, 43], [15, 23], [0, 18], [29, 8], [43, 0], [45, 26], [73, 35]]);
    polygon(context, '#543353', [[67, 54], [52, 41], [41, 53], [37, 35], [22, 48], [27, 27], [11, 38], [20, 19], [7, 18], [31, 11], [40, 5], [41, 29], [69, 37]]);
    context.clearRect(18, 20, 10, 8); context.clearRect(30, 32, 9, 10); context.clearRect(45, 39, 10, 7); context.clearRect(9, 31, 8, 7);
    pixelLine(context, PALETTE.bone, 4, [[70, 52], [42, 28], [40, 5]]); pixelLine(context, PALETTE.boneShadow, 3, [[42, 29], [19, 19]]);
    pixelLine(context, PALETTE.boneShadow, 3, [[42, 29], [25, 46]]); pixelLine(context, PALETTE.boneShadow, 3, [[42, 30], [53, 42]]);
    pixelLine(context, '#6fbb54', 2, [[39, 9], [31, 20], [34, 33]]);
  });
  createTexture(scene, 'rig-ancient-leg', 20, 38, (context) => {
    pixelLine(context, PALETTE.ink, 7, [[9, 1], [13, 18], [7, 29]]); pixelLine(context, PALETTE.bone, 4, [[9, 2], [12, 18], [7, 29]]);
    pixelLine(context, PALETTE.ink, 4, [[7, 29], [1, 37]]); pixelLine(context, PALETTE.ink, 4, [[8, 29], [10, 38]]); pixelLine(context, PALETTE.ink, 4, [[9, 29], [18, 35]]);
    pixelLine(context, PALETTE.bone, 2, [[7, 29], [2, 36]]); pixelLine(context, PALETTE.bone, 2, [[9, 29], [17, 35]]);
    polygon(context, '#514158', [[5, 6], [13, 4], [17, 13], [11, 17]]);
  });
  createTexture(scene, 'rig-ancient-neck', 34, 22, (context) => {
    polygon(context, PALETTE.ink, [[0, 10], [8, 2], [25, 0], [34, 7], [29, 18], [12, 22], [2, 17]]);
    pixelLine(context, PALETTE.boneShadow, 9, [[4, 12], [11, 7], [24, 5], [30, 9]]); pixelLine(context, PALETTE.bone, 5, [[5, 11], [12, 6], [24, 5], [29, 9]]);
    rect(context, '#5c7d45', 8, 12, 8, 7); rect(context, '#684168', 23, 9, 7, 6);
  });
  createTexture(scene, 'rig-ancient-skull', 46, 28, (context) => {
    polygon(context, PALETTE.ink, [[4, 4], [14, 0], [31, 3], [45, 10], [42, 21], [28, 27], [8, 25], [0, 17]]);
    polygon(context, PALETTE.bone, [[6, 6], [15, 3], [30, 6], [41, 11], [38, 18], [27, 23], [10, 22], [4, 16]]);
    polygon(context, PALETTE.boneShadow, [[7, 7], [17, 4], [13, 13], [5, 15]]); rect(context, PALETTE.ink, 14, 11, 8, 6);
    rect(context, '#71ed68', 16, 12, 5, 3); rect(context, PALETTE.ink, 30, 15, 7, 4); rect(context, PALETTE.ink, 24, 20, 5, 4);
    polygon(context, PALETTE.boneShadow, [[10, 4], [5, 0], [16, 3]]); polygon(context, PALETTE.bone, [[29, 5], [37, 0], [34, 9]]);
    rect(context, '#67436e', 2, 17, 8, 5);
  });
  createTexture(scene, 'rig-ancient-jaw', 32, 13, (context) => {
    polygon(context, PALETTE.ink, [[0, 0], [31, 1], [27, 10], [7, 13], [0, 8]]);
    pixelLine(context, PALETTE.boneShadow, 6, [[3, 4], [14, 8], [27, 5]]); pixelLine(context, PALETTE.bone, 3, [[3, 3], [14, 6], [27, 4]]);
    polygon(context, PALETTE.bone, [[8, 3], [11, 10], [14, 4]]); polygon(context, PALETTE.bone, [[18, 4], [21, 9], [23, 3]]);
  });
  createTexture(scene, 'rig-ancient-vines', 32, 38, (context) => {
    pixelLine(context, '#285f39', 3, [[16, 0], [13, 10], [20, 20], [14, 37]]); pixelLine(context, '#4e9d4c', 2, [[16, 1], [14, 10], [21, 20], [15, 36]]);
    polygon(context, '#76bd5c', [[12, 8], [3, 5], [9, 14]]); polygon(context, '#76bd5c', [[20, 18], [30, 14], [23, 24]]);
    polygon(context, '#9bc85a', [[14, 29], [5, 31], [13, 35]]);
  });
  createTexture(scene, 'rig-ancient-crystal', 18, 22, (context) => {
    polygon(context, PALETTE.ink, [[9, 0], [17, 7], [14, 21], [4, 22], [0, 9]]);
    polygon(context, '#7f4e9d', [[9, 3], [14, 8], [12, 18], [6, 19], [3, 9]]);
    polygon(context, '#d48cf1', [[9, 3], [10, 15], [6, 18], [4, 9]]); rect(context, '#f0c2ff', 7, 6, 3, 6);
  });

  // Final Dragon: intact broad wings, plated torso, long neck, articulated claws,
  // horns, jaws, and spiked tail form the strongest silhouette in the set.
  createTexture(scene, 'rig-dragon-tail', 48, 18, (context) => {
    polygon(context, PALETTE.ink, [[47, 3], [33, 0], [18, 2], [0, 7], [10, 11], [22, 17], [38, 14], [48, 9]]);
    polygon(context, PALETTE.redDark, [[45, 5], [32, 3], [19, 5], [5, 8], [12, 9], [23, 14], [37, 11], [45, 8]]);
    polygon(context, PALETTE.gold, [[10, 6], [15, 0], [17, 7]]); polygon(context, PALETTE.gold, [[23, 5], [29, 0], [29, 7]]); polygon(context, PALETTE.gold, [[35, 6], [41, 2], [40, 9]]);
    pixelLine(context, PALETTE.redLight, 2, [[41, 7], [15, 8]]);
  });
  createTexture(scene, 'rig-dragon-body', 68, 54, (context) => {
    polygon(context, PALETTE.ink, [[8, 8], [23, 1], [46, 2], [64, 13], [68, 34], [51, 52], [20, 54], [2, 40], [0, 18]]);
    polygon(context, '#8d2f3e', [[10, 10], [24, 5], [44, 6], [59, 15], [63, 32], [48, 47], [22, 49], [7, 37], [5, 19]]);
    polygon(context, '#cf4d4b', [[16, 10], [34, 5], [53, 15], [52, 34], [40, 44], [20, 40], [10, 23]]);
    polygon(context, PALETTE.goldDark, [[18, 25], [54, 24], [49, 30], [21, 31]]);
    polygon(context, PALETTE.gold, [[20, 31], [48, 31], [44, 37], [24, 37]]);
    pixelLine(context, PALETTE.redLight, 3, [[13, 16], [35, 10], [55, 18]]);
    polygon(context, PALETTE.gold, [[14, 8], [19, 0], [22, 8]]); polygon(context, PALETTE.gold, [[29, 5], [34, 0], [37, 6]]);
  });
  createTexture(scene, 'rig-dragon-wing', 88, 74, (context) => {
    polygon(context, PALETTE.ink, [[84, 69], [61, 52], [48, 70], [42, 47], [21, 67], [28, 38], [5, 55], [17, 28], [0, 21], [37, 9], [55, 0], [55, 34], [86, 43]]);
    polygon(context, '#702b42', [[82, 64], [61, 47], [49, 64], [46, 41], [24, 61], [33, 32], [12, 49], [23, 23], [9, 21], [40, 12], [51, 5], [51, 38], [82, 46]]);
    polygon(context, '#bd3e4a', [[50, 37], [41, 14], [24, 24], [34, 33]]); polygon(context, '#9c3347', [[48, 40], [34, 34], [25, 57], [45, 39]]);
    polygon(context, '#d95650', [[52, 39], [61, 48], [49, 61], [46, 42]]);
    pixelLine(context, PALETTE.goldDark, 4, [[83, 62], [51, 38], [51, 5]]); pixelLine(context, PALETTE.gold, 2, [[51, 38], [22, 23]]);
    pixelLine(context, PALETTE.gold, 2, [[51, 39], [29, 55]]); pixelLine(context, PALETTE.gold, 2, [[52, 40], [62, 48]]);
  });
  createTexture(scene, 'rig-dragon-rear-leg', 22, 42, (context) => {
    polygon(context, PALETTE.ink, [[4, 0], [18, 1], [20, 23], [14, 33], [22, 40], [16, 42], [10, 36], [7, 42], [1, 40], [0, 34], [7, 24]]);
    polygon(context, '#a33b43', [[6, 3], [16, 4], [17, 22], [11, 31], [16, 38], [14, 39], [9, 33], [6, 39], [3, 38], [3, 35], [10, 23]]);
    rect(context, PALETTE.gold, 5, 16, 12, 3);
    pixelLine(context, PALETTE.bone, 2, [[11, 34], [6, 40]]); pixelLine(context, PALETTE.bone, 2, [[13, 34], [19, 39]]);
  });
  createTexture(scene, 'rig-dragon-foreleg', 18, 38, (context) => {
    polygon(context, PALETTE.ink, [[3, 0], [15, 1], [17, 22], [13, 32], [18, 37], [13, 38], [9, 34], [7, 38], [2, 37], [0, 32], [5, 22]]);
    polygon(context, '#bd4548', [[5, 3], [13, 4], [14, 21], [10, 29], [13, 34], [11, 35], [8, 31], [6, 35], [3, 34], [3, 32], [8, 21]]);
    pixelLine(context, PALETTE.goldLight, 2, [[9, 31], [5, 36]]); pixelLine(context, PALETTE.goldLight, 2, [[11, 31], [16, 36]]);
  });
  createTexture(scene, 'rig-dragon-neck', 40, 24, (context) => {
    polygon(context, PALETTE.ink, [[0, 11], [10, 2], [29, 0], [40, 8], [34, 20], [14, 24], [2, 18]]);
    polygon(context, '#9e3440', [[4, 11], [11, 5], [28, 4], [36, 9], [31, 17], [14, 20], [5, 16]]);
    polygon(context, '#dd5950', [[9, 9], [24, 5], [32, 9], [21, 12]]);
    polygon(context, PALETTE.gold, [[10, 5], [13, 0], [17, 5]]); polygon(context, PALETTE.gold, [[23, 3], [27, 0], [29, 5]]);
  });
  createTexture(scene, 'rig-dragon-head', 48, 30, (context) => {
    polygon(context, PALETTE.ink, [[4, 5], [15, 0], [33, 3], [48, 11], [44, 23], [28, 30], [9, 27], [0, 18]]);
    polygon(context, '#ad3743', [[6, 7], [16, 3], [32, 6], [43, 12], [40, 20], [27, 26], [11, 23], [4, 17]]);
    polygon(context, '#e05a50', [[9, 7], [19, 3], [33, 8], [29, 13], [9, 13]]);
    rect(context, PALETTE.yellowLight, 31, 13, 6, 4); rect(context, PALETTE.ink, 34, 14, 2, 2);
    rect(context, PALETTE.ink, 39, 20, 6, 3); rect(context, PALETTE.gold, 9, 18, 7, 3);
    polygon(context, PALETTE.gold, [[10, 6], [6, 0], [17, 4]]); polygon(context, PALETTE.gold, [[26, 5], [34, 0], [33, 8]]);
  });
  createTexture(scene, 'rig-dragon-jaw', 34, 14, (context) => {
    polygon(context, PALETTE.ink, [[0, 0], [33, 1], [30, 10], [9, 14], [0, 9]]);
    polygon(context, '#792d3a', [[2, 2], [30, 3], [27, 8], [9, 11], [2, 7]]);
    polygon(context, PALETTE.bone, [[8, 2], [11, 10], [14, 3]]); polygon(context, PALETTE.bone, [[18, 3], [21, 9], [24, 2]]); polygon(context, PALETTE.bone, [[26, 2], [28, 7], [31, 2]]);
    rect(context, PALETTE.redLight, 9, 9, 14, 2);
  });
  createTexture(scene, 'rig-dragon-horn', 20, 20, (context) => {
    polygon(context, PALETTE.ink, [[18, 19], [9, 17], [2, 10], [0, 0], [5, 7], [12, 12], [20, 13]]);
    polygon(context, PALETTE.gold, [[17, 16], [10, 14], [5, 9], [2, 3], [6, 8], [13, 13], [18, 14]]);
    rect(context, PALETTE.goldLight, 9, 12, 6, 2);
  });

}

/** Creates the complete original procedural pixel-art texture set used by the game. */
export function createGameTextures(scene: Phaser.Scene): void {
  createBossRigTextures(scene);
  createTexture(scene, 'ground-grass', 32, 32, (context) => {
    rect(context, PALETTE.grass, 0, 0, 32, 32);
    rect(context, PALETTE.grassDark, 2, 5, 3, 2);
    rect(context, PALETTE.grassLight, 8, 2, 2, 4);
    rect(context, PALETTE.grassDark, 18, 10, 2, 3);
    rect(context, PALETTE.grassLight, 25, 5, 4, 2);
    rect(context, '#22543f', 5, 22, 4, 3);
    rect(context, PALETTE.grassGlow, 14, 25, 2, 3);
    rect(context, PALETTE.grassDark, 27, 26, 3, 2);
    rect(context, '#347254', 20, 29, 2, 2);
    rect(context, '#20503f', 11, 15, 2, 2);
  });

  createTexture(scene, 'ground-grass2', 32, 32, (context) => {
    rect(context, '#245944', 0, 0, 32, 32);
    rect(context, PALETTE.grassDark, 4, 3, 4, 2);
    rect(context, PALETTE.grassLight, 15, 2, 2, 5);
    rect(context, '#377957', 23, 9, 3, 3);
    rect(context, PALETTE.grassDark, 8, 13, 2, 4);
    rect(context, PALETTE.grassGlow, 3, 25, 2, 3);
    rect(context, PALETTE.grassDark, 17, 23, 4, 2);
    rect(context, '#3f815a', 27, 29, 3, 2);
    rect(context, '#1d4d3c', 26, 17, 2, 2);
    rect(context, '#32704f', 11, 29, 2, 2);
  });

  createTexture(scene, 'tree-large', 56, 76, (context) => {
    polygon(context, PALETTE.ink, [[20, 35], [36, 35], [38, 70], [32, 74], [19, 74], [17, 69]]);
    polygon(context, PALETTE.barkDark, [[22, 35], [34, 35], [35, 68], [31, 72], [21, 72], [20, 67]]);
    rect(context, PALETTE.bark, 24, 39, 8, 31);
    rect(context, PALETTE.barkLight, 25, 43, 3, 19);
    rect(context, PALETTE.barkDark, 29, 52, 4, 3);
    polygon(context, PALETTE.ink, [[5, 18], [10, 7], [21, 7], [25, 0], [36, 3], [40, 9], [50, 11], [55, 23], [50, 34], [42, 39], [35, 45], [22, 43], [16, 39], [6, 37], [0, 29]]);
    polygon(context, PALETTE.leafDark, [[7, 19], [12, 9], [22, 10], [26, 3], [35, 5], [39, 12], [48, 13], [52, 23], [47, 31], [39, 34], [34, 41], [24, 39], [18, 35], [8, 34], [3, 28]]);
    steppedBox(context, PALETTE.leaf, 11, 13, 20, 19, 3);
    steppedBox(context, '#2f875c', 27, 11, 19, 20, 3);
    rect(context, PALETTE.leafLight, 16, 11, 8, 5);
    rect(context, PALETTE.leafLight, 35, 16, 7, 4);
    rect(context, PALETTE.leafGlow, 20, 19, 5, 4);
    rect(context, '#21664e', 8, 26, 9, 5);
    rect(context, PALETTE.leafDark, 33, 30, 9, 5);
    rect(context, PALETTE.leafGlow, 44, 23, 4, 3);
  });

  createTexture(scene, 'tree-small', 42, 58, (context) => {
    polygon(context, PALETTE.ink, [[15, 29], [28, 29], [29, 54], [25, 58], [14, 58], [13, 53]]);
    polygon(context, PALETTE.bark, [[17, 28], [26, 28], [27, 52], [24, 56], [16, 56], [15, 51]]);
    rect(context, PALETTE.barkLight, 18, 32, 3, 17);
    polygon(context, PALETTE.ink, [[2, 18], [8, 7], [16, 7], [21, 0], [28, 6], [36, 8], [41, 18], [37, 29], [29, 34], [19, 35], [12, 31], [4, 29], [0, 24]]);
    polygon(context, PALETTE.leafDark, [[4, 18], [10, 9], [17, 10], [21, 3], [27, 8], [34, 10], [38, 19], [34, 27], [27, 31], [19, 32], [13, 28], [6, 27], [3, 23]]);
    steppedBox(context, PALETTE.leaf, 8, 12, 21, 17, 3);
    rect(context, PALETTE.leafLight, 13, 10, 7, 4);
    rect(context, PALETTE.leafGlow, 26, 13, 5, 4);
    rect(context, '#21664e', 7, 23, 7, 4);
  });

  createTexture(scene, 'tree-dead', 48, 66, (context) => {
    polygon(context, PALETTE.ink, [[20, 12], [27, 10], [30, 24], [39, 17], [43, 19], [35, 31], [34, 59], [40, 65], [27, 65], [23, 57], [19, 65], [8, 65], [16, 56], [17, 33], [7, 25], [3, 16], [8, 14], [14, 24], [18, 26]]);
    polygon(context, PALETTE.barkDark, [[22, 14], [25, 13], [28, 29], [39, 20], [40, 21], [32, 32], [31, 58], [36, 63], [28, 63], [23, 53], [18, 63], [12, 63], [18, 55], [19, 31], [10, 24], [6, 18], [8, 17], [15, 26], [20, 28]]);
    rect(context, PALETTE.bark, 21, 24, 6, 30);
    rect(context, PALETTE.barkLight, 22, 27, 2, 15);
    rect(context, '#bd734b', 31, 26, 3, 2);
  });

  createTexture(scene, 'bush', 40, 30, (context) => {
    polygon(context, PALETTE.ink, [[1, 17], [6, 7], [13, 7], [18, 1], [25, 5], [33, 5], [39, 14], [37, 25], [30, 29], [9, 29], [2, 24]]);
    polygon(context, PALETTE.leafDark, [[3, 17], [8, 9], [14, 10], [19, 4], [25, 8], [32, 7], [37, 15], [34, 23], [29, 27], [10, 27], [4, 23]]);
    steppedBox(context, PALETTE.leaf, 7, 12, 17, 13, 3);
    steppedBox(context, '#32875a', 20, 10, 14, 15, 3);
    rect(context, PALETTE.leafLight, 11, 9, 5, 4);
    rect(context, PALETTE.leafGlow, 27, 12, 4, 3);
    rect(context, PALETTE.purpleLight, 14, 19, 2, 2);
    rect(context, PALETTE.redLight, 30, 21, 2, 2);
  });

  createTexture(scene, 'chest', 38, 32, (context) => {
    rect(context, PALETTE.purpleDark, 4, 1, 30, 3);
    rect(context, PALETTE.ink, 2, 4, 34, 25);
    steppedBox(context, PALETTE.barkDark, 4, 5, 30, 12, 3);
    rect(context, PALETTE.bark, 6, 8, 26, 8);
    rect(context, PALETTE.barkLight, 8, 9, 10, 3);
    rect(context, PALETTE.leather, 4, 19, 30, 8);
    rect(context, PALETTE.barkLight, 7, 20, 24, 3);
    rect(context, PALETTE.gold, 17, 5, 5, 24);
    rect(context, PALETTE.goldLight, 18, 8, 2, 8);
    rect(context, PALETTE.ink, 15, 15, 9, 8);
    steppedBox(context, PALETTE.gold, 17, 16, 5, 6, 1);
    rect(context, PALETTE.purpleLight, 8, 2, 5, 2);
    rect(context, PALETTE.purple, 26, 2, 4, 2);
  });

  createTexture(scene, 'rock', 36, 28, (context) => {
    polygon(context, PALETTE.ink, [[2, 15], [8, 4], [19, 1], [29, 6], [35, 17], [31, 26], [8, 27], [1, 22]]);
    polygon(context, PALETTE.stone, [[4, 15], [10, 6], [19, 3], [27, 8], [32, 17], [29, 24], [9, 25], [3, 21]]);
    polygon(context, PALETTE.stoneLight, [[11, 7], [19, 5], [24, 9], [17, 12], [9, 12]]);
    rect(context, PALETTE.stoneDark, 23, 14, 7, 7);
    rect(context, PALETTE.grassLight, 7, 20, 8, 3);
    rect(context, PALETTE.grassGlow, 10, 18, 3, 2);
  });

  createTexture(scene, 'log', 50, 26, (context) => {
    polygon(context, PALETTE.ink, [[3, 7], [38, 3], [48, 8], [49, 19], [43, 25], [7, 23], [1, 18]]);
    polygon(context, PALETTE.barkDark, [[5, 8], [38, 5], [44, 9], [44, 20], [40, 23], [7, 21], [3, 17]]);
    rect(context, PALETTE.bark, 8, 8, 31, 11);
    rect(context, PALETTE.barkLight, 11, 9, 13, 3);
    rect(context, PALETTE.barkDark, 18, 15, 16, 3);
    steppedBox(context, PALETTE.leather, 38, 7, 9, 15, 2);
    rect(context, PALETTE.barkLight, 40, 10, 5, 8);
    rect(context, PALETTE.barkDark, 42, 12, 2, 4);
    rect(context, PALETTE.grassLight, 6, 5, 8, 3);
  });

  createTexture(scene, 'stump', 30, 26, (context) => {
    polygon(context, PALETTE.ink, [[4, 5], [24, 4], [28, 10], [26, 23], [20, 26], [7, 24], [2, 19], [2, 10]]);
    rect(context, PALETTE.barkDark, 4, 10, 21, 12);
    rect(context, PALETTE.bark, 7, 11, 15, 12);
    steppedBox(context, PALETTE.leather, 4, 5, 22, 10, 3);
    steppedBox(context, PALETTE.barkLight, 7, 7, 16, 6, 2);
    rect(context, PALETTE.barkDark, 12, 8, 7, 2);
    rect(context, PALETTE.inkSoft, 15, 9, 3, 2);
  });

  createTexture(scene, 'sign', 36, 42, (context) => {
    rect(context, PALETTE.ink, 15, 18, 8, 24);
    rect(context, PALETTE.barkDark, 17, 19, 4, 23);
    polygon(context, PALETTE.ink, [[1, 4], [28, 2], [35, 12], [28, 21], [2, 20], [0, 15]]);
    polygon(context, PALETTE.bark, [[3, 6], [27, 4], [32, 12], [27, 18], [4, 18], [2, 14]]);
    rect(context, PALETTE.barkLight, 6, 7, 19, 3);
    polygon(context, PALETTE.goldLight, [[10, 12], [22, 12], [22, 9], [28, 13], [22, 17], [22, 14], [10, 14]]);
    rect(context, PALETTE.grassLight, 10, 38, 17, 3);
  });

  createTexture(scene, 'ruins', 54, 50, (context) => {
    rect(context, PALETTE.ink, 2, 42, 50, 7);
    polygon(context, PALETTE.ink, [[4, 8], [17, 3], [21, 8], [20, 38], [28, 38], [27, 14], [36, 8], [49, 11], [50, 44], [39, 45], [39, 23], [33, 21], [31, 44], [15, 44], [14, 18], [7, 17], [8, 44], [2, 44]]);
    polygon(context, PALETTE.stone, [[6, 10], [15, 6], [18, 9], [17, 40], [30, 40], [29, 16], [36, 11], [46, 13], [47, 42], [41, 42], [41, 21], [32, 19], [33, 42], [13, 42], [12, 16], [7, 15], [7, 42], [4, 42]]);
    rect(context, PALETTE.stoneLight, 8, 11, 6, 3);
    rect(context, PALETTE.stoneDark, 9, 22, 7, 3);
    rect(context, PALETTE.stoneLight, 34, 13, 8, 3);
    rect(context, PALETTE.stoneDark, 37, 29, 8, 4);
    rect(context, PALETTE.grassLight, 3, 39, 15, 4);
    rect(context, PALETTE.grassGlow, 38, 39, 11, 3);
  });

  createTexture(scene, 'lantern', 26, 44, (context) => {
    rect(context, PALETTE.ink, 11, 1, 5, 43);
    rect(context, PALETTE.bark, 12, 2, 3, 42);
    rect(context, PALETTE.ink, 13, 3, 11, 3);
    rect(context, PALETTE.goldDark, 14, 4, 8, 2);
    rect(context, PALETTE.ink, 19, 5, 4, 7);
    polygon(context, PALETTE.ink, [[15, 10], [24, 10], [26, 16], [24, 25], [15, 25], [13, 16]]);
    steppedBox(context, PALETTE.gold, 16, 12, 7, 11, 2);
    rect(context, PALETTE.yellowLight, 18, 14, 4, 7);
    rect(context, PALETTE.white, 19, 15, 2, 3);
    rect(context, PALETTE.gold, 18, 27, 3, 2);
    rect(context, PALETTE.grassLight, 5, 41, 17, 3);
  });

  createTexture(scene, 'crystal', 32, 44, (context) => {
    polygon(context, PALETTE.ink, [[4, 39], [8, 15], [14, 8], [18, 17], [23, 0], [29, 10], [26, 37], [31, 42], [1, 42]]);
    polygon(context, PALETTE.purpleDark, [[7, 38], [10, 17], [14, 12], [17, 21], [23, 3], [27, 11], [24, 38]]);
    polygon(context, PALETTE.purple, [[10, 34], [12, 17], [14, 15], [16, 30]]);
    polygon(context, PALETTE.cyan, [[23, 5], [25, 11], [23, 26], [19, 19]]);
    rect(context, PALETTE.purpleLight, 12, 18, 2, 9);
    rect(context, PALETTE.white, 22, 8, 2, 5);
    rect(context, PALETTE.grassLight, 2, 39, 28, 4);
  });

  createTexture(scene, 'pond', 66, 44, (context) => {
    polygon(context, PALETTE.ink, [[8, 7], [22, 2], [47, 3], [60, 9], [65, 22], [59, 35], [45, 42], [18, 41], [5, 34], [0, 20]]);
    polygon(context, PALETTE.waterDark, [[9, 9], [23, 4], [46, 5], [58, 11], [62, 22], [56, 33], [44, 39], [19, 38], [7, 32], [3, 20]]);
    polygon(context, PALETTE.water, [[13, 12], [29, 7], [48, 9], [57, 16], [57, 27], [48, 34], [23, 34], [11, 28], [8, 19]]);
    rect(context, PALETTE.waterLight, 17, 13, 18, 3);
    rect(context, PALETTE.blueLight, 37, 28, 13, 2);
    rect(context, PALETTE.waterDark, 23, 22, 20, 3);
    polygon(context, PALETTE.leafLight, [[11, 25], [18, 21], [25, 25], [19, 30], [12, 29]]);
    rect(context, PALETTE.yellowLight, 17, 23, 3, 3);
    rect(context, PALETTE.grassGlow, 4, 8, 5, 4);
    rect(context, PALETTE.grassLight, 56, 33, 5, 5);
  });

  createTexture(scene, 'flower', 16, 20, (context) => {
    rect(context, PALETTE.leafDark, 7, 8, 3, 12);
    rect(context, PALETTE.leafLight, 4, 13, 4, 3);
    rect(context, PALETTE.leafLight, 9, 16, 4, 3);
    rect(context, PALETTE.purpleLight, 5, 2, 5, 4);
    rect(context, PALETTE.white, 2, 5, 5, 4);
    rect(context, PALETTE.redLight, 9, 5, 5, 4);
    rect(context, PALETTE.yellowLight, 6, 5, 5, 5);
    rect(context, PALETTE.white, 7, 6, 2, 2);
  });

  createTexture(scene, 'mushroom', 20, 20, (context) => {
    rect(context, PALETTE.ink, 7, 9, 7, 11);
    rect(context, PALETTE.bone, 9, 10, 4, 9);
    polygon(context, PALETTE.ink, [[1, 10], [4, 3], [9, 0], [16, 3], [19, 10], [16, 13], [4, 13]]);
    polygon(context, PALETTE.red, [[3, 9], [6, 4], [10, 2], [15, 4], [17, 9], [15, 11], [5, 11]]);
    rect(context, PALETTE.white, 7, 4, 3, 3);
    rect(context, PALETTE.redLight, 12, 7, 3, 2);
  });

  createTexture(scene, 'enemy-slime', 30, 24, (context) => {
    polygon(context, PALETTE.ink, [[2, 20], [3, 10], [8, 3], [15, 0], [23, 4], [28, 12], [29, 20], [25, 24], [5, 24]]);
    polygon(context, PALETTE.blueDark, [[4, 19], [5, 11], [10, 5], [15, 3], [21, 6], [26, 12], [27, 19], [23, 22], [7, 22]]);
    rect(context, PALETTE.blue, 7, 9, 17, 11);
    rect(context, PALETTE.blueLight, 9, 7, 6, 4);
    rect(context, PALETTE.white, 10, 12, 4, 5);
    rect(context, PALETTE.white, 19, 12, 4, 5);
    rect(context, PALETTE.ink, 12, 14, 2, 3);
    rect(context, PALETTE.ink, 19, 14, 2, 3);
    rect(context, PALETTE.purpleLight, 15, 19, 4, 2);
    rect(context, PALETTE.white, 6, 15, 2, 2); rect(context, PALETTE.cyan, 23, 18, 3, 2);
  });

  createTexture(scene, 'enemy-goblin', 32, 38, (context) => {
    polygon(context, PALETTE.ink, [[7, 5], [1, 2], [4, 12], [6, 16], [8, 23], [5, 35], [12, 37], [16, 29], [21, 37], [28, 35], [24, 23], [26, 15], [31, 5], [23, 7], [20, 2], [12, 2]]);
    polygon(context, PALETTE.poisonDark, [[8, 7], [4, 5], [7, 14], [8, 17], [23, 17], [25, 14], [28, 7], [22, 9], [19, 4], [12, 4]]);
    rect(context, PALETTE.poison, 9, 8, 14, 11);
    rect(context, PALETTE.poisonLight, 11, 7, 5, 3);
    rect(context, PALETTE.ink, 11, 12, 3, 3);
    rect(context, PALETTE.ink, 19, 12, 3, 3);
    rect(context, PALETTE.white, 12, 12, 1, 1);
    rect(context, PALETTE.white, 20, 12, 1, 1);
    polygon(context, PALETTE.leather, [[9, 19], [23, 19], [26, 31], [20, 34], [16, 28], [12, 34], [7, 31]]);
    rect(context, PALETTE.gold, 8, 24, 17, 3);
    rect(context, PALETTE.ink, 15, 24, 4, 4);
    polygon(context, PALETTE.stoneLight, [[27, 18], [31, 17], [26, 31], [24, 30]]);
    rect(context, PALETTE.barkDark, 24, 27, 3, 9);
    rect(context, PALETTE.white, 27, 19, 2, 5); rect(context, PALETTE.redDark, 10, 20, 4, 3);
  });

  createTexture(scene, 'enemy-bat', 42, 28, (context) => {
    polygon(context, PALETTE.ink, [[20, 9], [13, 5], [1, 1], [5, 11], [0, 20], [12, 17], [17, 23], [21, 28], [25, 23], [30, 17], [42, 20], [37, 11], [41, 1], [29, 5], [23, 9]]);
    polygon(context, PALETTE.purpleDark, [[18, 11], [12, 8], [4, 4], [8, 12], [4, 17], [13, 14], [18, 20]]);
    polygon(context, PALETTE.purpleDark, [[24, 11], [30, 8], [38, 4], [34, 12], [38, 17], [29, 14], [24, 20]]);
    polygon(context, PALETTE.purple, [[18, 8], [24, 8], [27, 18], [21, 25], [15, 18]]);
    polygon(context, PALETTE.purpleLight, [[18, 8], [17, 2], [21, 7], [25, 2], [24, 9]]);
    rect(context, PALETTE.redLight, 18, 12, 3, 2);
    rect(context, PALETTE.redLight, 23, 12, 3, 2);
    rect(context, PALETTE.white, 19, 12, 1, 1);
    rect(context, PALETTE.white, 24, 12, 1, 1);
    pixelLine(context, '#b485d7', 1, [[6, 6], [14, 12], [13, 16]]); pixelLine(context, '#b485d7', 1, [[36, 6], [28, 12], [29, 16]]);
  });

  createTexture(scene, 'enemy-skeleton', 34, 42, (context) => {
    polygon(context, PALETTE.ink, [[9, 2], [23, 1], [27, 6], [26, 16], [22, 20], [22, 27], [28, 38], [24, 42], [17, 31], [12, 42], [6, 39], [12, 27], [12, 20], [7, 17], [5, 8]]);
    steppedBox(context, PALETTE.bone, 8, 3, 17, 16, 3);
    rect(context, PALETTE.ink, 11, 9, 4, 4);
    rect(context, PALETTE.ink, 19, 9, 4, 4);
    rect(context, PALETTE.inkSoft, 16, 13, 3, 3);
    rect(context, PALETTE.boneShadow, 11, 17, 12, 3);
    rect(context, PALETTE.bone, 14, 20, 6, 12);
    rect(context, PALETTE.bone, 9, 23, 16, 3);
    rect(context, PALETTE.ink, 11, 27, 12, 2);
    rect(context, PALETTE.boneShadow, 15, 22, 2, 8);
    pixelLine(context, PALETTE.bone, 3, [[11, 30], [7, 40]]);
    pixelLine(context, PALETTE.bone, 3, [[21, 30], [26, 40]]);
    pixelLine(context, PALETTE.stoneLight, 3, [[28, 8], [28, 34]]);
    polygon(context, PALETTE.stoneLight, [[24, 7], [28, 0], [32, 7]]);
    rect(context, PALETTE.barkDark, 27, 27, 4, 8);
    rect(context, PALETTE.redLight, 15, 23, 4, 2); rect(context, PALETTE.boneShadow, 6, 35, 5, 2);
  });

  createTexture(scene, 'enemy-skeleton-archer', 38, 43, (context) => {
    polygon(context, PALETTE.ink, [[9, 2], [24, 1], [29, 7], [27, 18], [23, 21], [24, 29], [31, 39], [26, 43], [18, 32], [12, 43], [6, 40], [12, 28], [11, 21], [5, 16], [5, 7]]);
    steppedBox(context, PALETTE.bone, 8, 3, 18, 17, 3); rect(context, PALETTE.ink, 11, 9, 4, 4); rect(context, PALETTE.ink, 20, 9, 4, 4);
    rect(context, PALETTE.redLight, 21, 10, 2, 2); rect(context, PALETTE.boneShadow, 12, 17, 11, 3);
    rect(context, PALETTE.bone, 14, 21, 7, 11); rect(context, PALETTE.leather, 11, 23, 13, 7);
    pixelLine(context, PALETTE.bone, 3, [[14, 31], [8, 41]]); pixelLine(context, PALETTE.bone, 3, [[21, 31], [27, 41]]);
    pixelLine(context, PALETTE.goldDark, 2, [[31, 4], [36, 12], [36, 28], [31, 37]]); pixelLine(context, PALETTE.white, 1, [[32, 5], [32, 36]]);
    pixelLine(context, PALETTE.barkLight, 2, [[31, 21], [16, 18]]); polygon(context, PALETTE.stoneLight, [[15, 18], [20, 15], [19, 20]]);
  });

  createTexture(scene, 'enemy-wolf', 44, 30, (context) => {
    polygon(context, PALETTE.ink, [[1, 10], [8, 7], [12, 2], [19, 6], [31, 6], [37, 1], [40, 8], [44, 12], [42, 21], [35, 23], [33, 30], [27, 29], [26, 22], [16, 23], [13, 30], [7, 29], [8, 21], [2, 18]]);
    polygon(context, PALETTE.stoneDark, [[3, 11], [10, 9], [13, 5], [19, 8], [31, 8], [36, 4], [37, 10], [42, 13], [40, 19], [33, 21], [31, 27], [28, 27], [28, 20], [14, 21], [11, 27], [9, 27], [10, 19], [4, 17]]);
    rect(context, PALETTE.stone, 14, 9, 21, 10);
    polygon(context, PALETTE.stoneLight, [[15, 9], [23, 9], [18, 15], [12, 16]]);
    rect(context, PALETTE.redLight, 35, 12, 3, 2);
    rect(context, PALETTE.white, 36, 12, 1, 1);
    rect(context, PALETTE.ink, 40, 16, 4, 3);
    rect(context, PALETTE.bone, 36, 20, 5, 2);
    pixelLine(context, PALETTE.stoneLight, 2, [[17, 10], [24, 12], [31, 9]]); rect(context, PALETTE.redDark, 8, 15, 4, 2);
  });

  createTexture(scene, 'enemy-spider', 38, 32, (context) => {
    // Eight separately angled legs surround a small head and distinct abdomen.
    pixelLine(context, '#25172f', 3, [[16, 13], [8, 7], [1, 1]]); pixelLine(context, '#25172f', 3, [[15, 15], [6, 13], [0, 10]]);
    pixelLine(context, '#25172f', 3, [[15, 18], [6, 20], [0, 25]]); pixelLine(context, '#25172f', 3, [[17, 20], [9, 27], [4, 31]]);
    pixelLine(context, '#25172f', 3, [[22, 13], [30, 7], [37, 1]]); pixelLine(context, '#25172f', 3, [[23, 15], [32, 13], [38, 10]]);
    pixelLine(context, '#25172f', 3, [[23, 18], [32, 20], [38, 25]]); pixelLine(context, '#25172f', 3, [[21, 20], [29, 27], [34, 31]]);
    polygon(context, PALETTE.ink, [[11, 7], [19, 3], [27, 8], [26, 18], [19, 21], [11, 17]]);
    polygon(context, '#74508e', [[13, 8], [19, 5], [24, 9], [23, 16], [19, 18], [13, 15]]);
    polygon(context, PALETTE.ink, [[14, 17], [24, 17], [28, 24], [24, 30], [14, 30], [10, 24]]);
    polygon(context, '#563768', [[15, 19], [23, 19], [25, 24], [22, 28], [15, 27], [13, 23]]);
    rect(context, '#f1668b', 14, 11, 3, 3); rect(context, '#f1668b', 21, 11, 3, 3);
    polygon(context, PALETTE.bone, [[15, 16], [17, 22], [19, 16]]); polygon(context, PALETTE.bone, [[20, 16], [22, 22], [24, 16]]);
    polygon(context, '#75d06a', [[17, 21], [22, 21], [24, 25], [19, 27], [15, 24]]);
  });
  createTexture(scene, 'enemy-zombie', 38, 43, (context) => {
    // Head, reaching arms, torso and separated dragging legs remain independently readable.
    polygon(context, '#15241c', [[9, 2], [24, 1], [30, 7], [28, 19], [21, 23], [9, 20], [4, 13]]);
    polygon(context, '#6f9668', [[10, 4], [23, 4], [27, 8], [25, 17], [20, 20], [10, 17], [7, 12]]);
    rect(context, '#d7e36a', 11, 10, 3, 3); rect(context, '#d7e36a', 21, 9, 3, 3);
    polygon(context, '#3b2830', [[10, 16], [24, 15], [22, 21], [14, 22], [8, 19]]); rect(context, PALETTE.bone, 14, 17, 3, 4); rect(context, PALETTE.bone, 20, 16, 3, 4);
    polygon(context, '#53624f', [[8, 20], [26, 20], [28, 34], [20, 36], [17, 31], [13, 36], [6, 34]]);
    pixelLine(context, '#6f9668', 5, [[9, 22], [2, 27], [0, 34]]); pixelLine(context, '#6f9668', 5, [[25, 22], [32, 25], [37, 31]]);
    rect(context, '#934a48', 0, 31, 5, 4); rect(context, '#b8c49a', 33, 29, 5, 3);
    polygon(context, '#404d3e', [[8, 32], [15, 32], [14, 43], [5, 42]]); polygon(context, '#404d3e', [[20, 32], [27, 32], [32, 41], [23, 43]]);
    rect(context, PALETTE.ink, 15, 33, 5, 10); pixelLine(context, '#934a48', 2, [[13, 24], [24, 29]]);
  });
  createTexture(scene, 'enemy-mushroom', 40, 42, (context) => {
    polygon(context, '#201521', [[3, 17], [8, 5], [20, 0], [32, 5], [38, 17], [31, 23], [26, 22], [27, 36], [35, 39], [29, 42], [21, 38], [12, 42], [5, 39], [13, 35], [14, 22], [7, 23]]);
    polygon(context, '#b65f8b', [[5, 16], [10, 7], [20, 3], [30, 8], [36, 16], [29, 20], [10, 20]]);
    rect(context, '#f2c7d9', 15, 22, 11, 16); rect(context, '#fff0d7', 11, 10, 5, 4); rect(context, '#fff0d7', 25, 7, 4, 4);
    rect(context, '#6f254f', 9, 15, 4, 3); rect(context, '#6f254f', 27, 14, 4, 3); rect(context, '#e6b0cf', 18, 26, 2, 5);
    pixelLine(context, '#d7a8c7', 3, [[15, 27], [7, 31], [3, 35]]); pixelLine(context, '#d7a8c7', 3, [[25, 27], [32, 31], [37, 34]]);
    pixelLine(context, '#f2c7d9', 2, [[14, 36], [8, 40]]); pixelLine(context, '#f2c7d9', 2, [[25, 36], [31, 40]]);
  });
  createTexture(scene, 'enemy-plant', 40, 44, (context) => {
    polygon(context, '#15351e', [[18, 10], [7, 2], [10, 15], [0, 18], [12, 25], [27, 25], [40, 18], [29, 15], [33, 3], [22, 10]]);
    polygon(context, '#4d9a4e', [[14, 10], [20, 5], [27, 11], [28, 23], [23, 31], [15, 29], [11, 21]]);
    polygon(context, '#8f4f54', [[12, 15], [20, 11], [28, 15], [25, 23], [20, 26], [14, 22]]);
    polygon(context, '#241d28', [[14, 17], [26, 17], [23, 22], [17, 22]]); polygon(context, '#f1d06a', [[16, 17], [18, 21], [20, 17]]); polygon(context, '#f1d06a', [[21, 17], [23, 21], [25, 17]]);
    pixelLine(context, '#78c861', 3, [[14, 25], [6, 30], [3, 39]]); pixelLine(context, '#78c861', 3, [[26, 25], [34, 30], [37, 39]]);
    polygon(context, '#69b85a', [[8, 8], [1, 3], [5, 14]]); polygon(context, '#69b85a', [[31, 8], [38, 3], [35, 14]]);
    pixelLine(context, '#3c793f', 3, [[18, 28], [14, 37], [7, 43]]); pixelLine(context, '#3c793f', 3, [[22, 28], [26, 37], [34, 43]]); pixelLine(context, '#3c793f', 2, [[20, 29], [20, 43]]);
  });
  createTexture(scene, 'enemy-darkKnight', 42, 46, (context) => {
    polygon(context, '#111522', [[10, 1], [29, 1], [35, 10], [32, 24], [29, 28], [29, 43], [22, 46], [19, 34], [14, 46], [7, 43], [8, 27], [4, 13]]);
    polygon(context, '#3f4965', [[11, 4], [28, 4], [31, 12], [28, 25], [11, 25], [7, 13]]); rect(context, '#dc5575', 11, 13, 17, 3);
    polygon(context, '#66708d', [[12, 5], [20, 1], [27, 5], [29, 11], [10, 11]]); rect(context, '#ec6b83', 17, 15, 5, 3);
    polygon(context, '#20263b', [[10, 26], [29, 26], [28, 37], [23, 35], [22, 45], [17, 45], [16, 35], [9, 38]]); rect(context, PALETTE.ink, 17, 34, 5, 11);
    polygon(context, '#111522', [[4, 18], [12, 15], [13, 34], [4, 37], [0, 29]]); polygon(context, '#59647d', [[5, 20], [10, 18], [10, 31], [5, 33], [2, 28]]); rect(context, '#9da7ba', 4, 24, 7, 2);
    pixelLine(context, PALETTE.ink, 5, [[32, 14], [34, 41]]); pixelLine(context, '#b7bfd2', 3, [[32, 13], [34, 39]]); polygon(context, '#d5d9df', [[29, 10], [35, 1], [38, 12]]);
  });
  createTexture(scene, 'enemy-lizardman', 42, 43, (context) => {
    polygon(context, '#18301c', [[8, 5], [24, 3], [33, 8], [39, 13], [31, 19], [28, 25], [31, 38], [24, 42], [19, 31], [13, 43], [6, 39], [10, 23], [4, 14]]);
    polygon(context, '#5d9d50', [[10, 7], [23, 6], [30, 10], [35, 13], [28, 16], [26, 22], [11, 21], [7, 14]]);
    polygon(context, '#52744a', [[10, 22], [27, 22], [26, 34], [20, 31], [14, 36], [8, 33]]); rect(context, '#7c4d35', 10, 26, 16, 3);
    polygon(context, '#76bd5c', [[8, 8], [14, 1], [17, 8]]); rect(context, '#d9e66c', 23, 10, 4, 3); rect(context, PALETTE.ink, 25, 11, 2, 2);
    polygon(context, '#4f863f', [[9, 24], [1, 27], [0, 33], [12, 31]]); pixelLine(context, '#7fbd5b', 2, [[9, 27], [2, 31]]);
    pixelLine(context, '#c7b17a', 3, [[31, 4], [32, 40]]); polygon(context, PALETTE.stoneLight, [[27, 5], [31, 0], [35, 6]]); rect(context, '#704732', 29, 23, 7, 4);
    pixelLine(context, PALETTE.bone, 2, [[14, 36], [9, 42]]); pixelLine(context, PALETTE.bone, 2, [[23, 35], [29, 41]]);
  });
  createTexture(scene, 'enemy-witch', 44, 46, (context) => {
    polygon(context, '#21162c', [[19, 0], [8, 14], [15, 16], [7, 43], [20, 38], [35, 44], [27, 16], [36, 15]]);
    polygon(context, '#7e3c74', [[11, 29], [20, 18], [29, 29], [35, 42], [20, 38], [6, 42]]); rect(context, '#e1c9b2', 14, 13, 11, 10);
    rect(context, '#f16b9c', 15, 17, 3, 2); rect(context, '#f16b9c', 22, 17, 3, 2);
    pixelLine(context, '#e1c9b2', 3, [[15, 26], [8, 31]]); pixelLine(context, '#e1c9b2', 3, [[26, 26], [32, 31]]); rect(context, '#f0c6ad', 5, 29, 5, 4); rect(context, '#f0c6ad', 31, 29, 5, 4);
    polygon(context, '#b49ae6', [[18, 27], [21, 22], [24, 27], [21, 31]]);
    pixelLine(context, PALETTE.ink, 5, [[40, 7], [38, 45]]); pixelLine(context, '#6d4938', 3, [[40, 8], [38, 45]]); polygon(context, '#c78be0', [[35, 8], [40, 1], [44, 8], [40, 13]]);
    rect(context, '#e5aff5', 38, 5, 4, 4);
  });

  createTexture(scene, 'boss-minotaur', 70, 78, (context) => {
    polygon(context, '#1f1512', [[16, 9], [1, 0], [7, 18], [13, 22], [7, 40], [13, 72], [28, 78], [35, 62], [44, 78], [59, 72], [62, 40], [56, 22], [69, 0], [53, 9], [45, 3], [25, 3]]);
    polygon(context, '#7a4b31', [[18, 10], [27, 7], [43, 7], [52, 12], [55, 27], [45, 38], [25, 38], [15, 27]]);
    rect(context, '#f0b85c', 20, 20, 6, 4); rect(context, '#f0b85c', 44, 20, 6, 4); rect(context, '#463044', 17, 39, 38, 28);
    polygon(context, '#9d6a45', [[4, 2], [14, 12], [18, 24], [10, 19]]); polygon(context, '#9d6a45', [[66, 2], [56, 12], [52, 24], [60, 19]]);
    rect(context, '#d6a04f', 24, 43, 22, 6); rect(context, '#222331', 30, 48, 10, 4); pixelLine(context, '#c6cbd2', 5, [[57, 39], [66, 64]]);
    polygon(context, '#9aa2ac', [[55, 32], [68, 26], [65, 55], [55, 60]]); rect(context, '#f77a58', 32, 15, 6, 4);
  });

  createTexture(scene, 'boss-rooster', 90, 82, (context) => {
    polygon(context, PALETTE.ink, [[39, 8], [43, 0], [49, 8], [56, 1], [56, 13], [65, 17], [78, 12], [75, 23], [88, 30], [77, 36], [85, 48], [69, 47], [65, 63], [73, 78], [59, 82], [48, 67], [37, 82], [23, 78], [31, 61], [24, 50], [8, 58], [15, 44], [1, 37], [18, 28], [23, 16], [34, 14]]);
    polygon(context, '#a41f37', [[38, 11], [44, 5], [48, 12], [54, 6], [53, 17], [61, 20], [71, 17], [68, 27], [81, 31], [69, 35], [75, 43], [62, 41], [58, 58], [65, 74], [56, 76], [47, 61], [38, 76], [28, 74], [35, 58], [29, 46], [16, 52], [22, 40], [10, 36], [24, 29], [28, 19]]);
    polygon(context, '#e74842', [[33, 20], [46, 14], [59, 21], [63, 38], [57, 55], [46, 64], [34, 55], [27, 39]]);
    polygon(context, '#f58448', [[14, 35], [30, 25], [32, 47], [18, 48], [25, 40]]); polygon(context, '#f58448', [[76, 31], [61, 24], [60, 45], [73, 43], [67, 37]]);
    polygon(context, '#ffd36b', [[29, 20], [35, 14], [43, 15], [39, 22]]); polygon(context, '#ffd36b', [[56, 21], [66, 20], [75, 25], [63, 29]]);
    polygon(context, '#f6bd46', [[64, 29], [86, 34], [65, 40]]); rect(context, PALETTE.yellowLight, 55, 26, 5, 4); rect(context, PALETTE.ink, 57, 27, 2, 2);
    polygon(context, '#6b1631', [[38, 56], [47, 62], [57, 54], [55, 65], [47, 71], [38, 65]]);
    pixelLine(context, '#d9a64c', 4, [[40, 63], [34, 77]]); pixelLine(context, '#d9a64c', 4, [[54, 62], [60, 77]]);
    pixelLine(context, '#ffe08a', 2, [[34, 77], [25, 80]]); pixelLine(context, '#ffe08a', 2, [[60, 77], [69, 80]]);
    rect(context, PALETTE.white, 36, 26, 5, 3); rect(context, '#ff6d5f', 37, 27, 3, 2);
  });

  createTexture(scene, 'boss-troll', 78, 84, (context) => {
    polygon(context, PALETTE.ink, [[18, 7], [31, 1], [47, 4], [57, 13], [70, 16], [77, 34], [70, 55], [61, 57], [59, 79], [47, 84], [39, 68], [31, 83], [17, 79], [17, 58], [7, 55], [0, 36], [8, 17]]);
    polygon(context, '#395a36', [[20, 9], [32, 4], [46, 7], [54, 16], [66, 19], [73, 35], [66, 51], [57, 53], [55, 75], [48, 79], [39, 63], [32, 78], [22, 75], [21, 54], [11, 51], [5, 36], [12, 21]]);
    polygon(context, '#668449', [[22, 13], [35, 8], [49, 13], [55, 28], [51, 46], [40, 57], [25, 48], [17, 34]]);
    polygon(context, '#8cac59', [[14, 16], [21, 7], [27, 14], [20, 24]]); polygon(context, '#8cac59', [[54, 16], [62, 8], [67, 18], [59, 25]]);
    rect(context, '#f0d46a', 23, 27, 7, 5); rect(context, '#f0d46a', 45, 27, 7, 5); rect(context, PALETTE.ink, 26, 29, 3, 2); rect(context, PALETTE.ink, 46, 29, 3, 2);
    polygon(context, '#2a3529', [[27, 40], [49, 40], [45, 50], [31, 50]]); rect(context, PALETTE.bone, 31, 40, 4, 5); rect(context, PALETTE.bone, 42, 40, 4, 5);
    pixelLine(context, '#76583c', 5, [[66, 32], [72, 69]]); polygon(context, '#7c7f69', [[57, 13], [75, 5], [73, 28], [62, 34]]);
    rect(context, '#6fa355', 19, 61, 8, 4); rect(context, '#9dc967', 50, 58, 6, 6); rect(context, '#d8b64d', 35, 15, 5, 3);
  });

  createTexture(scene, 'boss-werewolf', 82, 70, (context) => {
    polygon(context, PALETTE.ink, [[7, 18], [18, 12], [23, 2], [34, 11], [51, 10], [63, 1], [66, 13], [78, 18], [81, 34], [72, 44], [67, 64], [55, 70], [45, 54], [33, 69], [20, 64], [18, 46], [5, 40], [0, 29]]);
    polygon(context, '#39364f', [[10, 20], [20, 15], [25, 7], [34, 14], [50, 13], [60, 6], [61, 17], [74, 21], [77, 33], [68, 41], [63, 59], [56, 65], [45, 50], [34, 64], [24, 59], [22, 42], [9, 37], [4, 29]]);
    polygon(context, '#69627e', [[20, 20], [31, 14], [50, 16], [63, 22], [67, 35], [57, 47], [43, 50], [27, 43], [15, 33]]);
    polygon(context, '#8d82a9', [[25, 18], [38, 16], [29, 29], [18, 32]]); polygon(context, '#8d82a9', [[56, 18], [45, 16], [53, 30], [65, 32]]);
    rect(context, '#f16b76', 26, 28, 7, 4); rect(context, '#f16b76', 50, 28, 7, 4); rect(context, PALETTE.white, 28, 28, 2, 2); rect(context, PALETTE.white, 52, 28, 2, 2);
    polygon(context, PALETTE.ink, [[32, 39], [51, 39], [47, 48], [38, 48]]); polygon(context, PALETTE.bone, [[35, 40], [39, 47], [42, 40], [46, 47], [49, 40]]);
    pixelLine(context, '#b99cff', 2, [[9, 26], [2, 20]]); pixelLine(context, '#b99cff', 2, [[71, 26], [80, 20]]); rect(context, '#796da1', 35, 54, 14, 4);
  });

  createTexture(scene, 'boss-wyvern', 112, 82, (context) => {
    polygon(context, PALETTE.ink, [[52, 7], [61, 4], [68, 16], [81, 12], [108, 2], [99, 24], [112, 36], [89, 42], [82, 54], [103, 67], [84, 68], [72, 59], [64, 76], [53, 82], [42, 72], [30, 68], [9, 67], [30, 53], [24, 42], [0, 36], [15, 23], [7, 3], [36, 13], [46, 17]]);
    polygon(context, '#8e3f3c', [[49, 18], [35, 16], [12, 7], [20, 23], [6, 34], [29, 38], [35, 50], [14, 63], [31, 61], [42, 52], [48, 66], [39, 72], [52, 76], [61, 70], [76, 67], [67, 56], [77, 48], [87, 62], [99, 63], [80, 48], [86, 38], [107, 34], [94, 23], [101, 7], [78, 16], [66, 21]]);
    polygon(context, '#d46a43', [[52, 12], [62, 10], [67, 27], [76, 36], [72, 52], [62, 67], [52, 72], [43, 58], [38, 42], [43, 27]]);
    polygon(context, '#f69b59', [[16, 12], [38, 19], [34, 37], [9, 32], [24, 23]]); polygon(context, '#f69b59', [[97, 12], [78, 19], [81, 37], [105, 32], [91, 23]]);
    polygon(context, '#efb85d', [[46, 22], [68, 22], [71, 36], [64, 45], [50, 44], [42, 35]]); rect(context, PALETTE.yellowLight, 49, 29, 5, 3); rect(context, PALETTE.yellowLight, 61, 29, 5, 3);
    polygon(context, PALETTE.bone, [[47, 43], [52, 50], [56, 44], [60, 50], [65, 43]]); rect(context, '#ffd06d', 53, 52, 10, 3); pixelLine(context, '#efbf6c', 3, [[42, 52], [34, 61]]); pixelLine(context, '#efbf6c', 3, [[73, 53], [81, 62]]);
  });

  createTexture(scene, 'boss-golem', 68, 76, (context) => {
    polygon(context, PALETTE.ink, [[15, 10], [28, 3], [42, 5], [49, 14], [61, 18], [67, 35], [61, 57], [52, 58], [49, 73], [37, 75], [32, 62], [26, 75], [14, 74], [13, 59], [5, 56], [0, 37], [6, 19]]);
    polygon(context, PALETTE.stoneDark, [[17, 12], [29, 6], [40, 8], [47, 17], [58, 20], [64, 36], [58, 54], [49, 55], [46, 70], [38, 72], [32, 57], [27, 72], [17, 71], [16, 56], [8, 53], [4, 37], [9, 22]]);
    polygon(context, PALETTE.stone, [[20, 13], [31, 9], [41, 12], [47, 24], [45, 43], [36, 53], [22, 48], [16, 35]]);
    rect(context, PALETTE.stoneLight, 23, 13, 13, 5);
    rect(context, PALETTE.ink, 21, 25, 7, 5);
    rect(context, PALETTE.ink, 38, 25, 7, 5);
    rect(context, PALETTE.cyan, 23, 26, 4, 3);
    rect(context, PALETTE.cyan, 39, 26, 4, 3);
    pixelLine(context, PALETTE.cyan, 3, [[33, 17], [30, 29], [35, 37], [31, 49]]);
    pixelLine(context, PALETTE.blueLight, 1, [[33, 18], [31, 29], [36, 37]]);
    rect(context, PALETTE.stoneLight, 8, 27, 8, 14);
    rect(context, PALETTE.stoneLight, 50, 31, 10, 12);
    rect(context, PALETTE.grassLight, 19, 66, 8, 4);
  });

  createTexture(scene, 'boss-vampire', 52, 64, (context) => {
    polygon(context, PALETTE.ink, [[19, 2], [33, 2], [37, 8], [45, 6], [40, 15], [49, 27], [51, 59], [38, 54], [32, 64], [25, 54], [18, 64], [13, 54], [1, 59], [3, 28], [12, 15], [7, 6], [16, 8]]);
    polygon(context, '#301c43', [[16, 13], [10, 17], [5, 30], [5, 54], [15, 49], [20, 58], [25, 48], [31, 58], [38, 49], [47, 55], [46, 30], [38, 16], [33, 13]]);
    polygon(context, PALETTE.bone, [[18, 7], [33, 7], [36, 14], [32, 25], [25, 29], [18, 24], [15, 14]]);
    polygon(context, PALETTE.inkSoft, [[17, 8], [25, 2], [34, 8], [31, 12], [19, 12]]);
    rect(context, PALETTE.red, 18, 15, 5, 3);
    rect(context, PALETTE.red, 29, 15, 5, 3);
    rect(context, PALETTE.white, 19, 15, 2, 1);
    rect(context, PALETTE.white, 30, 15, 2, 1);
    rect(context, PALETTE.redLight, 23, 24, 5, 2);
    polygon(context, PALETTE.redDark, [[14, 26], [25, 34], [38, 25], [34, 49], [26, 54], [18, 49]]);
    rect(context, PALETTE.red, 24, 31, 4, 17);
    polygon(context, PALETTE.redLight, [[24, 31], [28, 31], [26, 38]]);
    rect(context, PALETTE.purpleLight, 7, 34, 3, 9);
    rect(context, PALETTE.purpleLight, 42, 32, 3, 9);
  });

  createTexture(scene, 'boss-dragon', 116, 88, (context) => {
    polygon(context, PALETTE.ink, [[54, 5], [63, 5], [67, 16], [80, 11], [108, 2], [101, 21], [115, 34], [91, 40], [86, 51], [107, 66], [91, 67], [79, 58], [73, 70], [91, 80], [74, 82], [59, 88], [42, 81], [26, 81], [42, 69], [36, 57], [23, 68], [7, 66], [29, 49], [24, 40], [0, 34], [15, 21], [8, 2], [36, 12], [49, 17]]);
    polygon(context, PALETTE.redDark, [[50, 18], [38, 15], [13, 7], [20, 21], [6, 32], [27, 37], [34, 50], [13, 63], [29, 62], [40, 53], [47, 68], [34, 77], [49, 75], [58, 83], [68, 76], [83, 78], [70, 67], [77, 53], [89, 62], [102, 63], [82, 48], [88, 37], [109, 32], [96, 21], [103, 7], [77, 16], [66, 20]]);
    polygon(context, PALETTE.red, [[54, 11], [62, 11], [66, 25], [75, 34], [73, 52], [66, 66], [58, 78], [48, 66], [41, 52], [42, 34], [50, 26]]);
    polygon(context, PALETTE.redLight, [[17, 12], [38, 19], [35, 37], [10, 31], [24, 22]]);
    polygon(context, PALETTE.redLight, [[99, 12], [78, 19], [81, 37], [106, 31], [92, 22]]);
    rect(context, PALETTE.gold, 51, 20, 14, 19);
    polygon(context, PALETTE.goldLight, [[54, 8], [49, 0], [57, 5], [63, 0], [62, 9]]);
    polygon(context, PALETTE.ink, [[48, 20], [68, 20], [71, 34], [65, 43], [51, 43], [45, 34]]);
    polygon(context, PALETTE.red, [[50, 22], [66, 22], [68, 33], [63, 40], [52, 40], [48, 33]]);
    rect(context, PALETTE.yellowLight, 51, 28, 5, 3);
    rect(context, PALETTE.yellowLight, 61, 28, 5, 3);
    rect(context, PALETTE.white, 52, 28, 2, 1);
    rect(context, PALETTE.white, 62, 28, 2, 1);
    polygon(context, PALETTE.goldLight, [[50, 41], [54, 47], [57, 41], [60, 47], [64, 41]]);
    rect(context, PALETTE.goldDark, 53, 50, 10, 3);
    rect(context, PALETTE.redLight, 50, 57, 16, 4);
    pixelLine(context, PALETTE.gold, 3, [[45, 53], [36, 61]]);
    pixelLine(context, PALETTE.gold, 3, [[71, 53], [80, 61]]);
  });

  createTexture(scene, 'projectile-bolt', 22, 12, (context) => {
    rect(context, PALETTE.purpleDark, 0, 5, 8, 3);
    rect(context, PALETTE.purple, 4, 3, 9, 6);
    polygon(context, PALETTE.ink, [[9, 1], [15, 1], [22, 6], [15, 11], [9, 11], [5, 6]]);
    polygon(context, PALETTE.cyan, [[10, 3], [15, 3], [19, 6], [15, 9], [10, 9], [7, 6]]);
    rect(context, PALETTE.white, 12, 4, 5, 3);
  });

  createTexture(scene, 'projectile-shuriken', 22, 22, (context) => {
    drawShuriken(context, 1, 1);
  });

  createTexture(scene, 'projectile-arrow', 20, 18, (context) => {
    drawArrowhead(context, 1, 1);
  });

  createTexture(scene, 'projectile-rock', 18, 18, (context) => {
    polygon(context, PALETTE.ink, [[2, 5], [7, 1], [14, 3], [17, 9], [14, 16], [6, 17], [1, 12]]);
    polygon(context, PALETTE.stone, [[4, 6], [8, 3], [13, 5], [15, 9], [12, 14], [7, 15], [3, 11]]);
    rect(context, PALETTE.stoneLight, 7, 4, 5, 3);
    rect(context, PALETTE.stoneDark, 4, 10, 4, 3);
  });

  createTexture(scene, 'projectile-feather', 24, 12, (context) => {
    polygon(context, PALETTE.ink, [[1, 10], [6, 3], [14, 0], [23, 2], [18, 8], [10, 12]]);
    polygon(context, PALETTE.white, [[4, 9], [8, 4], [15, 2], [21, 3], [17, 7], [10, 10]]);
    pixelLine(context, PALETTE.gold, 2, [[3, 10], [19, 3]]);
    rect(context, PALETTE.redLight, 8, 5, 4, 2);
  });

  createTexture(scene, 'projectile-blood', 14, 20, (context) => {
    polygon(context, PALETTE.ink, [[7, 0], [13, 11], [12, 17], [8, 20], [3, 18], [0, 13]]);
    polygon(context, PALETTE.red, [[7, 3], [11, 11], [10, 16], [7, 18], [4, 16], [2, 13]]);
    rect(context, PALETTE.redLight, 5, 8, 3, 5);
  });

  createTexture(scene, 'projectile-fireball', 24, 20, (context) => {
    polygon(context, PALETTE.redDark, [[0, 8], [8, 5], [13, 1], [22, 5], [24, 11], [20, 18], [10, 20], [5, 16]]);
    rect(context, PALETTE.red, 6, 7, 13, 10);
    steppedBox(context, PALETTE.gold, 10, 5, 10, 11, 2);
    rect(context, PALETTE.yellowLight, 13, 8, 6, 6);
    rect(context, PALETTE.white, 15, 9, 3, 3);
  });

  createTexture(scene, 'xp-gem', 18, 24, (context) => {
    rect(context, PALETTE.purpleDark, 1, 7, 2, 10);
    rect(context, PALETTE.cyan, 15, 7, 2, 10);
    drawGem(context, 1, 1, PALETTE.blueDark, PALETTE.cyan, PALETTE.white);
  });

  createTexture(scene, 'pickup-health', 24, 24, (context) => {
    polygon(context, PALETTE.ink, [[12, 22], [2, 13], [1, 7], [5, 2], [11, 3], [12, 6], [14, 3], [20, 2], [23, 7], [22, 13]]);
    polygon(context, PALETTE.poison, [[12, 19], [4, 12], [3, 7], [6, 4], [10, 5], [12, 9], [14, 5], [19, 4], [21, 7], [20, 12]]);
    rect(context, PALETTE.poisonLight, 6, 6, 4, 3);
    rect(context, PALETTE.white, 8, 9, 8, 3);
    rect(context, PALETTE.white, 10, 7, 4, 7);
  });

  createTexture(scene, 'pickup-magnet', 26, 26, (context) => {
    polygon(context, PALETTE.ink, [[2, 2], [10, 2], [10, 14], [12, 18], [15, 18], [17, 14], [17, 2], [25, 2], [25, 16], [20, 24], [8, 24], [1, 16]]);
    polygon(context, PALETTE.red, [[4, 4], [8, 4], [8, 15], [11, 20], [16, 20], [19, 15], [19, 4], [23, 4], [23, 15], [19, 22], [8, 22], [3, 15]]);
    rect(context, PALETTE.white, 4, 4, 4, 5);
    rect(context, PALETTE.blueLight, 19, 4, 4, 5);
    rect(context, PALETTE.redLight, 5, 10, 3, 6);
    rect(context, PALETTE.cyan, 19, 10, 3, 6);
  });

  createTexture(scene, 'potion-red', 22, 26, (context) => {
    drawPotion(context, 1, 1, PALETTE.red, PALETTE.redLight);
  });
  createTexture(scene, 'potion-blue', 22, 26, (context) => {
    drawPotion(context, 1, 1, PALETTE.blue, PALETTE.blueLight);
  });
  createTexture(scene, 'potion-yellow', 22, 26, (context) => {
    drawPotion(context, 1, 1, PALETTE.yellow, PALETTE.yellowLight);
  });
  createTexture(scene, 'potion-green', 22, 26, (context) => {
    drawPotion(context, 1, 1, PALETTE.poison, PALETTE.poisonLight);
  });

  createTexture(scene, 'orb', 20, 20, (context) => {
    steppedBox(context, PALETTE.purpleDark, 0, 0, 20, 20, 4);
    steppedBox(context, PALETTE.purple, 2, 2, 16, 16, 3);
    steppedBox(context, PALETTE.cyan, 5, 4, 11, 11, 2);
    rect(context, PALETTE.white, 7, 6, 5, 4);
    rect(context, PALETTE.blueLight, 11, 11, 3, 3);
  });

  createTexture(scene, 'meteor', 30, 34, (context) => {
    polygon(context, PALETTE.redDark, [[1, 0], [9, 7], [13, 1], [17, 10], [24, 5], [23, 15], [29, 18], [24, 22], [7, 20]]);
    polygon(context, PALETTE.red, [[5, 3], [11, 10], [14, 5], [18, 14], [23, 10], [21, 18], [8, 18]]);
    polygon(context, PALETTE.ink, [[6, 17], [17, 13], [27, 19], [29, 28], [21, 34], [9, 31], [3, 24]]);
    polygon(context, PALETTE.stoneDark, [[8, 19], [17, 16], [24, 20], [26, 27], [20, 31], [10, 29], [6, 24]]);
    rect(context, PALETTE.stoneLight, 11, 19, 7, 4);
    rect(context, PALETTE.gold, 20, 22, 4, 5);
  });

  createTexture(scene, 'ice-shard', 22, 30, (context) => {
    drawIceShard(context, 1, 1);
  });

  createTexture(scene, 'black-hole', 38, 38, (context) => {
    steppedBox(context, PALETTE.purpleDark, 0, 6, 38, 26, 7);
    steppedBox(context, PALETTE.purple, 3, 8, 32, 22, 6);
    steppedBox(context, PALETTE.cyan, 7, 11, 24, 16, 5);
    steppedBox(context, PALETTE.ink, 10, 11, 20, 16, 5);
    rect(context, '#090912', 13, 13, 14, 12);
    rect(context, PALETTE.white, 5, 8, 4, 3);
    rect(context, PALETTE.purpleLight, 29, 27, 5, 3);
  });

  createIcon(scene, 'icon-bolt', PALETTE.cyan, (context) => {
    polygon(context, PALETTE.purple, [[6, 17], [14, 10], [24, 12], [27, 16], [22, 20], [13, 20]]);
    polygon(context, PALETTE.cyan, [[10, 17], [16, 12], [24, 14], [25, 16], [21, 18], [14, 18]]);
    rect(context, PALETTE.white, 17, 14, 6, 2);
  });

  createIcon(scene, 'icon-orb', PALETTE.purpleLight, (context) => {
    steppedBox(context, PALETTE.purple, 10, 10, 12, 12, 3);
    steppedBox(context, PALETTE.cyan, 13, 13, 6, 6, 2);
    rect(context, PALETTE.white, 14, 13, 3, 2);
    steppedBox(context, PALETTE.gold, 5, 5, 5, 5, 1);
    steppedBox(context, PALETTE.gold, 22, 21, 5, 5, 1);
  });

  createIcon(scene, 'icon-meteor', PALETTE.redLight, (context) => {
    polygon(context, PALETTE.red, [[5, 6], [13, 11], [15, 6], [20, 13], [13, 18]]);
    polygon(context, PALETTE.stone, [[12, 16], [21, 13], [27, 19], [24, 26], [15, 25], [10, 21]]);
    rect(context, PALETTE.gold, 15, 16, 6, 4);
    rect(context, PALETTE.stoneLight, 18, 15, 4, 2);
  });

  createIcon(scene, 'icon-poison', PALETTE.poisonLight, (context) => {
    drawPotion(context, 6, 5, PALETTE.poison, PALETTE.poisonLight);
    rect(context, PALETTE.purpleLight, 7, 23, 3, 2);
  });

  createIcon(scene, 'icon-shuriken', PALETTE.stoneLight, (context) => {
    drawShuriken(context, 6, 6);
  });

  createIcon(scene, 'icon-laser', PALETTE.redLight, (context) => {
    polygon(context, PALETTE.redDark, [[5, 19], [24, 8], [27, 12], [8, 23]]);
    polygon(context, PALETTE.red, [[6, 18], [25, 10], [26, 12], [8, 21]]);
    polygon(context, PALETTE.white, [[8, 17], [24, 11], [23, 13], [9, 19]]);
    rect(context, PALETTE.purple, 5, 21, 5, 4);
  });

  createIcon(scene, 'icon-arrow', PALETTE.goldLight, (context) => {
    drawArrowhead(context, 7, 8);
  });

  createIcon(scene, 'icon-lightning', PALETTE.yellowLight, (context) => {
    drawLightning(context, 6, 4);
  });

  createIcon(scene, 'icon-fire-ring', PALETTE.redLight, (context) => {
    drawFlame(context, 5, 5);
    steppedBox(context, PALETTE.redDark, 5, 8, 22, 18, 5);
    steppedBox(context, PALETTE.red, 7, 10, 18, 14, 4);
    steppedBox(context, PALETTE.yellowLight, 10, 13, 12, 8, 3);
    steppedBox(context, PALETTE.inkSoft, 12, 14, 8, 6, 2);
    rect(context, PALETTE.white, 7, 10, 3, 3);
  });

  createIcon(scene, 'icon-ice', PALETTE.ice, (context) => {
    drawIceShard(context, 6, 3);
    rect(context, PALETTE.blueLight, 5, 22, 5, 2);
    rect(context, PALETTE.white, 21, 8, 3, 3);
  });

  createIcon(scene, 'icon-black-hole', PALETTE.purpleLight, (context) => {
    steppedBox(context, PALETTE.purple, 5, 8, 22, 17, 5);
    steppedBox(context, PALETTE.cyan, 8, 10, 16, 13, 4);
    steppedBox(context, PALETTE.ink, 10, 11, 12, 11, 3);
    rect(context, '#080810', 13, 13, 6, 6);
    rect(context, PALETTE.white, 7, 9, 3, 2);
  });
}
