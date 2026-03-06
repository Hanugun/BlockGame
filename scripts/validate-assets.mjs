import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import {
  ASSET_MANIFEST_PATH,
  ASSET_ROOT,
  ASSET_SIZE,
  REQUIRED_ASSET_PATHS,
} from './asset-contract.mjs';

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function parseManifest(markdown) {
  const rows = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && !line.includes('---'));

  if (rows.length < 2) {
    throw new Error(`Asset manifest at ${ASSET_MANIFEST_PATH} does not contain the required markdown table.`);
  }

  return new Map(rows.slice(1).map((row) => {
    const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
    const assetPath = cells[0]?.replace(/^`|`$/g, '') ?? '';
    return [assetPath, cells];
  }));
}

async function validatePng(relativePath) {
  const fullPath = path.join(ASSET_ROOT, relativePath);
  const png = PNG.sync.read(await readFile(fullPath));
  if (png.width !== ASSET_SIZE || png.height !== ASSET_SIZE) {
    throw new Error(`${relativePath} must be ${ASSET_SIZE}x${ASSET_SIZE}; received ${png.width}x${png.height}.`);
  }
  let hasTransparency = false;
  for (let index = 3; index < png.data.length; index += 4) {
    if (png.data[index] < 255) {
      hasTransparency = true;
      break;
    }
  }
  if (!hasTransparency) {
    throw new Error(`${relativePath} must retain transparent pixels instead of a fully opaque background.`);
  }
}

async function main() {
  const manifest = parseManifest(await readFile(ASSET_MANIFEST_PATH, 'utf8'));
  const files = await collectFiles(ASSET_ROOT);
  const pngFiles = files
    .filter((file) => file.toLowerCase().endsWith('.png'))
    .map((file) => path.relative(ASSET_ROOT, file).replaceAll('\\', '/'));
  const nonPngFiles = files.filter((file) => !file.toLowerCase().endsWith('.png'));

  if (nonPngFiles.length > 0) {
    throw new Error(`PNG-only asset pack violated. Non-PNG files found:\n${nonPngFiles.join('\n')}`);
  }

  for (const requiredAsset of REQUIRED_ASSET_PATHS) {
    if (!pngFiles.includes(requiredAsset)) {
      throw new Error(`Missing required asset ${requiredAsset}`);
    }
    if (!manifest.has(`/assets/${requiredAsset}`)) {
      throw new Error(`Missing provenance row for /assets/${requiredAsset}`);
    }
    await validatePng(requiredAsset);
  }

  for (const pngFile of pngFiles) {
    if (!manifest.has(`/assets/${pngFile}`)) {
      throw new Error(`PNG asset ${pngFile} exists without a provenance row.`);
    }
  }

  process.stdout.write(`Validated ${pngFiles.length} PNG assets against ${ASSET_MANIFEST_PATH}\n`);
}

void main();
