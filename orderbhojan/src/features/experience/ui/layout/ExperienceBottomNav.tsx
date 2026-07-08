import { useLocation, useNavigate } from 'react-router-dom';
import { Icon, NavIsland, SideNav } from '@bhojan/design-system';
import { OrderBhojanBrand } from '@/shared/ui/OrderBhojanBrand';
import { useDiscoveryFilterStore } from '@/features/discovery/store/discoveryFilterStore';
import { useCategoryStore } from '@/features/experience/store/categoryStore';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: <Icon size={20} aria-hidden><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /></Icon> },
  { id: 'search', label: 'Search', icon: <Icon size={20} aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon> },
  { id: 'cart', label: 'Cart', icon: <Icon size={20} aria-hidden><circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" /><circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" /><path d="M2 2h2l2.5 13h11l2-8H6" /></Icon> },
  { id: 'orders', label: 'Orders', icon: <Icon size={20} aria-hidden><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /></Icon> },
  { id: 'profile', label: 'Profile', icon: <Icon size={20} aria-hidden><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></Icon> },
] as const;

const NAV_PATHS: Record<string, string> = {
  home: '/',
  search: '/search',
  cart: '/cart',
  orders: '/orders',
  profile: '/profile',
};

function resolveActiveId(pathname: string): string {
  if (pathname.startsWith('/search')) return 'search';
  if (pathname.startsWith('/cart')) return 'cart';
  if (pathname.startsWith('/orders')) return 'orders';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'home';
}

export function ExperienceBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeId = resolveActiveId(pathname);

  return (
    <>
      <SideNav
        brand={<OrderBhojanBrand variant="nav" linkToHome={false} />}
        items={[...NAV_ITEMS]}
        activeId={activeId}
        onChange={(id) => {
          const path = NAV_PATHS[id];
          if (id === 'home') {
            useDiscoveryFilterStore.getState().resetFilters();
            useCategoryStore.getState().clear();
          }
          if (path) navigate(path);
        }}
      />
      <NavIsland
        items={[...NAV_ITEMS]}
        activeId={activeId}
        onChange={(id) => {
          const path = NAV_PATHS[id];
          if (id === 'home') {
            useDiscoveryFilterStore.getState().resetFilters();
            useCategoryStore.getState().clear();
          }
          if (path) navigate(path);
        }}
      />
    </>
  );
}
