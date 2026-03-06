import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

function parseArgs(argv) {
  const args = {
    referenceDir: 'output/reference-frames',
    candidateDir: 'output/web-game-aqua-three',
    pairs: [
      'ref-0055s.png:shot-0.png',
      'ref-1140s.png:shot-1.png',
      'ref-1260s.png:shot-2.png',
    ],
    threshold: 96,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--reference-dir' && next) {
      args.referenceDir = next;
      index += 1;
      continue;
    }
    if (arg === '--candidate-dir' && next) {
      args.candidateDir = next;
      index += 1;
      continue;
    }
    if (arg === '--pairs' && next) {
      args.pairs = next.split(',').map((token) => token.trim()).filter(Boolean);
      index += 1;
      continue;
    }
    if (arg === '--threshold' && next) {
      const parsed = Number.parseFloat(next);
      if (Number.isFinite(parsed) && parsed > 0) {
        args.threshold = parsed;
      }
      index += 1;
    }
  }
  return args;
}

function asDataUrl(filepath) {
  const buffer = fs.readFileSync(filepath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

async function comparePair(page, referenceFile, candidateFile) {
  const referenceData = asDataUrl(referenceFile);
  const candidateData = asDataUrl(candidateFile);
  return page.evaluate(async ({ referenceDataUrl, candidateDataUrl }) => {
    const targetWidth = 160;
    const targetHeight = 90;

    async function loadImage(src) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      });
    }

    function drawToData(image) {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        return null;
      }
      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      return context.getImageData(0, 0, targetWidth, targetHeight).data;
    }

    const [referenceImage, candidateImage] = await Promise.all([
      loadImage(referenceDataUrl),
      loadImage(candidateDataUrl),
    ]);
    const referencePixels = drawToData(referenceImage);
    const candidatePixels = drawToData(candidateImage);
    if (!referencePixels || !candidatePixels) {
      return Number.POSITIVE_INFINITY;
    }

    let sum = 0;
    let count = 0;
    for (let index = 0; index < referencePixels.length; index += 4) {
      const dr = referencePixels[index] - candidatePixels[index];
      const dg = referencePixels[index + 1] - candidatePixels[index + 1];
      const db = referencePixels[index + 2] - candidatePixels[index + 2];
      sum += (dr * dr) + (dg * dg) + (db * db);
      count += 3;
    }
    return Math.sqrt(sum / Math.max(1, count));
  }, { referenceDataUrl: referenceData, candidateDataUrl: candidateData });
}

async function main() {
  const args = parseArgs(process.argv);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent('<html><body style=\"margin:0\"></body></html>');

  const results = [];
  for (const pair of args.pairs) {
    const [referenceName, candidateName] = pair.split(':');
    const referencePath = path.resolve(args.referenceDir, referenceName);
    const candidatePath = path.resolve(args.candidateDir, candidateName);
    if (!fs.existsSync(referencePath) || !fs.existsSync(candidatePath)) {
      results.push({
        pair,
        rmse: Number.POSITIVE_INFINITY,
        pass: false,
        reason: 'missing_file',
      });
      continue;
    }
    const rmse = await comparePair(page, referencePath, candidatePath);
    results.push({
      pair,
      rmse: Number(rmse.toFixed(2)),
      pass: rmse <= args.threshold,
    });
  }

  await browser.close();

  const failed = results.filter((entry) => !entry.pass);
  process.stdout.write(`${JSON.stringify({ threshold: args.threshold, results }, null, 2)}\n`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

void main();
