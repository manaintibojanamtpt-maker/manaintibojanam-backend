#!/usr/bin/env node
/**
 * Merges shared SPA hosting preset into firebase.json hosting entries.
 * Run: node scripts/firebase/compose-firebase-hosting.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const preset = JSON.parse(readFileSync(join(__dirname, 'spa-hosting-preset.json'), 'utf8'));
const firebase = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'));

function spaSite(target, publicDir) {
  return { target, public: publicDir, ...preset };
}

firebase.hosting = [
  spaSite('orderbhojan', 'orderbhojan/dist'),
  spaSite('manaintibojanam', 'dist'),
  spaSite('owner', 'dist'),
  spaSite('admin', 'dist'),
];

writeFileSync(join(root, 'firebase.json'), `${JSON.stringify(firebase, null, 2)}\n`, 'utf8');
console.log('[compose-firebase-hosting] Updated firebase.json hosting targets.');
