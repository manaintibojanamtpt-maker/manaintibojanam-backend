/**
 * Prepare Capacitor asset inputs from the master OrderBhojan icon.
 *
 * Drop your master PNG at: resources/icon-source.png (1024x1024+ recommended).
 * Foreground is scaled to ~88% for adaptive-icon safe zone (round/square masks).
 */
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const resourcesDir = path.join(root, 'resources');
/** Primary master HD icon path — replace this file, then run `npm run icons:generate`. */
const PRIMARY_SOURCE_PATH = path.join(resourcesDir, 'icon-source.png');
/** Optional fallback if you keep design assets under assets/. */
const FALLBACK_SOURCE_PATH = path.join(root, 'assets', 'icon-source.png');
const iconBackgroundColor = '#070504';
const foregroundScale = 0.88;
const MIN_SOURCE_SIZE = 1024;
const MIN_CAPACITOR_LAYER_SIZE = 2048;
const MAX_CAPACITOR_LAYER_SIZE = 4096;
const PNG_OPTIONS = { compressionLevel: 9, effort: 10 };

const resizeKernel = sharp.kernel.lanczos3;

async function resolveSourcePath() {
  for (const candidate of [PRIMARY_SOURCE_PATH, FALLBACK_SOURCE_PATH]) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    `Missing master icon. Place a square PNG (${MIN_SOURCE_SIZE}x${MIN_SOURCE_SIZE}+) at:\n` +
      `  ${PRIMARY_SOURCE_PATH}\n` +
      `  (or ${FALLBACK_SOURCE_PATH})`,
  );
}

async function loadNormalizedSourceBuffer(sourcePath) {
  const image = sharp(sourcePath).rotate().ensureAlpha();
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const maxDim = Math.max(width, height);

  console.log(`Source icon: ${path.relative(root, sourcePath)} (${width}x${height})`);

  if (maxDim < MIN_SOURCE_SIZE) {
    console.warn(
      `WARNING: source is ${width}x${height} (below ${MIN_SOURCE_SIZE}px). ` +
        `Android/iOS icons will look soft until you replace it with a ${MIN_SOURCE_SIZE}x${MIN_SOURCE_SIZE}+ PNG.`,
    );
  }

  if (width === height) {
    return image.png(PNG_OPTIONS).toBuffer();
  }

  console.log(`Normalizing non-square source to ${maxDim}x${maxDim}`);
  return sharp({
    create: {
      width: maxDim,
      height: maxDim,
      channels: 4,
      background: iconBackgroundColor,
    },
  })
    .composite([
      {
        input: await image.png(PNG_OPTIONS).toBuffer(),
        top: Math.floor((maxDim - height) / 2),
        left: Math.floor((maxDim - width) / 2),
      },
    ])
    .png(PNG_OPTIONS)
    .toBuffer();
}

async function writeSolidBackground(outPath, size) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: iconBackgroundColor,
    },
  })
    .png(PNG_OPTIONS)
    .toFile(outPath);
}

async function writeForeground(outPath, size, sourceBuffer) {
  const inset = Math.round((size * (1 - foregroundScale)) / 2);
  const inner = size - inset * 2;

  const resized = await sharp(sourceBuffer)
    .resize(inner, inner, {
      fit: 'contain',
      background: iconBackgroundColor,
      kernel: resizeKernel,
    })
    .png(PNG_OPTIONS)
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, top: inset, left: inset }])
    .png(PNG_OPTIONS)
    .toFile(outPath);
}

async function writePwaIcons(sourceBuffer) {
  const iconsDir = path.join(root, 'public', 'icons');
  const brandDir = path.join(root, 'public', 'brand');
  await mkdir(iconsDir, { recursive: true });
  await mkdir(brandDir, { recursive: true });

  const resize = (size) =>
    sharp(sourceBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: iconBackgroundColor,
        kernel: resizeKernel,
      })
      .png(PNG_OPTIONS);

  await resize(512).toFile(path.join(iconsDir, 'icon-512.png'));
  await resize(192).toFile(path.join(iconsDir, 'icon-192.png'));

  await sharp(sourceBuffer).png(PNG_OPTIONS).toFile(path.join(brandDir, 'orderbhojan-logo.png'));
  await sharp(sourceBuffer).png(PNG_OPTIONS).toFile(path.join(resourcesDir, 'icon.png'));
}

function capacitorLayerSize(sourceMaxDim) {
  return Math.min(
    MAX_CAPACITOR_LAYER_SIZE,
    Math.max(MIN_CAPACITOR_LAYER_SIZE, sourceMaxDim),
  );
}

async function main() {
  await mkdir(resourcesDir, { recursive: true });
  const sourcePath = await resolveSourcePath();
  const sourceBuffer = await loadNormalizedSourceBuffer(sourcePath);
  const sourceMeta = await sharp(sourceBuffer).metadata();
  const layerSize = capacitorLayerSize(Math.max(sourceMeta.width ?? 0, sourceMeta.height ?? 0));

  await writePwaIcons(sourceBuffer);
  await writeSolidBackground(path.join(resourcesDir, 'icon-background.png'), layerSize);
  await writeForeground(
    path.join(resourcesDir, 'icon-foreground.png'),
    layerSize,
    sourceBuffer,
  );

  console.log('');
  console.log('Prepared Capacitor layers:');
  console.log(`  resources/icon.png (${sourceMeta.width}x${sourceMeta.height})`);
  console.log(`  resources/icon-foreground.png (${layerSize}x${layerSize}, ~88% safe zone)`);
  console.log(`  resources/icon-background.png (${layerSize}x${layerSize})`);
  console.log('Updated PWA icons:');
  console.log('  public/icons/icon-192.png (192x192)');
  console.log('  public/icons/icon-512.png (512x512)');
  console.log(`  public/brand/orderbhojan-logo.png (${sourceMeta.width}x${sourceMeta.height})`);
  console.log('');
  console.log('Next: capacitor-assets will emit Android mipmap + iOS AppIcon sizes.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
