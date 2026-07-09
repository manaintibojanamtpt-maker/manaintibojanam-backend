import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { BDS_FROZEN, BDS_VERSION } from '@bhojan/design-system';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('BDS theme certification', () => {
  it('design system is frozen at v1.0.0', () => {
    assert.equal(BDS_VERSION, '1.0.0');
    assert.equal(BDS_FROZEN, true);
  });

  it('index.html uses Evening Kitchen theme-color and display fonts', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    assert.match(html, /theme-color" content="#0a0706"/i);
    assert.match(html, /Fraunces/);
    assert.match(html, /Figtree/);
  });

  it('vite PWA manifest uses Evening Kitchen colors', () => {
    const vite = readFileSync(join(root, 'vite.config.ts'), 'utf8');
    assert.match(vite, /theme_color: '#0a0706'/);
    assert.match(vite, /background_color: '#0a0706'/);
  });

  it('pages use BDS CSS variables not legacy brand tokens', () => {
    const pages = [
      'styles/experience-premium.css',
      'app/pages/FoundationPage.tsx',
      'features/auth/ui/AuthShellPage.tsx',
    ];
    for (const page of pages) {
      const content = readFileSync(join(root, 'src', page), 'utf8');
      assert.match(content, /var\(--bds-/);
      assert.doesNotMatch(content, /brand-\d+/);
      assert.doesNotMatch(content, /surface-\d+/);
    }
  });
});
