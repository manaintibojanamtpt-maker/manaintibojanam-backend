/**
 * Prepare Capacitor asset inputs from the master OrderBhojan icon.
 *
 * Drop your master PNG at: resources/icon-source.png (1024x1024+ recommended).
 * Legacy icons (icon.png, PWA, iOS) use ~90% fill — full-bleed square with breathing room.
 * Adaptive foreground uses ~70% fill so the wide OB mark fits Android/iOS circle masks
 * (66dp safe zone). Android XML inset stays at 0% — padding lives in the foreground PNG
 * only, avoiding the old 16.7% + shrink double-crop.
 *
 * @capacitor/assets v3 custom icon-foreground/icon-background mode writes legacy
 * 48dp mipmaps (192px @ xxxhdpi) instead of adaptive 108dp (432px). Run
 * `--fix-android-adaptive` after capacitor-assets to emit correct mipmaps.
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
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
const androidResDir = path.join(root, 'android', 'app', 'src', 'main', 'res');
const iconBackgroundColor = '#070504';
/** Full-bleed legacy icon (icon.png, PWA, iOS via capacitor-assets). */
const legacyIconScale = 0.9;
/**
 * Adaptive foreground — keep OB + wordmark inside the ~66% launcher safe zone.
 * Source artwork is edge-to-edge; shrinking here prevents circle/squircle clipping.
 */
const adaptiveForegroundScale = 0.7;
/** No XML inset — foreground PNG already carries safe-zone padding (was 16.7%, then 10%). */
const ADAPTIVE_INSET = '0%';
const MIN_SOURCE_SIZE = 1024;
const MIN_LAYER_SIZE = 1024;
const MAX_LAYER_SIZE = 4096;
/** Lossless PNG — no aggressive DEFLATE (compressionLevel 9 bloated re-encode passes). */
const PNG_OPTIONS = { compressionLevel: 0, effort: 1 };

const resizeKernel = sharp.kernel.lanczos3;

/** Adaptive icon layer sizes (108dp @ density). */
const ANDROID_ADAPTIVE_DENSITIES = [
  { folder: 'mipmap-ldpi', size: 81 },
  { folder: 'mipmap-mdpi', size: 108 },
  { folder: 'mipmap-hdpi', size: 162 },
  { folder: 'mipmap-xhdpi', size: 216 },
  { folder: 'mipmap-xxhdpi', size: 324 },
  { folder: 'mipmap-xxxhdpi', size: 432 },
];

const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background>
        <inset android:drawable="@mipmap/ic_launcher_background" android:inset="${ADAPTIVE_INSET}" />
    </background>
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="${ADAPTIVE_INSET}" />
    </foreground>
</adaptive-icon>`;

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

function layerSize(sourceMaxDim) {
  return Math.min(MAX_LAYER_SIZE, Math.max(MIN_LAYER_SIZE, sourceMaxDim));
}

async function loadNormalizedSourceBuffer(sourcePath) {
  const image = sharp(sourcePath).rotate().ensureAlpha();
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const maxDim = Math.max(width, height);

  console.log(`Source icon: ${path.relative(root, sourcePath)} (${width}x${height}, ${meta.format})`);

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
    .png({ compressionLevel: 9, effort: 1 })
    .toFile(outPath);
}

async function composeScaledSquare(outPath, size, sourceBuffer, scale, background) {
  const inset = Math.round((size * (1 - scale)) / 2);
  const inner = size - inset * 2;
  const resizeBackground =
    background.alpha === 0 ? { r: 0, g: 0, b: 0, alpha: 0 } : background;

  const resized = await sharp(sourceBuffer)
    .resize(inner, inner, {
      fit: 'contain',
      background: resizeBackground,
      kernel: resizeKernel,
    })
    .png(PNG_OPTIONS)
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: resized, top: inset, left: inset }])
    .png(PNG_OPTIONS)
    .toFile(outPath);
}

async function writeForeground(outPath, size, sourceBuffer) {
  await composeScaledSquare(outPath, size, sourceBuffer, adaptiveForegroundScale, {
    r: 0,
    g: 0,
    b: 0,
    alpha: 0,
  });
}

async function writeLegacyIcon(outPath, size, sourceBuffer) {
  await composeScaledSquare(outPath, size, sourceBuffer, legacyIconScale, iconBackgroundColor);
}

async function writePwaIcons(sourceBuffer) {
  const iconsDir = path.join(root, 'public', 'icons');
  const brandDir = path.join(root, 'public', 'brand');
  await mkdir(iconsDir, { recursive: true });
  await mkdir(brandDir, { recursive: true });

  await writeLegacyIcon(path.join(iconsDir, 'icon-512.png'), 512, sourceBuffer);
  await writeLegacyIcon(path.join(iconsDir, 'icon-192.png'), 192, sourceBuffer);
  await writeLegacyIcon(path.join(iconsDir, 'apple-touch-icon-180x180.png'), 180, sourceBuffer);

  await sharp(sourceBuffer).png(PNG_OPTIONS).toFile(path.join(brandDir, 'orderbhojan-logo.png'));
}

async function writeAndroidAdaptiveMipmaps(foregroundPath, backgroundPath) {
  console.log('');
  console.log('Fixing Android adaptive mipmaps (108dp / xxxhdpi=432px):');

  for (const { folder, size } of ANDROID_ADAPTIVE_DENSITIES) {
    const dir = path.join(androidResDir, folder);
    await mkdir(dir, { recursive: true });

    const foregroundDest = path.join(dir, 'ic_launcher_foreground.png');
    const backgroundDest = path.join(dir, 'ic_launcher_background.png');

    await sharp(foregroundPath)
      .resize(size, size, { kernel: resizeKernel })
      .png(PNG_OPTIONS)
      .toFile(foregroundDest);

    await writeSolidBackground(backgroundDest, size);

    console.log(`  ${folder}/ic_launcher_foreground.png (${size}x${size})`);
  }

  const anydpiDir = path.join(androidResDir, 'mipmap-anydpi-v26');
  await mkdir(anydpiDir, { recursive: true });
  await writeFile(path.join(anydpiDir, 'ic_launcher.xml'), ADAPTIVE_ICON_XML);
  await writeFile(path.join(anydpiDir, 'ic_launcher_round.xml'), ADAPTIVE_ICON_XML);
}

async function prepareAssets() {
  await mkdir(resourcesDir, { recursive: true });
  const sourcePath = await resolveSourcePath();
  const sourceBuffer = await loadNormalizedSourceBuffer(sourcePath);
  const sourceMeta = await sharp(sourceBuffer).metadata();
  const size = layerSize(Math.max(sourceMeta.width ?? 0, sourceMeta.height ?? 0));

  await writePwaIcons(sourceBuffer);
  await writeLegacyIcon(path.join(resourcesDir, 'icon.png'), size, sourceBuffer);
  await writeSolidBackground(path.join(resourcesDir, 'icon-background.png'), size);
  await writeForeground(path.join(resourcesDir, 'icon-foreground.png'), size, sourceBuffer);

  console.log('');
  console.log('Prepared Capacitor layers:');
  console.log(
    `  resources/icon.png (${size}x${size}, ${Math.round(legacyIconScale * 100)}% logo fill, legacy full-bleed)`,
  );
  console.log(
    `  resources/icon-foreground.png (${size}x${size}, ${Math.round(adaptiveForegroundScale * 100)}% logo fill)`,
  );
  console.log(`  Android adaptive XML inset: ${ADAPTIVE_INSET}`);
  console.log(`  resources/icon-background.png (${size}x${size})`);
  console.log('Updated PWA icons:');
  console.log('  public/icons/icon-192.png (192x192)');
  console.log('  public/icons/icon-512.png (512x512)');
  console.log('  public/icons/apple-touch-icon-180x180.png (180x180)');
  console.log(`  public/brand/orderbhojan-logo.png (${sourceMeta.width}x${sourceMeta.height})`);
  console.log('');
  console.log('Next: capacitor-assets (iOS + legacy Android), then --fix-android-adaptive.');
}

async function fixAndroidAdaptive() {
  const foregroundPath = path.join(resourcesDir, 'icon-foreground.png');
  const backgroundPath = path.join(resourcesDir, 'icon-background.png');

  for (const candidate of [foregroundPath, backgroundPath]) {
    try {
      await access(candidate);
    } catch {
      throw new Error(`Missing ${path.relative(root, candidate)}. Run prepare step first.`);
    }
  }

  await writeAndroidAdaptiveMipmaps(foregroundPath, backgroundPath);
}

async function verifyOutputs() {
  const checks = [
    ['android xxxhdpi foreground', path.join(androidResDir, 'mipmap-xxxhdpi/ic_launcher_foreground.png'), 432, 432],
    ['android xxxhdpi background', path.join(androidResDir, 'mipmap-xxxhdpi/ic_launcher_background.png'), 432, 432],
    ['iOS App Store icon', path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), 1024, 1024],
    ['resources foreground layer', path.join(resourcesDir, 'icon-foreground.png'), null, null],
  ];

  console.log('');
  console.log('Verification:');
  for (const [label, filePath, expW, expH] of checks) {
    try {
      const meta = await sharp(filePath).metadata();
      const { size } = await import('node:fs/promises').then((fs) => fs.stat(filePath));
      const dimOk = expW == null || (meta.width === expW && meta.height === expH);
      const flag = dimOk ? 'OK' : 'WARN';
      console.log(
        `  [${flag}] ${label}: ${meta.width}x${meta.height} ${meta.format} ${size} bytes` +
          (expW != null && !dimOk ? ` (expected ${expW}x${expH})` : ''),
      );
    } catch {
      console.log(`  [MISSING] ${label}: ${path.relative(root, filePath)}`);
    }
  }
}

async function main() {
  const mode = process.argv.includes('--fix-android-adaptive')
    ? 'fix-android-adaptive'
    : process.argv.includes('--verify')
      ? 'verify'
      : 'prepare';

  if (mode === 'prepare') {
    await prepareAssets();
  } else if (mode === 'fix-android-adaptive') {
    await fixAndroidAdaptive();
    await verifyOutputs();
  } else if (mode === 'verify') {
    await verifyOutputs();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
