export const M2_MILESTONE = 'M2';

export { LocationProvider } from './ui/LocationProvider';
export { LocationChip } from './ui/LocationChip';
export { LocationSelectorSheet } from './ui/LocationSelectorSheet';
export { useLocationFeatureEnabled, useLocationGeocodeEnabled, useLocationMapEnabled } from './hooks/useLocationFeature';
export { useActiveLocation, useLocationUiState, useSavedAddressesList, useRecentLocationsList } from './hooks/useActiveLocation';
export { useLocationActions } from './hooks/useLocationActions';
export type { CustomerLocation, SavedAddress, IndiaAddress } from './domain/location.types';
