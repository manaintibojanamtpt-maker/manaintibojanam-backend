import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CustomerSegmentSummary, getCustomerSegmentsSummary, generateCampaign } from '../../services/CustomerIntelligenceService';
import { m } from 'framer-motion';
import { Rocket, Send, Copy, AlertTriangle, CheckCircle2, TrendingUp, Users, Activity, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { trackEvent } from '../../services/AnalyticsService';
import { getDb } from '../../lib/firebase-db';
import { collection, addDoc } from 'firebase/firestore';

const OwnerMarketing: React.FC = () => {
  const { userProfile } = useAuth();
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

  useEffect(() => {
    if (tenantId) {
      getCustomerSegmentsSummary(tenantId).then(data => {
        setSegments(data);
        setLoading(false);
      });
    }
  }, [tenantId]);

  const handleGenerate = (audience: string) => {
    if (!tenantId) return;
    setSelectedAudience(audience);
    const campaign = generateCampaign(audience, "BhojanOS Partner");
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
        createdAt: new Date().toISOString()
      });

      trackEvent(tenantId, 'campaignSent', { audience: selectedAudience, expectedOrders: generatedCampaign.expectedOrders });
      setIsSending(false);
      setGeneratedCampaign(null);
      setSelectedAudience(null);
      toast.success(`Campaign successfully launched across all channels!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to launch campaign.');
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-white/50">
      <Loader2 className="animate-spin mr-2" size={20} /> Loading Campaign Center...
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Rocket className="text-purple-400" />
            Smart Campaign Center
          </h1>
          <p className="text-white/50 mt-1">1-Click revenue recovery & customer retention.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Campaign Selection Column */}
        <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto no-scrollbar pr-2">
          <h2 className="text-lg font-bold text-white mb-4 sticky top-0 bg-[#050505] z-10 py-2">Select Target Audience</h2>
          
          {[
            { id: 'Recovery Campaign (Inactive)', icon: AlertTriangle, color: 'amber', desc: "Target 24 Inactive Customers to recover lost revenue." },
            { id: 'Win-Back Campaign (Lost)', icon: Activity, color: 'red', desc: "Target Lost Customers who haven't ordered in 30 days." },
            { id: 'Loyalty Campaign (Repeat)', icon: CheckCircle2, color: 'emerald', desc: "Reward Repeat Customers to increase order frequency." },
            { id: 'VIP / High Value', icon: Users, color: 'purple', desc: "Exclusive offers for your top 20% High Value Customers." },
            { id: 'Birthday Campaign', icon: Rocket, color: 'pink', desc: "Automate birthday surprises for customers this month." },
            { id: 'Festival Campaign', icon: Rocket, color: 'blue', desc: "Launch seasonal or festival-specific promotions." },
            { id: 'Referral Campaign', icon: TrendingUp, color: 'orange', desc: "Incentivize your best customers to refer friends." }
          ].map(c => (
            <button 
              key={c.id}
              onClick={() => handleGenerate(c.id)}
              className={`w-full text-left p-5 rounded-2xl border transition-all ${selectedAudience === c.id ? `bg-${c.color}-500/10 border-${c.color}-500/50 shadow-[0_0_20px_rgba(var(--color-${c.color}-500),0.2)]` : 'bg-[#0f0f11] border-white/10 hover:border-white/20'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`flex items-center gap-2 text-${c.color}-400 font-bold`}>
                  <c.icon size={18} /> {c.id}
                </div>
              </div>
              <p className="text-sm text-white/50">{c.desc}</p>
            </button>
          ))}
        </div>

        {/* Campaign Generation Column */}
        <div className="lg:col-span-2">
          {generatedCampaign ? (
            <m.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0f0f11] rounded-3xl border border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Campaign Ready</h3>
                  <div className="text-right flex items-center gap-2">
                    <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold">Confidence: {generatedCampaign.confidenceScore}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                    <p className="text-xs text-white/50 uppercase tracking-wider font-bold">Expected Reach</p>
                    <p className="text-xl font-black text-blue-400">{generatedCampaign.expectedReach.toLocaleString()}</p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                    <p className="text-xs text-white/50 uppercase tracking-wider font-bold">Expected Orders</p>
                    <p className="text-xl font-black text-amber-400">{generatedCampaign.expectedOrders.toLocaleString()}</p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                    <p className="text-xs text-white/50 uppercase tracking-wider font-bold">Revenue Lift</p>
                    <p className="text-xl font-black text-green-400">₹{generatedCampaign.expectedRevenueLift.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-white/60">WhatsApp Payload</label>
                    <button onClick={() => copyToClipboard(generatedCampaign.whatsappCopy)} className="text-white/40 hover:text-white"><Copy size={14}/></button>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white whitespace-pre-wrap font-medium">
                    {generatedCampaign.whatsappCopy}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-white/60">SMS Payload</label>
                    <button onClick={() => copyToClipboard(generatedCampaign.smsCopy)} className="text-white/40 hover:text-white"><Copy size={14}/></button>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white whitespace-pre-wrap font-medium">
                    {generatedCampaign.smsCopy}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-white/60">Instagram Caption</label>
                    <button onClick={() => copyToClipboard(generatedCampaign.instagramCaption)} className="text-white/40 hover:text-white"><Copy size={14}/></button>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white whitespace-pre-wrap font-medium">
                    {generatedCampaign.instagramCaption}
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/[0.02] border border-dashed border-white/20 p-4 rounded-xl">
                  <span className="text-white/60 font-medium">Auto-generated Coupon:</span>
                  <span className="text-lg font-black text-white tracking-widest bg-white/10 px-4 py-1 rounded-lg">{generatedCampaign.couponCode}</span>
                </div>

                <button
                  onClick={handleLaunch}
                  disabled={isSending}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white p-4 rounded-xl font-black text-lg uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                  {isSending ? 'Launching Campaign...' : 'Launch Campaign'}
                </button>
              </div>
            </m.div>
          ) : (
            <div className="h-full border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-white/30 p-12 text-center min-h-[400px]">
              <Rocket size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Audience Selected</p>
              <p className="text-sm">Select an audience on the left to auto-generate a high-converting recovery campaign.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default OwnerMarketing;
