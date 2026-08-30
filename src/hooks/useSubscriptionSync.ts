import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { useSubscriptionStore, selectSubscriptionStatus, selectSubscriptionLoading, selectSubscriptionError, selectSubscriptionHydrated } from '../lib/subscriptionStore';
import { subscriptionKeys, useSubscriptionStatus, subscriptionHooks, fetchSubscriptionStatus } from '../lib/subscriptionQueries';
import type { SubscriptionStatusResponse } from '../lib/subscriptionQueries';
import type { TenantPlanSnapshot } from '../lib/planStatus';

/**
 * Hook that synchronizes TanStack Query with Zustand store for subscription state.
 * Provides real-time subscription data with optimistic updates and offline support.
 */
export function useSubscriptionSync(tenantId: string | null | undefined, options?: {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  syncOnMount?: boolean;
  syncOnWindowFocus?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: SubscriptionStatusResponse) => void;
}) {
  const queryClient = useQueryClient();

  // Zustand store selectors
  // NOTE: selectSubscriptionStatus returns a NEW object literal on every call.
  // With zustand v5 + React 19 (useSyncExternalStore), using it directly causes
  // an infinite re-render loop ("Maximum update depth exceeded") because the
  // snapshot is never reference-stable. Wrap it with useShallow so the returned
  // object is cached while its fields are shallow-equal.
  const storeStatus = useSubscriptionStore(useShallow(selectSubscriptionStatus));
  const storeLoading = useSubscriptionStore(selectSubscriptionLoading);
  const storeError = useSubscriptionStore(selectSubscriptionError);
  const storeHydrated = useSubscriptionStore(selectSubscriptionHydrated);

  // Store actions
  const setFromServer = useSubscriptionStore((state) => state.setFromServer);
  const setFromTenantInfo = useSubscriptionStore((state) => state.setFromTenantInfo);
  const setLoading = useSubscriptionStore((state) => state.setLoading);
  const setError = useSubscriptionStore((state) => state.setError);
  const setHydrated = useSubscriptionStore((state) => state.setHydrated);
  const optimisticUpdate = useSubscriptionStore((state) => state.optimisticUpdate);
  const rollbackOptimisticUpdate = useSubscriptionStore((state) => state.rollbackOptimisticUpdate);
  const clearError = useSubscriptionStore((state) => state.clearError);
  const reset = useSubscriptionStore((state) => state.reset);

  // TanStack Query
  const query = useSubscriptionStatus(tenantId, {
    enabled: options?.enabled !== false && !!tenantId,
    refetchInterval: options?.refetchInterval ?? 30000,
    staleTime: options?.staleTime ?? 10000,
  });

  // Track if we've done initial sync
  const initialSyncedRef = useRef(false);
  const tenantIdRef = useRef(tenantId);
  tenantIdRef.current = tenantId;
  // Keep latest options in a ref so effects don't re-run on every render
  // (callers pass an inline object literal which changes identity each render).
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Sync query data to Zustand store
  useEffect(() => {
    if (query.data) {
      setFromServer(query.data);
      if (optionsRef.current?.onSuccess) {
        optionsRef.current.onSuccess(query.data);
      }
    }
  }, [query.data, setFromServer]);

  // Sync query error to Zustand store
  useEffect(() => {
    if (query.error) {
      const error = query.error instanceof Error ? query.error : new Error('Unknown error');
      setError(error.message);
      if (optionsRef.current?.onError) {
        optionsRef.current.onError(error);
      }
    } else if (query.isSuccess) {
      clearError();
    }
  }, [query.error, query.isSuccess, setError, clearError]);

  // Sync loading state
  useEffect(() => {
    setLoading(query.isLoading);
  }, [query.isLoading, setLoading]);

  // Initial sync on mount or tenantId change
  useEffect(() => {
    if (!tenantId || initialSyncedRef.current) return;

    const doInitialSync = async () => {
      try {
        setLoading(true);
        // Prefetch and get cached data
        const cachedData = queryClient.getQueryData<SubscriptionStatusResponse>(subscriptionKeys.status(tenantId));
        if (cachedData) {
          setFromServer(cachedData);
        } else {
          // Fetch fresh data
          await queryClient.prefetchQuery({
            queryKey: subscriptionKeys.status(tenantId),
            queryFn: () => fetchSubscriptionStatus(tenantId!),
            staleTime: 10000,
          });
          const freshData = queryClient.getQueryData<SubscriptionStatusResponse>(subscriptionKeys.status(tenantId));
          if (freshData) {
            setFromServer(freshData);
          }
        }
        initialSyncedRef.current = true;
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to sync subscription');
      } finally {
        setLoading(false);
      }
    };

    doInitialSync();
  }, [tenantId, queryClient, setFromServer, setLoading, setError]);

  // Sync on window focus (optional)
  useEffect(() => {
    if (!options?.syncOnWindowFocus) return;

    const handleFocus = () => {
      if (tenantIdRef.current && !query.isLoading) {
        queryClient.invalidateQueries({ queryKey: subscriptionKeys.status(tenantIdRef.current) });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [queryClient, query.isLoading, options?.syncOnWindowFocus]);

  // Reset when tenantId becomes null
  useEffect(() => {
    if (!tenantId) {
      reset();
      initialSyncedRef.current = false;
    }
  }, [tenantId, reset]);

  // Hydration handling
  useEffect(() => {
    if (storeHydrated && !query.isLoading) {
      setHydrated(true);
    }
  }, [storeHydrated, query.isLoading, setHydrated]);

  // Optimistic update helpers
  const optimisticUpgrade = useCallback((newPlanId: string) => {
    optimisticUpdate({
      planId: newPlanId,
      effectivePlanId: newPlanId,
      status: 'active',
      isActive: true,
      isTrialActive: false,
      isInGracePeriod: false,
    });
  }, [optimisticUpdate]);

  const optimisticCancel = useCallback(() => {
    optimisticUpdate({
      canceledAtPeriodEnd: true,
      isCanceledAtPeriodEnd: true,
      status: 'active',
    });
  }, [optimisticUpdate]);

  const optimisticResume = useCallback(() => {
    optimisticUpdate({
      canceledAtPeriodEnd: false,
      isCanceledAtPeriodEnd: false,
    });
  }, [optimisticUpdate]);

  const optimisticRetry = useCallback(() => {
    optimisticUpdate({
      failedPaymentAttempts: 0,
      isPastDue: false,
      status: 'active',
      isActive: true,
    });
  }, [optimisticUpdate]);

  // Mutation hooks
  const upgradeMutation = subscriptionHooks.useUpgradeSubscriptionPlan();
  const cancelMutation = subscriptionHooks.useCancelSubscription();
  const resumeMutation = subscriptionHooks.useResumeSubscription();
  const retryMutation = subscriptionHooks.useRetryBilling();
  const checkoutMutation = subscriptionHooks.useSubscriptionCheckout();

  // Enhanced mutation wrappers with optimistic updates
  const upgradePlan = useCallback(async (planId: string) => {
    if (!tenantId) throw new Error('No tenant ID');
    optimisticUpgrade(planId);
    try {
      const result = await upgradeMutation.mutateAsync({ tenantId, planId: planId as any });
      // Server response will sync via query invalidation
      return result;
    } catch (error) {
      rollbackOptimisticUpdate();
      throw error;
    }
  }, [tenantId, optimisticUpgrade, upgradeMutation, rollbackOptimisticUpdate]);

  const cancelSubscription = useCallback(async () => {
    if (!tenantId) throw new Error('No tenant ID');
    optimisticCancel();
    try {
      const result = await cancelMutation.mutateAsync(tenantId);
      return result;
    } catch (error) {
      rollbackOptimisticUpdate();
      throw error;
    }
  }, [tenantId, optimisticCancel, cancelMutation, rollbackOptimisticUpdate]);

  const resumeSubscription = useCallback(async () => {
    if (!tenantId) throw new Error('No tenant ID');
    optimisticResume();
    try {
      const result = await resumeMutation.mutateAsync(tenantId);
      return result;
    } catch (error) {
      rollbackOptimisticUpdate();
      throw error;
    }
  }, [tenantId, optimisticResume, resumeMutation, rollbackOptimisticUpdate]);

  const retryBilling = useCallback(async () => {
    if (!tenantId) throw new Error('No tenant ID');
    optimisticRetry();
    try {
      const result = await retryMutation.mutateAsync(tenantId);
      return result;
    } catch (error) {
      rollbackOptimisticUpdate();
      throw error;
    }
  }, [tenantId, optimisticRetry, retryMutation, rollbackOptimisticUpdate]);

  const triggerCheckout = useCallback(async (planId: string) => {
    if (!tenantId) throw new Error('No tenant ID');
    return checkoutMutation.mutateAsync({ tenantId, planId: planId as any });
  }, [tenantId, checkoutMutation]);

  // Return combined state and actions
  return {
    // Current state (from Zustand - fast, synchronous)
    ...storeStatus,

    // Loading states
    isLoading: storeLoading || query.isLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,

    // Error state
    error: storeError || (query.error instanceof Error ? query.error.message : null),

    // Hydration
    isHydrated: storeHydrated,

    // Query state
    queryStatus: query.status,
    dataUpdatedAt: query.dataUpdatedAt,

    // Actions
    refetch: query.refetch,
    upgradePlan,
    cancelSubscription,
    resumeSubscription,
    retryBilling,
    triggerCheckout,
    refresh: query.refetch,

    // Utility functions
    requiresPaymentForUpgrade: subscriptionHooks.requiresPaymentForUpgrade,

    // Mutation states
    isUpgrading: upgradeMutation.isPending,
    isCanceling: cancelMutation.isPending,
    isResuming: resumeMutation.isPending,
    isRetrying: retryMutation.isPending,
    isCheckingOut: checkoutMutation.isPending,

    // Mutation errors
    upgradeError: upgradeMutation.error?.message ?? null,
    cancelError: cancelMutation.error?.message ?? null,
    resumeError: resumeMutation.error?.message ?? null,
    retryError: retryMutation.error?.message ?? null,
    checkoutError: checkoutMutation.error?.message ?? null,

    // Raw query for advanced use
    query,
  };
}

/**
 * Hook for reading subscription state without triggering fetches.
 * Useful for components that only need to display cached data.
 */
export function useSubscriptionState(tenantId: string | null | undefined) {
  // useShallow required here too — see note in useSubscriptionSync above.
  const storeStatus = useSubscriptionStore(useShallow(selectSubscriptionStatus));
  const storeLoading = useSubscriptionStore(selectSubscriptionLoading);
  const storeError = useSubscriptionStore(selectSubscriptionError);
  const storeHydrated = useSubscriptionStore(selectSubscriptionHydrated);

  // If tenantId changed, the store might have stale data
  // This hook just reads from store, doesn't trigger fetches
  return {
    ...storeStatus,
    isLoading: storeLoading,
    error: storeError,
    isHydrated: storeHydrated,
  };
}

/**
 * Hook for subscribing to subscription changes across components.
 * Provides a way to listen for store updates.
 */
export function useSubscriptionListener(callback: (state: ReturnType<typeof selectSubscriptionStatus>) => void) {
  useEffect(() => {
    const unsubscribe = useSubscriptionStore.subscribe(
      selectSubscriptionStatus,
      callback
    );
    return unsubscribe;
  }, [callback]);
}

/**
 * Hook to manually sync subscription state from tenant info (e.g., from TenantContext)
 */
export function useTenantInfoSync(tenantInfo: TenantPlanSnapshot | null) {
  const setFromTenantInfo = useSubscriptionStore((state) => state.setFromTenantInfo);

  useEffect(() => {
    if (tenantInfo) {
      setFromTenantInfo(tenantInfo);
    }
  }, [tenantInfo, setFromTenantInfo]);
}

export type UseSubscriptionSyncReturn = ReturnType<typeof useSubscriptionSync>;
export type UseSubscriptionStateReturn = ReturnType<typeof useSubscriptionState>;