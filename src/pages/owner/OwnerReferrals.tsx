import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDb } from '../../lib/firebase-db';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Tenant } from '../../types';
import { motion } from 'framer-motion';
import { Target, Gift, Users, Copy, CheckCircle2, Award, ChevronRight, TrendingUp, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const OwnerReferrals: React.FC = () => {
  const { userProfile } = useAuth();
  const tenantId = userProfile?.ownedTenantIds?.[0];
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchTenant = async () => {
      const docSnap = await getDoc(doc(getDb(), 'tenants', tenantId));
      if (docSnap.exists()) {
        const data = docSnap.data() as Tenant;
        // Auto-generate code if none exists
        if (!data.referral?.referralCode) {
          const newCode = `BHOJ-${tenantId.substring(0, 6).toUpperCase()}`;
          await updateDoc(doc(getDb(), 'tenants', tenantId), {
            'referral.referralCode': newCode,
            'referral.successfulReferrals': 0,
            'referral.referralCount': 0
          });
          data.referral = { ...data.referral, referralCode: newCode, successfulReferrals: 0, referralCount: 0 };
        }
        setTenant(data);
      }
      setLoading(false);
    };
    fetchTenant();
  }, [tenantId]);

  const copyToClipboard = () => {
    if (tenant?.referral?.referralCode) {
      navigator.clipboard.writeText(tenant.referral.referralCode);
      toast.success('Referral code copied!');
    }
  };

  const shareViaWhatsApp = () => {
    if (tenant?.referral?.referralCode) {
      const text = encodeURIComponent(`Start your own food business with BhojanOS! Use my referral code ${tenant.referral.referralCode} to get exclusive onboarding support. Sign up at ${window.location.origin}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  if (loading) return <div className="p-8 text-center text-white/50">Loading Referral Program...</div>;

  const successfulRef = tenant?.referral?.successfulReferrals || 0;
  
  const milestones = [
    { target: 1, reward: '1 Month Free Growth Plan or ₹500 Credit', achieved: successfulRef >= 1 },
    { target: 3, reward: '1 Month Free Pro Plan', achieved: successfulRef >= 3 },
    { target: 10, reward: 'Founder Ambassador Badge', achieved: successfulRef >= 10 }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-black uppercase tracking-widest border border-orange-500/20">Product Led Growth</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Gift className="text-orange-400" /> Refer & Earn
          </h1>
          <p className="text-white/50 mt-2 max-w-xl">
            Invite another kitchen to BhojanOS. Earn free subscription credits and help other food entrepreneurs grow.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Code Display */}
        <div className="md:col-span-2 bg-gradient-to-br from-orange-900/40 to-red-900/20 border border-orange-500/30 rounded-2xl p-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10">
             <Sparkles size={120} />
           </div>
           <div className="relative z-10">
             <h2 className="text-lg font-bold text-white mb-4">Your Unique Referral Code</h2>
             <div className="flex flex-col sm:flex-row gap-4">
               <div className="flex-1 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between p-4">
                 <span className="text-2xl font-black tracking-widest text-white">{tenant?.referral?.referralCode || 'GENERATING...'}</span>
                 <button onClick={copyToClipboard} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"><Copy size={20}/></button>
               </div>
               <button onClick={shareViaWhatsApp} className="px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                 Invite via WhatsApp
               </button>
             </div>
           </div>
        </div>

        {/* Stats */}
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 flex flex-col justify-center">
           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Your Impact</h3>
           <div className="flex items-end gap-2 mb-1">
             <span className="text-4xl font-black text-white">{tenant?.referral?.referralCount || 0}</span>
             <span className="text-sm text-white/40 mb-1">Invites Sent</span>
           </div>
           <div className="flex items-end gap-2 mt-4">
             <span className="text-4xl font-black text-green-400">{successfulRef}</span>
             <span className="text-sm text-green-400/60 mb-1">Paid Conversions</span>
           </div>
        </div>
      </div>

      {/* Rewards Roadmap */}
      <h2 className="text-xl font-bold text-white mb-4">Milestone Rewards</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {milestones.map((m, i) => (
          <div key={i} className={`p-6 rounded-2xl border transition-all ${m.achieved ? 'bg-orange-500/10 border-orange-500/50' : 'bg-[#0A0A0A] border-white/5 opacity-60'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-3xl font-black ${m.achieved ? 'text-orange-400' : 'text-white/20'}`}>{m.target}</span>
              {m.achieved ? <CheckCircle2 className="text-orange-400" size={24}/> : <Target className="text-white/20" size={24}/>}
            </div>
            <p className="text-sm font-bold text-white mb-1">Paid Merchants</p>
            <p className={`text-sm ${m.achieved ? 'text-orange-200' : 'text-gray-400'}`}>{m.reward}</p>
          </div>
        ))}
      </div>

      {/* Funnel Tracking */}
      <h2 className="text-xl font-bold text-white mb-4">Tracking Funnel</h2>
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6">
         <div className="flex flex-col md:flex-row justify-between relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0" />
            
            {['Invitation Sent', 'Signup', 'Approved', 'Published', 'Paid Subscriber', 'Reward Issued'].map((step, idx) => {
              // Mock active state for visual demonstration
              const isActive = idx === 0 || (idx === 1 && (tenant?.referral?.referralCount || 0) > 0) || (idx === 4 && successfulRef > 0) || (idx === 5 && successfulRef > 0);
              return (
                <div key={idx} className="relative z-10 flex flex-row md:flex-col items-center gap-4 md:gap-2 my-2 md:my-0 bg-[#0A0A0A] md:bg-transparent py-2 md:py-0 px-2 md:px-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${isActive ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-[#111] border-white/10 text-white/30'}`}>
                    {idx + 1}
                  </div>
                  <span className={`text-xs font-bold text-center w-24 ${isActive ? 'text-white' : 'text-white/30'}`}>{step}</span>
                </div>
              );
            })}
         </div>
      </div>
    </div>
  );
};

export default OwnerReferrals;
