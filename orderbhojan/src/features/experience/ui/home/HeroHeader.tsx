import { Link } from 'react-router-dom';
import {
  Avatar,
  Button,
  Icon,
  Text,
} from '@bhojan/design-system';
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
          <Text variant="caption" className="ob-hero-header__greeting">{greeting}</Text>
          <Text variant="title" as="p" className="ob-hero-header__name">
            {sessionUser?.displayName ?? (status === 'guest' ? 'Guest' : 'Foodie')}
          </Text>
        </div>
        <div className="ob-hero-header__actions">
          <Link to="/notifications" aria-label="Notifications" className="ob-icon-btn">
            <Icon size={22} label="Notifications">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </Icon>
          </Link>
          <Link to="/profile" aria-label="Profile">
            <Avatar
              src={sessionUser?.photoURL ?? undefined}
              initials={initials}
              size="lg"
            />
          </Link>
        </div>
      </div>
      {locationEnabled ? (
        <LocationChip variant="hero" className="ob-hero-header__address" />
      ) : (
        <Button
          variant="ghost"
          fullWidth
          className="ob-hero-header__address"
          aria-label="Delivery address placeholder"
        >
          <Icon size={18} label="Location">
            <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </Icon>
          <Text variant="bodySm" className="ob-hero-header__address-label">
            {DELIVERY_ADDRESS_PLACEHOLDER}
          </Text>
          <Icon size={16} aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </Icon>
        </Button>
      )}
    </header>
  );
}
