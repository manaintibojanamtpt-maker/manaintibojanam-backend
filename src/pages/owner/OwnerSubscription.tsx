import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { getDb } from '../../lib/firebase-db';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import FounderBetaTrustBanner from '../../components/FounderBetaTrustBanner';
import { PricingPlanCard, PricingComparisonTable } from '../../components/pricing/PricingPlanCard';
import {
  FREE_PLAN,
  PAID_PLANS,
  PaidPlanId,
  PRICING_ZERO_COMMISSION_NOTE,
  formatPlanDisplayName,
  getPlanById,
  pricingPageCopy,
} from '../../config/pricing';

const OwnerSubscription = () => {
  const { tenantInfo } = useTenant();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<PaidPlanId | null>(null);
  const copy = pricingPageCopy.owner;

  if (!tenantInfo) return null;

  const isEmailVerified = currentUser?.emailVerified || tenantInfo.kyc?.emailVerificationStatus === 'verified';
  const isMerchantAgreementAccepted = !!tenantInfo.legal?.merchantDeclarationAcceptedAt;
  const isKycCompleted = tenantInfo.kyc?.verificationLevel !== undefined && tenantInfo.kyc.verificationLevel >= 0;
  const hasBusinessAddress = !!tenantInfo.location?.lat;
  const hasMobileNumber = !!tenantInfo.kyc?.mobileNumber;
  const canActivate = isEmailVerified && isMerchantAgreementAccepted && isKycCompleted && hasBusinessAddress && hasMobileNumber;

  const currentPlanId = tenantInfo.subscription?.planId || 'starter';
  const trialExpiresAt = tenantInfo.subscription?.trialExpiresAt
    ? new Date(tenantInfo.subscription.trialExpiresAt)
    : null;
  const isTrialActive = trialExpiresAt && trialExpiresAt.getTime() > Date.now();
  const currentPlan = getPlanById(currentPlanId) || FREE_PLAN;

  const handleUpgrade = async (planId: PaidPlanId) => {
    if (planId === currentPlanId) return;

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

    if (tenantInfo.subscription?.trialUsed && currentPlanId === 'starter') {
      // Allow trial once; after that still update plan for demo — production would use payment gateway
    }

    setLoadingPlan(planId);
    try {
      const db = getDb();
      const tenantRef = doc(db, 'tenants', tenantInfo.slug);

      if (!tenantInfo.subscription?.trialUsed && currentPlanId === 'starter') {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 3);
        await updateDoc(tenantRef, {
          'subscription.planId': planId,
          'subscription.status': 'trialing',
          'subscription.trialActivatedAt': new Date().toISOString(),
          'subscription.trialExpiresAt': expiresAt.toISOString(),
          'subscription.trialUsed': true,
          'subscription.trialType': planId,
        });
        toast.success(`3-day ${plan.name} trial started. ${copy.upgradeSuccess}`);
      } else {
        await updateDoc(tenantRef, {
          'subscription.planId': planId,
          'subscription.status': 'active',
        });
        toast.success(copy.upgradeSuccess);
      }
    } catch (err: unknown) {
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
          <h2 className="text-xl font-black text-white mt-1">{formatPlanDisplayName(currentPlanId)}</h2>
          {isTrialActive && trialExpiresAt && (
            <p className="text-sm text-orange-400 mt-1">
              Trial active until {trialExpiresAt.toLocaleDateString('en-IN')}
            </p>
          )}
          {currentPlanId === 'starter' && (
            <p className="text-sm text-white/45 mt-1">
              {currentPlan.priceLabel} · {currentPlan.period}
            </p>
          )}
        </div>
        {currentPlanId !== 'starter' && (
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
          <PricingPlanCard plan={FREE_PLAN} variant="owner" isCurrent={currentPlanId === 'starter'} />
          {PAID_PLANS.map((plan) => (
            <PricingPlanCard
              key={plan.id}
              plan={plan}
              variant="owner"
              isCurrent={currentPlanId === plan.id}
              loading={loadingPlan === plan.id}
              disabled={!canActivate && plan.id !== 'enterprise'}
              onSelect={() => {
                if (plan.id === 'enterprise' && !canActivate) {
                  navigate('/contact');
                  return;
                }
                handleUpgrade(plan.id);
              }}
              actionLabel={
                plan.id === 'enterprise' && !canActivate
                  ? copy.contactSales
                  : currentPlanId === plan.id
                    ? 'Current plan'
                    : tenantInfo.subscription?.trialUsed || currentPlanId !== 'starter'
                      ? plan.ownerCta
                      : `Try ${plan.name} — 3 days free`
              }
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

      <div>
        <h3 className="text-lg font-bold text-white mb-2">{copy.trialTitle}</h3>
        <p className="text-sm text-white/45 mb-6">{copy.trialHelper}</p>
        <PricingComparisonTable />
      </div>
    </div>
  );
};

export default OwnerSubscription;
