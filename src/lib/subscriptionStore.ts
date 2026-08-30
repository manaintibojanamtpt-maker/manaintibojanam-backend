import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import type { TenantPlanSnapshot } from './planStatus';
import type { SubscriptionStatusResponse } from './subscriptionQueries';

// Subscription state types
export interface SubscriptionState {
  // Current subscription data
  tenantId: string | null;
  planId: string | null;
  status: string | null;
  currentPeriodEnd: Date | null;
  trialExpiresAt: Date | null;
  canceledAtPeriodEnd: boolean;
  failedPaymentAttempts: number;
  nextBillingAttemptAt: Date | null;
  razorpaySubscriptionId: string | null;
  razorpayCustomerId: string | null;
  trialUsed: boolean;
  trialType: 'growth_onboarding' | 'paid_upgrade' | 'none' | null;

  // Computed values
  effectivePlanId: string | null;
  isTrialActive: boolean;
  isInGracePeriod: boolean;
  isCanceledAtPeriodEnd: boolean;
  isPastDue: boolean;
  isActive: boolean;
  isGrowthTrialExpired: boolean;
  isProTrialExpired: boolean;
  gracePeriodDaysRemaining: number | null;

  // UI state
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  lastSynced: number | null;

  // Hydration state
  _hasHydrated: boolean;
}

interface SubscriptionActions {
  // Setters
  setTenantId: (tenantId: string | null) => void;
  setFromServer: (data: SubscriptionStatusResponse) => void;
  setFromTenantInfo: (tenantInfo: TenantPlanSnapshot | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHydrated: (hydrated: boolean) => void;

  // Computed getters (non-persisted)
  getEffectivePlanId: () => string;
  getStatusLabel: () => string;
  getDisplayStatus: () => string;
  getDaysUntilNextBilling: () => number | null;
  getFailedPaymentAttempts: () => number;
  getNextBillingAttemptAt: () => Date | null;
  isSubscriptionBillable: () => boolean;
  isSubscriptionPeriodEnded: () => boolean;
  willSubscriptionRenew: () => boolean;

  // Sync actions
  syncFromServer: (tenantId: string) => Promise<void>;
  optimisticUpdate: (updates: Partial<SubscriptionState>) => void;
  rollbackOptimisticUpdate: () => void;
  clearError: () => void;
  reset: () => void;
}

// Initial state
const initialState: SubscriptionState = {
  tenantId: null,
  planId: null,
  status: null,
  currentPeriodEnd: null,
  trialExpiresAt: null,
  canceledAtPeriodEnd: false,
  failedPaymentAttempts: 0,
  nextBillingAttemptAt: null,
  razorpaySubscriptionId: null,
  razorpayCustomerId: null,
  trialUsed: false,
  trialType: null,
  effectivePlanId: null,
  isTrialActive: false,
  isInGracePeriod: false,
  isCanceledAtPeriodEnd: false,
  isPastDue: false,
  isActive: false,
  isGrowthTrialExpired: false,
  isProTrialExpired: false,
  gracePeriodDaysRemaining: null,
  loading: false,
  error: null,
  lastFetched: null,
  lastSynced: null,
  _hasHydrated: false,
};

// Helper to compute derived state
function computeDerivedState(state: Partial<SubscriptionState>): Partial<SubscriptionState> {
  const now = new Date();
  const trialExpiresAt = parseDate(state.trialExpiresAt);
  const currentPeriodEnd = parseDate(state.currentPeriodEnd);
  const status = state.status || 'none';
  const planId = state.planId || 'starter';
  const trialType = state.trialType;

  const isTrialActive = trialExpiresAt && trialExpiresAt > now;
  const isInGracePeriod = trialExpiresAt && trialExpiresAt <= now &&
    new Date(trialExpiresAt.getTime() + 3 * 24 * 60 * 60 * 1000) > now;
  const isCanceledAtPeriodEnd = state.canceledAtPeriodEnd ?? false;
  const isPastDue = status === 'past_due';
  const isActive = ['active', 'trialing'].includes(status);

  // Check for expired trials
  const isGrowthTrialExpired = trialExpiresAt && trialExpiresAt <= now &&
    trialType === 'growth_onboarding' &&
    status === 'trialing';
  const isProTrialExpired = trialExpiresAt && trialExpiresAt <= now &&
    trialType === 'paid_upgrade' &&
    planId === 'pro' &&
    status === 'trialing';

  // Calculate grace period days remaining
  let gracePeriodDaysRemaining: number | null = null;
  if (isInGracePeriod && trialExpiresAt) {
    const graceEnd = new Date(trialExpiresAt.getTime() + 3 * 24 * 60 * 60 * 1000);
    const diffMs = graceEnd.getTime() - now.getTime();
    if (diffMs > 0) {
      gracePeriodDaysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } else {
      gracePeriodDaysRemaining = 0;
    }
  }

  // Determine effective plan
  let effectivePlanId = planId;
  if (isTrialActive) {
    effectivePlanId = trialType === 'growth_onboarding' ? 'growth' : planId || 'growth';
  } else if (isInGracePeriod) {
    effectivePlanId = planId || 'growth';
  }

  return {
    effectivePlanId,
    isTrialActive: !!isTrialActive,
    isInGracePeriod: !!isInGracePeriod,
    isCanceledAtPeriodEnd,
    isPastDue,
    isActive,
    isGrowthTrialExpired: !!isGrowthTrialExpired,
    isProTrialExpired: !!isProTrialExpired,
    gracePeriodDaysRemaining,
  };
}

// Helper to parse date from various formats
function parseDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (value?.seconds) {
    // Firestore Timestamp
    return new Date(value.seconds * 1000);
  }
  return null;
}

// Calculate days until next billing
function calculateDaysUntilNextBilling(currentPeriodEnd: Date | null): number | null {
  if (!currentPeriodEnd) return null;
  const now = new Date();
  const diffMs = currentPeriodEnd.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Status label
function getStatusLabel(state: SubscriptionState): string {
  if (state.isTrialActive) {
    return state.trialType === 'growth_onboarding'
      ? 'Growth Trial Active'
      : 'Trial Active';
  }
  if (state.isInGracePeriod) return 'Grace Period';
  if (state.isCanceledAtPeriodEnd) return 'Canceling at Period End';
  if (state.isPastDue) return 'Past Due';
  if (state.isActive) return 'Active';
  if (state.status === 'canceled') return 'Canceled';
  if (state.status === 'paused') return 'Paused';
  if (state.status === 'expired') return 'Expired';
  return 'Free Storefront';
}

// Display status
function getDisplayStatus(state: SubscriptionState): string {
  if (state.isTrialActive) {
    const daysLeft = state.trialExpiresAt
      ? Math.ceil((state.trialExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;
    return `${state.trialType === 'growth_onboarding' ? 'Growth' : 'Trial'} — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`;
  }
  if (state.isInGracePeriod) {
    const graceEnd = state.trialExpiresAt
      ? new Date(state.trialExpiresAt.getTime() + 3 * 24 * 60 * 60 * 1000)
      : null;
    const daysLeft = graceEnd
      ? Math.ceil((graceEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;
    return `Grace Period — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`;
  }
  if (state.isCanceledAtPeriodEnd) {
    return state.currentPeriodEnd
      ? `Active until ${state.currentPeriodEnd.toLocaleDateString('en-IN')}`
      : 'Canceling at period end';
  }
  if (state.isPastDue) {
    const attempts = state.failedPaymentAttempts;
    return `Payment Failed (${attempts}/3 attempts)`;
  }
  if (state.isActive) {
    return state.currentPeriodEnd
      ? `Renews ${state.currentPeriodEnd.toLocaleDateString('en-IN')}`
      : 'Active';
  }
  return 'Free Storefront';
}

// Check if billable
function checkBillable(state: SubscriptionState): boolean {
  return state.isActive || state.isPastDue;
}

// Check if period ended
function checkPeriodEnded(state: SubscriptionState): boolean {
  if (!state.currentPeriodEnd) return false;
  return new Date() > state.currentPeriodEnd;
}

// Check if will renew
function checkWillRenew(state: SubscriptionState): boolean {
  return state.isActive && !state.isCanceledAtPeriodEnd && !state.isPastDue;
}

// Previous state for optimistic updates
let previousState: Partial<SubscriptionState> | null = null;

export const useSubscriptionStore = create<SubscriptionState & SubscriptionActions>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Setters
        setTenantId: (tenantId) => set({ tenantId }),

        setFromServer: (data) => {
          const trialExpiresAt = parseDate(data.trialExpiresAt);
          const currentPeriodEnd = parseDate(data.currentPeriodEnd);
          const nextBillingAttemptAt = parseDate(data.nextBillingAttemptAt);

          // Determine trial type
          let trialType: SubscriptionState['trialType'] = null;
          if (trialExpiresAt && trialExpiresAt > new Date()) {
            // Check if it's a growth onboarding trial (14 days) vs paid upgrade trial (3 days)
            const createdAt = data.createdAt ? parseDate(data.createdAt) : null;
            if (createdAt) {
              const trialDuration = trialExpiresAt.getTime() - createdAt.getTime();
              trialType = trialDuration > 7 * 24 * 60 * 60 * 1000 ? 'growth_onboarding' : 'paid_upgrade';
            } else {
              trialType = 'paid_upgrade';
            }
          }

          const derived = computeDerivedState({
            planId: data.planId,
            status: data.status,
            currentPeriodEnd,
            trialExpiresAt,
            canceledAtPeriodEnd: data.canceledAtPeriodEnd,
            failedPaymentAttempts: data.failedPaymentAttempts,
            nextBillingAttemptAt,
            trialUsed: data.trialUsed,
            trialType,
          });

          set({
            tenantId: data.tenantId,
            planId: data.planId,
            status: data.status,
            currentPeriodEnd,
            trialExpiresAt,
            canceledAtPeriodEnd: data.canceledAtPeriodEnd ?? false,
            failedPaymentAttempts: data.failedPaymentAttempts ?? 0,
            nextBillingAttemptAt,
            razorpaySubscriptionId: data.razorpaySubscriptionId ?? null,
            razorpayCustomerId: data.razorpayCustomerId ?? null,
            trialUsed: data.trialUsed ?? false,
            trialType,
            lastFetched: Date.now(),
            lastSynced: Date.now(),
            error: null,
            ...derived,
          });
        },

        setFromTenantInfo: (tenantInfo) => {
          if (!tenantInfo) {
            set({ ...initialState, _hasHydrated: get()._hasHydrated });
            return;
          }

          const subscription = tenantInfo.subscription;
          if (!subscription) {
            set({
              tenantId: tenantInfo.id,
              planId: 'starter',
              status: 'none',
              effectivePlanId: 'starter',
              isActive: false,
              isTrialActive: false,
              isInGracePeriod: false,
              isCanceledAtPeriodEnd: false,
              isPastDue: false,
              trialUsed: false,
              trialType: null,
              razorpaySubscriptionId: null,
              razorpayCustomerId: null,
              currentPeriodEnd: null,
              trialExpiresAt: null,
              nextBillingAttemptAt: null,
              failedPaymentAttempts: 0,
              canceledAtPeriodEnd: false,
              lastFetched: Date.now(),
              _hasHydrated: get()._hasHydrated,
            });
            return;
          }

          const trialExpiresAt = parseDate(subscription.trialExpiresAt);
          const currentPeriodEnd = parseDate(subscription.currentPeriodEnd);
          const nextBillingAttemptAt = parseDate(subscription.nextBillingAttemptAt);
          const canceledAt = parseDate(subscription.canceledAt);

          let trialType: SubscriptionState['trialType'] = null;
          if (trialExpiresAt && trialExpiresAt > new Date()) {
            // Check if it's a growth onboarding trial
            trialType = subscription.trialType === 'growth_onboarding' ? 'growth_onboarding' : 'paid_upgrade';
          }

          const derived = computeDerivedState({
            planId: subscription.planId || 'starter',
            status: subscription.status || 'none',
            currentPeriodEnd,
            trialExpiresAt,
            canceledAtPeriodEnd: subscription.canceledAtPeriodEnd ?? false,
            failedPaymentAttempts: subscription.failedPaymentAttempts ?? 0,
            nextBillingAttemptAt,
            trialUsed: subscription.trialUsed ?? false,
            trialType,
          });

          set({
            tenantId: tenantInfo.id,
            planId: subscription.planId || 'starter',
            status: subscription.status || 'none',
            currentPeriodEnd,
            trialExpiresAt,
            canceledAtPeriodEnd: subscription.canceledAtPeriodEnd ?? false,
            failedPaymentAttempts: subscription.failedPaymentAttempts ?? 0,
            nextBillingAttemptAt,
            razorpaySubscriptionId: subscription.razorpaySubscriptionId ?? null,
            razorpayCustomerId: subscription.razorpayCustomerId ?? null,
            trialUsed: subscription.trialUsed ?? false,
            trialType,
            lastFetched: Date.now(),
            _hasHydrated: get()._hasHydrated,
            ...derived,
          });
        },

        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        setHydrated: (_hasHydrated) => set({ _hasHydrated }),

        // Computed getters
        getEffectivePlanId: () => get().effectivePlanId || 'starter',

        getStatusLabel: () => getStatusLabel(get()),

        getDisplayStatus: () => getDisplayStatus(get()),

        getDaysUntilNextBilling: () => calculateDaysUntilNextBilling(get().currentPeriodEnd),

        getFailedPaymentAttempts: () => get().failedPaymentAttempts,

        getNextBillingAttemptAt: () => get().nextBillingAttemptAt,

        isSubscriptionBillable: () => checkBillable(get()),

        isSubscriptionPeriodEnded: () => checkPeriodEnded(get()),

        willSubscriptionRenew: () => checkWillRenew(get()),

        // Sync actions
        syncFromServer: async (tenantId: string) => {
          // This will be called from the query layer
          // The store gets updated via setFromServer
          // Just mark as synced
          set({ lastSynced: Date.now() });
        },

        // Optimistic updates
        optimisticUpdate: (updates) => {
          previousState = { ...get() };
          const derived = computeDerivedState({ ...get(), ...updates });
          set({ ...updates, ...derived });
        },

        rollbackOptimisticUpdate: () => {
          if (previousState) {
            const derived = computeDerivedState(previousState);
            set({ ...previousState, ...derived });
            previousState = null;
          }
        },

        clearError: () => set({ error: null }),

        reset: () => {
          previousState = null;
          set({ ...initialState, _hasHydrated: get()._hasHydrated });
        },
      }),
      {
        name: 'bhojanos-subscription-store',
        storage: createJSONStorage(() => {
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              return localStorage;
            }
          } catch {
            // Memory storage fallback when localStorage is blocked or unavailable
          }
          const memoryStore = new Map<string, string>();
          return {
            getItem: (name: string) => memoryStore.get(name) ?? null,
            setItem: (name: string, value: string) => memoryStore.set(name, value),
            removeItem: (name: string) => memoryStore.delete(name),
          };
        }),
        partialize: (state) => ({
          tenantId: state.tenantId,
          planId: state.planId,
          status: state.status,
          currentPeriodEnd: state.currentPeriodEnd?.toISOString() ?? null,
          trialExpiresAt: state.trialExpiresAt?.toISOString() ?? null,
          canceledAtPeriodEnd: state.canceledAtPeriodEnd,
          failedPaymentAttempts: state.failedPaymentAttempts,
          nextBillingAttemptAt: state.nextBillingAttemptAt?.toISOString() ?? null,
          razorpaySubscriptionId: state.razorpaySubscriptionId,
          razorpayCustomerId: state.razorpayCustomerId,
          trialUsed: state.trialUsed,
          trialType: state.trialType,
          effectivePlanId: state.effectivePlanId,
          isTrialActive: state.isTrialActive,
          isInGracePeriod: state.isInGracePeriod,
          isCanceledAtPeriodEnd: state.isCanceledAtPeriodEnd,
          isPastDue: state.isPastDue,
          isActive: state.isActive,
          isGrowthTrialExpired: state.isGrowthTrialExpired,
          isProTrialExpired: state.isProTrialExpired,
          gracePeriodDaysRemaining: state.gracePeriodDaysRemaining,
          lastFetched: state.lastFetched,
          lastSynced: state.lastSynced,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Convert ISO strings back to Date objects
            if (state.currentPeriodEnd) state.currentPeriodEnd = new Date(state.currentPeriodEnd);
            if (state.trialExpiresAt) state.trialExpiresAt = new Date(state.trialExpiresAt);
            if (state.nextBillingAttemptAt) state.nextBillingAttemptAt = new Date(state.nextBillingAttemptAt);
            state._hasHydrated = true;
          }
        },
      }
    )
  )
);

// Selectors for common use cases
export const selectSubscriptionStatus = (state: SubscriptionState) => ({
  effectivePlanId: state.effectivePlanId,
  status: state.status,
  statusLabel: state.getStatusLabel(),
  displayStatus: state.getDisplayStatus(),
  isTrialActive: state.isTrialActive,
  isInGracePeriod: state.isInGracePeriod,
  isCanceledAtPeriodEnd: state.isCanceledAtPeriodEnd,
  isPastDue: state.isPastDue,
  isActive: state.isActive,
  isGrowthTrialExpired: state.isGrowthTrialExpired,
  isProTrialExpired: state.isProTrialExpired,
  gracePeriodDaysRemaining: state.gracePeriodDaysRemaining,
  currentPeriodEnd: state.currentPeriodEnd,
  trialExpiresAt: state.trialExpiresAt,
  daysUntilNextBilling: state.getDaysUntilNextBilling(),
  failedPaymentAttempts: state.getFailedPaymentAttempts(),
  nextBillingAttemptAt: state.getNextBillingAttemptAt(),
  razorpaySubscriptionId: state.razorpaySubscriptionId,
  razorpayCustomerId: state.razorpayCustomerId,
  trialUsed: state.trialUsed,
  trialType: state.trialType,
});

export const selectSubscriptionLoading = (state: SubscriptionState) => state.loading;
export const selectSubscriptionError = (state: SubscriptionState) => state.error;
export const selectSubscriptionHydrated = (state: SubscriptionState) => state._hasHydrated;

// Helper hook to use subscription store with selectors
export function useSubscriptionSelector<T>(selector: (state: SubscriptionState) => T): T {
  return useSubscriptionStore(selector);
}

// Export the store for direct access if needed
export default useSubscriptionStore;