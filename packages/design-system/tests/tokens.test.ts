import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getSemanticColors, semanticColorsToCssVars } from '../src/tokens/colors';
import { spacing } from '../src/tokens/spacing';
import { typographyVariants } from '../src/tokens/typography';
import { cn } from '../src/utils/cn';

describe('BDS tokens', () => {
  it('exposes semantic colors for all themes', () => {
    for (const theme of ['light', 'dark', 'brand', 'food'] as const) {
      const colors = getSemanticColors(theme);
      assert.ok(colors.primary);
      assert.ok(colors.textPrimary);
      assert.ok(colors.background);
    }
  });

  it('maps semantic colors to CSS variables', () => {
    const vars = semanticColorsToCssVars(getSemanticColors('dark'));
    assert.equal(vars['--bds-color-primary'], getSemanticColors('dark').primary);
    assert.ok(vars['--bds-color-veg']);
  });

  it('defines spacing scale', () => {
    assert.ok(spacing[4]);
    assert.equal(spacing[1], '0.25rem');
  });

  it('defines typography variants', () => {
    assert.ok(typographyVariants.price);
    assert.ok(typographyVariants.displayXl);
  });
});

describe('cn utility', () => {
  it('merges class names', () => {
    assert.equal(cn('a', false && 'b', 'c'), 'a c');
  });
});
