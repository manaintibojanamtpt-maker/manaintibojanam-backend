import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { Shield, CheckCircle2, AlertCircle, Zap, Star, Crown } from 'lucide-react';
import { getDb } from '../../lib/firebase-db';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import FounderBetaTrustBanner from '../../components/FounderBetaTrustBanner';

const OwnerSubscription = () => {
  const { tenantInfo } = useTenant();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!tenantInfo) return null;

  const isEmailVerified = currentUser?.emailVerified || tenantInfo.kyc?.emailVerificationStatus === 'verified';
  const isMerchantAgreementAccepted = !!tenantInfo.legal?.merchantDeclarationAcceptedAt;
  const isKycCompleted = tenantInfo.kyc?.verificationLevel !== undefined && tenantInfo.kyc.verificationLevel >= 0;
  const hasBusinessAddress = !!tenantInfo.location?.lat;
  const hasMobileNumber = !!tenantInfo.kyc?.mobileNumber;

  const canActivate = isEmailVerified && isMerchantAgreementAccepted && isKycCompleted && hasBusinessAddress && hasMobileNumber;

  const handleActivateTrial = async (plan: 'growth' | 'pro' | 'enterprise') => {
    if (!canActivate || !tenantInfo.slug) {
      toast.error('Please complete all requirements before activating.');
      return;
    }

    // Check if trial was already used
    if (tenantInfo.subscription?.trialUsed) {
      toast.error('You have already used your Premium Evaluation Program trial.');
      return;
    }

    setLoading(true);
    try {
      const db = getDb();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3); // 3 days trial

      await updateDoc(doc(db, 'tenants', tenantInfo.slug), {
        'subscription.planId': plan,
        'subscription.status': 'trialing',
        'subscription.trialActivatedAt': new Date().toISOString(),
        'subscription.trialExpiresAt': expiresAt.toISOString(),
        'subscription.trialUsed': true,
        'subscription.trialType': plan
      });

      toast.success(`${plan.toUpperCase()} Trial activated successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate trial.');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    { id: 'growth', name: 'Growth', icon: <Zap className="text-blue-500" />, desc: 'For growing kitchens' },
    { id: 'pro', name: 'Pro', icon: <Star className="text-orange-500" />, desc: 'Advanced analytics & intelligence' },
    { id: 'enterprise', name: 'Enterprise', icon: <Crown className="text-purple-500" />, desc: 'Full AI capabilities' }
  ];

  const currentPlan = tenantInfo.subscription?.planId || 'starter';
  const trialExpiresAt = tenantInfo.subscription?.trialExpiresAt ? new Date(tenantInfo.subscription.trialExpiresAt) : null;
  const isTrialActive = trialExpiresAt && trialExpiresAt.getTime() > Date.now();

  return (
    <div className="space-y-6 text-white max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Subscription & Plans</h1>
        <p className="text-white/50 text-sm mt-1 mb-6">Manage your BhojanOS plan and entitlements.</p>
        <FounderBetaTrustBanner />
      </div>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-4">Current Plan: <span className="uppercase text-orange-500">{currentPlan}</span></h2>
        
        {isTrialActive && (
          <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl mb-6">
            <p className="text-orange-400 font-bold text-sm">Trial Active until {trialExpiresAt.toLocaleDateString()}</p>
          </div>
        )}

        <h3 className="font-bold mb-4">Premium Evaluation Program (3-Day Trial)</h3>
        
        {!canActivate && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl mb-6">
            <h4 className="text-rose-400 font-bold text-sm mb-2 flex items-center gap-2">
              <AlertCircle size={16} /> Activation Requirements
            </h4>
            <ul className="space-y-1 text-xs">
              <li className="flex items-center gap-2">
                {isEmailVerified ? <CheckCircle2 size={14} className="text-green-500"/> : <div className="w-3.5 h-3.5 rounded-full border border-white/20"/>} Email Verified
              </li>
              <li className="flex items-center gap-2">
                {isMerchantAgreementAccepted ? <CheckCircle2 size={14} className="text-green-500"/> : <div className="w-3.5 h-3.5 rounded-full border border-white/20"/>} Merchant Agreement Accepted
              </li>
              <li className="flex items-center gap-2">
                {isKycCompleted ? <CheckCircle2 size={14} className="text-green-500"/> : <div className="w-3.5 h-3.5 rounded-full border border-white/20"/>} KYC Completed
              </li>
              <li className="flex items-center gap-2">
                {hasBusinessAddress ? <CheckCircle2 size={14} className="text-green-500"/> : <div className="w-3.5 h-3.5 rounded-full border border-white/20"/>} Business Address Provided
              </li>
              <li className="flex items-center gap-2">
                {hasMobileNumber ? <CheckCircle2 size={14} className="text-green-500"/> : <div className="w-3.5 h-3.5 rounded-full border border-white/20"/>} Mobile Number Provided
              </li>
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.id} className="border border-white/10 rounded-xl p-4 bg-black/40 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                {p.icon}
              </div>
              <h4 className="font-bold text-lg">{p.name}</h4>
              <p className="text-xs text-white/40 mb-4">{p.desc}</p>
              
              <button
                onClick={() => handleActivateTrial(p.id as any)}
                disabled={!canActivate || tenantInfo.subscription?.trialUsed || loading}
                className="mt-auto w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 text-sm font-bold transition-colors"
              >
                {tenantInfo.subscription?.trialUsed ? 'Trial Used' : 'Activate 3-Day Trial'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OwnerSubscription;
