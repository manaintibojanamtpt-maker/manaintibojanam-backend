import { Button, Icon, Skeleton, Text } from '@bhojan/design-system';
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
    <Button
      variant="ghost"
      fullWidth
      className={`ob-location-chip ob-location-chip--${variant}${className ? ` ${className}` : ''}`}
      aria-label={active ? `Delivery location: ${label}` : 'Set delivery location'}
      aria-expanded={selectorOpen}
      onClick={handleClick}
    >
      <Icon size={18} label="Location">
        <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </Icon>
      {uiStatus === 'loading' ? (
        <Skeleton width="60%" height={16} />
      ) : (
        <Text variant="bodySm" className="ob-location-chip__label">
          {uiError && uiStatus === 'error' ? uiError.message : label}
        </Text>
      )}
      <Icon size={16} aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </Icon>
    </Button>
  );
}
