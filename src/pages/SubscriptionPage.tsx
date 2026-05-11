import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Info, Sparkles, ArrowRight, Loader2, Star, Gift, ShieldCheck, ChevronLeft, PauseCircle, PlayCircle, Utensils } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { getDb } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ReferralBanner from '../components/ReferralBanner';
import { differenceInDays, format, addDays } from 'date-fns';

const PLANS = [
  {
    id: '1_meal',
    title: '1 Meal / Day',
    price: 3000,
    mealsPerDay: 1,
    description: 'Perfect for working professionals',
    popular: false,
  },
  {
    id: '2_meals',
    title: '2 Meals / Day',
    price: 5500,
    mealsPerDay: 2,
    description: 'Most popular for complete daily nutrition',
    popular: true,
    savings: 500,
  },
  {
    id: '3_meals',
    title: '3 Meals / Day',
    price: 6500,
    mealsPerDay: 3,
    description: 'Complete hassle-free dining all month',
    popular: false,
    savings: 2500,
  }
];

export default function SubscriptionPage() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>('2_meals');
  const [mealPref, setMealPref] = useState<'veg' | 'egg' | 'nonveg'>('nonveg');
  const [deliverySlot, setDeliverySlot] = useState<'lunch' | 'dinner' | 'both'>('both');
  
  const [referralCode, setReferralCode] = useState('');
  const [referralStatus, setReferralStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [referralMessage, setReferralMessage] = useState('');
  const [validReferralDoc, setValidReferralDoc] = useState<any>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingSubDoc, setExistingSubDoc] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState(false);

  useEffect(() => {
    // Wake up backend to avoid Razorpay cold-start delays
    fetch('https://manaintibojanam-backend.onrender.com/api/health').catch(() => {});

    if (!currentUser) {
      setLoadingInitial(false);
      return;
    }

    const q = query(
      collection(getDb(), 'subscriptions'), 
      where('userId', '==', currentUser.uid),
      where('status', 'in', ['active', 'paused'])
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setExistingSubDoc({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setExistingSubDoc(null);
      }
      setLoadingInitial(false);
    }, (err) => {
      console.error("Error checking subscription:", err);
      setLoadingInitial(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleApplyReferral = async () => {
    if (!currentUser) {
      toast.error('Please login first');
      navigate('/login');
      return;
    }
    if (!referralCode.trim()) return;

    setReferralStatus('loading');
    try {
      const q = query(collection(getDb(), 'referrals'), where('referralCode', '==', referralCode.trim().toUpperCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setReferralStatus('invalid');
        setReferralMessage('Invalid referral code');
        setValidReferralDoc(null);
        return;
      }

      const refDoc = snap.docs[0];
      const data = refDoc.data();

      if (data.userId === currentUser.uid) {
        setReferralStatus('invalid');
        setReferralMessage('You cannot use your own referral code');
        setValidReferralDoc(null);
        return;
      }

      if (data.referredUsers?.includes(currentUser.uid)) {
        setReferralStatus('invalid');
        setReferralMessage('You have already used this referral code');
        setValidReferralDoc(null);
        return;
      }

      setReferralStatus('valid');
      setReferralMessage('Referral applied! ₹100 Discount');
      setValidReferralDoc({ id: refDoc.id, ...data });
    } catch (error) {
      console.error("Error applying referral", error);
      setReferralStatus('invalid');
      setReferralMessage('Failed to verify code');
    }
  };

  const generateWeeklyPlan = (pref: string) => {
    switch (pref) {
      case 'veg': return { vegDays: 7, eggDays: 0, nonVegDays: 0 };
      case 'egg': return { vegDays: 4, eggDays: 3, nonVegDays: 0 };
      case 'nonveg': return { vegDays: 3, eggDays: 2, nonVegDays: 2 };
      default: return { vegDays: 7, eggDays: 0, nonVegDays: 0 };
    }
  };

  const activePlan = PLANS.find(p => p.id === selectedPlan)!;
  const discount = referralStatus === 'valid' ? 100 : 0;
  const finalPrice = activePlan.price - discount;
  const weeklyBreakdown = generateWeeklyPlan(mealPref);

  const getServerTime = async () => {
    try {
      const res = await fetch('/api/server-time');
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      return new Date(data.time);
    } catch (e) {
      console.warn("Failed to fetch server time, falling back to local time", e);
      return new Date();
    }
  };

  const handlePause = async () => {
    if (!existingSubDoc) return;
    
    const totalPausedDays = existingSubDoc.totalPausedDays || 0;
    const pauseCount = existingSubDoc.pauseCount || 0;
    
    if (totalPausedDays >= 7) {
      toast.error('You have reached the maximum pause limit of 7 days.');
      return;
    }
    if (pauseCount >= 3) {
      toast.error('You have reached the maximum limit of 3 pauses.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateDoc(doc(getDb(), 'subscriptions', existingSubDoc.id), {
        status: 'paused',
        pausedAt: serverTimestamp(),
        pauseCount: pauseCount + 1
      });
      setExistingSubDoc({ ...existingSubDoc, status: 'paused', pausedAt: new Date(), pauseCount: pauseCount + 1 });
      toast.success('Subscription paused successfully. No deliveries will be made.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to pause subscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResume = async () => {
    if (!existingSubDoc || existingSubDoc.status !== 'paused') return;
    
    setIsSubmitting(true);
    try {
      const serverTime = await getServerTime();
      
      const pausedAtDate = existingSubDoc.pausedAt?.toDate ? existingSubDoc.pausedAt.toDate() : new Date(existingSubDoc.pausedAt);
      const daysPaused = differenceInDays(serverTime, pausedAtDate);
      const actualDaysPaused = Math.max(1, daysPaused); 
      
      const currentEndDate = existingSubDoc.endDate?.toDate ? existingSubDoc.endDate.toDate() : new Date(existingSubDoc.endDate);
      
      if (serverTime > currentEndDate) {
        await updateDoc(doc(getDb(), 'subscriptions', existingSubDoc.id), {
          status: 'expired'
        });
        toast.error('Subscription has expired.');
        setExistingSubDoc({ ...existingSubDoc, status: 'expired' });
        return;
      }
      
      const newEndDate = addDays(currentEndDate, actualDaysPaused);
      
      await updateDoc(doc(getDb(), 'subscriptions', existingSubDoc.id), {
        status: 'active',
        endDate: newEndDate,
        pausedAt: null,
        totalPausedDays: (existingSubDoc.totalPausedDays || 0) + actualDaysPaused
      });
      
      setExistingSubDoc({ 
        ...existingSubDoc, 
        status: 'active', 
        endDate: newEndDate, 
        pausedAt: null, 
        totalPausedDays: (existingSubDoc.totalPausedDays || 0) + actualDaysPaused 
      });
      
      toast.success('Subscription resumed successfully! End date extended.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to resume subscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubscribe = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (existingSubDoc) {
      toast.error('You already have an active subscription!');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(now.getDate() + 30);

      // 1. Create order on backend for Razorpay
      const API_BASE_URL = 'https://manaintibojanam-backend.onrender.com';
      const createRes = await fetch(`${API_BASE_URL}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalPrice })
      });
      const createData = await createRes.json();
      
      if (!createRes.ok || !createData.order_id) {
        throw new Error(createData.error || 'Failed to create secure payment session');
      }

      // 2. Configure Razorpay
      const options = {
        key: 'rzp_live_Sjcjj19nnWXEzX', // Live Key
        amount: createData.amount,
        currency: 'INR',
        name: 'Mana Inti Bojanam',
        description: 'Monthly Meal Subscription',
        order_id: createData.order_id,
        prefill: {
          name: currentUser.displayName || '',
          email: currentUser.email || '',
          contact: currentUser.phoneNumber || ''
        },
        theme: { color: '#E65100' },
        handler: async function (response: any) {
          try {
            setIsSubmitting(true);
            
            // 3. Verify payment on backend
            const verifyRes = await fetch(`${API_BASE_URL}/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response)
            });
            const verifyData = await verifyRes.json();
            
            if (verifyData.success) {
              // 4. Create subscription in Firestore ONLY AFTER verification
              await addDoc(collection(getDb(), 'subscriptions'), {
                userId: currentUser.uid,
                planType: selectedPlan,
                price: activePlan.price,
                finalPrice: finalPrice,
                startDate: serverTimestamp(),
                endDate: endDate.toISOString(),
                mealsPerDay: activePlan.mealsPerDay,
                mealPreference: mealPref,
                weeklyPlan: weeklyBreakdown,
                deliverySlot: deliverySlot,
                status: 'active',
                usedReferral: referralStatus === 'valid',
                referralCodeUsed: referralStatus === 'valid' ? validReferralDoc?.referralCode : null,
                pendingDiscount: 0,
                deliveryFeeCharged: 0,
                deliveryPartnerCost: 0,
                profitMargin: 0,
                isFreeDelivery: true,
                absorbedCost: 0, // Admin tracking
                createdAt: serverTimestamp()
              });

              // 5. Update referral doc and referrer's pending discount if used
              if (referralStatus === 'valid' && validReferralDoc) {
                await updateDoc(doc(getDb(), 'referrals', validReferralDoc.id), {
                  referredUsers: arrayUnion(currentUser.uid),
                  totalEarnings: (validReferralDoc.totalEarnings || 0) + 100,
                  discountGiven: (validReferralDoc.discountGiven || 0) + 100
                });

                // Apply discount to referrer's active subscription
                try {
                  const subQuery = query(
                    collection(getDb(), 'subscriptions'),
                    where('userId', '==', validReferralDoc.userId),
                    where('status', '==', 'active')
                  );
                  const subSnap = await getDocs(subQuery);
                  if (!subSnap.empty) {
                    const referrerSubId = subSnap.docs[0].id;
                    const currentDiscount = subSnap.docs[0].data().pendingDiscount || 0;
                    await updateDoc(doc(getDb(), 'subscriptions', referrerSubId), {
                      pendingDiscount: currentDiscount + 100
                    });
                  }
                } catch (e) {
                  console.error("Failed to add pending discount to referrer:", e);
                }
              }

              toast.success('Successfully subscribed to Monthly Plan!');
              setSubscriptionSuccess(true);
            } else {
              toast.error('Payment verification failed');
            }
          } catch (err) {
            console.error(err);
            toast.error('Payment verification error');
          } finally {
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: function() {
            setIsSubmitting(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast.error('Payment failed: ' + response.error.description);
        setIsSubmitting(false);
      });
      rzp.open();

    } catch (error: any) {
      console.error("Subscription Error:", error);
      toast.error(error.message || 'Failed to initialize payment.');
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-dark-bg pb-12 flex flex-col">
      {/* Mobile-first standalone header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft size={24} className="text-gray-900 dark:text-white" />
        </button>
        <span className="font-black text-lg text-gray-900 dark:text-white absolute left-1/2 -translate-x-1/2">Subscriptions</span>
        <div className="w-10"></div> {/* Spacer to center the title */}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 md:pt-12 flex-1 w-full">
        
        {subscriptionSuccess ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
          >
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-8">
              <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">You're Subscribed!</h1>
            <p className="text-gray-500 mb-12 max-w-md">
              Your monthly meal plan is now active. Get ready for delicious, home-style food delivered daily.
            </p>
            
            <div className="w-full max-w-2xl mb-8 text-left">
              <ReferralBanner referralCode={userProfile?.referralCode || 'YOUR_CODE'} />
            </div>
            
            <button
              onClick={() => navigate('/')}
              className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl"
            >
              Back to Home
            </button>
          </motion.div>
        ) : existingSubDoc ? (
          <div className="max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-6">Manage Subscription</h2>
            
            <div className={`p-8 rounded-[2.5rem] shadow-xl border relative overflow-hidden ${
              existingSubDoc.status === 'paused' 
                ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' 
                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
            }`}>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white capitalize">
                    {existingSubDoc.planType.replace('_', ' ')}
                  </h3>
                  <p className="text-gray-500 font-medium capitalize mt-1">
                    {existingSubDoc.mealPreference} • {existingSubDoc.deliverySlot} Delivery
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest ${
                  existingSubDoc.status === 'paused' 
                    ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200' 
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {existingSubDoc.status}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-800">
                  <span className="text-gray-500 font-medium">Valid Until</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {existingSubDoc.endDate?.toDate 
                      ? format(existingSubDoc.endDate.toDate(), 'dd MMM yyyy') 
                      : format(new Date(existingSubDoc.endDate), 'dd MMM yyyy')}
                  </span>
                </div>
                {existingSubDoc.status === 'paused' && (
                  <div className="flex justify-between items-center py-3 border-b border-orange-200 dark:border-orange-800">
                    <span className="text-orange-600 font-medium">Paused On</span>
                    <span className="font-bold text-orange-700 dark:text-orange-400">
                      {existingSubDoc.pausedAt?.toDate 
                        ? format(existingSubDoc.pausedAt.toDate(), 'dd MMM yyyy') 
                        : format(new Date(existingSubDoc.pausedAt), 'dd MMM yyyy')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-800">
                  <span className="text-gray-500 font-medium">Total Pauses Used</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {existingSubDoc.pauseCount || 0} / 3
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-800">
                  <span className="text-gray-500 font-medium">Total Paused Days</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {existingSubDoc.totalPausedDays || 0} / 7 Days
                  </span>
                </div>
              </div>

              {existingSubDoc.status === 'paused' && (
                <div className="mb-8 bg-orange-100 dark:bg-orange-900/30 p-4 rounded-xl flex items-start gap-3">
                  <Info className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-orange-800 dark:text-orange-300">Your subscription is paused.</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                      No deliveries will be made. Resume whenever you're ready, and your end date will be extended automatically.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4">
                {existingSubDoc.status === 'active' ? (
                  <button
                    onClick={handlePause}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-orange-100 hover:bg-orange-200 text-orange-800 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <PauseCircle size={20} />}
                    Pause Subscription
                  </button>
                ) : (
                  <button
                    onClick={handleResume}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <PlayCircle size={20} />}
                    Resume Delivery
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <Utensils className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No Active Subscription</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              You don't have an active monthly meal subscription. Enjoy home-style Telugu meals delivered to your doorstep daily!
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-95"
            >
              Browse Plans
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
