import {
  LayoutDashboard,
  ShoppingBag,
  Menu as MenuIcon,
  Store,
  Truck,
  Users,
  Package,
  TrendingUp,
  CheckCircle2,
  CreditCard,
  Bell,
  Gift,
  MessageCircle,
  Settings,
  LucideIcon,
} from 'lucide-react';

export interface OwnerNavItem {
  id: string;
  label: string;
  shortLabel: string;
  path: string;
  icon: LucideIcon;
  group: 'run' | 'store' | 'grow' | 'account';
  mobileBar?: boolean;
  hideOnMobile?: boolean;
  featureGate?: 'customerInsights' | 'predictiveSupply' | 'marketing' | 'deliveryIntelligence';
}

export const ownerNavGroups: Record<OwnerNavItem['group'], string> = {
  run: 'Run your kitchen',
  store: 'Your store',
  grow: 'Grow sales',
  account: 'Account',
};

export const ownerNavItems: OwnerNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', path: '/owner/dashboard', icon: LayoutDashboard, group: 'run', mobileBar: true },
  { id: 'orders', label: 'Orders', shortLabel: 'Orders', path: '/owner/orders', icon: ShoppingBag, group: 'run', mobileBar: true },
  { id: 'menu', label: 'Menu', shortLabel: 'Menu', path: '/owner/menu', icon: MenuIcon, group: 'run', mobileBar: true },
  { id: 'storefront', label: 'Storefront', shortLabel: 'Store', path: '/owner/settings', icon: Store, group: 'store', mobileBar: true },
  { id: 'delivery', label: 'Delivery', shortLabel: 'Delivery', path: '/owner/delivery', icon: Truck, group: 'store', hideOnMobile: true, featureGate: 'deliveryIntelligence' },
  { id: 'compliance', label: 'Compliance', shortLabel: 'KYC', path: '/owner/kyc', icon: CheckCircle2, group: 'store' },
  { id: 'customers', label: 'Customers', shortLabel: 'Customers', path: '/owner/customers', icon: Users, group: 'grow', hideOnMobile: true, featureGate: 'customerInsights' },
  { id: 'growth', label: 'Growth', shortLabel: 'Growth', path: '/owner/marketing', icon: TrendingUp, group: 'grow', hideOnMobile: true, featureGate: 'marketing' },
  { id: 'inventory', label: 'Inventory', shortLabel: 'Stock', path: '/owner/recipes', icon: Package, group: 'run', hideOnMobile: true, featureGate: 'predictiveSupply' },
  { id: 'notifications', label: 'Notifications', shortLabel: 'Alerts', path: '/owner/notifications', icon: Bell, group: 'run', hideOnMobile: true },
  { id: 'payments', label: 'Payments', shortLabel: 'Pay', path: '/owner/subscription', icon: CreditCard, group: 'account', hideOnMobile: true },
  { id: 'referrals', label: 'Refer & earn', shortLabel: 'Refer', path: '/owner/referrals', icon: Gift, group: 'grow' },
  { id: 'help', label: 'Help & feedback', shortLabel: 'Help', path: '/owner/feedback', icon: MessageCircle, group: 'account' },
];

export const getOwnerPageTitle = (pathname: string): string => {
  const match = ownerNavItems.find((item) => item.path === pathname);
  if (match) return match.label;
  if (pathname === '/owner/operations') return 'Reports';
  if (pathname === '/owner/import-data') return 'Import data';
  if (pathname === '/owner/setup') return 'Store setup';
  return 'Dashboard';
};
