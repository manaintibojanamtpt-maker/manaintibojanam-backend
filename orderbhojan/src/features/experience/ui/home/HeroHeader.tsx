import { Link } from 'react-router-dom';
import { Bell, ChevronDown, MapPin } from 'lucide-react';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { LocationChip, useLocationFeatureEnabled } from '@/features/location';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useGreeting } from '../../hooks/useGreeting';
import { useScrollChrome } from '../../hooks/useScrollChrome';
import { DELIVERY_ADDRESS_PLACEHOLDER } from '../../data/mockCatalog';

export function HeroHeader() {
  const greeting = useGreeting();
  const scrolled = useScrollChrome();
  const locationEnabled = useLocationFeatureEnabled();
  const { sessionUser, status } = useAuth();
  const initials =
    sessionUser?.displayName?.slice(0, 2).toUpperCase()
    ?? sessionUser?.email?.slice(0, 2).toUpperCase()
    ?? 'G';

  return (
    <header
      className={`ob-hero-header${scrolled ? ' ob-hero-header--scrolled' : ''}`}
      aria-label="Home header"
    >
      <div className="ob-hero-header__top">
        <div className="ob-hero-header__identity">
          <p className="bds-text-caption ob-hero-header__greeting">{greeting}</p>
          <p className="bds-text-title ob-hero-header__name">
            {sessionUser?.displayName ?? (status === 'guest' ? 'Guest' : 'Foodie')}
          </p>
        </div>
        <div className="ob-hero-header__actions">
          <Link to="/notifications" aria-label="Notifications" className="ob-icon-btn">
            <Bell className="h-[22px] w-[22px]" aria-hidden />
          </Link>
          <Link to="/profile" aria-label="Profile">
            <div className="bds-avatar bds-avatar--lg" role="img" aria-label={initials}>
              {sessionUser?.photoURL ? (
                <img src={sessionUser.photoURL} alt="" />
              ) : (
                initials
              )}
            </div>
          </Link>
        </div>
      </div>
      {locationEnabled ? (
        <LocationChip variant="hero" className="ob-hero-header__address" />
      ) : (
        <SoftButton
          tone="ghost"
          fullWidth
          className="ob-hero-header__address"
          aria-label="Delivery address placeholder"
        >
          <MapPin className="h-[18px] w-[18px]" aria-hidden />
          <span className="bds-text-body-sm ob-hero-header__address-label">
            {DELIVERY_ADDRESS_PLACEHOLDER}
          </span>
          <ChevronDown className="h-4 w-4" aria-hidden />
        </SoftButton>
      )}
    </header>
  );
}
