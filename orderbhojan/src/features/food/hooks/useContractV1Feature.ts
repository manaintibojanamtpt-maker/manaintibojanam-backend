import { isFeatureEnabled, loadFeatureFlags } from '@/featureFlags/flags';

export function isFirestoreSyncEnabled(): boolean {
  return isFeatureEnabled(loadFeatureFlags(), 'FF_OB_FIRESTORE');
}

export function isContractMenuPathEnabled(): boolean {
  const flags = loadFeatureFlags();
  return (
    isFeatureEnabled(flags, 'FF_OB_CONTRACT_V1') || isFeatureEnabled(flags, 'FF_OB_FIRESTORE')
  );
}
