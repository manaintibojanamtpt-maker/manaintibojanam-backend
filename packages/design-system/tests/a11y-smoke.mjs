import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(__dirname, '../src/styles/bds.css'), 'utf8');

const requiredSelectors = [
  '.bds-btn--primary',
  '.bds-card',
  '.bds-badge--veg',
  '.bds-input',
  '.bds-skeleton',
  '.bds-dialog',
  '.bds-sheet',
  '.bds-restaurant-card',
  '.bds-cart-bar',
  '.bds-timeline',
  '.bds-topbar',
  '.bds-tab--active',
  '.bds-segment--active',
  '.bds-empty',
  '.bds-error',
  '.bds-metric-card',
  '.bds-sr-only',
];

for (const selector of requiredSelectors) {
  assert.ok(css.includes(selector), `Missing a11y/CSS selector: ${selector}`);
}

assert.ok(css.includes('prefers-reduced-motion'), 'Reduced motion media query required');
assert.ok(css.includes('focus-visible'), 'Focus ring styles required');

console.log('[test:a11y] CSS accessibility smoke passed');
