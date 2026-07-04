import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Icon,
  SearchBar,
  Skeleton,
  Text,
} from '@bhojan/design-system';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useActiveLocation, useRecentLocationsList, useSavedAddressesList } from '../hooks/useActiveLocation';
import { useLocationActions } from '../hooks/useLocationActions';
import { useLocationUiState } from '../hooks/useActiveLocation';
import { useLocationSessionStore } from '../store/locationSessionStore';
import { AddressFormSheet } from './AddressFormSheet';

export function LocationSelectorSheet() {
  const open = useLocationSessionStore((s) => s.selectorOpen);
  const { closeSelector, requestCurrentLocation, selectSavedAddress, selectRecentLocation } = useLocationActions();
  const { uiStatus, uiError } = useLocationUiState();
  const active = useActiveLocation();
  const saved = useSavedAddressesList();
  const recent = useRecentLocationsList();
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);

  const filteredSaved = saved.filter((a) => {
    const label = `${a.label} ${a.customLabel ?? ''} ${a.address.formattedAddress ?? ''}`.toLowerCase();
    return label.includes(search.toLowerCase());
  });

  return (
    <>
      <BottomSheet open={open} onClose={closeSelector} title="Deliver to">
        <div className="ob-location-sheet">
          <SearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved addresses"
            aria-label="Search addresses"
          />

          <Button
            variant="primary"
            fullWidth
            className="ob-location-sheet__gps"
            onClick={() => void requestCurrentLocation()}
            disabled={uiStatus === 'loading'}
          >
            <Icon size={18} label="GPS">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            </Icon>
            {uiStatus === 'loading' ? 'Detecting…' : 'Use current location'}
          </Button>

          {uiError ? (
            <Card className="ob-location-sheet__error" role="alert">
              <Text variant="bodySm">{uiError.message}</Text>
              {uiError.retryable ? (
                <Button variant="ghost" size="compact" onClick={() => void requestCurrentLocation()}>
                  Retry
                </Button>
              ) : null}
            </Card>
          ) : null}

          {active?.serviceability?.message ? (
            <Text variant="caption" className="ob-location-sheet__hint">
              {active.serviceability.message}
            </Text>
          ) : null}

          {recent.length > 0 ? (
            <section className="ob-location-sheet__section" aria-label="Recent locations">
              <Text variant="subtitle">Recent</Text>
              {recent.map((entry) => (
                <Button
                  key={entry.id}
                  variant="ghost"
                  fullWidth
                  className="ob-location-sheet__row"
                  onClick={() => void selectRecentLocation(entry.id)}
                >
                  <Icon size={16} label="Recent">
                    <path d="M12 8v4l3 3" />
                    <circle cx="12" cy="12" r="9" />
                  </Icon>
                  <Text variant="bodySm">{entry.displayLabel}</Text>
                </Button>
              ))}
            </section>
          ) : null}

          {isAuthenticated ? (
            <section className="ob-location-sheet__section" aria-label="Saved addresses">
              <Text variant="subtitle">Saved addresses</Text>
              {uiStatus === 'loading' && saved.length === 0 ? (
                <Skeleton height={48} />
              ) : null}
              {filteredSaved.length === 0 ? (
                <EmptyState title="No saved addresses" description="Add home, work, or other addresses." />
              ) : (
                filteredSaved.map((addr) => (
                  <Button
                    key={addr.id}
                    variant="ghost"
                    fullWidth
                    className="ob-location-sheet__row"
                    onClick={() => void selectSavedAddress(addr.id)}
                  >
                    <Text variant="bodySm" style={{ fontWeight: 700 }}>
                      {addr.customLabel ?? addr.label}
                      {addr.isDefault ? ' · Default' : ''}
                    </Text>
                    <Text variant="caption">{addr.address.formattedAddress ?? addr.address.street}</Text>
                  </Button>
                ))
              )}
              <Button variant="secondary" fullWidth onClick={() => setShowAddressForm(true)}>
                Add new address
              </Button>
            </section>
          ) : (
            <Card className="ob-location-sheet__guest">
              <Text variant="bodySm">Sign in to save addresses for faster checkout.</Text>
              <Link to="/auth">
                <Button variant="secondary" fullWidth>
                  Sign in
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </BottomSheet>

      <AddressFormSheet
        key={showAddressForm ? `address-${active?.coordinates.lat ?? 'new'}` : 'closed'}
        open={showAddressForm}
        onClose={() => setShowAddressForm(false)}
      />
    </>
  );
}
