import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import {
  ASSET_ROOT,
  ASSET_SIZE,
  REQUIRED_ASSET_PATHS,
} from './asset-contract.mjs';

function createImage() {
  return new PNG({ width: ASSET_SIZE, height: ASSET_SIZE });
}

function setPixel(image, x, y, [r, g, b, a = 255]) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    return;
  }
  const index = (image.width * y + x) << 2;
  image.data[index] = r;
  image.data[index + 1] = g;
  image.data[index + 2] = b;
  image.data[index + 3] = a;
}

function fillRect(image, x, y, width, height, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      setPixel(image, px, py, color);
    }
  }
}

function strokeRect(image, x, y, width, height, color) {
  fillRect(image, x, y, width, 1, color);
  fillRect(image, x, y + height - 1, width, 1, color);
  fillRect(image, x, y, 1, height, color);
  fillRect(image, x + width - 1, y, 1, height, color);
}

function fillCircle(image, cx, cy, radius, color) {
  const radiusSq = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if ((dx * dx) + (dy * dy) <= radiusSq) {
        setPixel(image, x, y, color);
      }
    }
  }
}

function drawDiamond(image, topY, halfWidth, colors) {
  const centerX = 16;
  for (let row = 0; row < halfWidth; row += 1) {
    const span = halfWidth - row;
    const startX = centerX - span;
    const endX = centerX + span;
    const y = topY + row;
    for (let x = startX; x <= endX; x += 1) {
      setPixel(image, x, y, colors.top);
    }
  }
  for (let row = 1; row < halfWidth; row += 1) {
    const span = row;
    const startX = centerX - span;
    const endX = centerX + span;
    const y = topY + halfWidth - 1 + row;
    for (let x = startX; x <= endX; x += 1) {
      setPixel(image, x, y, colors.bottom);
    }
  }
}

function drawPieceIcon(cells, colors) {
  const image = createImage();
  const cellSize = 6;
  const shadowOffset = 1;
  const minX = Math.min(...cells.map((cell) => cell[0]));
  const minY = Math.min(...cells.map((cell) => cell[1]));
  const maxX = Math.max(...cells.map((cell) => cell[0]));
  const maxY = Math.max(...cells.map((cell) => cell[1]));
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const offsetX = Math.floor((ASSET_SIZE - (width * cellSize)) / 2) - (minX * cellSize);
  const offsetY = Math.floor((ASSET_SIZE - (height * cellSize)) / 2) - (minY * cellSize);

  for (const [x, y] of cells) {
    const px = offsetX + (x * cellSize);
    const py = offsetY + (y * cellSize);
    fillRect(image, px + shadowOffset, py + shadowOffset, cellSize - 1, cellSize - 1, colors.shadow);
    fillRect(image, px, py, cellSize - 1, cellSize - 1, colors.fill);
    strokeRect(image, px, py, cellSize - 1, cellSize - 1, colors.stroke);
    fillRect(image, px + 1, py + 1, cellSize - 3, 1, colors.highlight);
  }

  return image;
}

function drawTerrainTile() {
  const image = createImage();
  drawDiamond(image, 3, 10, {
    top: [202, 144, 87, 255],
    bottom: [124, 74, 44, 255],
  });
  fillRect(image, 6, 15, 20, 10, [133, 79, 47, 255]);
  fillRect(image, 8, 11, 16, 3, [101, 145, 78, 255]);
  fillRect(image, 10, 7, 12, 2, [224, 195, 143, 180]);
  return image;
}

function drawWaterTile() {
  const image = createImage();
  fillCircle(image, 16, 17, 9, [72, 187, 246, 220]);
  fillCircle(image, 16, 17, 6, [151, 230, 255, 235]);
  fillRect(image, 11, 8, 10, 4, [222, 248, 255, 220]);
  return image;
}

function drawIceTile() {
  const image = createImage();
  fillRect(image, 15, 5, 2, 22, [162, 243, 255, 235]);
  fillRect(image, 5, 15, 22, 2, [162, 243, 255, 235]);
  for (let step = 0; step < 9; step += 1) {
    setPixel(image, 8 + step, 8 + step, [209, 251, 255, 255]);
    setPixel(image, 24 - step, 8 + step, [209, 251, 255, 255]);
  }
  fillCircle(image, 16, 16, 4, [222, 253, 255, 210]);
  return image;
}

function drawWaterBar() {
  const image = createImage();
  strokeRect(image, 10, 3, 12, 26, [225, 239, 255, 255]);
  fillRect(image, 12, 11, 8, 15, [74, 194, 247, 235]);
  fillRect(image, 12, 8, 8, 3, [171, 237, 255, 220]);
  fillRect(image, 12, 6, 4, 2, [255, 255, 255, 180]);
  return image;
}

function drawRainbow() {
  const image = createImage();
  const bands = [
    { radius: 11, color: [255, 116, 110, 220] },
    { radius: 9, color: [255, 185, 82, 220] },
    { radius: 7, color: [255, 236, 112, 220] },
    { radius: 5, color: [90, 232, 156, 220] },
  ];

  for (const band of bands) {
    for (let angle = Math.PI; angle <= Math.PI * 2; angle += 0.02) {
      const x = Math.round(16 + (Math.cos(angle) * band.radius));
      const y = Math.round(18 + (Math.sin(angle) * band.radius));
      setPixel(image, x, y, band.color);
      setPixel(image, x, y + 1, band.color);
    }
  }
  fillCircle(image, 10, 22, 2, [255, 255, 255, 180]);
  fillCircle(image, 22, 22, 2, [255, 255, 255, 180]);
  return image;
}

function drawMonster() {
  const image = createImage();
  fillCircle(image, 16, 17, 9, [123, 225, 171, 230]);
  fillRect(image, 9, 21, 14, 4, [45, 64, 52, 230]);
  fillCircle(image, 12, 15, 2, [19, 24, 28, 255]);
  fillCircle(image, 20, 15, 2, [19, 24, 28, 255]);
  fillRect(image, 11, 22, 2, 2, [247, 246, 242, 255]);
  fillRect(image, 15, 22, 2, 2, [247, 246, 242, 255]);
  fillRect(image, 19, 22, 2, 2, [247, 246, 242, 255]);
  return image;
}

async function writePng(relativePath, image) {
  const destination = path.join(ASSET_ROOT, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, PNG.sync.write(image));
  process.stdout.write(`Wrote ${relativePath}\n`);
}

async function main() {
  const writers = new Map([
    ['tiles/terrain.png', () => drawTerrainTile()],
    ['blocks/block_t.png', () => drawPieceIcon([[1, 0], [0, 1], [1, 1], [2, 1]], {
      fill: [212, 154, 84, 255],
      shadow: [118, 74, 38, 180],
      stroke: [98, 58, 30, 255],
      highlight: [242, 204, 150, 255],
    })],
    ['blocks/block_l.png', () => drawPieceIcon([[0, 0], [0, 1], [0, 2], [1, 2]], {
      fill: [209, 143, 74, 255],
      shadow: [115, 69, 33, 180],
      stroke: [92, 52, 24, 255],
      highlight: [239, 197, 133, 255],
    })],
    ['blocks/block_s.png', () => drawPieceIcon([[1, 0], [2, 0], [0, 1], [1, 1]], {
      fill: [196, 131, 72, 255],
      shadow: [112, 64, 32, 180],
      stroke: [86, 48, 21, 255],
      highlight: [232, 188, 129, 255],
    })],
    ['blocks/block_square.png', () => drawPieceIcon([[0, 0], [1, 0], [0, 1], [1, 1]], {
      fill: [84, 193, 103, 255],
      shadow: [31, 92, 44, 180],
      stroke: [19, 69, 32, 255],
      highlight: [172, 236, 179, 255],
    })],
    ['blocks/block_straight.png', () => drawPieceIcon([[0, 0], [1, 0], [2, 0], [3, 0]], {
      fill: [225, 168, 98, 255],
      shadow: [125, 79, 40, 180],
      stroke: [103, 59, 27, 255],
      highlight: [247, 214, 164, 255],
    })],
    ['water/water.png', () => drawWaterTile()],
    ['water/ice.png', () => drawIceTile()],
    ['ui/water_bar.png', () => drawWaterBar()],
    ['effects/rainbow.png', () => drawRainbow()],
    ['monsters/monster.png', () => drawMonster()],
  ]);

  for (const relativePath of REQUIRED_ASSET_PATHS) {
    const writer = writers.get(relativePath);
    if (!writer) {
      throw new Error(`No procedural generator registered for ${relativePath}`);
    }
    await writePng(relativePath, writer());
  }
}

void main();
