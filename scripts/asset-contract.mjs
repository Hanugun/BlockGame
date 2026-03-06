import path from 'node:path';

export const ROOT = process.cwd();
export const ASSET_ROOT = path.join(ROOT, 'apps', 'client', 'public', 'assets');
export const ASSET_MANIFEST_PATH = path.join(ROOT, 'docs', 'assets', 'asset-manifest.md');
export const ASSET_SIZE = 32;

export const REQUIRED_ASSET_PATHS = [
  'tiles/terrain.png',
  'blocks/block_t.png',
  'blocks/block_l.png',
  'blocks/block_s.png',
  'blocks/block_square.png',
  'blocks/block_straight.png',
  'water/water.png',
  'water/ice.png',
  'ui/water_bar.png',
  'effects/rainbow.png',
  'monsters/monster.png',
];

export const APPROVED_EXTERNAL_SOURCES = [
  {
    id: 'kenney',
    label: 'Kenney',
    hosts: ['kenney.nl', 'kenneyassets.com'],
  },
  {
    id: 'itch.io',
    label: 'itch.io',
    hosts: ['itch.io', 'img.itch.zone'],
  },
  {
    id: 'opengameart',
    label: 'OpenGameArt',
    hosts: ['opengameart.org', 'media.opengameart.org'],
  },
];
