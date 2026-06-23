import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDb } from '../../lib/firebase-db';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { MessageCircle, Bug, Lightbulb, HelpCircle, Star, ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { calculateMerchantHealth } from '../../lib/merchantHealth';
import FounderBetaTrustBanner from '../../components/FounderBetaTrustBanner';

const OwnerFeedback: React.FC = () => {
  const { userProfile } = useAuth();
  const tenantId = userProfile?.ownedTenantIds?.[0];
  const [type, setType] = useState<'feature' | 'bug' | 'suggestion' | 'help' | 'rating' | null>(null);
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !type) return;
    if (type === 'rating' && rating === 0) return toast.error('Please select a rating.');
    if (type !== 'rating' && description.trim().length < 10) return toast.error('Please provide more detail (at least 10 characters).');

    setSubmitting(true);
    try {
      // Get tenant metadata for context
      const tenantDoc = await getDoc(doc(getDb(), 'tenants', tenantId));
      let healthScore = 0;
      let plan = 'free';
      let businessType = 'unknown';
      if (tenantDoc.exists()) {
        const tData = tenantDoc.data() as any;
        plan = tData.subscription?.plan || 'free';
        businessType = tData.businessType || 'home_kitchen';
        const healthRes = calculateMerchantHealth(tData, undefined, 10);
        healthScore = healthRes.score;
      }

      await addDoc(collection(getDb(), 'merchant_feedback'), {
        tenantId,
        type,
        description,
        rating: type === 'rating' ? rating : null,
        merchantHealthSnapshot: healthScore,
        plan,
        businessType,
        status: 'new',
        timestamp: serverTimestamp()
      });

      setSuccess(true);
      toast.success('Feedback sent to founders!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 max-w-2xl mx-auto pb-24 text-center mt-12">
         <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
           <CheckCircle2 size={40} className="text-green-400" />
         </div>
         <h2 className="text-3xl font-black text-white mb-4">Thank You!</h2>
         <p className="text-gray-400 mb-8">Your feedback goes directly to our founders. It helps us build a better partner for your business.</p>
         <button onClick={() => {setSuccess(false); setType(null); setDescription(''); setRating(0);}} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all">
           Submit Another
         </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <MessageCircle className="text-purple-400" /> Merchant Success Center
        </h1>
        <p className="text-white/50 mt-2 mb-6 max-w-xl">
          BhojanOS is built for you. Tell us what you need, report an issue, or ask for help. We review every submission. We usually respond within a few hours during business hours.
        </p>
        <FounderBetaTrustBanner />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Select Category</h2>
          <div className="space-y-3">
            {[
              { id: 'help', label: 'I Need Help', desc: 'Stuck? Ask our success team.', icon: HelpCircle, color: 'blue' },
              { id: 'feature', label: 'Feature Request', desc: 'Something missing? Tell us.', icon: MessageCircle, color: 'purple' },
              { id: 'suggestion', label: 'Improvement', desc: 'How can we make it better?', icon: Lightbulb, color: 'amber' },
              { id: 'bug', label: 'Report a Bug', desc: 'Something broken? Let us fix it.', icon: Bug, color: 'red' },
              { id: 'rating', label: 'Rate BhojanOS', desc: 'How are we doing?', icon: Star, color: 'green' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id as any)}
                className={`w-full flex items-center p-4 rounded-xl border transition-all ${type === t.id ? `bg-${t.color}-500/10 border-${t.color}-500/50` : 'bg-[#0A0A0A] border-white/5 hover:bg-white/5'}`}
              >
                <div className={`p-3 rounded-lg bg-${t.color}-500/10 text-${t.color}-400 mr-4`}>
                  <t.icon size={20} />
                </div>
                <div className="text-left">
                  <div className={`font-bold ${type === t.id ? 'text-white' : 'text-gray-300'}`}>{t.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                </div>
                {type === t.id && <ArrowRight className={`ml-auto text-${t.color}-400`} size={18} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          {type && (
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-6 capitalize">{type === 'rating' ? 'Rate Us' : type === 'help' ? 'Request Support' : type}</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {type === 'rating' ? (
                  <div className="flex gap-2 justify-center py-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
                        <Star size={40} className={rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">
                      {type === 'help' ? 'How can we help you?' : 'Please provide details'}
                    </label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={type === 'help' ? "I'm having trouble with..." : "I would love to see..."}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 min-h-[150px] resize-none"
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={submitting || (type === 'rating' ? rating === 0 : description.trim().length < 10)}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2"
                >
                  {submitting ? 'Sending...' : 'Send to bhojanos26@gmail.com'} <ArrowRight size={18} />
                </button>
                <p className="text-center text-xs text-gray-500 mt-4">Support Contact: +91 7666258454</p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerFeedback;
