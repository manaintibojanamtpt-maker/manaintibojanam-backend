import { ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const ROUTE_TITLES: Record<string, string> = {
  '/search': 'Menu',
  '/cart': 'Cart',
  '/checkout': 'Checkout',
  '/orders': 'Orders',
  '/profile': 'Profile',
  '/favorites': 'Favorites',
  '/notifications': 'Notifications',
};

function resolveTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) {
    return ROUTE_TITLES[pathname];
  }
  if (pathname.startsWith('/orders/') && pathname.includes('/track')) {
    return 'Track order';
  }
  return 'OrderBhojan';
}

export function OrderBhojanScreenHeader({
  title,
  fallbackPath = '/',
}: {
  readonly title?: string;
  readonly fallbackPath?: string;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const resolvedTitle = title ?? resolveTitle(pathname);

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/5 bg-black/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex min-h-12 max-w-7xl items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="ob-press ob-touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/90 touch-manipulation"
          aria-label="Go back"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
              return;
            }
            navigate(fallbackPath);
          }}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-white">{resolvedTitle}</h1>
      </div>
    </header>
  );
}
