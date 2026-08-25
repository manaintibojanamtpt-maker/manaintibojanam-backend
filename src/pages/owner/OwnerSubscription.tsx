import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import FounderBetaTrustBanner from '../../components/FounderBetaTrustBanner';
import { PricingPlanCard, PricingComparisonTable } from '../../components/pricing/PricingPlanCard';
import {
  getOwnerPlanActionLabel,
  getOwnerTrialNote,
  activateGrowthOnboardingTrial,
  ownerPlanRequiresPayment,
  isOwnerPlanActionable,
} from '../../lib/planStatus';
import { upgradeOwnerSubscriptionPlan } from '../../lib/ownerSubscriptionApi';
import { runOwnerSubscriptionPayment } from '../../lib/ownerSubscriptionPayment';
import {
  FREE_PLAN,
  PAID_PLANS,
  PaidPlanId,
  PLAN_TRIALS,
  PRICING_ZERO_COMMISSION_NOTE,
  formatPlanDisplayName,
  getPlanById,
  pricingPageCopy,
} from '../../config/pricing';
import { useSubscriptionSync } from '../../hooks/useSubscriptionSync';

const OwnerSubscription = () => {
  const { tenantInfo, loading: tenantLoading, refreshTenant } = useTenant();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<PaidPlanId | null>(null);
  const copy = pricingPageCopy.owner;

  const tenantDocId = tenantInfo?.id || tenantInfo?.slug;

  // Use subscription sync hook for real-time state
  const subscription = useSubscriptionSync(tenantDocId, {
    enabled: !!tenantDocId && !tenantLoading,
    refetchInterval: 30000,
    staleTime: 10000,
    onSuccess: () => {
      // Optionally refresh tenant info when subscription updates
    },
  });

  if (tenantLoading && !tenantInfo) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-10 text-center text-white/60">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-red-500" />
        Loading plans &amp; billing…
      </div>
    );
  }

  if (!tenantInfo) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center max-w-lg mx-auto">
        <p className="text-lg font-bold text-white">Could not load your kitchen profile</p>
        <p className="mt-2 text-sm text-white/60">Check your connection and try again.</p>
        <button
          type="button"
          onClick={() => void refreshTenant()}
          className="mt-6 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const isEmailVerified = currentUser?.emailVerified || tenantInfo.kyc?.emailVerificationStatus === 'verified';
  const isMerchantAgreementAccepted = !!tenantInfo.legal?.merchantDeclarationAcceptedAt;
  const isKycCompleted = tenantInfo.kyc?.verificationLevel !== undefined && tenantInfo.kyc.verificationLevel >= 0;
  const hasBusinessAddress = !!tenantInfo.location?.lat;
  const hasMobileNumber = !!tenantInfo.kyc?.mobileNumber;
  const canActivate = isEmailVerified && isMerchantAgreementAccepted && isKycCompleted && hasBusinessAddress && hasMobileNumber;

  // Use synced subscription state
  const effectivePlanId = subscription.effectivePlanId || getEffectivePlanId(tenantInfo);
  const trialExpiresAt = subscription.trialExpiresAt;
  const isTrialActive = subscription.isTrialActive;
  const growthOnboardingTrial = subscription.trialType === 'growth_onboarding';
  const trialDaysLeft = subscription.daysUntilNextBilling;
  const currentPlan = getPlanById(effectivePlanId) || FREE_PLAN;

  // Computed from synced state
  const isInGracePeriod = subscription.isInGracePeriod;
  const isCanceledAtPeriodEnd = subscription.isCanceledAtPeriodEnd;
  const isPastDue = subscription.isPastDue;
  const failedPaymentAttempts = subscription.failedPaymentAttempts;
  const nextBillingAttemptAt = subscription.nextBillingAttemptAt;
  const isBillable = subscription.isBillable;
  const daysUntilNextBillingValue = subscription.daysUntilNextBilling;

  const getOwnerPlanActionLabelWithEnterprise = (plan: (typeof PAID_PLANS)[number]) => {
    if (effectivePlanId === 'enterprise') {
      if (plan.id === 'enterprise') return 'Current plan';
      return copy.contactSales;
    }
    if (plan.id === 'enterprise' && !canActivate) return copy.contactSales;
    return getOwnerPlanActionLabel(plan.id, plan.name, plan.ownerCta, tenantInfo);
  };

  const handleUpgrade = async (planId: PaidPlanId) => {
    if (planId === effectivePlanId) return;

    if (planId === 'enterprise' && !canActivate) {
      toast.error('Complete verification to upgrade, or contact us for Enterprise onboarding.');
      navigate('/contact');
      return;
    }

    const plan = getPlanById(planId);
    if (!plan) return;

    const confirmed = window.confirm(copy.upgradeConfirm(plan.name));
    if (!confirmed) return;

    if (!canActivate || !tenantInfo.slug) {
      toast.error('Complete verification requirements before upgrading.');
      return;
    }

    setLoadingPlan(planId);
    const tenantDocId = tenantInfo.id || tenantInfo.slug;
    try {
      // Check if payment is required
      const requiresPayment = subscription.requiresPaymentForUpgrade?.(effectivePlanId, planId, subscription.trialUsed) ?? ownerPlanRequiresPayment(tenantInfo, planId);

      if (requiresPayment) {
        await runOwnerSubscriptionPayment({
          tenantId: tenantDocId,
          planId,
          customerName: currentUser?.displayName || tenantInfo.name,
          customerEmail: currentUser?.email || tenantInfo.contact?.email,
          customerPhone: tenantInfo.kyc?.mobileNumber || tenantInfo.contact?.phone,
        });
        await refreshTenant();
        toast.success(`${plan.name} activated. ${copy.upgradeSuccess}`);
        return;
      }

      if (
        planId === 'growth' &&
        effectivePlanId === 'starter' &&
        !subscription.trialUsed
      ) {
        await activateGrowthOnboardingTrial(tenantDocId);
        await refreshTenant();
        toast.success(`${PLAN_TRIALS.growthOnboardingDays}-day ${plan.name} trial started. ${copy.upgradeSuccess}`);
        return;
      }

      // Use the sync hook's upgradePlan for optimistic updates
      await subscription.upgradePlan(planId);
      await refreshTenant();
      if (!subscription.trialUsed && effectivePlanId === 'starter') {
        toast.success(`${PLAN_TRIALS.paidUpgradeDays}-day ${plan.name} trial started. ${copy.upgradeSuccess}`);
      } else {
        toast.success(copy.upgradeSuccess);
      }
    } catch (err: unknown) {
      const apiErr = err as Error & { status?: number };
      if (apiErr.status === 402 || ownerPlanRequiresPayment(tenantInfo, planId)) {
        try {
          await runOwnerSubscriptionPayment({
            tenantId: tenantDocId,
            planId,
            customerName: currentUser?.displayName || tenantInfo.name,
            customerEmail: currentUser?.email || tenantInfo.contact?.email,
            customerPhone: tenantInfo.kyc?.mobileNumber || tenantInfo.contact?.phone,
          });
          await refreshTenant();
          toast.success(`${plan.name} activated. ${copy.upgradeSuccess}`);
          return;
        } catch (paymentErr: unknown) {
          const message = paymentErr instanceof Error ? paymentErr.message : 'Payment failed.';
          toast.error(message);
          return;
        }
      }
      const message = err instanceof Error ? err.message : 'Failed to update plan.';
      toast.error(message);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-8 text-white max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{copy.title}</h1>
        <p className="text-white/50 text-sm sm:text-base mt-2 max-w-2xl">{copy.subtitle}</p>
        <p className="text-sm font-semibold text-emerald-400/90 mt-3 flex items-center gap-2">
          <Shield size={16} /> {PRICING_ZERO_COMMISSION_NOTE}
        </p>
        <div className="mt-4">
          <FounderBetaTrustBanner />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#111] to-[#0A0A0A] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{copy.currentPlanLabel}</p>
          <h2 className="text-xl font-black text-white mt-1">{formatPlanDisplayName(effectivePlanId)}</h2>
          {isTrialActive && trialExpiresAt && (
            <p className="text-sm text-orange-400 mt-1">
              {subscription.trialType === 'growth_onboarding'
                ? `${PLAN_TRIALS.growthOnboardingDays}-day Growth trial · ${subscription.daysUntilNextBilling ?? '—'} days left · ends ${trialExpiresAt.toLocaleDateString('en-IN')}`
                : `Trial active until ${trialExpiresAt.toLocaleDateString('en-IN')}`}
            </p>
          )}
          {subscription.isInGracePeriod && effectivePlanId === 'growth' && (
            <p className="text-sm text-amber-400 mt-1 font-medium">
              Your Growth trial has expired. You are in a 3-day grace period ({subscription.gracePeriodDaysRemaining ?? '—'} days left). Pay ₹999/mo below to avoid suspension.
            </p>
          )}
          {!subscription.isInGracePeriod && subscription.isGrowthTrialExpired && effectivePlanId === 'growth' && (
            <p className="text-sm text-rose-400 mt-1 font-medium">
              Your Growth trial has expired. Pay ₹999/mo below to keep accepting live orders.
            </p>
          )}
          {subscription.isInGracePeriod && effectivePlanId === 'pro' && (
            <p className="text-sm text-amber-400 mt-1 font-medium">
              Your Pro trial has expired. You are in a 3-day grace period ({subscription.gracePeriodDaysRemaining ?? '—'} days left). Pay ₹2,999/mo below to avoid downgrade.
            </p>
          )}
          {!subscription.isInGracePeriod && subscription.isProTrialExpired && effectivePlanId === 'pro' && (
            <p className="text-sm text-rose-400 mt-1 font-medium">
              Your Pro trial has expired. Pay ₹2,999/mo below to keep Pro features active.
            </p>
          )}
          {effectivePlanId === 'starter' && (
            <p className="text-sm text-white/45 mt-1">
              {currentPlan.priceLabel} · {currentPlan.period}
            </p>
          )}
        </div>
        {effectivePlanId !== 'starter' && (
          <div className="text-right">
            <p className="text-3xl font-black text-white">{currentPlan.priceLabel}</p>
            <p className="text-xs text-white/40">{currentPlan.period}</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-1">{copy.compareTitle}</h3>
        <p className="text-sm text-white/45 mb-6">{copy.compareHelper}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          <PricingPlanCard plan={FREE_PLAN} variant="owner" isCurrent={effectivePlanId === 'starter'} />
          {PAID_PLANS.map((plan) => (
            <PricingPlanCard
              key={plan.id}
              plan={{
                ...plan,
                trialNote: getOwnerTrialNote(plan.id, tenantInfo, plan.trialNote),
              }}
              variant="owner"
              isCurrent={effectivePlanId === plan.id}
              loading={loadingPlan === plan.id}
              disabled={
                effectivePlanId === 'enterprise' ||
                (!canActivate && plan.id !== 'enterprise') ||
                !isOwnerPlanActionable(tenantInfo, plan.id)
              }
              onSelect={() => {
                if (plan.id === effectivePlanId) return;
                if (effectivePlanId === 'enterprise' || (plan.id === 'enterprise' && !canActivate)) {
                  navigate('/contact');
                  return;
                }
                handleUpgrade(plan.id);
              }}
              actionLabel={getOwnerPlanActionLabelWithEnterprise(plan)}
            />
          ))}
        </div>
      </div>

      {!canActivate && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl">
          <h4 className="text-rose-400 font-bold text-sm mb-3 flex items-center gap-2">
            <AlertCircle size={16} /> Complete these steps to upgrade
          </h4>
          <ul className="grid sm:grid-cols-2 gap-2 text-xs text-white/70">
            <li className="flex items-center gap-2">
              {isEmailVerified ? <CheckCircle2 size={14} className="text-green-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-white/20" />}
              Email verified
            </li>
            <li className="flex items-center gap-2">
              {isMerchantAgreementAccepted ? <CheckCircle2 size={14} className="text-green-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-white/20" />}
              Merchant agreement accepted
            </li>
            <li className="flex items-center gap-2">
              {isKycCompleted ? <CheckCircle2 size={14} className="text-green-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-white/20" />}
              Basic KYC completed
            </li>
            <li className="flex items-center gap-2">
              {hasBusinessAddress ? <CheckCircle2 size={14} className="text-green-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-white/20" />}
              Business address added
            </li>
            <li className="flex items-center gap-2">
              {hasMobileNumber ? <CheckCircle2 size={14} className="text-green-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-white/20" />}
              Mobile number on file
            </li>
          </ul>
        </div>
      )}

      {/* Subscription Management Section */}
      {effectivePlanId !== 'starter' && (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#111] to-[#0A0A0A] p-5 sm:p-6">
          <h3 className="text-lg font-bold text-white mb-4">Subscription Management</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Status</p>
              <p className="text-lg font-bold text-white">{subscription.statusLabel}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Billing Cycle</p>
              <p className="text-lg font-bold text-white">
                {subscription.currentPeriodEnd
                  ? `Ends ${subscription.currentPeriodEnd.toLocaleDateString('en-IN')}`
                  : 'Monthly'}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Next Charge</p>
              <p className="text-lg font-bold text-white">
                {daysUntilNextBillingValue !== null
                  ? `${daysUntilNextBillingValue} day(s)`
                  : '—'}
              </p>
            </div>
          </div>

          {isCanceledAtPeriodEnd && (
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-amber-400 text-sm font-medium mb-2">
                Your subscription is set to cancel at the end of the current billing period.
              </p>
              <p className="text-white/70 text-sm mb-3">
                You'll continue to have access until {subscription.currentPeriodEnd
                  ? subscription.currentPeriodEnd.toLocaleDateString('en-IN')
                  : 'the period ends'}.
              </p>
              <button
                onClick={async () => {
                  const confirmed = window.confirm('Resume your subscription? You will continue to be billed monthly.');
                  if (!confirmed) return;
                  try {
                    await subscription.resumeSubscription();
                    await refreshTenant();
                    toast.success('Subscription resumed successfully');
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : 'Failed to resume subscription');
                  }
                }}
                disabled={subscription.isResuming}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {subscription.isResuming ? 'Resuming...' : 'Resume Subscription'}
              </button>
            </div>
          )}

          {!isCanceledAtPeriodEnd && isBillable && (
            <div className="mt-4">
              <button
                onClick={async () => {
                  const confirmed = window.confirm(
                    'Cancel your subscription? You will keep access until the end of the current billing period, then your plan will downgrade to Free Storefront.'
                  );
                  if (!confirmed) return;
                  try {
                    await subscription.cancelSubscription();
                    await refreshTenant();
                    toast.success('Subscription will cancel at period end');
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription');
                  }
                }}
                disabled={subscription.isCanceling}
                className="rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 px-5 py-2.5 text-sm font-medium hover:bg-rose-600/30 transition-colors w-full disabled:opacity-50"
              >
                {subscription.isCanceling ? 'Canceling...' : 'Cancel Subscription (at period end)'}
              </button>
            </div>
          )}

          {failedPaymentAttempts > 0 && (
            <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <p className="text-rose-400 text-sm font-medium mb-2">
                Payment issue detected — {failedPaymentAttempts} failed attempt(s)
              </p>
              <p className="text-white/70 text-sm mb-3">
                Next retry: {nextBillingAttemptAt
                  ? new Date(nextBillingAttemptAt).toLocaleString('en-IN')
                  : 'Soon'}
              </p>
              <button
                onClick={async () => {
                  try {
                    await subscription.retryBilling();
                    await refreshTenant();
                    toast.success('Billing retry triggered');
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : 'Failed to retry billing');
                  }
                }}
                disabled={subscription.isRetrying}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                {subscription.isRetrying ? 'Retrying...' : 'Retry Payment Now'}
              </button>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-white mb-2">{copy.trialTitle}</h3>
        <p className="text-sm text-white/45 mb-6">{copy.trialHelper}</p>
        <PricingComparisonTable />
      </div>
    </div>
  );
};

export default OwnerSubscription;
