import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'dist/styles');
mkdirSync(outDir, { recursive: true });

const bds = readFileSync(resolve(root, 'src/styles/bds.css'), 'utf8');
const px2 = readFileSync(resolve(root, 'src/styles/bds-px2.css'), 'utf8');
writeFileSync(resolve(outDir, 'bds.css'), `${bds}\n\n/* PX2 Design Freeze */\n${px2}`);
console.log('[build-css] Merged bds.css + bds-px2.css → dist/styles/bds.css');
