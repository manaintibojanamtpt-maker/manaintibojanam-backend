/**
 * BhojanOS Storefront Design System — public API
 * Import only from this barrel. Deep imports are discouraged.
 */
export * from './tokens/index';
export * from './primitives';
export {
  Skeleton,
  MenuItemSkeleton,
  CategorySkeleton,
  RecommendedSkeleton,
  TrendingSkeleton,
  HomeBentoSkeleton,
} from './skeleton/SkeletonSystem';
export * from './layout';
export * from './cart';
export * from './food';
export * from './marketplace';
export * from './orders';
export * from './location';

/** Marketplace presentation adapters (props-only; OrderBhojan wires business logic) */
export * from './adapters/marketplace';

/** Styles entry path for apps that opt in to DS tokens (not wired globally yet) */
export const DESIGN_SYSTEM_STYLES = './styles/index.css';
