#!/usr/bin/env node
/**
 * Symlink orderbhojan/node_modules → src/node_modules so tsc can resolve
 * react, clsx, tailwind-merge, etc. when type-checking ../src/design-system.
 */
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const target = resolve(root, 'orderbhojan/node_modules');
const linkPath = resolve(root, 'src/node_modules');

if (!existsSync(target)) {
  console.error(`[link-storefront-peer-deps] Missing ${target} — run npm ci in orderbhojan first`);
  process.exit(1);
}

mkdirSync(dirname(linkPath), { recursive: true });

if (existsSync(linkPath)) {
  const stat = lstatSync(linkPath);
  if (stat.isSymbolicLink()) {
    rmSync(linkPath);
  } else if (stat.isDirectory()) {
    console.error(`[link-storefront-peer-deps] Refusing to replace real directory: ${linkPath}`);
    process.exit(1);
  } else {
    rmSync(linkPath);
  }
}

const type = process.platform === 'win32' ? 'junction' : 'dir';
symlinkSync(target, linkPath, type);
console.log(`[link-storefront-peer-deps] Linked ${linkPath} → ${target}`);
