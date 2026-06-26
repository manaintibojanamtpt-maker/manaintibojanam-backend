import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { CustomerSegmentSummary, getCustomerSegmentsSummary, generateCampaign } from '../../services/CustomerIntelligenceService';
import { m } from 'framer-motion';
import { Rocket, Send, Copy, AlertTriangle, CheckCircle2, TrendingUp, Users, Activity, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { trackEvent } from '../../services/AnalyticsService';
import { getDb } from '../../lib/firebase-db';
import { collection, addDoc } from 'firebase/firestore';
import { EnvironmentConfig } from '../../config/environment';

const CAMPAIGN_OPTIONS = [
  { id: 'Recovery Campaign (Inactive)', icon: AlertTriangle, selectedClass: 'bg-amber-500/10 border-amber-500/40', iconClass: 'text-amber-400', descKey: 'inactive' as const },
  { id: 'Win-Back Campaign (Lost)', icon: Activity, selectedClass: 'bg-red-500/10 border-red-500/40', iconClass: 'text-red-400', descKey: 'lost' as const },
  { id: 'Loyalty Campaign (Repeat)', icon: CheckCircle2, selectedClass: 'bg-emerald-500/10 border-emerald-500/40', iconClass: 'text-emerald-400', descKey: 'repeat' as const },
  { id: 'VIP / High Value', icon: Users, selectedClass: 'bg-orange-500/10 border-orange-500/40', iconClass: 'text-orange-400', descKey: 'vip' as const },
  { id: 'Birthday Campaign', icon: Rocket, selectedClass: 'bg-pink-500/10 border-pink-500/40', iconClass: 'text-pink-400', descKey: 'birthday' as const },
  { id: 'Festival Campaign', icon: Rocket, selectedClass: 'bg-blue-500/10 border-blue-500/40', iconClass: 'text-blue-400', descKey: 'festival' as const },
  { id: 'Referral Campaign', icon: TrendingUp, selectedClass: 'bg-orange-500/10 border-orange-500/40', iconClass: 'text-orange-400', descKey: 'referral' as const },
];

const OwnerMarketing: React.FC = () => {
  const { userProfile } = useAuth();
  const { tenantInfo, tenantSlug } = useTenant();
  const tenantId = userProfile?.ownedTenantIds?.[0];
  const [segments, setSegments] = useState<CustomerSegmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);

  const [generatedCampaign, setGeneratedCampaign] = useState<{
    whatsappCopy: string;
    smsCopy: string;
    instagramCaption: string;
    couponCode: string;
    expectedReach: number;
    expectedOrders: number;
    expectedRevenueLift: number;
    confidenceScore: number;
  } | null>(null);

  const [isSending, setIsSending] = useState(false);

  const tenantName = tenantInfo?.name || tenantInfo?.kyc?.businessName || 'your restaurant';
  const storeSlug = tenantInfo?.slug || tenantSlug || tenantId;
  const storeLink = storeSlug ? EnvironmentConfig.getStorefrontUrl(storeSlug) : '';

  const audienceDescriptions = useMemo(() => ({
    inactive: `Target ${Math.max(segments?.atRiskCustomers || 0, 0) + Math.max(segments?.churnedCustomers || 0, 0)} inactive or at-risk customers to recover lost revenue.`,
    lost: `Win back ${Math.max(segments?.churnedCustomers || 0, 0)} customers who haven't ordered in 30+ days.`,
    repeat: `Reward ${Math.max(segments?.repeatCustomers || 0, 0)} repeat customers to increase order frequency.`,
    vip: `Exclusive offers for your top ${Math.max(segments?.vipCustomers || 0, 0)} high-value customers.`,
    birthday: 'Automate birthday surprises for customers this month.',
    festival: 'Launch seasonal or festival-specific promotions.',
    referral: 'Incentivize your best customers to refer friends.',
  }), [segments]);

  useEffect(() => {
    if (tenantId) {
      getCustomerSegmentsSummary(tenantId).then((data) => {
        setSegments(data);
        setLoading(false);
      });
    }
  }, [tenantId]);

  const handleGenerate = (audience: string) => {
    if (!tenantId) return;
    setSelectedAudience(audience);
    const campaign = generateCampaign(audience, tenantName, storeLink, segments);
    setGeneratedCampaign(campaign);
    trackEvent(tenantId, 'campaignCreated', { audience });
  };

  const handleLaunch = async () => {
    if (!tenantId || !selectedAudience || !segments || !generatedCampaign) return;
    setIsSending(true);

    try {
      const db = getDb();
      await addDoc(collection(db, 'campaigns'), {
        tenantId,
        audience: selectedAudience,
        couponCode: generatedCampaign.couponCode,
        expectedReach: generatedCampaign.expectedReach,
        expectedOrders: generatedCampaign.expectedOrders,
        expectedRevenueLift: generatedCampaign.expectedRevenueLift,
        confidenceScore: generatedCampaign.confidenceScore,
        status: 'launched',
        createdAt: new Date().toISOString(),
      });

      trackEvent(tenantId, 'campaignSent', { audience: selectedAudience, expectedOrders: generatedCampaign.expectedOrders });
      setIsSending(false);
      setGeneratedCampaign(null);
      setSelectedAudience(null);
      toast.success('Campaign successfully launched across all channels!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to launch campaign.');
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading Campaign Center...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Rocket className="text-[#FF6B00]" />
            Smart Campaign Center
          </h1>
          <p className="text-white/50 mt-1">1-Click revenue recovery & customer retention for {tenantName}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto no-scrollbar pr-2">
          <h2 className="text-lg font-bold text-white mb-4 sticky top-0 bg-[#050505] z-10 py-2">Select Target Audience</h2>

          {CAMPAIGN_OPTIONS.map((c) => (
            <button
              key={c.id}
              onClick={() => handleGenerate(c.id)}
              className={`w-full text-left p-5 rounded-2xl border transition-all ${
                selectedAudience === c.id ? c.selectedClass : 'bg-[#0f0f11] border-white/10 hover:border-white/20'
              }`}
            >
              <div className={`flex items-center gap-2 font-bold mb-2 ${selectedAudience === c.id ? c.iconClass : 'text-white/70'}`}>
                <c.icon size={18} /> {c.id}
              </div>
              <p className="text-sm text-white/50 leading-relaxed">{audienceDescriptions[c.descKey]}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {generatedCampaign ? (
            <m.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0f0f11] rounded-2xl border border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Campaign Ready</h3>
                  <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold">
                    Confidence: {generatedCampaign.confidenceScore}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                    <p className="text-xs text-white/50 uppercase tracking-wider font-bold">Expected Reach</p>
                    <p className="text-xl font-black text-white">{generatedCampaign.expectedReach.toLocaleString()}</p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                    <p className="text-xs text-white/50 uppercase tracking-wider font-bold">Expected Orders</p>
                    <p className="text-xl font-black text-[#FF6B00]">{generatedCampaign.expectedOrders.toLocaleString()}</p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                    <p className="text-xs text-white/50 uppercase tracking-wider font-bold">Revenue Lift</p>
                    <p className="text-xl font-black text-emerald-400">₹{generatedCampaign.expectedRevenueLift.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {[
                  { label: 'WhatsApp Payload', value: generatedCampaign.whatsappCopy },
                  { label: 'SMS Payload', value: generatedCampaign.smsCopy },
                  { label: 'Instagram Caption', value: generatedCampaign.instagramCaption },
                ].map((block) => (
                  <div key={block.label}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-white/60">{block.label}</label>
                      <button onClick={() => copyToClipboard(block.value)} className="text-white/40 hover:text-white"><Copy size={14} /></button>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white whitespace-pre-wrap font-medium leading-relaxed">
                      {block.value}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between bg-white/[0.02] border border-dashed border-white/20 p-4 rounded-xl">
                  <span className="text-white/60 font-medium">Auto-generated Coupon:</span>
                  <span className="text-lg font-black text-white tracking-widest bg-white/10 px-4 py-1 rounded-lg">{generatedCampaign.couponCode}</span>
                </div>

                <button
                  onClick={handleLaunch}
                  disabled={isSending}
                  className="w-full flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#E56D00] text-white p-4 rounded-xl font-bold text-base transition-all disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                  {isSending ? 'Launching Campaign...' : 'Launch Campaign'}
                </button>
              </div>
            </m.div>
          ) : (
            <div className="h-full border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-white/30 p-12 text-center min-h-[400px]">
              <Rocket size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Audience Selected</p>
              <p className="text-sm">Select an audience on the left to generate a tailored campaign for {tenantName}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerMarketing;
