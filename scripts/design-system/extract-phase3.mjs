/**
 * Phase 3 — copy founder presentation components into src/design-system
 * and replace originals with compatibility re-exports.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dsRoot = path.join(root, 'src/design-system');

/** @type {Array<{ src: string; dest: string; kind: 'default' | 'named' | 'both' }>} */
const EXTRACTIONS = [
  // UI primitives
  { src: 'src/components/ui/SoftButton.tsx', dest: 'src/design-system/primitives/SoftButton.tsx', kind: 'both' },
  { src: 'src/components/ui/CTAButton.tsx', dest: 'src/design-system/primitives/CTAButton.tsx', kind: 'named' },
  { src: 'src/components/ui/GlassCard.tsx', dest: 'src/design-system/primitives/GlassCard.tsx', kind: 'named' },
  { src: 'src/components/ui/Skeleton.tsx', dest: 'src/design-system/primitives/Skeleton.tsx', kind: 'named' },
  { src: 'src/components/ui/Section.tsx', dest: 'src/design-system/primitives/Section.tsx', kind: 'named' },
  { src: 'src/components/ui/SectionHeader.tsx', dest: 'src/design-system/primitives/SectionHeader.tsx', kind: 'named' },
  { src: 'src/components/ui/IconContainer.tsx', dest: 'src/design-system/primitives/IconContainer.tsx', kind: 'named' },
  { src: 'src/components/ui/MetricCard.tsx', dest: 'src/design-system/primitives/MetricCard.tsx', kind: 'named' },
  { src: 'src/components/ui/TrustBadge.tsx', dest: 'src/design-system/primitives/TrustBadge.tsx', kind: 'named' },
  { src: 'src/components/ui/TechBadge.tsx', dest: 'src/design-system/primitives/TechBadge.tsx', kind: 'named' },
  { src: 'src/components/ui/TimelineCard.tsx', dest: 'src/design-system/primitives/TimelineCard.tsx', kind: 'named' },
  { src: 'src/components/ui/ExecutiveCard.tsx', dest: 'src/design-system/primitives/ExecutiveCard.tsx', kind: 'named' },
  { src: 'src/components/ui/FeatureCard.tsx', dest: 'src/design-system/primitives/FeatureCard.tsx', kind: 'named' },
  { src: 'src/components/ui/ProfileImage.tsx', dest: 'src/design-system/primitives/ProfileImage.tsx', kind: 'named' },
  // Skeleton
  { src: 'src/components/SkeletonSystem.tsx', dest: 'src/design-system/skeleton/SkeletonSystem.tsx', kind: 'named' },
  // Layout
  { src: 'src/components/BottomNav.tsx', dest: 'src/design-system/layout/BottomNav.tsx', kind: 'default' },
  { src: 'src/components/Header.tsx', dest: 'src/design-system/layout/Header.tsx', kind: 'default' },
  { src: 'src/components/StorefrontDesktopHeader.tsx', dest: 'src/design-system/layout/StorefrontDesktopHeader.tsx', kind: 'default' },
  // Cart
  { src: 'src/components/FloatingMiniCart.tsx', dest: 'src/design-system/cart/FloatingMiniCart.tsx', kind: 'default' },
  { src: 'src/components/DesktopFloatingCart.tsx', dest: 'src/design-system/cart/DesktopFloatingCart.tsx', kind: 'default' },
  // Food
  { src: 'src/components/MenuItemCard.tsx', dest: 'src/design-system/food/MenuItemCard.tsx', kind: 'default' },
  { src: 'src/components/Banner.tsx', dest: 'src/design-system/food/Banner.tsx', kind: 'default' },
  // Marketplace
  { src: 'src/components/marketplace/HighlightedText.tsx', dest: 'src/design-system/marketplace/HighlightedText.tsx', kind: 'named' },
  { src: 'src/components/marketplace/MarketplaceSearchAutocomplete.tsx', dest: 'src/design-system/marketplace/MarketplaceSearchAutocomplete.tsx', kind: 'named' },
  { src: 'src/components/marketplace/MarketplaceSearchBar.tsx', dest: 'src/design-system/marketplace/MarketplaceSearchBar.tsx', kind: 'named' },
  { src: 'src/components/marketplace/MarketplaceSearchFilterChips.tsx', dest: 'src/design-system/marketplace/MarketplaceSearchFilterChips.tsx', kind: 'named' },
  { src: 'src/components/marketplace/MarketplaceSearchFilterDrawer.tsx', dest: 'src/design-system/marketplace/MarketplaceSearchFilterDrawer.tsx', kind: 'named' },
  { src: 'src/components/marketplace/MarketplaceSearchResultCard.tsx', dest: 'src/design-system/marketplace/MarketplaceSearchResultCard.tsx', kind: 'named' },
  { src: 'src/components/marketplace/MarketplaceSearchResults.tsx', dest: 'src/design-system/marketplace/MarketplaceSearchResults.tsx', kind: 'named' },
  { src: 'src/components/marketplace/MarketplaceSearchSortSelector.tsx', dest: 'src/design-system/marketplace/MarketplaceSearchSortSelector.tsx', kind: 'named' },
  { src: 'src/components/marketplace/MarketplaceSearchStates.tsx', dest: 'src/design-system/marketplace/MarketplaceSearchStates.tsx', kind: 'named' },
  { src: 'src/components/marketplace/MarketplaceKitchenCard.tsx', dest: 'src/design-system/marketplace/MarketplaceKitchenCard.tsx', kind: 'named' },
  // Orders
  { src: 'src/components/DigitalInvoice.tsx', dest: 'src/design-system/orders/DigitalInvoice.tsx', kind: 'default' },
  { src: 'src/components/OrderTracking.tsx', dest: 'src/design-system/orders/OrderTracking.tsx', kind: 'default' },
  // Location
  { src: 'src/components/AutoLocationForm.tsx', dest: 'src/design-system/location/AutoLocationForm.tsx', kind: 'default' },
  { src: 'src/components/HeaderLocationDropdown.tsx', dest: 'src/design-system/location/HeaderLocationDropdown.tsx', kind: 'default' },
];

function depthFromSrc(filePath) {
  const rel = filePath.replace(/^src\//, '');
  return rel.split('/').length - 1;
}

function transformImports(content, srcPath, destPath) {
  const srcDepth = depthFromSrc(srcPath);
  const destDepth = depthFromSrc(destPath);
  const delta = destDepth - srcDepth;

  if (delta === 0) {
    return transformInternalRefs(content, destPath);
  }

  let out = content;
  const upPrefix = '../'.repeat(Math.max(1, 1 + (delta > 0 ? delta : 0)));

  if (delta > 0) {
    out = out.replace(/from ['"](\.\.\/)+/g, (match) => {
      const levels = (match.match(/\.\.\//g) || []).length;
      return `from '${'../'.repeat(levels + delta)}`;
    });
    out = out.replace(/from "(\.\.\/)+/g, (match) => {
      const levels = (match.match(/\.\.\//g) || []).length;
      return `from "${'../'.repeat(levels + delta)}`;
    });
  }

  return transformInternalRefs(out, destPath);
}

function transformInternalRefs(content, destPath) {
  let out = content;

  // CTAButton imports SoftButton from same ui folder -> primitives
  out = out.replace(
    /from ['"]\.\/SoftButton['"]/g,
    "from './SoftButton'",
  );

  // Components still in src/components (not extracted in P0)
  const legacySiblingImports = [
    'ActiveOrderStrip',
    'StorefrontInstallButton',
    'BottomSheet',
  ];

  for (const name of legacySiblingImports) {
    out = out.replace(
      new RegExp(`from ['"]\\.\\/${name}['"]`, 'g'),
      `from '../../components/${name}'`,
    );
  }

  // HeaderLocationDropdown <-> AutoLocationForm within location/
  if (destPath.includes('design-system/location/HeaderLocationDropdown')) {
    out = out.replace(
      /from ['"]\.\/AutoLocationForm['"]/g,
      "from './AutoLocationForm'",
    );
  }

  if (destPath.includes('design-system/layout/StorefrontDesktopHeader')) {
    out = out.replace(
      /from ['"]\.\/HeaderLocationDropdown['"]/g,
      "from '../location/HeaderLocationDropdown'",
    );
    out = out.replace(
      /from ['"]\.\/StorefrontInstallButton['"]/g,
      "from '../../components/StorefrontInstallButton'",
    );
  }

  if (destPath.includes('design-system/layout/Header')) {
    out = out.replace(
      /from ['"]\.\/StorefrontInstallButton['"]/g,
      "from '../../components/StorefrontInstallButton'",
    );
  }

  if (destPath.includes('design-system/layout/BottomNav')) {
    out = out.replace(
      /from ['"]\.\/ActiveOrderStrip['"]/g,
      "from '../../components/ActiveOrderStrip'",
    );
  }

  if (destPath.includes('design-system/food/MenuItemCard')) {
    out = out.replace(
      /from ['"]\.\/BottomSheet['"]/g,
      "from '../../components/BottomSheet'",
    );
  }

  if (destPath.includes('design-system/orders/OrderTracking')) {
    out = out.replace(
      /from ['"]\.\/DigitalInvoice['"]/g,
      "from './DigitalInvoice'",
    );
  }

  // CTAButton was in ui/, now in primitives/
  if (destPath.includes('design-system/primitives/CTAButton')) {
    // SoftButton is sibling — already ./SoftButton
  }

  // Fix SkeletonSystem lib path (was ../lib from components, needs ../../lib from skeleton/)
  if (destPath.includes('design-system/skeleton/SkeletonSystem')) {
    out = out.replace(/from ['"]\.\.\/lib\//g, "from '../../lib/");
  }

  // Fix ui/Skeleton path (was ../../lib from ui/)
  if (destPath.includes('design-system/primitives/Skeleton')) {
    out = out.replace(/from ['"]\.\.\/\.\.\/lib\//g, "from '../../lib/");
  }

  // Fix CTAButton - was ./SoftButton in ui folder, still ./SoftButton in primitives
  return out;
}

function reExportStub(destPath, kind) {
  const relFromSrcComponents = path
    .relative(path.join(root, 'src'), path.join(root, destPath))
    .replace(/\\/g, '/')
    .replace(/\.tsx$/, '');

  const importPath = `../${relFromSrcComponents}`;

  if (kind === 'default') {
    return `/** @deprecated Import from '@/design-system' — compatibility re-export (Phase 3) */\nexport { default } from '${importPath}';\n`;
  }
  if (kind === 'named') {
    return `/** @deprecated Import from '@/design-system' — compatibility re-export (Phase 3) */\nexport * from '${importPath}';\n`;
  }
  return `/** @deprecated Import from '@/design-system' — compatibility re-export (Phase 3) */\nexport * from '${importPath}';\nexport { default } from '${importPath}';\n`;
}

function copyTokens() {
  const indexCss = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');
  const softButtons = fs.readFileSync(path.join(root, 'src/styles/soft-buttons.css'), 'utf8');

  const themeMatch = indexCss.match(/@theme \{[\s\S]*?\}/);
  const themeBlock = themeMatch ? themeMatch[0] : '';

  const colorsCss = `${themeBlock}\n\n:root {\n  --mib-bg: #070504;\n  --mib-surface: #120d0a;\n  --mib-surface-strong: #1a1410;\n  --mib-border: rgba(255, 255, 255, 0.05);\n  --mib-border-strong: rgba(255, 170, 95, 0.12);\n  --mib-text: #fffaf3;\n  --mib-muted: #d0c4b5;\n  --mib-primary: #ff6b35;\n  --mib-primary-2: #ff9f1c;\n  --mib-success: #10b981;\n  --mib-radius-card: 1.75rem;\n  --mib-shadow-card: 0 10px 40px -10px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.02) inset;\n  --mib-shadow-glow: 0 0 30px -10px rgba(255, 107, 53, 0.25);\n}\n`;

  const glassSection = `
.mib-glass {
  background: rgba(18, 13, 10, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.mib-hero-gradient {
  background: linear-gradient(
    to bottom,
    rgba(7, 5, 4, 0.2) 0%,
    rgba(7, 5, 4, 0.4) 40%,
    rgba(7, 5, 4, 0.8) 80%,
    rgba(7, 5, 4, 1) 100%
  );
}
`;

  const motionCss = `
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.shimmer {
  animation: shimmer 2s infinite;
  background: linear-gradient(90deg, rgba(255,255,255,0.07) 25%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.07) 75%);
  background-size: 1000px 100%;
}
`;

  fs.mkdirSync(path.join(dsRoot, 'tokens'), { recursive: true });
  fs.mkdirSync(path.join(dsRoot, 'styles'), { recursive: true });

  fs.writeFileSync(path.join(dsRoot, 'tokens/colors.css'), colorsCss);
  fs.writeFileSync(path.join(dsRoot, 'tokens/typography.css'), `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');\n`);
  fs.writeFileSync(path.join(dsRoot, 'tokens/glass.css'), glassSection);
  fs.writeFileSync(path.join(dsRoot, 'tokens/motion.css'), motionCss);
  fs.writeFileSync(path.join(dsRoot, 'styles/soft-buttons.css'), softButtons);

  fs.writeFileSync(
    path.join(dsRoot, 'styles/index.css'),
    `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap');
@import "../tokens/colors.css";
@import "../tokens/glass.css";
@import "../tokens/motion.css";
@import "./soft-buttons.css";
`,
  );

  fs.writeFileSync(
    path.join(dsRoot, 'tokens/index.ts'),
    `/** Design system token constants — Phase 3 copy from src/index.css */\nexport const colors = {
  primary: '#FF7A00',
  primaryLight: '#FF9F43',
  brandBg: '#070504',
  cardBg: '#120D0A',
  textMain: '#FFFAF3',
  textSecondary: '#B9ADA1',
  accentRed: '#FF6B35',
} as const;

export const fonts = {
  sans: 'Plus Jakarta Sans',
  display: 'Outfit',
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;
`,
  );
}

function writeIndexFiles() {
  const primitives = [
    'SoftButton', 'CTAButton', 'GlassCard', 'Skeleton', 'Section', 'SectionHeader',
    'IconContainer', 'MetricCard', 'TrustBadge', 'TechBadge', 'TimelineCard',
    'ExecutiveCard', 'FeatureCard', 'ProfileImage',
  ];

  fs.writeFileSync(
    path.join(dsRoot, 'primitives/index.ts'),
    primitives.map((p) => `export * from './${p}';`).join('\n') + '\n',
  );

  fs.writeFileSync(
    path.join(dsRoot, 'skeleton/index.ts'),
    `export * from './SkeletonSystem';\n`,
  );

  fs.writeFileSync(
    path.join(dsRoot, 'layout/index.ts'),
    `export { default as BottomNav } from './BottomNav';\nexport { default as Header } from './Header';\nexport { default as StorefrontDesktopHeader } from './StorefrontDesktopHeader';\n`,
  );

  fs.writeFileSync(
    path.join(dsRoot, 'cart/index.ts'),
    `export { default as FloatingMiniCart } from './FloatingMiniCart';\nexport { default as DesktopFloatingCart } from './DesktopFloatingCart';\n`,
  );

  fs.writeFileSync(
    path.join(dsRoot, 'food/index.ts'),
    `export { default as MenuItemCard } from './MenuItemCard';\nexport { default as Banner } from './Banner';\n`,
  );

  const marketplaceExports = [
    'HighlightedText', 'MarketplaceSearchAutocomplete', 'MarketplaceSearchBar',
    'MarketplaceSearchFilterChips', 'MarketplaceSearchFilterDrawer',
    'MarketplaceSearchResultCard', 'MarketplaceSearchResults',
    'MarketplaceSearchSortSelector', 'MarketplaceSearchStates', 'MarketplaceKitchenCard',
  ];
  fs.writeFileSync(
    path.join(dsRoot, 'marketplace/index.ts'),
    marketplaceExports.map((m) => `export * from './${m}';`).join('\n') + '\n',
  );

  fs.writeFileSync(
    path.join(dsRoot, 'orders/index.ts'),
    `export { default as OrderTracking } from './OrderTracking';\nexport { default as DigitalInvoice } from './DigitalInvoice';\n`,
  );

  fs.writeFileSync(
    path.join(dsRoot, 'location/index.ts'),
    `export { default as AutoLocationForm } from './AutoLocationForm';\nexport { default as HeaderLocationDropdown } from './HeaderLocationDropdown';\n`,
  );

  fs.writeFileSync(
    path.join(dsRoot, 'index.ts'),
    `export * from './tokens/index';
export * from './primitives';
export * from './skeleton';
export * from './layout';
export * from './cart';
export * from './food';
export * from './marketplace';
export * from './orders';
export * from './location';
`,
  );
}

function main() {
  copyTokens();

  for (const { src, dest, kind } of EXTRACTIONS) {
    const srcFull = path.join(root, src);
    const destFull = path.join(root, dest);
    fs.mkdirSync(path.dirname(destFull), { recursive: true });

    const original = fs.readFileSync(srcFull, 'utf8');
    const transformed = transformImports(original, src, dest);
    fs.writeFileSync(destFull, transformed);

    fs.writeFileSync(srcFull, reExportStub(dest, kind));
    console.log(`✓ ${src} → ${dest}`);
  }

  writeIndexFiles();
  console.log('\nPhase 3 extraction complete.');
}

main();
