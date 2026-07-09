#!/usr/bin/env node
/** Screen 2 capture — delegates to screen1 script with screen2 output path */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/ux-review/screen2-home-375x2.png');

const child = spawn(process.execPath, [path.join(__dirname, 'capture-home-screen1.mjs'), out], {
  cwd: root,
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
