import type { TenantInfo } from '../context/TenantContext';
import {
  STORE_SETUP_STEPS,
  STORE_SETUP_TOTAL_REQUIRED,
  StoreSetupStepDefinition,
  StoreSetupStepId,
} from '../config/storeSetupSteps';
import { isStoreLiveForOrders } from './planStatus';

export interface StoreSetupStepStatus extends StoreSetupStepDefinition {
  complete: boolean;
  isCurrent: boolean;
}

export interface StoreSetupProgress {
  steps: StoreSetupStepStatus[];
  completedCount: number;
  requiredCompletedCount: number;
  totalRequired: number;
  percentComplete: number;
  nextStep: StoreSetupStepStatus | null;
  isComplete: boolean;
  needsSetup: boolean;
  wizardStep: number;
}

type TenantSnapshot = Pick<
  TenantInfo,
  'name' | 'location' | 'deliveryConfig' | 'paymentConfig' | 'kyc' | 'onboardingStatus' | 'storeStatus' | 'sandboxMode'
> | null | undefined;

function isStepComplete(id: StoreSetupStepId, tenant: TenantSnapshot, menuCount: number): boolean {
  if (!tenant) return false;

  switch (id) {
    case 'account':
      return !!(tenant.kyc?.email || tenant.kyc?.ownerName);
    case 'kitchen':
      return !!(tenant.name && tenant.name.trim().length > 1);
    case 'location':
      return !!(tenant.location?.address?.trim() && tenant.location?.city?.trim());
    case 'delivery':
      return (
        tenant.deliveryConfig?.enabled !== false &&
        (tenant.deliveryConfig?.maxRadius ?? 0) > 0
      );
    case 'payments': {
      const providers = tenant.paymentConfig?.providers;
      if (!providers) return false;
      return Object.values(providers).some((p: { enabled?: boolean }) => p?.enabled === true);
    }
    case 'menu':
      return menuCount >= 3;
    case 'mobile':
      return !!(tenant.kyc?.mobileNumber && String(tenant.kyc.mobileNumber).replace(/\D/g, '').length >= 10);
    case 'go-live':
      return tenant.onboardingStatus?.isComplete === true || isStoreLiveForOrders(tenant);
    default:
      return false;
  }
}

export function computeStoreSetupProgress(
  tenant: TenantSnapshot,
  menuCount: number,
): StoreSetupProgress {
  const completionMap = new Map<StoreSetupStepId, boolean>();
  for (const step of STORE_SETUP_STEPS) {
    completionMap.set(step.id, isStepComplete(step.id, tenant, menuCount));
  }

  const firstIncomplete = STORE_SETUP_STEPS.find((s) => !completionMap.get(s.id)) ?? null;
  const wizardStep =
    firstIncomplete?.wizardStep ??
    tenant?.onboardingStatus?.currentStep ??
    (tenant?.onboardingStatus?.isComplete ? STORE_SETUP_STEPS.length : 1);

  const steps: StoreSetupStepStatus[] = STORE_SETUP_STEPS.map((step) => ({
    ...step,
    complete: completionMap.get(step.id) === true,
    isCurrent: firstIncomplete?.id === step.id,
  }));

  const completedCount = steps.filter((s) => s.complete).length;
  const requiredCompletedCount = steps.filter((s) => s.required && s.complete).length;
  const percentComplete = Math.round((requiredCompletedCount / STORE_SETUP_TOTAL_REQUIRED) * 100);
  const allRequiredDone = requiredCompletedCount >= STORE_SETUP_TOTAL_REQUIRED;
  const onboardingComplete = tenant?.onboardingStatus?.isComplete === true;
  const isComplete =
    onboardingComplete ||
    (allRequiredDone && completionMap.get('go-live') === true);

  const needsSetup = !isComplete;

  const nextStep = firstIncomplete
    ? { ...firstIncomplete, complete: false, isCurrent: true }
    : null;

  return {
    steps,
    completedCount,
    requiredCompletedCount,
    totalRequired: STORE_SETUP_TOTAL_REQUIRED,
    percentComplete,
    nextStep,
    isComplete,
    needsSetup,
    wizardStep: Math.min(Math.max(wizardStep, 1), 7),
  };
}

export function needsStoreSetup(tenant: TenantSnapshot, menuCount = 0): boolean {
  if (tenant?.onboardingStatus?.isComplete === true) return false;
  if (isStoreLiveForOrders(tenant)) return false;
  if (tenant?.subscription?.status === 'trialing' && tenant?.storeStatus === 'active') return false;
  return computeStoreSetupProgress(tenant, menuCount).needsSetup;
}

export function getSetupContinuePath(progress: StoreSetupProgress): string {
  const next = progress.nextStep;
  if (!next) return '/owner/dashboard';
  if (next.wizardStep) return `/owner/setup?step=${next.wizardStep}`;
  return next.path;
}
