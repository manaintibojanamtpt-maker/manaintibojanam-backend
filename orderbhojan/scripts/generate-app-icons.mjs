/**
 * Prepare Capacitor asset inputs from the master OrderBhojan icon.
 * Foreground is scaled to ~88% for adaptive-icon safe zone (round/square masks).
 */
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const resourcesDir = path.join(root, 'resources');
const sourcePath = path.join(resourcesDir, 'icon-source.png');
const iconBackgroundColor = '#070504';
const foregroundScale = 0.88;

async function writeSolidBackground(outPath, size) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: iconBackgroundColor,
    },
  })
    .png()
    .toFile(outPath);
}

async function writeForeground(outPath, size) {
  const inset = Math.round(size * (1 - foregroundScale) / 2);
  const inner = size - inset * 2;

  const resized = await sharp(sourcePath)
    .resize(inner, inner, { fit: 'contain', background: iconBackgroundColor })
    .png()
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
    .png()
    .toFile(outPath);
}

async function writePwaIcons() {
  const iconsDir = path.join(root, 'public', 'icons');
  await mkdir(iconsDir, { recursive: true });

  await sharp(sourcePath).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  await sharp(sourcePath).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));

  await copyFile(sourcePath, path.join(root, 'public', 'brand', 'orderbhojan-logo.png'));
  await copyFile(sourcePath, path.join(resourcesDir, 'icon.png'));
}

async function main() {
  await mkdir(resourcesDir, { recursive: true });

  const meta = await sharp(sourcePath).metadata();
  console.log(`Source icon: ${meta.width}x${meta.height}`);

  await writePwaIcons();
  await writeSolidBackground(path.join(resourcesDir, 'icon-background.png'), 1024);
  await writeForeground(path.join(resourcesDir, 'icon-foreground.png'), 1024);

  console.log('Prepared resources/icon.png, icon-foreground.png, icon-background.png');
  console.log('Updated public/icons/icon-192.png, icon-512.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
