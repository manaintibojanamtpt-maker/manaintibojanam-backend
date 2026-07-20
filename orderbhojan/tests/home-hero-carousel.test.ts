import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('home hero carousel', () => {
  it('auto-advances slides unless prefers-reduced-motion (not richMotion tier)', () => {
    const hero = readFileSync(
      join(root, 'src/presentation/discovery/OrderBhojanHomeHero.tsx'),
      'utf8',
    );

    assert.match(hero, /carouselAutoAdvance\s*=\s*!prefersReducedMotion/);
    assert.match(hero, /if \(!carouselAutoAdvance \|\| slides\.length <= 1\)/);
    assert.doesNotMatch(hero, /if \(!richMotion \|\| slides\.length <= 1\)/);
    assert.match(hero, /rotationIntervalMs = heroConfig\.rotationIntervalMs/);
  });

  it('shows slide indicators whenever multiple slides exist', () => {
    const view = readFileSync(
      join(root, '../src/design-system/adapters/marketplace/MarketplaceDiscoveryHeroView.tsx'),
      'utf8',
    );

    assert.match(view, /\{slides\.length > 1 \? \(/);
    assert.doesNotMatch(view, /\{animated && slides\.length > 1 \? \(/);
  });

  it('uses readable hero copy classes with scrim-backed text shadows', () => {
    const view = readFileSync(
      join(root, '../src/design-system/adapters/marketplace/MarketplaceDiscoveryHeroView.tsx'),
      'utf8',
    );
    const theme = readFileSync(join(root, 'src/styles/mib-theme.css'), 'utf8');

    assert.match(view, /ds-discovery-hero__eyebrow/);
    assert.match(view, /ds-discovery-hero__headline/);
    assert.match(view, /ds-discovery-hero__subline/);
    assert.doesNotMatch(view, /bg-clip-text text-transparent/);
    assert.match(theme, /\.ds-discovery-hero__headline[\s\S]*text-shadow/);
    assert.match(theme, /\.ds-discovery-hero__scrim[\s\S]*rgba\(5, 4, 3, 0\.98\)/);
  });

  it('defaults hero rotation interval to 12 seconds', () => {
    const scenes = readFileSync(
      join(root, 'src/features/experience/data/kitchenHeroScenes.ts'),
      'utf8',
    );

    assert.match(scenes, /KITCHEN_HERO_ROTATION_MS = 12_000/);
    assert.match(scenes, /rotationIntervalMs: KITCHEN_HERO_ROTATION_MS/);
  });
});
