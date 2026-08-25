import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { ownerApiRequest } from './ownerProvisioning';
import { getPlanById, PaidPlanId } from '../config/pricing';
import {
  getEffectivePlanId,
  getSubscriptionDisplayStatus,
  getSubscriptionStatusLabel,
  isSubscriptionBillable,
  isSubscriptionPeriodEnded,
  isSubscriptionCanceledAtPeriodEnd,
  daysUntilNextBilling,
  getFailedPaymentAttempts,
  getNextBillingAttemptAt,
  willSubscriptionRenew,
  cancelOwnerSubscription,
  resumeOwnerSubscription,
  retryOwnerSubscriptionBilling,
  getOwnerSubscriptionStatus,
  type TenantPlanSnapshot,
} from './planStatus';

// Query Keys
export const subscriptionKeys = {
  all: ['subscription'] as const,
  tenant: (tenantId: string) => [...subscriptionKeys.all, 'tenant', tenantId] as const,
  status: (tenantId: string) => [...subscriptionKeys.tenant(tenantId), 'status'] as const,
  plans: () => [...subscriptionKeys.all, 'plans'] as const,
};

// Types
export interface SubscriptionStatusResponse {
  success: boolean;
  tenantId: string;
  planId: string;
  status: string;
  currentPeriodEnd?: string;
  trialExpiresAt?: string;
  canceledAtPeriodEnd?: boolean;
  failedPaymentAttempts?: number;
  nextBillingAttemptAt?: string;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  trialUsed?: boolean;
}

export interface UpgradePlanResponse {
  success: boolean;
  tenantId: string;
  planId: string;
  unchanged?: boolean;
  subscriptionId?: string;
  clientSecret?: string;
  requiresPayment?: boolean;
}

// Fetch subscription status
export async function fetchSubscriptionStatus(tenantId: string): Promise<SubscriptionStatusResponse> {
  return ownerApiRequest<SubscriptionStatusResponse>(
    'GET',
    `/api/owner/subscription/status?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

// Fetch all plans
export async function fetchPlans() {
  return { plans: Object.values(getPlanById('starter') ? { starter: getPlanById('starter') } : {} as any) };
}

// Hook for subscription status
export function useSubscriptionStatus(tenantId: string | null | undefined, options?: {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
}) {
  return useQuery({
    queryKey: subscriptionKeys.status(tenantId || ''),
    queryFn: () => fetchSubscriptionStatus(tenantId!),
    enabled: !!tenantId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval ?? 30000, // 30 seconds default for real-time status
    staleTime: options?.staleTime ?? 10000, // 10 seconds stale time
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook for all plans
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans(),
    queryFn: fetchPlans,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24,
  });
}

// Mutation: Upgrade plan
export function useUpgradeSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, planId }: { tenantId: string; planId: PaidPlanId }) => {
      return ownerApiRequest<UpgradePlanResponse>(
        'PUT',
        '/api/owner/subscription/plan',
        { tenantId, planId },
      );
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.status(variables.tenantId) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.tenant(variables.tenantId) });
    },
  });
}

// Mutation: Cancel subscription
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      return cancelOwnerSubscription(tenantId);
    },
    onSuccess: (_, tenantId) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.status(tenantId) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.tenant(tenantId) });
    },
  });
}

// Mutation: Resume subscription
export function useResumeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      return resumeOwnerSubscription(tenantId);
    },
    onSuccess: (_, tenantId) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.status(tenantId) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.tenant(tenantId) });
    },
  });
}

// Mutation: Retry billing
export function useRetryBilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      return retryOwnerSubscriptionBilling(tenantId);
    },
    onSuccess: (_, tenantId) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.status(tenantId) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.tenant(tenantId) });
    },
  });
}

// Mutation: Trigger subscription checkout
export function useSubscriptionCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, planId }: { tenantId: string; planId: PaidPlanId }) => {
      return ownerApiRequest<{ subscription: { id: string; status: string; client_secret?: string }; key: string; isMock?: boolean }>(
        'POST',
        '/api/owner/subscription/checkout',
        { tenantId, planId },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.status(variables.tenantId) });
    },
  });
}

// Prefetch subscription status
export function prefetchSubscriptionStatus(queryClient: ReturnType<typeof useQueryClient>, tenantId: string) {
  return queryClient.prefetchQuery({
    queryKey: subscriptionKeys.status(tenantId),
    queryFn: () => fetchSubscriptionStatus(tenantId),
    staleTime: 10000,
  });
}

// Invalidate subscription queries
export function invalidateSubscriptionQueries(queryClient: ReturnType<typeof useQueryClient>, tenantId: string) {
  queryClient.invalidateQueries({ queryKey: subscriptionKeys.tenant(tenantId) });
}

// Computed status from cached data
export function getComputedSubscriptionStatus(data: SubscriptionStatusResponse | undefined, tenantInfo?: TenantPlanSnapshot) {
  if (!data) return null;

  const effectivePlanId = data.planId;
  const isTrialActive = data.trialExpiresAt && new Date(data.trialExpiresAt) > new Date();

  return {
    effectivePlanId,
    status: data.status,
    statusLabel: getSubscriptionStatusLabel({ subscription: data } as any),
    displayStatus: getSubscriptionDisplayStatus({ subscription: data } as any),
    currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
    trialExpiresAt: data.trialExpiresAt ? new Date(data.trialExpiresAt) : null,
    isTrialActive,
    canceledAtPeriodEnd: data.canceledAtPeriodEnd ?? false,
    failedPaymentAttempts: data.failedPaymentAttempts ?? 0,
    nextBillingAttemptAt: data.nextBillingAttemptAt ? new Date(data.nextBillingAttemptAt) : null,
    daysUntilNextBilling: daysUntilNextBilling({ subscription: data } as any),
    isBillable: isBillableStatus({ subscription: data } as any),
    isPeriodEnded: isSubscriptionPeriodEnded({ subscription: data } as any),
    willRenew: willSubscriptionRenew({ subscription: data } as any),
    razorpaySubscriptionId: data.razorpaySubscriptionId,
    razorpayCustomerId: data.razorpayCustomerId,
    trialUsed: data.trialUsed,
  };
}

// Check if payment is required for upgrade
export function requiresPaymentForUpgrade(currentPlanId: string, targetPlanId: PaidPlanId, trialUsed: boolean = false): boolean {
  const planHierarchy = ['starter', 'growth', 'pro', 'enterprise'];
  const currentIndex = planHierarchy.indexOf(currentPlanId);
  const targetIndex = planHierarchy.indexOf(targetPlanId);

  if (targetIndex <= currentIndex) return false; // Downgrade or same plan

  // Upgrade from starter to growth - trial available if not used
  if (currentPlanId === 'starter' && targetPlanId === 'growth' && !trialUsed) {
    return false;
  }

  // Upgrade to any paid plan from starter - trial available if not used (3 days)
  if (currentPlanId === 'starter' && targetPlanId !== 'starter' && !trialUsed) {
    return false;
  }

  return true;
}

// Export all hooks
export const subscriptionHooks = {
  useSubscriptionStatus,
  useSubscriptionPlans,
  useUpgradeSubscriptionPlan,
  useCancelSubscription,
  useResumeSubscription,
  useRetryBilling,
  useSubscriptionCheckout,
  prefetchSubscriptionStatus,
  invalidateSubscriptionQueries,
  getComputedSubscriptionStatus,
  requiresPaymentForUpgrade,
  subscriptionKeys,
};