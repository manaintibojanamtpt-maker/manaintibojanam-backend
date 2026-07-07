import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

await esbuild.build({
  entryPoints: [path.join(root, 'server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: path.join(root, 'dist/server.cjs'),
  format: 'cjs',
  external: [
    'express',
    'cors',
    'body-parser',
    'firebase-admin',
    'vite',
    'node-cron',
  ],
  alias: {
    '@bhojan/marketplace-contracts': path.join(
      root,
      'packages/marketplace-contracts/src/index.ts',
    ),
  },
  logLevel: 'info',
});
