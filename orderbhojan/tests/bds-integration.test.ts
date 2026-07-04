import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const srcRoot = join(root, 'src');

const forbiddenUiPaths = [
  'shared/components/Button.tsx',
  'shared/components/Card.tsx',
  'shared/components/Input.tsx',
  'shared/components/Dialog.tsx',
  'shared/components/BottomSheet.tsx',
  'shared/components/Skeleton.tsx',
];

const requiredBdsLayouts = [
  'shared/layouts/MarketplaceLayout.tsx',
  'shared/layouts/AuthLayout.tsx',
  'shared/layouts/FullScreenLayout.tsx',
  'shared/layouts/ResponsiveLayout.tsx',
];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules') continue;
      walk(full, files);
    } else if (/\.(tsx|ts)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe('BDS integration — no custom UI primitives', () => {
  it('removed legacy shared/components primitives', () => {
    for (const rel of forbiddenUiPaths) {
      const full = join(srcRoot, rel);
      assert.throws(() => statSync(full), /ENOENT/);
    }
  });

  it('requires BDS layout files', () => {
    for (const rel of requiredBdsLayouts) {
      assert.ok(statSync(join(srcRoot, rel)).isFile(), `Missing ${rel}`);
    }
  });

  it('AppProviders uses DesignSystemProvider', () => {
    const content = readFileSync(join(srcRoot, 'shared/providers/AppProviders.tsx'), 'utf8');
    assert.match(content, /DesignSystemProvider/);
    assert.doesNotMatch(content, /shared\/providers\/ThemeProvider/);
  });

  it('source files do not import legacy shared/components', () => {
    const files = walk(srcRoot);
    const violations = files.filter((file) => {
      const content = readFileSync(file, 'utf8');
      return content.includes('@/shared/components') || content.includes("from '@/shared/components'");
    });
    assert.deepEqual(violations, []);
  });

  it('globals.css imports BDS styles', () => {
    const css = readFileSync(join(srcRoot, 'styles/globals.css'), 'utf8');
    assert.match(css, /@bhojan\/design-system\/styles\.css/);
    assert.doesNotMatch(css, /--color-brand-600/);
  });

  it('package.json depends on @bhojan/design-system', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert.ok(pkg.dependencies['@bhojan/design-system']);
  });
});
