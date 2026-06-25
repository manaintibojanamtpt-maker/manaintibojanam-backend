import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { useNavigate } from 'react-router-dom';
import { getDb } from '../../lib/firebase-db';
import { logIncident } from '../../lib/monitoring';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Store, MapPin, Truck, CreditCard, Menu as MenuIcon, CheckCircle, ArrowRight, ArrowLeft, LogOut } from 'lucide-react';
import { m } from 'framer-motion';

const STEPS = [
  { id: 1, title: 'Account', icon: Store },
  { id: 2, title: 'Kitchen Details', icon: Store },
  { id: 3, title: 'Location', icon: MapPin },
  { id: 4, title: 'Delivery Configuration', icon: Truck },
  { id: 5, title: 'Payment Configuration', icon: CreditCard },
  { id: 6, title: 'Menu', icon: MenuIcon },
  { id: 7, title: 'Publish', icon: CheckCircle },
];

const OnboardingWizard: React.FC = () => {
  const { currentUser } = useAuth();
  const { tenantInfo, loading } = useTenant();
  const navigate = useNavigate();
  const db = getDb();

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenantInfo?.onboardingStatus) {
      if (tenantInfo.onboardingStatus.isComplete || tenantInfo.onboardingStatus.migrated) {
        navigate('/owner/dashboard');
      } else {
        setCurrentStep(tenantInfo.onboardingStatus.currentStep || 1);
      }
    }
  }, [tenantInfo, navigate]);

  if (loading || !tenantInfo) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const saveProgress = async (step: number, isComplete: boolean = false) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'tenants', tenantInfo.slug), {
        'onboardingStatus.currentStep': step,
        'onboardingStatus.isComplete': isComplete,
        ...(isComplete && { 'onboardingStatus.completedAt': serverTimestamp() })
      });
      
      logIncident('onboarding_events', {
        action: isComplete ? 'wizard_completed' : 'step_saved',
        step: isComplete ? 'finish' : step,
        tenantId: tenantInfo.id,
        timestamp: new Date().toISOString()
      });
      
      setCurrentStep(step);
    } catch (error) {
      console.error('Failed to save progress:', error);
      toast.error('Failed to save progress');
      logIncident('onboarding_events', {
        action: 'step_save_failed',
        step,
        tenantId: tenantInfo?.id,
        error: error?.toString()
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length) {
      await saveProgress(currentStep + 1);
    } else {
      await saveProgress(currentStep, true);
      toast.success('Onboarding complete!');
      
      // Auto publish the store
      await updateDoc(doc(db, 'tenants', tenantInfo.slug), {
        storeStatus: 'active'
      });
      
      navigate('/owner/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      saveProgress(currentStep - 1);
    }
  };

  const handleExit = () => {
    logIncident('onboarding_events', {
      action: 'wizard_abandoned',
      step: currentStep,
      tenantId: tenantInfo?.id,
      timestamp: new Date().toISOString()
    });
    navigate('/owner/dashboard');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Confirm Account Details</h2>
            <p className="text-gray-400">Please confirm your basic account details.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input type="email" value={tenantInfo.kyc?.email || ''} readOnly className="w-full bg-dark-bg/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500" />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Kitchen Details</h2>
            <p className="text-gray-400">Tell us about your kitchen.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Kitchen Name</label>
                <input type="text" defaultValue={tenantInfo.name} className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500" />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Location Setup</h2>
            <p className="text-gray-400">Where are you cooking?</p>
             <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                <input type="text" placeholder="Enter your kitchen address" className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500" />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Delivery Configuration</h2>
            <p className="text-gray-400">How far do you deliver?</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Free Delivery Radius (km)</label>
                <input type="number" defaultValue={2} className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500" />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Payment Configuration</h2>
            <p className="text-gray-400">How do you want to get paid?</p>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 border border-white/10 rounded-xl bg-white/[0.02]">
                <input type="checkbox" className="w-5 h-5 rounded border-white/20 bg-dark-bg text-orange-500 focus:ring-orange-500" />
                <span className="text-white font-medium">Enable Cash on Delivery (COD)</span>
              </label>
              <label className="flex items-center space-x-3 p-4 border border-white/10 rounded-xl bg-white/[0.02]">
                <input type="checkbox" className="w-5 h-5 rounded border-white/20 bg-dark-bg text-orange-500 focus:ring-orange-500" />
                <span className="text-white font-medium">Enable Razorpay</span>
              </label>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Menu Setup</h2>
            <p className="text-gray-400">Add your first few items.</p>
            <div className="p-8 border border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center text-center">
              <MenuIcon className="w-12 h-12 text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Import a Template Menu</h3>
              <p className="text-gray-400 mb-4">Start quickly with a pre-built menu template.</p>
              <button className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors font-medium">
                Use Cloud Kitchen Template
              </button>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Ready to Publish</h2>
            <p className="text-gray-400">You're all set! Click finish to make your store live.</p>
            <div className="p-6 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
              <h3 className="text-lg font-medium text-orange-400 mb-2">Almost Live!</h3>
              <p className="text-gray-300">Your store will be available at <strong>{tenantInfo.slug}.bhojanos.com</strong></p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 h-16 bg-brand-bg/80 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center space-x-2">
          <Store className="w-6 h-6 text-orange-500" />
          <span className="text-white font-bold text-lg hidden sm:block">BhojanOS Setup</span>
        </div>
        <button 
          onClick={handleExit}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
        >
          <span>Exit & Continue Later</span>
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <main className="pt-24 pb-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex gap-12">
        {/* Sidebar Progress */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-32 space-y-8">
            {STEPS.map((step, index) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              
              return (
                <div key={step.id} className="relative">
                  {index !== STEPS.length - 1 && (
                    <div className={`absolute top-8 left-4 w-0.5 h-12 -ml-px ${isCompleted ? 'bg-orange-500' : 'bg-white/10'}`} />
                  )}
                  <div className={`flex items-center space-x-4 ${isCurrent ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      isCurrent ? 'border-orange-500 bg-orange-500/20 text-orange-500' :
                      isCompleted ? 'border-orange-500 bg-orange-500 text-white' :
                      'border-white/10 bg-dark-bg'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : step.id}
                    </div>
                    <span className="font-medium">{step.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 max-w-xl">
          {/* Mobile Progress Bar */}
          <div className="lg:hidden mb-8">
            <div className="flex justify-between text-sm font-medium text-gray-400 mb-2">
              <span>Step {currentStep} of {STEPS.length}</span>
              <span>{Math.round((currentStep / STEPS.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all duration-300"
                style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          <m.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl"
          >
            {renderStepContent()}
            
            <div className="mt-12 flex items-center justify-between pt-8 border-t border-white/10">
              <button
                onClick={handleBack}
                disabled={currentStep === 1 || saving}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              
              <button
                onClick={handleNext}
                disabled={saving}
                className="flex items-center space-x-2 px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
              >
                <span>{saving ? 'Saving...' : currentStep === STEPS.length ? 'Finish & Publish' : 'Continue'}</span>
                {!saving && <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </m.div>
        </div>
      </main>
    </div>
  );
};

export default OnboardingWizard;
