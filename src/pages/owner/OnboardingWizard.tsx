import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getDb } from '../../lib/firebase-db';
import { logIncident } from '../../lib/monitoring';
import { doc, updateDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Store, CheckCircle, ArrowRight, ArrowLeft, LogOut, Loader2, Menu as MenuIcon, ExternalLink } from 'lucide-react';
import { m } from 'framer-motion';
import { seedCloudKitchenTemplate } from '../../config/cloudKitchenMenu';
import { onboardingPlanMessaging, PLAN_TRIALS } from '../../config/pricing';
import { activateGrowthOnboardingTrial } from '../../lib/planStatus';
import PlanClarityNotice from '../../components/owner/PlanClarityNotice';
import { STORE_SETUP_STEPS, getSetupStepByWizardStep } from '../../config/storeSetupSteps';
import SetupStepInstructions from '../../components/owner/SetupStepInstructions';
import { computeStoreSetupProgress, needsStoreSetup } from '../../lib/storeSetupProgress';
import SoftButton from '../../components/ui/SoftButton';
import { requestOwnerWelcomeEmail } from '../../lib/ownerWelcomeEmail';
import { ownerApiRequest } from '../../lib/ownerProvisioning';
import { EnvironmentConfig } from '../../config/environment';

const WIZARD_STEPS = STORE_SETUP_STEPS.filter((s) => s.wizardStep != null).map((s) => ({
  id: s.wizardStep!,
  title: s.shortTitle,
  icon: s.icon,
}));

const OnboardingWizard: React.FC = () => {
  const { tenantInfo, loading } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const db = getDb();

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [seedingMenu, setSeedingMenu] = useState(false);
  const [menuSeeded, setMenuSeeded] = useState(false);
  const [menuCount, setMenuCount] = useState(0);

  const [kitchenName, setKitchenName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [freeRadius, setFreeRadius] = useState(2);
  const [maxRadius, setMaxRadius] = useState(5);
  const [codEnabled, setCodEnabled] = useState(true);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);

  useEffect(() => {
    if (!tenantInfo?.id || !tenantInfo.onboardingStatus?.migrated) return;
    if (!needsStoreSetup(tenantInfo, menuCount)) return;

    void updateDoc(doc(db, 'tenants', tenantInfo.id), {
      'onboardingStatus.migrated': false,
      'onboardingStatus.isComplete': false,
    }).catch((err) => console.warn('Failed to reset stale migrated onboarding flag', err));
  }, [tenantInfo, menuCount]);

  useEffect(() => {
    if (!tenantInfo?.id) return;
    const menuQuery = query(collection(getDb(), 'menu'), where('tenantId', '==', tenantInfo.id));
    const unsub = onSnapshot(menuQuery, (snap) => {
      setMenuCount(snap.size);
      if (snap.size >= 3) setMenuSeeded(true);
    });
    return () => unsub();
  }, [tenantInfo?.id]);

  useEffect(() => {
    if (!tenantInfo) return;

    setKitchenName(tenantInfo.name || '');
    setAddress(tenantInfo.location?.address || '');
    setCity(tenantInfo.location?.city || '');
    setStateName(tenantInfo.location?.state || '');
    setPincode(tenantInfo.location?.pincode || '');
    setFreeRadius(tenantInfo.deliveryConfig?.freeRadius ?? 2);
    setMaxRadius(tenantInfo.deliveryConfig?.maxRadius ?? 5);
    setCodEnabled(tenantInfo.paymentConfig?.providers?.cod?.enabled !== false);
    setRazorpayEnabled(tenantInfo.paymentConfig?.providers?.razorpay?.enabled === true);

    const stepParam = Number(searchParams.get('step'));
    const validParam = stepParam >= 1 && stepParam <= WIZARD_STEPS.length ? stepParam : null;
    const progress = computeStoreSetupProgress(tenantInfo, menuCount);
    const resumeStep = progress.wizardStep;

    if (tenantInfo.onboardingStatus?.isComplete) {
      navigate('/owner/dashboard');
      return;
    }

    setCurrentStep(validParam ?? resumeStep);
  }, [tenantInfo, navigate, searchParams, menuCount]);

  if (loading || !tenantInfo) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const stepMeta = getSetupStepByWizardStep(currentStep);
  const setupProgress = computeStoreSetupProgress(tenantInfo, menuCount);

  const saveStepData = async (step: number): Promise<Record<string, unknown>> => {
    const payload: Record<string, unknown> = {};

    if (step === 1) {
      payload.kyc = {
        ...(tenantInfo.kyc || {}),
        email: tenantInfo.kyc?.email || tenantInfo.contactEmail || '',
        ownerName: tenantInfo.kyc?.ownerName || kitchenName || tenantInfo.name || '',
      };
    }

    if (step === 2) {
      if (!kitchenName.trim()) throw new Error('Kitchen name is required');
      payload.name = kitchenName.trim();
    }

    if (step === 3) {
      if (!address.trim() || !city.trim()) throw new Error('Address and city are required');
      payload.location = {
        address: address.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
        lat: tenantInfo.location?.lat || 0,
        lng: tenantInfo.location?.lng || 0,
      };
    }

    if (step === 4) {
      payload.deliveryConfig = {
        enabled: true,
        freeRadius: Number(freeRadius) || 2,
        paidRadius: Number(maxRadius) || 5,
        maxRadius: Number(maxRadius) || 5,
        baseFee: 0,
        perKmCharge: 0,
        prepTime: tenantInfo.deliveryConfig?.prepTime || 20,
        feesConfigured: false,
      };
    }

    if (step === 5) {
      if (!codEnabled && !razorpayEnabled) {
        throw new Error('Enable at least one payment method');
      }
      payload.paymentConfig = {
        defaultProvider: codEnabled ? 'cod' : 'razorpay',
        providers: {
          cod: { enabled: codEnabled },
          razorpay: { enabled: razorpayEnabled },
        },
      };
    }

    return payload;
  };

  const persistStep = async (targetStep: number, isComplete: boolean = false) => {
    const payload = await saveStepData(currentStep);
    const nextStep = isComplete ? currentStep : targetStep;

    try {
      await ownerApiRequest('POST', '/api/owner/onboarding/step', {
        tenantId: tenantInfo.id,
        step: currentStep,
        payload,
        nextStep,
        isComplete,
      });
    } catch (apiError) {
      console.warn('Onboarding API save failed, falling back to client Firestore', apiError);
      const tenantRef = doc(db, 'tenants', tenantInfo.id);
      if (Object.keys(payload).length > 0) {
        await updateDoc(tenantRef, payload);
      }
      await updateDoc(tenantRef, {
        'onboardingStatus.currentStep': nextStep,
        'onboardingStatus.isComplete': isComplete,
        ...(isComplete && { 'onboardingStatus.completedAt': serverTimestamp(), 'onboardingStatus.migrated': false }),
      });
    }
  };

  const saveProgress = async (step: number, isComplete: boolean = false) => {
    setSaving(true);
    try {
      await persistStep(step, isComplete);

      logIncident('onboarding_events', {
        action: isComplete ? 'wizard_completed' : 'step_saved',
        step: isComplete ? 'finish' : step,
        tenantId: tenantInfo.id,
        timestamp: new Date().toISOString(),
      });

      setCurrentStep(isComplete ? currentStep : step);
    } catch (error: any) {
      console.error('Failed to save progress:', error);
      toast.error(error.message || 'Failed to save progress');
      logIncident('onboarding_events', {
        action: 'step_save_failed',
        step,
        tenantId: tenantInfo?.id,
        error: error?.toString(),
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    try {
      if (currentStep === 6 && menuCount < 3) {
        toast.error('Add at least 3 menu items before continuing. Import the template or open Menu Builder.');
        return;
      }

      if (currentStep < WIZARD_STEPS.length) {
        await saveProgress(currentStep + 1);
        navigate(`/owner/setup?step=${currentStep + 1}`, { replace: true });
      } else {
        await saveProgress(currentStep, true);
        try {
          await activateGrowthOnboardingTrial(tenantInfo.id);
        } catch (trialError) {
          console.warn('Growth trial activation fallback skipped:', trialError);
        }
        void requestOwnerWelcomeEmail(tenantInfo.slug);
        toast.success(`Store is live! Your ${PLAN_TRIALS.growthOnboardingDays}-day Growth trial has started.`);
        navigate('/owner/dashboard', { replace: true });
      }
    } catch {
      // toast already shown
    }
  };

  const handleBack = async () => {
    if (currentStep > 1) {
      const prev = currentStep - 1;
      try {
        await saveProgress(prev);
        navigate(`/owner/setup?step=${prev}`, { replace: true });
      } catch {
        // toast already shown
      }
    }
  };

  const handleExit = () => {
    logIncident('onboarding_events', {
      action: 'wizard_abandoned',
      step: currentStep,
      tenantId: tenantInfo?.id,
      timestamp: new Date().toISOString(),
    });
    navigate('/owner/dashboard');
  };

  const handleSeedTemplate = async () => {
    setSeedingMenu(true);
    try {
      const count = await seedCloudKitchenTemplate(tenantInfo.id);
      setMenuSeeded(true);
      toast.success(`Added ${count} items from Cloud Kitchen template`);
      if (menuCount + count >= 3 && currentStep === 6) {
        toast.success('Menu ready — tap Save & continue to go to the final step.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to import template menu');
    } finally {
      setSeedingMenu(false);
    }
  };

  const renderStepContent = () => {
    const meta = stepMeta;
    if (!meta) return null;

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2">Step 1 of 7</p>
              <h2 className="text-2xl font-bold text-white">{meta.title}</h2>
              <p className="text-gray-400 mt-1">{meta.description}</p>
            </div>
            <SetupStepInstructions step={meta} />
            <PlanClarityNotice variant="wizard" />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input type="email" value={tenantInfo.kyc?.email || ''} readOnly className="w-full bg-dark-bg/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2">Step 2 of 7</p>
              <h2 className="text-2xl font-bold text-white">{meta.title}</h2>
              <p className="text-gray-400 mt-1">{meta.description}</p>
            </div>
            <SetupStepInstructions step={meta} />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Kitchen Name</label>
              <input type="text" value={kitchenName} onChange={(e) => setKitchenName(e.target.value)} placeholder="e.g. Spice Route Kitchen" className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500" />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2">Step 3 of 7</p>
              <h2 className="text-2xl font-bold text-white">{meta.title}</h2>
              <p className="text-gray-400 mt-1">{meta.description}</p>
            </div>
            <SetupStepInstructions step={meta} />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Street Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter your kitchen address" className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Pincode</label>
                  <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">State</label>
                <input type="text" value={stateName} onChange={(e) => setStateName(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500" />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2">Step 4 of 7</p>
              <h2 className="text-2xl font-bold text-white">{meta.title}</h2>
              <p className="text-gray-400 mt-1">{meta.description}</p>
            </div>
            <SetupStepInstructions step={meta} />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Free Delivery Radius (km)</label>
                <input type="number" min={0} step={0.5} value={freeRadius} onChange={(e) => setFreeRadius(Number(e.target.value))} className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Maximum Delivery Radius (km)</label>
                <input type="number" min={1} step={0.5} value={maxRadius} onChange={(e) => setMaxRadius(Number(e.target.value))} className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500" />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2">Step 5 of 7</p>
              <h2 className="text-2xl font-bold text-white">{meta.title}</h2>
              <p className="text-gray-400 mt-1">{meta.description}</p>
            </div>
            <SetupStepInstructions step={meta} />
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 border border-white/10 rounded-xl bg-white/[0.02] cursor-pointer">
                <input type="checkbox" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-dark-bg text-orange-500 focus:ring-orange-500" />
                <span className="text-white font-medium">Enable Cash on Delivery (COD)</span>
              </label>
              <label className="flex items-center space-x-3 p-4 border border-white/10 rounded-xl bg-white/[0.02] cursor-pointer">
                <input type="checkbox" checked={razorpayEnabled} onChange={(e) => setRazorpayEnabled(e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-dark-bg text-orange-500 focus:ring-orange-500" />
                <div>
                  <span className="text-white font-medium block">Enable Online Payments (Razorpay)</span>
                  <span className="text-gray-500 text-sm">UPI, cards & wallets — complete KYC to go live</span>
                </div>
              </label>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2">Step 6 of 7</p>
              <h2 className="text-2xl font-bold text-white">{meta.title}</h2>
              <p className="text-gray-400 mt-1">{meta.description}</p>
            </div>
            <SetupStepInstructions step={meta} />
            <div className={`p-4 rounded-xl border ${menuCount >= 3 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.02] border-white/10'}`}>
              <p className={`text-sm font-bold ${menuCount >= 3 ? 'text-emerald-400' : 'text-white/70'}`}>
                {menuCount >= 3 ? `${menuCount} menu items ready` : `${menuCount}/3 items added — need at least 3`}
              </p>
            </div>
            <div className="p-8 border border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center text-center">
              <MenuIcon className="w-12 h-12 text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Import a Template Menu</h3>
              <p className="text-gray-400 mb-4">Start quickly with a pre-built South Indian cloud kitchen menu.</p>
              {menuSeeded || menuCount >= 3 ? (
                <p className="text-emerald-400 font-medium mb-4">Menu ready! You can edit items in Menu Builder.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleSeedTemplate}
                  disabled={seedingMenu}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors font-medium disabled:opacity-50 flex items-center gap-2 mb-4"
                >
                  {seedingMenu && <Loader2 className="w-4 h-4 animate-spin" />}
                  Use Cloud Kitchen Template
                </button>
              )}
              <Link
                to="/owner/menu"
                className="inline-flex items-center gap-2 text-sm font-bold text-orange-400 hover:text-orange-300"
              >
                Open Menu Builder <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2">Step 7 of 7 — Final step</p>
              <h2 className="text-2xl font-bold text-white">{onboardingPlanMessaging.publishTitle}</h2>
              <p className="text-gray-400 mt-1">{meta.description}</p>
            </div>
            <SetupStepInstructions step={meta} />
            <PlanClarityNotice variant="publish" />
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-white/40">Setup checklist</p>
              {setupProgress.steps
                .filter((s) => s.required && s.id !== 'go-live')
                .map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    {s.complete ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-orange-500/50 shrink-0" />
                    )}
                    <span className={s.complete ? 'text-emerald-200' : 'text-orange-200'}>{s.title}</span>
                  </div>
                ))}
            </div>
            <div className="p-6 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
              <h3 className="text-lg font-medium text-orange-400 mb-2">Your store URL</h3>
              <p className="text-gray-300 break-all">
                Customers will order at{' '}
                <strong>{EnvironmentConfig.getStorefrontUrl(tenantInfo.slug || tenantInfo.id)}</strong>
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="fixed top-0 inset-x-0 h-16 bg-brand-bg/80 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center space-x-2">
          <Store className="w-6 h-6 text-orange-500" />
          <span className="text-white font-bold text-lg hidden sm:block">BhojanOS Store Setup</span>
        </div>
        <button onClick={handleExit} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
          <span>Save & exit to dashboard</span>
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <main className="pt-24 pb-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex gap-12">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-32 space-y-8">
            {WIZARD_STEPS.map((step, index) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const StepIcon = step.icon;
              return (
                <div key={step.id} className="relative">
                  {index !== WIZARD_STEPS.length - 1 && (
                    <div className={`absolute top-8 left-4 w-0.5 h-12 -ml-px ${isCompleted ? 'bg-orange-500' : 'bg-white/10'}`} />
                  )}
                  <div className={`flex items-center space-x-4 ${isCurrent ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      isCurrent ? 'border-orange-500 bg-orange-500/20 text-orange-500' :
                      isCompleted ? 'border-orange-500 bg-orange-500 text-white' :
                      'border-white/10 bg-dark-bg'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                    </div>
                    <span className="font-medium">{step.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 max-w-xl">
          <div className="lg:hidden mb-8">
            <div className="flex justify-between text-sm font-medium text-gray-400 mb-2">
              <span>Step {currentStep} of {WIZARD_STEPS.length}</span>
              <span>{Math.round((currentStep / WIZARD_STEPS.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all duration-300" style={{ width: `${(currentStep / WIZARD_STEPS.length) * 100}%` }} />
            </div>
          </div>

          <m.div key={currentStep} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl">
            {renderStepContent()}

            <div className="mt-12 flex items-center justify-between pt-8 border-t border-white/10">
              <SoftButton
                type="button"
                tone="ghost"
                size="compact"
                disabled={currentStep === 1 || saving}
                onClick={handleBack}
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </SoftButton>
              <SoftButton type="button" tone="primary" disabled={saving} onClick={handleNext}>
                <span>{saving ? 'Saving...' : currentStep === WIZARD_STEPS.length ? 'Publish & start trial' : 'Save & continue'}</span>
                {!saving && <ArrowRight className="w-5 h-5" />}
              </SoftButton>
            </div>
          </m.div>
        </div>
      </main>
    </div>
  );
};

export default OnboardingWizard;
