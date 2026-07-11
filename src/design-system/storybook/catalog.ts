/**
 * Storybook readiness manifest — components that can render in isolation.
 * No Storybook installed; this documents required providers per component.
 */
export type StorybookProvider =
  | 'none'
  | 'router'
  | 'cart'
  | 'tenant'
  | 'auth'
  | 'delivery';

export interface StorybookComponentMeta {
  readonly name: string;
  readonly module: string;
  readonly exportName: string;
  readonly providers: readonly StorybookProvider[];
  readonly notes?: string;
}

export const STORYBOOK_COMPONENT_CATALOG: readonly StorybookComponentMeta[] = [
  // Primitives — fully isolated
  { name: 'SoftButton', module: 'primitives', exportName: 'SoftButton', providers: ['router'] },
  { name: 'CTAButton', module: 'primitives', exportName: 'CTAButton', providers: ['router'] },
  { name: 'GlassCard', module: 'primitives', exportName: 'GlassCard', providers: ['none'] },
  { name: 'PulseSkeleton', module: 'primitives', exportName: 'PulseSkeleton', providers: ['none'] },
  { name: 'Section', module: 'primitives', exportName: 'Section', providers: ['none'] },
  { name: 'SectionHeader', module: 'primitives', exportName: 'SectionHeader', providers: ['none'] },
  { name: 'MetricCard', module: 'primitives', exportName: 'MetricCard', providers: ['none'] },
  { name: 'TrustBadge', module: 'primitives', exportName: 'TrustBadge', providers: ['none'] },
  { name: 'TechBadge', module: 'primitives', exportName: 'TechBadge', providers: ['none'] },
  { name: 'TimelineCard', module: 'primitives', exportName: 'TimelineCard', providers: ['none'] },
  { name: 'ExecutiveCard', module: 'primitives', exportName: 'ExecutiveCard', providers: ['none'] },
  { name: 'FeatureCard', module: 'primitives', exportName: 'FeatureCard', providers: ['none'] },
  { name: 'ProfileImage', module: 'primitives', exportName: 'ProfileImage', providers: ['none'] },
  // Skeleton
  { name: 'Skeleton', module: 'skeleton', exportName: 'Skeleton', providers: ['none'] },
  { name: 'MenuItemSkeleton', module: 'skeleton', exportName: 'MenuItemSkeleton', providers: ['none'] },
  // Layout — presentation views isolated; wired components need providers
  { name: 'BottomSheet', module: 'layout', exportName: 'BottomSheet', providers: ['none'] },
  { name: 'ActiveOrderStripView', module: 'layout', exportName: 'ActiveOrderStripView', providers: ['none'] },
  { name: 'StorefrontInstallButtonView', module: 'layout', exportName: 'StorefrontInstallButtonView', providers: ['none'] },
  { name: 'BottomNav', module: 'layout', exportName: 'BottomNav', providers: ['router', 'cart', 'tenant'] },
  { name: 'Header', module: 'layout', exportName: 'Header', providers: ['router', 'cart', 'tenant', 'auth'] },
  { name: 'StorefrontDesktopHeader', module: 'layout', exportName: 'StorefrontDesktopHeader', providers: ['router', 'cart', 'tenant', 'auth', 'delivery'] },
  // Cart
  { name: 'FloatingMiniCart', module: 'cart', exportName: 'FloatingMiniCart', providers: ['router', 'cart', 'tenant'] },
  { name: 'DesktopFloatingCart', module: 'cart', exportName: 'DesktopFloatingCart', providers: ['router', 'cart', 'tenant'] },
  // Food
  { name: 'MenuItemCard', module: 'food', exportName: 'MenuItemCard', providers: ['router', 'cart'], notes: 'Pass addToCart handlers as props' },
  { name: 'Banner', module: 'food', exportName: 'Banner', providers: ['router'], notes: 'Firestore in component — mock for stories' },
  // Marketplace — props-only
  { name: 'MarketplaceSearchBar', module: 'marketplace', exportName: 'MarketplaceSearchBar', providers: ['none'] },
  { name: 'MarketplaceKitchenCardView', module: 'marketplace', exportName: 'MarketplaceKitchenCardView', providers: ['router'] },
  { name: 'MarketplaceSearchResults', module: 'marketplace', exportName: 'MarketplaceSearchResults', providers: ['none'], notes: 'Requires view model props' },
  // Orders
  { name: 'DigitalInvoice', module: 'orders', exportName: 'DigitalInvoice', providers: ['tenant'], notes: 'Pass order prop' },
  { name: 'OrderTracking', module: 'orders', exportName: 'OrderTracking', providers: ['router', 'tenant', 'auth'], notes: 'Full page — mock Firestore for stories' },
  // Location
  { name: 'AutoLocationForm', module: 'location', exportName: 'AutoLocationForm', providers: ['none'], notes: 'Pass isOpen, onClose, onLocationSelect props' },
  { name: 'HeaderLocationDropdown', module: 'location', exportName: 'HeaderLocationDropdown', providers: ['auth', 'tenant', 'delivery'] },
] as const;
