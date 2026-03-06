import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const texturesDir = path.join(root, 'apps', 'client', 'public', 'assets', 'textures');
const uiDir = path.join(root, 'apps', 'client', 'public', 'assets', 'ui');

const terrainTexture = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <radialGradient id="g" cx="48%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#d09258"/>
      <stop offset="55%" stop-color="#ad6d3f"/>
      <stop offset="100%" stop-color="#6b3f25"/>
    </radialGradient>
  </defs>
  <rect width="256" height="256" fill="url(#g)"/>
  <g fill="none" stroke="#e7bf91" stroke-opacity="0.28">
    <path d="M10 180c30-22 61-20 94-10s61 9 92-7"/>
    <path d="M5 98c26-16 52-17 81-9s56 10 86-2"/>
    <path d="M25 32c37 11 70 14 110 3s63-10 96 4"/>
  </g>
  <g fill="#4a2819" fill-opacity="0.28">
    <circle cx="36" cy="45" r="11"/>
    <circle cx="88" cy="120" r="8"/>
    <circle cx="161" cy="64" r="10"/>
    <circle cx="220" cy="170" r="12"/>
  </g>
</svg>`;

const waterTexture = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#89dcff"/>
      <stop offset="100%" stop-color="#2f7ac5"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#bg)"/>
  <g fill="none" stroke="#d8f7ff" stroke-width="4" stroke-opacity="0.62">
    <path d="M10 46c19 18 36 19 55 0s36-19 55 0 36 19 55 0 36-19 55 0"/>
    <path d="M0 118c17 14 35 14 54 0s37-14 56 0 37 14 56 0 37-14 56 0"/>
    <path d="M20 188c15 12 32 12 49 0s34-12 51 0 34 12 51 0 34-12 51 0"/>
  </g>
</svg>`;

const phaseArrow = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="28" fill="#7e6ce0" fill-opacity="0.45"/>
  <path d="M32 10l16 18h-9v24h-14V28h-9z" fill="#ff473f" stroke="#ffd25f" stroke-width="3" />
</svg>`;

async function writeFile(relativePath, content) {
  const outputPath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content, 'utf8');
  process.stdout.write(`Wrote ${relativePath}\n`);
}

async function main() {
  await fs.mkdir(texturesDir, { recursive: true });
  await fs.mkdir(uiDir, { recursive: true });
  await writeFile('apps/client/public/assets/textures/terrain-rock.svg', terrainTexture);
  await writeFile('apps/client/public/assets/textures/water-surface.svg', waterTexture);
  await writeFile('apps/client/public/assets/ui/phase-arrow-up.svg', phaseArrow);
}

void main();
