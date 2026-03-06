import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourcesPath = path.join(root, 'scripts', 'asset-sources.json');
const outputDirectory = path.join(root, 'apps', 'client', 'public', 'assets', 'icons');

const raw = await readFile(sourcesPath, 'utf8');
const sources = JSON.parse(raw);

await mkdir(outputDirectory, { recursive: true });

for (const [name, definition] of Object.entries(sources)) {
  const response = await fetch(definition.url);
  if (!response.ok) {
    throw new Error(`Failed to download ${name} from ${definition.url}: ${response.status}`);
  }
  const svg = await response.text();
  const destination = path.join(outputDirectory, `${name}.svg`);
  await writeFile(destination, svg, 'utf8');
  console.log(`Downloaded ${name} -> ${destination}`);
}
