import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CustomerSegmentSummary, getCustomerSegmentsSummary, generateCampaign } from '../../services/CustomerIntelligenceService';
import { motion } from 'framer-motion';
import { Rocket, Send, Copy, AlertTriangle, CheckCircle2, TrendingUp, Users, Activity, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { trackEvent } from '../../services/AnalyticsService';

const OwnerMarketing: React.FC = () => {
  const { userProfile } = useAuth();
  const tenantId = userProfile?.ownedTenantIds?.[0];
  const [segments, setSegments] = useState<CustomerSegmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);
  
  const [generatedCampaign, setGeneratedCampaign] = useState<{
    whatsappCopy: string;
    smsCopy: string;
    couponCode: string;
    expectedRecoveryPerUser: number;
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

  const handleLaunch = () => {
    if (!tenantId || !selectedAudience || !segments) return;
    setIsSending(true);

    // Mock API call to Twilio/WhatsApp Business API
    setTimeout(() => {
      let count = 0;
      if (selectedAudience === 'At Risk') count = segments.atRiskCustomers;
      if (selectedAudience === 'Churned') count = segments.churnedCustomers;
      if (selectedAudience === 'VIP') count = segments.vipCustomers;

      trackEvent(tenantId, 'campaignSent', { audience: selectedAudience, count });
      setIsSending(false);
      setGeneratedCampaign(null);
      setSelectedAudience(null);
      toast.success(`Campaign successfully launched to ${count} customers!`);
    }, 1500);
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
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-bold text-white mb-4">Select Target Audience</h2>
          
          <button 
            onClick={() => handleGenerate('At Risk')}
            className={`w-full text-left p-5 rounded-2xl border transition-all ${selectedAudience === 'At Risk' ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-[#0f0f11] border-white/10 hover:border-white/20'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <AlertTriangle size={18} /> Reactivation
              </div>
              <span className="bg-white/10 text-white px-2 py-0.5 rounded-md text-xs font-bold">{segments?.atRiskCustomers} Users</span>
            </div>
            <p className="text-sm text-white/50">Target At-Risk customers who haven't ordered in 14 days.</p>
          </button>

          <button 
            onClick={() => handleGenerate('Churned')}
            className={`w-full text-left p-5 rounded-2xl border transition-all ${selectedAudience === 'Churned' ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-[#0f0f11] border-white/10 hover:border-white/20'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <Activity size={18} /> Win Back
              </div>
              <span className="bg-white/10 text-white px-2 py-0.5 rounded-md text-xs font-bold">{segments?.churnedCustomers} Users</span>
            </div>
            <p className="text-sm text-white/50">Target Churned customers who haven't ordered in 30 days.</p>
          </button>

          <button 
            onClick={() => handleGenerate('VIP')}
            className={`w-full text-left p-5 rounded-2xl border transition-all ${selectedAudience === 'VIP' ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'bg-[#0f0f11] border-white/10 hover:border-white/20'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold">
                <Users size={18} /> VIP Reward
              </div>
              <span className="bg-white/10 text-white px-2 py-0.5 rounded-md text-xs font-bold">{segments?.vipCustomers} Users</span>
            </div>
            <p className="text-sm text-white/50">Target top 20% high-LTV customers to drive loyalty.</p>
          </button>
        </div>

        {/* Campaign Generation Column */}
        <div className="lg:col-span-2">
          {generatedCampaign ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0f0f11] rounded-3xl border border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Campaign Ready</h3>
                  <div className="text-right">
                    <p className="text-xs text-white/50 uppercase tracking-widest font-bold mb-1">Estimated Recovery</p>
                    <p className="text-2xl font-black text-green-400">
                      ₹{((selectedAudience === 'At Risk' ? segments!.atRiskCustomers : selectedAudience === 'Churned' ? segments!.churnedCustomers : segments!.vipCustomers) * generatedCampaign.expectedRecoveryPerUser).toLocaleString()}
                    </p>
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
            </motion.div>
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
