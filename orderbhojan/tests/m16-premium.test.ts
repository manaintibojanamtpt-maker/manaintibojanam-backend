import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('M1.6 premium visual layer', () => {
  it('loads premium CSS from main entry', () => {
    const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
    assert.match(main, /experience-premium\.css/);
    statSync(join(root, 'src/styles/experience-premium.css'));
  });

  it('uses scroll chrome hook in hero header', () => {
    const header = readFileSync(join(root, 'src/features/experience/ui/home/HeroHeader.tsx'), 'utf8');
    assert.match(header, /useScrollChrome/);
    assert.match(header, /ob-hero-header--scrolled/);
  });

  it('premium CSS includes safe-area and reduced motion', () => {
    const css = readFileSync(join(root, 'src/styles/experience-premium.css'), 'utf8');
    assert.match(css, /safe-area-inset-top/);
    assert.match(css, /safe-area-inset-bottom/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /ob-bottom-nav-shell/);
  });

  it('floating nav island uses glass styling', () => {
    const css = readFileSync(join(root, 'src/styles/experience-premium.css'), 'utf8');
    assert.match(css, /backdrop-filter/);
    assert.match(css, /ob-bottom-nav-fixed/);
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
