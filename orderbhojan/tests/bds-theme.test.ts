import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('Storefront design system theme certification', () => {
  it('founder design system constants remain frozen at v1.0.0', () => {
    const constants = readFileSync(
      resolve(root, '../packages/design-system/src/constants.ts'),
      'utf8',
    );
    assert.match(constants, /BDS_VERSION = '1\.0\.0'/);
    assert.match(constants, /BDS_FROZEN = true/);
  });

  it('index.html uses Evening Kitchen theme-color without external font CDN', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    assert.match(html, /theme-color" content="#(050403|070504)"/i);
    assert.doesNotMatch(html, /fonts\.googleapis\.com/);
  });

  it('globals.css self-hosts Fraunces and Figtree display fonts', () => {
    const globals = readFileSync(join(root, 'src/styles/globals.css'), 'utf8');
    const fonts = readFileSync(join(root, 'src/styles/fonts.css'), 'utf8');
    assert.match(globals, /fonts\.css/);
    assert.match(fonts, /figtree/i);
    assert.match(fonts, /fraunces/i);
  });

  it('vite PWA manifest uses Evening Kitchen colors', () => {
    const vite = readFileSync(join(root, 'vite.config.ts'), 'utf8');
    assert.match(vite, /theme_color:\s*'#(050403|070504)'/);
    assert.match(vite, /background_color:\s*'#(050403|070504)'/);
  });

  it('pages use BDS CSS variables not legacy brand tokens', () => {
    const pages = [
      'styles/globals.css',
      'app/pages/FoundationPage.tsx',
    ];
    for (const page of pages) {
      const content = readFileSync(join(root, 'src', page), 'utf8');
      assert.match(content, /var\(--bds-/);
      assert.doesNotMatch(content, /brand-\d+/);
      assert.doesNotMatch(content, /surface-\d+/);
    }
    const authPresentation = readFileSync(
      join(root, 'src/presentation/auth/OrderBhojanAuthShellPage.tsx'),
      'utf8',
    );
    assert.match(authPresentation, /storefront-design-system/);
  });
});
