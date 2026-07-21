import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDir = dirname(fileURLToPath(import.meta.url));

/** OrderBhojan app root (`orderbhojan/` in monorepo, repo root when synced standalone). */
export const orderbhojanRoot = resolve(testsDir, '..');

function firstExistingPath(candidates: string[], label: string): string {
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`${label} not found. Tried:\n${candidates.map((p) => `  - ${p}`).join('\n')}`);
}

/** Resolve a path under the OrderBhojan app source tree. */
export function resolveOrderBhojanPath(...segments: string[]): string {
  return firstExistingPath(
    [
      resolve(orderbhojanRoot, ...segments),
      resolve(orderbhojanRoot, 'orderbhojan', ...segments),
    ],
    `OrderBhojan path ${segments.join('/')}`,
  );
}

/** Resolve vendored monorepo design-system files (symlink or storefront-src copy). */
export function resolveStorefrontDesignSystemPath(...segments: string[]): string {
  return firstExistingPath(
    [
      resolve(orderbhojanRoot, '../src/design-system', ...segments),
      resolve(orderbhojanRoot, 'storefront-src/design-system', ...segments),
      resolve(orderbhojanRoot, 'src/design-system', ...segments),
    ],
    `Storefront design-system path ${segments.join('/')}`,
  );
}

export function readOrderBhojanFile(...segments: string[]): string {
  return readFileSync(resolveOrderBhojanPath(...segments), 'utf8');
}

export function readStorefrontDesignSystemFile(...segments: string[]): string {
  return readFileSync(resolveStorefrontDesignSystemPath(...segments), 'utf8');
}
