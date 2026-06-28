import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, X, Store, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { onboardingPlanMessaging, PLAN_TRIALS } from '../../config/pricing';
import {
  activateGrowthOnboardingTrial,
  freeStorefrontBannerDismissKey,
} from '../../lib/planStatus';

interface FreeStorefrontBannerProps {
  tenantSlug: string;
  tenantDocId: string;
  storeAlreadyLive?: boolean;
  onboarding?: {
    isComplete?: boolean;
    currentStep?: number;
    migrated?: boolean;
  };
  showWizardProgress?: boolean;
  onTrialActivated?: () => void;
}

export const FreeStorefrontBanner: React.FC<FreeStorefrontBannerProps> = ({
  tenantSlug,
  tenantDocId,
  storeAlreadyLive = false,
  onboarding,
  showWizardProgress = false,
  onTrialActivated,
}) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [activating, setActivating] = useState(false);

  const onboardingIncomplete =
    showWizardProgress &&
    onboarding &&
    !onboarding.isComplete &&
    !onboarding.migrated;

  const onboardingComplete =
    !!onboarding?.isComplete || !!onboarding?.migrated || storeAlreadyLive;

  const currentStep = onboarding?.currentStep || 1;

  useEffect(() => {
    if (!tenantSlug) return;
    try {
      setDismissed(sessionStorage.getItem(freeStorefrontBannerDismissKey(tenantSlug)) === '1');
    } catch {
      setDismissed(false);
    }
  }, [tenantSlug]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(freeStorefrontBannerDismissKey(tenantSlug), '1');
    } catch {
      // ignore
    }
  };

  const startGrowthTrial = async () => {
    if (!tenantDocId || activating) return;
    setActivating(true);
    try {
      await activateGrowthOnboardingTrial(tenantDocId);
      toast.success(`Your ${PLAN_TRIALS.growthOnboardingDays}-day Growth trial is active. You can keep accepting orders.`);
      handleDismiss();
      onTrialActivated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not start Growth trial.';
      toast.error(message);
    } finally {
      setActivating(false);
    }
  };

  const handlePrimary = async () => {
    if (onboardingIncomplete) {
      navigate('/owner/setup');
      return;
    }
    if (onboardingComplete || storeAlreadyLive) {
      await startGrowthTrial();
      return;
    }
    if (showWizardProgress) {
      navigate('/owner/setup');
      return;
    }
    navigate('/owner/subscription');
  };

  if (dismissed) return null;

  const primaryLabel = activating
    ? 'Starting trial…'
    : onboardingIncomplete
      ? `Continue setup (step ${currentStep} of 7)`
      : storeAlreadyLive || onboardingComplete
        ? 'Start Growth trial'
        : showWizardProgress
          ? 'Publish & start trial'
          : 'Start Growth trial';

  const title = storeAlreadyLive || onboardingComplete
    ? 'Start your Growth trial'
    : 'Free storefront — not live for orders yet';

  const intro = storeAlreadyLive || onboardingComplete
    ? 'Your storefront is already live. Start the 14-day Growth trial to keep accepting customer orders — free, no card required.'
    : onboardingPlanMessaging.wizardIntro;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#FF7A00]/30 bg-gradient-to-r from-[#FF7A00]/15 via-[#FF7A00]/8 to-transparent p-5 sm:p-6">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 rounded-lg p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        aria-label="Dismiss banner"
      >
        <X size={16} />
      </button>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 pr-8">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF7A00]/20 border border-[#FF7A00]/30">
              <Store className="h-4 w-4 text-[#ffb347]" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">{title}</h2>
          </div>

          <p className="text-sm text-white/75 leading-relaxed max-w-2xl">{intro}</p>

          <ul className="text-xs sm:text-sm text-white/55 space-y-1.5 max-w-2xl">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Direct Storefront is free forever — build menu, brand, and settings at no cost.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ffb347] mt-0.5">→</span>
              <span>
                Live customer orders need Growth.{' '}
                <strong className="text-[#ffb347]">{PLAN_TRIALS.growthOnboardingDays}-day free trial</strong> — no card required.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/35 mt-0.5">·</span>
              <span>Try Pro or Growth later from Payments &amp; plans ({PLAN_TRIALS.paidUpgradeDays}-day trial).</span>
            </li>
          </ul>

          {onboardingIncomplete && (
            <p className="text-xs font-semibold text-orange-300/90">
              Setup progress: step {currentStep} of 7 — finish to publish and start your Growth trial.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handlePrimary}
            disabled={activating}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap px-5 py-3 rounded-xl font-bold text-sm text-white bg-[#FF7A00] hover:bg-[#E56D00] transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {activating ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
            {primaryLabel}
            {!activating && <ArrowRight size={16} />}
          </button>
          <button
            type="button"
            onClick={() => navigate('/owner/subscription')}
            className="inline-flex items-center justify-center whitespace-nowrap px-5 py-3 rounded-xl font-semibold text-sm text-white/80 border border-white/15 hover:bg-white/5 transition-colors"
          >
            View plans &amp; pricing
          </button>
        </div>
      </div>
    </div>
  );
};

export default FreeStorefrontBanner;
