import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('M1.6 premium visual layer', () => {
  it('loads storefront styles via globals.css only', () => {
    const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
    assert.match(main, /@\/styles\/globals\.css/);
    assert.doesNotMatch(main, /experience-premium\.css/);

    const globals = readFileSync(join(root, 'src/styles/globals.css'), 'utf8');
    assert.match(globals, /design-system\/styles\/index\.css/);
  });

  it('uses scroll chrome hook in hero header', () => {
    const header = readFileSync(join(root, 'src/features/experience/ui/home/HeroHeader.tsx'), 'utf8');
    assert.match(header, /useScrollChrome/);
    assert.match(header, /ob-hero-header--scrolled/);
  });

  it('mib theme CSS includes reduced motion', () => {
    const css = readFileSync(join(root, 'src/styles/mib-theme.css'), 'utf8');
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /ob-bottom-nav-shell/);
    assert.match(css, /ob-hero-header--scrolled/);
  });

  it('floating nav island uses glass styling', () => {
    const css = readFileSync(join(root, 'src/styles/mib-theme.css'), 'utf8');
    assert.match(css, /backdrop-filter/);
    assert.match(css, /mib-glass/);
  });

  it('does not add marketplace API imports to experience UI', () => {
    const home = readFileSync(join(root, 'src/features/experience/ui/home/HomeExperiencePage.tsx'), 'utf8');
    assert.doesNotMatch(home, /getMarketplaceApiClient/);
  });
});

describe('M1.6 architecture freeze', () => {
  it('does not modify AppRouter paths', () => {
    const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
    assert.match(router, /SearchExperiencePage/);
    assert.doesNotMatch(router, /discovery.*M2/i);
  });
});
