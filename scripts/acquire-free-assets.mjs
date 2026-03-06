import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import {
  APPROVED_EXTERNAL_SOURCES,
  ASSET_SIZE,
  ROOT,
} from './asset-contract.mjs';

const CONFIG_PATH = path.join(ROOT, 'scripts', 'free-asset-sources.json');
const STAGING_ROOT = path.join(ROOT, 'temp', 'acquired-free-assets');

function hostAllowed(sourceId, rawUrl) {
  const source = APPROVED_EXTERNAL_SOURCES.find((entry) => entry.id === sourceId);
  if (!source) {
    return false;
  }
  const url = new URL(rawUrl);
  return source.hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

async function loadConfig() {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return { assets: [] };
    }
    throw error;
  }
}

async function main() {
  const config = await loadConfig();
  const entries = Array.isArray(config.assets) ? config.assets : [];

  if (entries.length === 0) {
    process.stdout.write([
      'No external CC0 PNG sources are configured.',
      'Procedural PNG assets remain the authoritative pack for this rebuild pass.',
      'Approved search order: Kenney -> itch.io CC0 listings -> OpenGameArt.',
    ].join('\n'));
    return;
  }

  await mkdir(STAGING_ROOT, { recursive: true });
  const report = [];

  for (const entry of entries) {
    const sourceId = String(entry.source ?? '');
    const url = String(entry.url ?? '');
    const target = String(entry.target ?? '');
    const license = String(entry.license ?? '');

    if (!sourceId || !url || !target) {
      throw new Error(`Invalid asset entry in ${CONFIG_PATH}: ${JSON.stringify(entry)}`);
    }
    if (license.toUpperCase() !== 'CC0') {
      throw new Error(`Rejected ${target}: license must be explicit CC0.`);
    }
    if (!hostAllowed(sourceId, url)) {
      throw new Error(`Rejected ${target}: ${url} is not from an approved ${sourceId} host.`);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get('content-type') ?? '';
    const buffer = Buffer.from(await response.arrayBuffer());
    const png = PNG.sync.read(buffer);

    if (!contentType.includes('png') && !url.toLowerCase().endsWith('.png')) {
      throw new Error(`Rejected ${target}: source is not a PNG raster asset.`);
    }
    if (png.width < ASSET_SIZE || png.height < ASSET_SIZE) {
      throw new Error(`Rejected ${target}: ${png.width}x${png.height} is below ${ASSET_SIZE}x${ASSET_SIZE}.`);
    }

    const destination = path.join(STAGING_ROOT, target.replaceAll('/', path.sep));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, buffer);
    report.push({
      target,
      source: sourceId,
      url,
      dimensions: `${png.width}x${png.height}`,
      reviewRequired: 'manual nearest-neighbor coherence check still required before promotion',
    });
    process.stdout.write(`Staged ${target} from ${sourceId} -> ${destination}\n`);
  }

  await writeFile(
    path.join(STAGING_ROOT, 'report.json'),
    JSON.stringify(report, null, 2),
    'utf8',
  );
}

void main();
