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

/** Creates the complete original procedural pixel-art texture set used by the game. */
export function createGameTextures(scene: Phaser.Scene): void {
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
