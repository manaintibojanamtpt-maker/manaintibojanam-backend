import { ChevronDown, MapPin } from 'lucide-react';
import { Skeleton } from '@bhojan/storefront-design-system/primitives/Skeleton';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { useActiveLocation, useLocationUiState } from '../hooks/useActiveLocation';
import { useLocationActions } from '../hooks/useLocationActions';
import { useLocationSessionStore } from '../store/locationSessionStore';

const PLACEHOLDER = 'Set delivery location';

interface LocationChipProps {
  readonly className?: string;
  readonly variant?: 'hero' | 'compact';
}

export function LocationChip({ className = '', variant = 'hero' }: LocationChipProps) {
  const active = useActiveLocation();
  const { uiStatus, uiError } = useLocationUiState();
  const { openSelector, requestCurrentLocation } = useLocationActions();
  const selectorOpen = useLocationSessionStore((s) => s.selectorOpen);

  const label =
    uiStatus === 'loading'
      ? 'Detecting location…'
      : active?.displayLabel ?? PLACEHOLDER;

  const handleClick = () => {
    if (uiStatus === 'error' && uiError?.retryable) {
      void requestCurrentLocation();
      return;
    }
    openSelector();
  };

  return (
    <SoftButton
      type="button"
      tone="ghost"
      fullWidth={variant !== 'compact'}
      className={`!justify-start gap-2 ${variant === 'compact' ? 'w-full max-w-full !px-2 !py-1.5' : ''} ${className}`.trim()}
      aria-label={active ? `Delivery location: ${label}` : 'Set delivery location'}
      aria-expanded={selectorOpen}
      onClick={handleClick}
    >
      <MapPin className="h-4 w-4 shrink-0 text-[#FF7A00]" aria-hidden />
      {uiStatus === 'loading' ? (
        <Skeleton className="h-4 w-3/5" />
      ) : (
        <span className="truncate text-sm text-white/80">
          {uiError && uiStatus === 'error' ? uiError.message : label}
        </span>
      )}
      <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-white/50" aria-hidden />
    </SoftButton>
  );
}
