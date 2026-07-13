import { Clock3, LocateFixed } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import BottomSheet from '@bhojan/storefront-design-system/layout/BottomSheet';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { Skeleton } from '@bhojan/storefront-design-system/primitives/Skeleton';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { EmptyStateView } from '@/shared/ui/EmptyStateView';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useActiveLocation, useRecentLocationsList, useSavedAddressesList } from '../hooks/useActiveLocation';
import { useLocationActions } from '../hooks/useLocationActions';
import { useLocationUiState } from '../hooks/useActiveLocation';
import { useLocationSessionStore } from '../store/locationSessionStore';
import { AddressFormSheet } from './AddressFormSheet';

export function LocationSelectorSheet() {
  const open = useLocationSessionStore((s) => s.selectorOpen);
  const { closeSelector, requestCurrentLocation, selectSavedAddress, selectRecentLocation, openWizard } = useLocationActions();
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
      <BottomSheet isOpen={open} onClose={closeSelector} title="Deliver to" panelClassName="bg-[#120e0c] text-white">
        <div className="flex flex-col gap-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search saved addresses"
            aria-label="Search addresses"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#FF7A00]/50"
          />

          <SoftButton
            type="button"
            fullWidth
            disabled={uiStatus === 'loading'}
            onClick={() => {
              void requestCurrentLocation();
            }}
          >
            <LocateFixed className="h-4 w-4" aria-hidden />
            {uiStatus === 'loading' ? 'Detecting…' : 'Use current location'}
          </SoftButton>

          {uiError ? (
            <div role="alert">
              <GlassCard hoverEffect={false} className="!rounded-2xl !p-4">
              <p className="text-sm text-white/80">{uiError.message}</p>
              {uiError.retryable ? (
                <SoftButton type="button" tone="ghost" size="compact" className="mt-3" onClick={() => void requestCurrentLocation()}>
                  Retry
                </SoftButton>
              ) : null}
            </GlassCard>
            </div>
          ) : null}

          {active?.serviceability?.message ? (
            <p className="text-xs text-white/60">{active.serviceability.message}</p>
          ) : null}

          {recent.length > 0 ? (
            <section className="flex flex-col gap-2" aria-label="Recent locations">
              <p className="text-sm font-bold text-white">Recent</p>
              {recent.map((entry) => (
                <SoftButton
                  key={entry.id}
                  type="button"
                  tone="ghost"
                  fullWidth
                  className="!justify-start"
                  onClick={() => void selectRecentLocation(entry.id)}
                >
                  <Clock3 className="h-4 w-4" aria-hidden />
                  {entry.displayLabel}
                </SoftButton>
              ))}
            </section>
          ) : null}

          {isAuthenticated ? (
            <section className="flex flex-col gap-2" aria-label="Saved addresses">
              <p className="text-sm font-bold text-white">Saved addresses</p>
              {uiStatus === 'loading' && saved.length === 0 ? (
                <Skeleton className="h-12 w-full rounded-2xl" />
              ) : null}
              {filteredSaved.length === 0 ? (
                <EmptyStateView title="No saved addresses" description="Add home, work, or other addresses." />
              ) : (
                filteredSaved.map((addr) => (
                  <SoftButton
                    key={addr.id}
                    type="button"
                    tone="ghost"
                    fullWidth
                    className="!h-auto !flex-col !items-start !gap-1 !py-3"
                    onClick={() => void selectSavedAddress(addr.id)}
                  >
                    <span className="text-sm font-bold text-white">
                      {addr.customLabel ?? addr.label}
                      {addr.isDefault ? ' · Default' : ''}
                    </span>
                    <span className="text-xs text-white/60">{addr.address.formattedAddress ?? addr.address.street}</span>
                  </SoftButton>
                ))
              )}
              <SoftButton
                type="button"
                tone="secondary"
                fullWidth
                onClick={() => {
                  closeSelector();
                  openWizard();
                }}
              >
                Add new address
              </SoftButton>
            </section>
          ) : (
            <GlassCard hoverEffect={false} className="!rounded-2xl !p-4">
              <p className="text-sm text-white/80">Sign in to save addresses for faster checkout.</p>
              <Link to="/auth" className="mt-3 block">
                <SoftButton type="button" tone="secondary" fullWidth>
                  Sign in
                </SoftButton>
              </Link>
            </GlassCard>
          )}
        </div>
      </BottomSheet>

      <AddressFormSheet
        open={showAddressForm}
        onClose={() => setShowAddressForm(false)}
      />
    </>
  );
}
