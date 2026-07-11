/** Fix compatibility re-export paths after Phase 3 extraction */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const EXTRACTIONS = [
  { src: 'src/components/ui/SoftButton.tsx', dest: 'src/design-system/primitives/SoftButton.tsx', kind: 'both' },
  { src: 'src/components/ui/CTAButton.tsx', dest: 'src/design-system/primitives/CTAButton.tsx', kind: 'named' },
  { src: 'src/components/ui/GlassCard.tsx', dest: 'src/design-system/primitives/GlassCard.tsx', kind: 'both' },
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
  { src: 'src/components/SkeletonSystem.tsx', dest: 'src/design-system/skeleton/SkeletonSystem.tsx', kind: 'named' },
  { src: 'src/components/BottomNav.tsx', dest: 'src/design-system/layout/BottomNav.tsx', kind: 'default' },
  { src: 'src/components/Header.tsx', dest: 'src/design-system/layout/Header.tsx', kind: 'default' },
  { src: 'src/components/StorefrontDesktopHeader.tsx', dest: 'src/design-system/layout/StorefrontDesktopHeader.tsx', kind: 'default' },
  { src: 'src/components/FloatingMiniCart.tsx', dest: 'src/design-system/cart/FloatingMiniCart.tsx', kind: 'default' },
  { src: 'src/components/DesktopFloatingCart.tsx', dest: 'src/design-system/cart/DesktopFloatingCart.tsx', kind: 'default' },
  { src: 'src/components/MenuItemCard.tsx', dest: 'src/design-system/food/MenuItemCard.tsx', kind: 'default' },
  { src: 'src/components/Banner.tsx', dest: 'src/design-system/food/Banner.tsx', kind: 'default' },
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
  { src: 'src/components/DigitalInvoice.tsx', dest: 'src/design-system/orders/DigitalInvoice.tsx', kind: 'default' },
  { src: 'src/components/OrderTracking.tsx', dest: 'src/design-system/orders/OrderTracking.tsx', kind: 'default' },
  { src: 'src/components/AutoLocationForm.tsx', dest: 'src/design-system/location/AutoLocationForm.tsx', kind: 'default' },
  { src: 'src/components/HeaderLocationDropdown.tsx', dest: 'src/design-system/location/HeaderLocationDropdown.tsx', kind: 'default' },
];

function reExportStub(srcPath, destPath, kind) {
  const srcFull = path.join(root, srcPath);
  const destFull = path.join(root, destPath);
  let importPath = path.relative(path.dirname(srcFull), destFull).replace(/\\/g, '/').replace(/\.tsx$/, '');
  if (!importPath.startsWith('.')) importPath = `./${importPath}`;

  if (kind === 'default') {
    return `/** @deprecated Import from '@/design-system' — compatibility re-export (Phase 3) */\nexport { default } from '${importPath}';\n`;
  }
  if (kind === 'named') {
    return `/** @deprecated Import from '@/design-system' — compatibility re-export (Phase 3) */\nexport * from '${importPath}';\n`;
  }
  return `/** @deprecated Import from '@/design-system' — compatibility re-export (Phase 3) */\nexport * from '${importPath}';\nexport { default } from '${importPath}';\n`;
}

for (const item of EXTRACTIONS) {
  fs.writeFileSync(path.join(root, item.src), reExportStub(item.src, item.dest, item.kind));
  console.log(`fixed ${item.src}`);
}
