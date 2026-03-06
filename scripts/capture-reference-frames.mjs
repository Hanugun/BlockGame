import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const VIDEO_FILENAME = 'Aqua Aqua Gameplay HD (PS2) _ NO COMMENTARY.mp4';
const DEFAULT_TIMESTAMPS = [
  40,
  55,
  90,
  190,
  1140,
  1260,
  1380,
];

function parseArgs(argv) {
  const args = {
    outDir: 'output/reference-frames',
    timestamps: DEFAULT_TIMESTAMPS,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--out-dir' && next) {
      args.outDir = next;
      index += 1;
      continue;
    }
    if (arg === '--timestamps' && next) {
      args.timestamps = next
        .split(',')
        .map((token) => Number.parseInt(token.trim(), 10))
        .filter((value) => Number.isFinite(value) && value >= 0);
      index += 1;
    }
  }
  return args;
}

async function seekVideo(page, timeSeconds) {
  await page.evaluate(async (targetTime) => {
    const video = document.querySelector('video');
    if (!video) {
      return;
    }
    video.pause();
    video.currentTime = targetTime;
    await new Promise((resolve) => {
      let completed = false;
      const done = () => {
        if (completed) {
          return;
        }
        completed = true;
        video.removeEventListener('seeked', done);
        resolve();
      };
      video.addEventListener('seeked', done);
      setTimeout(done, 2_500);
    });
  }, timeSeconds);
}

async function main() {
  const args = parseArgs(process.argv);
  const root = process.cwd();
  const videoPath = path.join(root, VIDEO_FILENAME);
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Missing reference video at ${videoPath}`);
  }

  const outDirectory = path.resolve(root, args.outDir);
  fs.mkdirSync(outDirectory, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`file:///${videoPath.replace(/\\/g, '/')}`);
  await page.waitForSelector('video');

  for (const timeSeconds of args.timestamps) {
    await seekVideo(page, timeSeconds);
    await page.waitForTimeout(120);
    const filename = `ref-${String(timeSeconds).padStart(4, '0')}s.png`;
    const outputPath = path.join(outDirectory, filename);
    await page.screenshot({ path: outputPath });
    process.stdout.write(`Captured ${filename}\n`);
  }

  await browser.close();
  process.stdout.write(`Saved frames to ${outDirectory}\n`);
}

void main();
