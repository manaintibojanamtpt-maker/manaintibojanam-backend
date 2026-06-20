import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, MapPin, CreditCard, ArrowLeft, ChevronRight, ShieldCheck, Plus, Minus, Check, Clock, Heart, Sparkles, Utensils, Lock, X, ArrowRight } from 'lucide-react';
import { activeTenantId } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useCheckoutState } from '../hooks/useCheckoutState';
import { useAIAnalytics } from '../hooks/useAIAnalytics';
import { createOrder, stageOrderDraft } from '../services/api';
import LocationPicker from '../components/LocationPicker';
import { OrderStatus } from '../types';
import { formatPrice, cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';
import { getDb } from '../lib/firebase-db';
import { doc, updateDoc, setDoc, arrayUnion, collection, getDocs, query, where, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { differenceInMinutes } from 'date-fns';
import { MenuItem } from '../types';
import { Skeleton } from '../components/SkeletonSystem';

// Countdown removed by request

const Checkout: React.FC = () => {
  const { tenantId, tenantSlug } = useTenant();
  const navigate = useNavigate();
  const basePath = tenantSlug ? `/k/${tenantSlug}` : '';
  const state = useCheckoutState();
  const { logEvent } = useAIAnalytics();
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  
  // Temporary state for new address before saving
  const [newAddressLat, setNewAddressLat] = useState<number | null>(null);
  const [newAddressLng, setNewAddressLng] = useState<number | null>(null);
  const [newAddressText, setNewAddressText] = useState('');
  const [newAddressLabel, setNewAddressLabel] = useState('Home');

  const [deliverySlots, setDeliverySlots] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  
  // Subscription Logistics State
  const subscriptionItem = state.cart.find(item => item.isSubscription);
  const hasSubscription = !!subscriptionItem;
  
  const [subStartDate, setSubStartDate] = useState<string>(subscriptionItem?.subscriptionDetails?.startDate || new Date().toISOString().split('T')[0]);
  const [subSlot, setSubSlot] = useState<string>(subscriptionItem?.subscriptionDetails?.slot || 'lunch');
  const [subFrequency, setSubFrequency] = useState<'daily' | 'mon-fri' | 'custom'>('daily');
  
  useEffect(() => {
    // Wake up backend to avoid Razorpay cold-start delays
    fetch('https://manaintibojanam-backend.onrender.com/api/health').catch(() => {});

    const fetchRecommendations = async () => {
      setLoadingRecommendations(true);
      try {
        const q = query(
          collection(getDb(), 'menu'),
          where('tenantId', '==', activeTenantId),
          where('isAvailable', '==', true),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
        
        // Simple context-based filtering:
        // If they have biryani, suggest raita/drink
        const hasBiryani = state.cart.some(i => i.name?.toLowerCase()?.includes('biryani'));
        const hasMeals = state.cart.some(i => i.name?.toLowerCase()?.includes('meal'));
        
        let filtered = items.filter(i => !state.cart.some(c => c.id === i.id)); // exclude already in cart
        
        if (hasBiryani) {
          const contextItems = filtered.filter(i => i.category?.toLowerCase() === 'beverages' || i.name?.toLowerCase()?.includes('raita'));
          if (contextItems.length > 0) filtered = [...contextItems, ...filtered.filter(i => !contextItems.includes(i))];
        } else if (hasMeals) {
          const contextItems = filtered.filter(i => i.category?.toLowerCase() === 'desserts' || i.name?.toLowerCase()?.includes('sweet'));
          if (contextItems.length > 0) filtered = [...contextItems, ...filtered.filter(i => !contextItems.includes(i))];
        }
        
        setRecommendations(filtered.slice(0, 3));
      } catch (err) {
        console.error('Failed to load recommendations', err);
      } finally {
        setLoadingRecommendations(false);
      }
    };
    fetchRecommendations();
  }, [state.cart]);

  useEffect(() => {
    const openTime = state.fees?.storeTiming?.openTime || '10:00';
    const closeTime = state.fees?.storeTiming?.closeTime || '22:00';
    
    const todaySlots: string[] = [];
    const tomorrowSlots: string[] = [];
    const now = new Date();
    
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);
    
    const todayOpen = new Date(now);
    todayOpen.setHours(openHour, openMin, 0, 0);
    const todayClose = new Date(now);
    todayClose.setHours(closeHour, closeMin, 0, 0);

    const tomorrowOpen = new Date(todayOpen);
    tomorrowOpen.setDate(tomorrowOpen.getDate() + 1);
    const tomorrowClose = new Date(todayClose);
    tomorrowClose.setDate(tomorrowClose.getDate() + 1);

    const BUFFER_MS = 60 * 60 * 1000; // 60 mins buffer
    const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    const addSlot = (start: Date, targetArray: string[], prefix: string) => {
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour slots for cleaner UI
      targetArray.push(`${prefix}, ${formatTime(start)} - ${formatTime(end)}`);
    };

    const earliestDeliveryToday = new Date(now.getTime() + BUFFER_MS);
    
    if (earliestDeliveryToday <= todayClose) {
      todaySlots.push('Standard Delivery (ASAP)');
      
      const currentSlot = new Date(earliestDeliveryToday);
      const remainder = currentSlot.getMinutes() % 30;
      if (remainder !== 0) currentSlot.setMinutes(currentSlot.getMinutes() + (30 - remainder));
      
      if (currentSlot < todayOpen) currentSlot.setTime(todayOpen.getTime());

      while (currentSlot.getTime() + 60 * 60 * 1000 <= todayClose.getTime()) {
        addSlot(currentSlot, todaySlots, 'Today');
        currentSlot.setMinutes(currentSlot.getMinutes() + 60);
      }
    }
    
    const currentSlotTomorrow = new Date(tomorrowOpen);
    while (currentSlotTomorrow.getTime() + 60 * 60 * 1000 <= tomorrowClose.getTime()) {
      addSlot(currentSlotTomorrow, tomorrowSlots, 'Tomorrow');
      currentSlotTomorrow.setMinutes(currentSlotTomorrow.getMinutes() + 60);
    }

    const allSlots = [...todaySlots, ...tomorrowSlots];
    setDeliverySlots(allSlots);
    
    if (!allSlots.includes(state.deliveryTimeSlot)) {
      state.setDeliveryTimeSlot(allSlots[0] || 'Standard Delivery (ASAP)');
    }
  }, [state.fees?.storeTiming]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleLocationSelect = async (locationData: any) => {
    const newAddr = {
      id: crypto.randomUUID(),
      label: 'Saved Address',
      address: locationData.fullAddress,
      addressText: locationData.addressText,
      fullAddress: locationData.fullAddress,
      lat: locationData.lat,
      lng: locationData.lng,
      distanceKm: locationData.distanceKm,
      deliveryFee: locationData.deliveryFee,
      isDefault: !state.userProfile?.savedAddresses?.length
    };

    try {
      state.setIsProcessing(true);
      if (state.currentUser?.uid) {
        await setDoc(doc(getDb(), 'users', state.currentUser.uid), {
          savedAddresses: arrayUnion(newAddr)
        }, { merge: true });
      }
      
      state.setSelectedAddressId(newAddr.id);
      state.setAddressText(newAddr.address);
      state.setDeliveryState(prev => ({ ...prev, selectedAddress: newAddr as any }));
      setShowLocationPicker(false);
      setShowAddressModal(false);
      toast.success('Address saved!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save address');
    } finally {
      state.setIsProcessing(false);
    }
  };

  const handleSaveNewAddress = async () => {
    if (!newAddressText || !newAddressLabel) {
      toast.error('Address and label are required');
      return;
    }
    if (!state.currentUser) {
      toast.error('Please login');
      triggerHaptic('warning');
      navigate(`${basePath}/login?redirect=${basePath}/checkout`);
      return;
    }

    try {
      state.setIsProcessing(true);
      const newAddr: any = {
        id: Date.now().toString(),
        label: newAddressLabel,
        address: newAddressText,
        isDefault: !state.userProfile?.savedAddresses?.length
      };

      if (newAddressLat !== null) newAddr.lat = newAddressLat;
      if (newAddressLng !== null) newAddr.lng = newAddressLng;

      await setDoc(doc(getDb(), 'users', state.currentUser.uid), {
        savedAddresses: arrayUnion(newAddr)
      }, { merge: true });

      state.setSelectedAddressId(newAddr.id);
      state.setAddressText(newAddr.address);
      state.setDeliveryState(prev => ({
        ...prev,
        selectedAddress: { id: newAddr.id, label: newAddr.label, address: newAddr.address }
      }));
      
      setShowAddressModal(false);
      setNewAddressText('');
      setNewAddressLat(null);
      setNewAddressLng(null);
      toast.success('Address saved!');
    } catch (err) {
      console.error('Save Address Error:', err);
      toast.error('Failed to save address');
    } finally {
      state.setIsProcessing(false);
    }
  };

  const getScheduledForTimestamp = (slot: string) => {
    if (slot === 'Standard Delivery (ASAP)' || slot === 'ASAP') return null;
    
    // e.g. "Today, 1:30 PM - 2:00 PM"
    const parts = slot.split(', ');
    if (parts.length !== 2) return new Date().toISOString();
    
    const dayStr = parts[0];
    const timeRange = parts[1];
    const startTimeStr = timeRange.split(' - ')[0];
    
    const now = new Date();
    if (dayStr === 'Tomorrow') {
      now.setDate(now.getDate() + 1);
    } else if (dayStr === 'Day After Tomorrow') {
      now.setDate(now.getDate() + 2);
    }
    
    const timeMatch = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeMatch) {
      let [_, h, m, ampm] = timeMatch;
      let hour = parseInt(h, 10);
      if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
      now.setHours(hour, parseInt(m, 10), 0, 0);
    }
    
    return now.toISOString();
  };

  const buildOrderData = () => {
    const orderNumber = Math.floor(100000 + Math.random() * 900000);
    const orderItems = state.cart.map(item => {
      const lineSubtotal = item.price * item.quantity;
      const lineTax = (lineSubtotal * state.fees.gst) / 100;
      return {
        menuItemId: item.id,
        name: item.name,
        unitPrice: item.price,
        quantity: item.quantity,
        lineSubtotal,
        discount: 0,
        discountApplied: false,
        lineTax,
        lineTotal: lineSubtotal + lineTax
      };
    });

    const isASAP = state.deliveryTimeSlot === 'Standard Delivery (ASAP)' || state.deliveryTimeSlot === 'ASAP';
    const scheduledFor = isASAP ? null : getScheduledForTimestamp(state.deliveryTimeSlot);

    return {
      orderNumber,
      tenantId,
      userId: state.currentUser?.uid || null,
      customerName: state.name || null,
      userEmail: state.email || null,
      phone: state.phone || null,
      address: state.addressText,
      items: orderItems,
      subtotal: state.total,
      gst: state.gstAmount,
      packingFee: state.packingFee,
      deliveryFee: state.deliveryFee,
      totalAmount: state.finalTotal,
      status: hasSubscription ? OrderStatus.ACTIVE : OrderStatus.PLACED,
      createdAt: Date.now(),
      paymentMethod: state.paymentMethod === 'online' ? 'razorpay' : 'cod',
      paymentStatus: 'pending',
      feedbackStatus: 'NOT_ELIGIBLE',
      deliveryType: isASAP ? 'asap' : 'scheduled',
      orderType: hasSubscription ? 'subscription_master' : (isASAP ? 'instant' : 'scheduled'),
      remainingCycles: hasSubscription ? 30 : null,
      deliveryTimeSlot: state.deliveryTimeSlot,
      specialInstructions: state.specialInstructions || null,
      deliveryPartner: state.cheapestPartner?.partner || null,
      deliveryPartnerCost: state.cheapestPartner?.cost || null,
      deliveryFeeCharged: state.deliveryFee,
      profitMargin: state.deliveryFee - (state.cheapestPartner?.cost || 0),
      isFreeDelivery: state.deliveryFee === 0,
      absorbedCost: state.deliveryFee === 0 ? (state.cheapestPartner?.cost || 0) : 0,
      scheduledFor,
      // Backward-compatible field for the backend prep worker.
      scheduledTime: scheduledFor,
      prepAlertSent: isASAP ? null : false,
      isCOD: state.paymentMethod === 'cod',
      deliveryMethod: state.orderType // Passes pickup/delivery flag safely
    };
  };

  const handlePlaceOrder = async () => {
    if (!state.currentUser) {
      navigate(`${basePath}/login?redirect=${basePath}/checkout`);
      return;
    }
    if (!state.addressText || !state.phone || !state.name) {
      toast.error('Please ensure your profile details and address are complete.');
      return;
    }
    
    // COD Kill Switch / Leak Prevention
    if (state.paymentMethod === 'cod') {
      if (hasSubscription) {
        toast.error("Subscription orders cannot be processed with Cash on Delivery.");
        return;
      }
      if (state.total > 1000) {
        toast.error("Orders exceeding ₹1,000 require a digital payment method.");
        return;
      }
    }

    try {
      setIsPlacingOrder(true);
      const orderData: any = buildOrderData();

      if (state.paymentMethod === 'online') {
        // Fallback to Render backend if VITE_API_URL is not set
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://manaintibojanam-backend.onrender.com';
        
        let subscriptionData = null;
        if (hasSubscription && subscriptionItem && state.currentUser) {
          subscriptionData = {
            userId: state.currentUser.uid,
            planType: subscriptionItem.id,
            price: subscriptionItem.price,
            finalPrice: state.finalTotal,
            startDate: new Date(subStartDate),
            endDate: new Date(new Date(subStartDate).getTime() + (subFrequency === 'daily' ? 30 : 22) * 24 * 60 * 60 * 1000),
            mealsPerDay: subscriptionItem.id === '1_meal' ? 1 : 2,
            mealPreference: subscriptionItem.subscriptionDetails?.preference || 'veg',
            deliverySlot: subSlot,
            frequency: subFrequency,
            status: 'active',
            usedReferral: false
          };
        }

        // BATCH 2: Stage Draft Order
        const draftId = await stageOrderDraft(orderData, subscriptionData);
        
        const createRes = await fetch(`${API_BASE_URL}/api/create-razorpay-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: orderData.totalAmount, draftId, userId: state.currentUser?.uid })
        });
        const createData = await createRes.json();
        
        if (!createRes.ok || !createData.success || !createData.order?.id) {
          throw new Error(createData.error || 'Failed to create secure payment session');
        }

        // Handle Mock Payment in development environments if keys are missing
        if (createData.isMock) {
          toast.success('Test Mode: Payment simulated');
          
          // Mock verification calls canonical promotion on backend
          const verifyRes = await fetch(`${API_BASE_URL}/api/verify-razorpay-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              razorpay_order_id: createData.order.id, 
              razorpay_payment_id: 'mock_payment', 
              razorpay_signature: 'mock_signature',
              draftId 
            })
          });
          const verifyData = await verifyRes.json();
          
          if (verifyData.success) {
            if (state.currentUser) {
              await updateDoc(doc(getDb(), 'users', state.currentUser.uid), {
                'preferences.lastPaymentMethod': state.paymentMethod
              });
            }
            state.clearCart();
            if (state.aiAssisted) logEvent('ai_assisted_checkout', { orderId: draftId, method: 'online' });
            if (hasSubscription) navigate(`${basePath}/subscription?new=true`);
            else navigate(`${basePath}/payment-success`);
            return;
          }
        }

        const options = {
          key: createData.key || 'rzp_live_Sjcjj19nnWXEzX',
          amount: createData.order.amount,
          currency: 'INR',
          name: 'Mana Inti Bojanam',
          description: 'Authentic Telugu Meals',
          order_id: createData.order.id,
          prefill: {
            name: (state.name || '').trim(),
            email: (state.email || '').trim().toLowerCase(),
            contact: (state.phone || '').replace(/\D/g, '').slice(-10)
          },
          theme: {
            color: '#E65100'
          },
          handler: async function (response: any) {
            try {
              setIsPlacingOrder(true);
              
              const verifyRes = await fetch(`${API_BASE_URL}/api/verify-razorpay-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...response, draftId })
              });
              const verifyData = await verifyRes.json();
              
              if (verifyData.success) {
                if (state.currentUser) {
                  await updateDoc(doc(getDb(), 'users', state.currentUser.uid), {
                    'preferences.lastPaymentMethod': state.paymentMethod
                  });
                }
                
                state.clearCart();
                // Store orderId in session to fetch later if needed
                sessionStorage.setItem('lastPendingOrderId', draftId);
                if (hasSubscription) {
                  navigate(`${basePath}/subscription?new=true`);
                } else {
                  if (state.aiAssisted) logEvent('ai_assisted_checkout', { orderId: draftId, method: 'online' });
                  navigate(`${basePath}/payment-success`);
                }
              } else {
                toast.error('Payment verification failed');
                setIsPlacingOrder(false);
              }
            } catch (err: any) {
              console.error(err);
              toast.error(err?.message || 'Payment verification failed. Please try again.');
              setIsPlacingOrder(false);
            }
          },
          modal: {
            ondismiss: function() {
              setIsPlacingOrder(false);
            }
          }
        };

        try {
          if (typeof (window as any).Razorpay === 'undefined') {
            throw new Error("Razorpay SDK failed to load. Please disable your adblocker or try Cash on Delivery.");
          }
          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', function (response: any) {
            toast.error('Payment failed: ' + response.error.description);
            setIsPlacingOrder(false);
          });
          rzp.open();
        } catch (rzpErr: any) {
          console.error("Razorpay SDK Error:", rzpErr);
          toast.error(rzpErr.message || "Could not open payment window. Please check your phone/email.");
          setIsPlacingOrder(false);
        }
        
      } else {
        // COD Flow
        const orderId = await createOrder(orderData);
        if (!orderId) throw new Error('Order creation failed');

        if (state.currentUser) {
          await updateDoc(doc(getDb(), 'users', state.currentUser.uid), {
            'preferences.lastPaymentMethod': state.paymentMethod
          });
        }

        state.clearCart();
        if (state.aiAssisted) logEvent('ai_assisted_checkout', { orderId, method: 'cod' });
        navigate(`${basePath}/order-success?orderId=${encodeURIComponent(orderId)}`, { state: { orderId } });
        setIsPlacingOrder(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to process. Please try again.');
      setIsPlacingOrder(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setIsApplyingPromo(true);
    try {
      const q = query(collection(getDb(), 'coupons'), where('code', '==', promoInput.toUpperCase().trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error('Invalid promo code');
        state.setAppliedCoupon(null);
      } else {
        const coupon = snap.docs[0].data();
        if (!coupon.isActive) {
          toast.error('This promo code is no longer active');
        } else if (state.total < Number(coupon.minOrder || 0)) {
          toast.error(`Minimum order amount for this code is ${formatPrice(coupon.minOrder)}`);
        } else {
          state.setAppliedCoupon(coupon);
          toast.success('Promo code applied successfully!');
        }
      }
    } catch (err) {
      console.error('Promo error', err);
      toast.error('Failed to verify promo code');
    } finally {
      setIsApplyingPromo(false);
    }
  };



  if (state.cart.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 dark:bg-[#111111] p-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-48 h-48 mb-6 relative flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse opacity-50 blur-xl"></div>
          <div className="absolute inset-6 bg-red-500/20 rounded-full border border-red-500/30 backdrop-blur-sm"></div>
          <ShoppingCart size={56} className="text-red-500 relative z-10" strokeWidth={1.5} />
        </motion.div>
        <motion.h2 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight"
        >
          Your dining table is waiting
        </motion.h2>
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto leading-relaxed"
        >
          Let's fill it with some hot, home-style food.
        </motion.p>
        <motion.button 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={() => navigate(tenantSlug ? `/k/${tenantSlug}/menu` : '/menu')} 
          className="mib-primary-action w-full max-w-[280px]"
        >
          Browse Menu
        </motion.button>
      </div>
    );
  }

  const selectedSavedAddress = state.userProfile?.savedAddresses?.find(a => a.id === state.selectedAddressId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-[calc(8rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 sticky top-0 z-30 shadow-sm border-b border-gray-100 dark:border-gray-800" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center px-4 py-4 gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-black text-gray-900 dark:text-white">
              {hasSubscription ? 'Setup Subscription' : 'Checkout'}
            </h1>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              {hasSubscription ? '30-Day Meal Plan' : `${state.cart.length} items`}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        
        {/* Subscription Specialized Card */}
        {hasSubscription && subscriptionItem && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles size={100} />
            </div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{subscriptionItem.name}</h3>
                  <p className="text-indigo-100/80 text-xs font-bold uppercase tracking-widest mt-1">Monthly Subscription</p>
                </div>
                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                  30 Days
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Start Date</p>
                  <p className="font-bold text-sm">{new Date(subStartDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Meal Slot</p>
                  <p className="font-bold text-sm capitalize">{subSlot.replace('_', ' + ')}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-indigo-100">
                <Check size={14} className="text-green-400" />
                <span>Pause or resume anytime (upto 7 days)</span>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* 1. Order Summary Card (Items First) - Only for regular orders */}
        {!hasSubscription && (
          <motion.div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg">Your Order</h2>
              <p className="text-xs font-semibold text-gray-500 mt-1.5 flex items-center gap-1.5"><Clock size={14} className="text-gray-400"/> Freshly prepared after your order</p>
            </div>
            
            <div className="space-y-0">
              {state.cart.map((item, idx) => (
                <div key={item.id} className={`flex justify-between items-center gap-4 py-3 ${idx !== state.cart.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Utensils size={12} className="text-red-500 shrink-0" />
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-none">{item.name}</p>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 w-[84px] h-7 shadow-sm">
                      <button 
                        type="button"
                        onClick={() => state.updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-full flex items-center justify-center text-red-600 dark:text-red-400"
                      >
                        <Minus size={12} strokeWidth={3} />
                      </button>
                      <span className="text-xs font-black text-gray-900 dark:text-white">{item.quantity}</span>
                      <button 
                        type="button"
                        onClick={() => state.updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-full flex items-center justify-center text-red-600 dark:text-red-400"
                      >
                        <Plus size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-sm font-black text-gray-900 dark:text-white">{formatPrice(item.price * item.quantity)}</span>
                    {item.quantity > 1 && (
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{formatPrice(item.price)} per unit</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="relative">
                <textarea
                  placeholder="Any special instructions? (e.g. Please bring change for ₹500, Ring the bell)"
                  className="w-full pl-4 pr-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm resize-none h-[80px] shadow-sm"
                  value={state.specialInstructions || ''}
                  onChange={(e) => state.setSpecialInstructions(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. Bill Details - Premium Editorial Card */}
        <motion.div 
          className="bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800"
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
        >
          <div className="px-6 py-5 border-b border-gray-50 dark:border-white/5">
            <h3 className="font-black text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Bill Summary</h3>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Promo Code Section */}
            {!hasSubscription && (
              <div className="mb-2">
                {state.appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Sparkles size={16} />
                      <span className="font-bold text-sm">'{state.appliedCoupon.code}' applied</span>
                    </div>
                    <button onClick={() => { state.setAppliedCoupon(null); setPromoInput(''); }} className="text-xs font-black text-red-500 uppercase tracking-wider">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-white/5">
                    <input 
                      type="text" placeholder="HAVE A PROMO CODE?" value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-transparent px-3 py-2 text-[10px] font-black text-gray-900 dark:text-white uppercase outline-none placeholder:text-gray-500"
                    />
                    <button 
                      type="button"
                      onClick={handleApplyPromo} 
                      disabled={!promoInput.trim() || isApplyingPromo} 
                      className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 min-h-[36px]"
                    >
                      {isApplyingPromo ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Item Total</span>
                <span className="font-bold text-gray-900 dark:text-white tabular-nums">{formatPrice(state.total)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <div className="flex flex-col">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Delivery Partner Fee</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white tabular-nums">
                  {state.orderType === 'pickup' || state.deliveryFee === 0 ? <span className="text-emerald-500">FREE</span> : formatPrice(state.deliveryFee)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <div className="flex flex-col">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Taxes and Charges</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">GST ({state.fees.gst}%) + Packaging</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white tabular-nums">{formatPrice(state.gstAmount + state.packingFee)}</span>
              </div>

              {state.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-500 font-bold">
                  <span>Offer Applied</span>
                  <span className="tabular-nums">- {formatPrice(state.discountAmount)}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Grand Total</span>
                <motion.span 
                  key={state.finalTotal}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter tabular-nums"
                >
                  {formatPrice(state.finalTotal)}
                </motion.span>
              </div>
            </div>
          </div>

          {/* Trust Shield Section Integrated into Card */}
          <div className="bg-gray-50 dark:bg-white/[0.02] px-6 py-4 flex items-center gap-3">
             <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <ShieldCheck size={18} />
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">
                Securely handled & verified for hygiene
             </p>
          </div>
        </motion.div>

        {/* Smart Recommendations Moved Here - Only for regular orders */}
        {!hasSubscription && recommendations.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Sparkles size={16} /></div>
                <div>
                  <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight">Add more?</h3>
                  <p className="text-[10px] text-gray-500 font-bold">Hand-picked pairings for you</p>
                </div>
              </div>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-2 -mx-2 px-2 no-scrollbar">
              {loadingRecommendations ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={`skel-${i}`} className="w-[140px] flex-shrink-0">
                    <Skeleton className="h-24 w-full rounded-2xl mb-2" />
                    <Skeleton className="h-4 w-3/4 rounded mb-1" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                ))
              ) : recommendations.map(item => (
                <div key={item.id} className="w-[140px] flex-shrink-0 bg-gray-50 dark:bg-gray-950/50 border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col group relative">
                  <div className="h-24 w-full relative">
                    <img src={item.image} alt={item.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-3 flex flex-col flex-1 bg-white dark:bg-gray-900/50">
                    <p className="text-[11px] font-black text-gray-900 dark:text-white line-clamp-2 leading-tight flex-1 mb-2">{item.name}</p>
                    <div className="flex items-center justify-between w-full mt-auto">
                      <span className="text-xs font-black">{formatPrice(item.price)}</span>
                      <button type="button" onClick={() => { state.addToCart(item); toast.success(`Added ${item.name}`); }} className="bg-red-600 text-white px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">Add</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        
        {/* 3. Delivery / Pickup Toggle - Hide for Subscriptions */}
        {!hasSubscription && (
          <div className="bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl flex relative border border-gray-200 dark:border-white/5 shadow-inner">
            <motion.div
              className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] bg-gradient-to-r from-red-600 to-orange-500 rounded-xl shadow-md z-0"
              animate={{ x: state.orderType === 'pickup' ? '100%' : '0%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
            <button type="button" onClick={() => state.setOrderType('delivery')} className={`flex-1 py-3 text-sm font-black z-10 transition-colors duration-300 ${state.orderType === 'delivery' ? 'text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}>Delivery</button>
            <button type="button" onClick={() => state.setOrderType('pickup')} className={`flex-1 py-3 text-sm font-black z-10 transition-colors duration-300 ${state.orderType === 'pickup' ? 'text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}>Pickup</button>
          </div>
        )}

        {/* 4. Address Card */}
        <AnimatePresence mode="popLayout">
          {state.orderType === 'delivery' ? (
            <motion.div key="delivery" className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h2 className="font-black text-gray-900 dark:text-white leading-none mb-1">Deliver to</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saved Address</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowAddressModal(true)} className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-500/10 px-3 py-2 rounded-xl active:scale-95 transition-transform">Change</button>
              </div>

              {state.addressText ? (
                <div className="bg-gray-50 dark:bg-gray-950/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                  <h3 className="font-black text-gray-900 dark:text-white text-base mb-1">{selectedSavedAddress?.label || 'Custom Address'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed pr-6">{state.addressText}</p>
                </div>
              ) : (
                <button type="button" onClick={() => setShowAddressModal(true)} className="w-full py-6 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-orange-500 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all">
                  <Plus size={24} /> 
                  <span className="font-black text-xs uppercase tracking-widest">Add New Address</span>
                </button>
              )}
              <div className="pl-11 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">Full Name</label>
                  <input 
                    type="text" placeholder="e.g. Viswa Teja" 
                    autoComplete="off"
                    className={`w-full p-3.5 rounded-xl border ${!state.name && isPlacingOrder ? 'border-red-500 bg-red-50/50' : 'border-gray-100 dark:border-white/5'} bg-gray-50 dark:bg-gray-950 text-base font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 transition-all`} 
                    value={state.name || ''} 
                    onChange={(e) => state.setName(e.target.value)} 
                  />
                  {!state.name && isPlacingOrder && <p className="text-[10px] font-bold text-red-500 ml-1">Name is required for delivery</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">Phone Number</label>
                  <input 
                    type="tel" placeholder="10-digit mobile number" 
                    autoComplete="off"
                    className={`w-full p-3.5 rounded-xl border ${!state.phone && isPlacingOrder ? 'border-red-500 bg-red-50/50' : 'border-gray-100 dark:border-white/5'} bg-gray-50 dark:bg-gray-950 text-base font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 transition-all`} 
                    value={state.phone || ''} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      state.setPhone(val);
                    }} 
                  />
                  {!state.phone && isPlacingOrder && <p className="text-[10px] font-bold text-red-500 ml-1">Phone number is required for delivery updates</p>}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="pickup" className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center shrink-0"><MapPin size={20} /></div>
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white text-lg">Pickup from Restaurant</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Pari residency, ManjariBk, Morewasti, Pune, 412307</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <input type="text" placeholder="Your Name" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white outline-none" value={state.name || ''} onChange={(e) => state.setName(e.target.value)} />
                <input type="tel" placeholder="Phone Number" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white outline-none" value={state.phone || ''} onChange={(e) => state.setPhone(e.target.value)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. Delivery Timing - Hide for Subscriptions */}
        {!hasSubscription && (
          <motion.div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-red-500" />
                <h2 className="font-bold text-gray-900 dark:text-white">Delivery Time</h2>
              </div>
              {state.deliveryTimeSlot.includes('ASAP') && (
                <span className="text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg uppercase tracking-wider">Fastest Delivery</span>
              )}
            </div>
            
            <div className="space-y-4">
              {/* Today's Slots */}
              {deliverySlots.filter(s => s.includes('Today') || s.includes('ASAP')).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Today</p>
                  <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
                    {deliverySlots.filter(s => s.includes('Today') || s.includes('ASAP')).map(slot => (
                      <button 
                        key={slot} 
                        type="button"
                        onClick={() => state.setDeliveryTimeSlot(slot)} 
                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 font-bold text-xs transition-all ${
                          state.deliveryTimeSlot === slot 
                            ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' 
                            : 'border-gray-50 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-red-200'
                        }`}
                      >
                        {slot.replace('Today, ', '').replace('Standard Delivery (ASAP)', 'ASAP (30-45 mins)')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tomorrow's Slots */}
              {deliverySlots.filter(s => s.includes('Tomorrow')).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Tomorrow</p>
                  <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
                    {deliverySlots.filter(s => s.includes('Tomorrow')).map(slot => (
                      <button 
                        key={slot} 
                        type="button"
                        onClick={() => state.setDeliveryTimeSlot(slot)} 
                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 font-bold text-xs transition-all ${
                          state.deliveryTimeSlot === slot 
                            ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' 
                            : 'border-gray-50 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-red-200'
                        }`}
                      >
                        {slot.replace('Tomorrow, ', '')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 6. Payment Method Card */}
        <motion.div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-4"><CreditCard size={20} className="text-red-500" /><h2 className="font-bold text-gray-900 dark:text-white">Payment Method</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" onClick={() => state.setPaymentMethod('online')} className={`p-4 rounded-xl border-2 text-left transition-all ${state.paymentMethod === 'online' ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : 'border-gray-100 dark:border-gray-800'}`}>
              <div className="flex justify-between items-center mb-1"><span className="font-bold">Online</span>{state.paymentMethod === 'online' && <Check size={16} className="text-red-600" />}</div>
              <p className="text-xs text-gray-500">UPI, Cards, Wallets</p>
            </button>
            <button type="button" onClick={() => !hasSubscription && state.setPaymentMethod('cod')} disabled={hasSubscription} className={`p-4 rounded-xl border-2 text-left transition-all ${state.paymentMethod === 'cod' ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : 'border-gray-100 dark:border-gray-800'} ${hasSubscription ? 'opacity-50' : ''}`}>
              <div className="flex justify-between items-center mb-1"><span className="font-bold">COD</span>{state.paymentMethod === 'cod' && <Check size={16} className="text-red-600" />}</div>
              <p className="text-xs text-gray-500">Cash on Delivery</p>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Trust Badges */}
      <div className="max-w-lg mx-auto px-6 pb-32 pt-4 space-y-4">
        <div className="flex items-center gap-4 bg-green-50/50 dark:bg-green-900/10 p-3 rounded-2xl border border-green-100 dark:border-green-900/20">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0"><Lock size={20} className="text-green-600" /></div>
          <div><p className="text-sm font-black text-green-900 dark:text-green-400">100% Safe & Secure Payments</p><p className="text-[10px] font-bold text-green-600/80 uppercase tracking-widest">PCI DSS Compliant</p></div>
        </div>
        <div className="flex items-center gap-4 bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-2xl border border-orange-100 dark:border-orange-900/20">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0"><Check size={18} className="text-orange-600" strokeWidth={3} /></div>
          <div><p className="text-sm font-black text-orange-900 dark:text-orange-400">FSSAI Certified Kitchen</p><p className="text-[10px] font-bold text-orange-600/80 uppercase tracking-widest">Lic No. 21524083006390</p></div>
        </div>
      </div>

      {/* STICKY BOTTOM ACTION */}
      <div className="fixed bottom-0 inset-x-0 z-[45] p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto flex items-center gap-4">
           <div className="flex flex-col">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Pay via {state.paymentMethod.toUpperCase()}</p>
              <p className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">{formatPrice(state.finalTotal)}</p>
           </div>
           
           <div className="flex-1 relative">
             <motion.div
               className="relative h-14 rounded-2xl overflow-hidden flex items-center justify-center group shadow-[0_12px_24px_-12px_rgba(255,107,53,0.5)]"
             >
               <AnimatePresence mode="wait">
                 {isPlacingOrder ? (
                   <motion.div
                     key="loading"
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     className="flex items-center gap-3 w-full h-full bg-gradient-to-br from-orange-500 to-red-600 text-white font-black uppercase tracking-widest text-xs justify-center"
                   >
                     <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                     Securing Order...
                   </motion.div>
                 ) : (
                   <motion.button
                     key="action"
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     onClick={() => {
                        triggerHaptic('medium');
                        handlePlaceOrder();
                     }}
                     className="w-full h-full bg-gradient-to-br from-[#ff6b35] to-[#ff9f1c] hover:from-[#ff8a65] hover:to-[#ffb366] text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 group-active:scale-95 transition-all"
                   >
                     {hasSubscription ? 'Pay & Subscribe' : 'Place Order'}
                     <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                   </motion.button>
                 )}
               </AnimatePresence>
             </motion.div>
           </div>
        </div>
      </div>

      <LocationPicker 
        isOpen={showLocationPicker} 
        onClose={() => setShowLocationPicker(false)} 
        onLocationSelect={handleLocationSelect} 
      />

      <AnimatePresence>
        {showAddressModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddressModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select</p>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Delivery Address</h3>
                </div>
                <button onClick={() => setShowAddressModal(false)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
                {state.userProfile?.savedAddresses?.map((addr: any) => (
                  <button
                    key={addr.id}
                    onClick={() => {
                      triggerHaptic('light');
                      state.setSelectedAddressId(addr.id);
                      state.setAddressText(addr.address);
                      setShowAddressModal(false);
                    }}
                    className={cn(
                      "w-full p-4 rounded-2xl text-left border transition-all",
                      state.selectedAddressId === addr.id 
                        ? "bg-red-500/5 border-red-500 shadow-sm" 
                        : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 hover:border-gray-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                       <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg", 
                         state.selectedAddressId === addr.id ? "bg-red-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500")}>
                         {addr.label}
                       </span>
                       {state.selectedAddressId === addr.id && <Check size={16} className="text-red-500" />}
                    </div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-relaxed">{addr.address}</p>
                  </button>
                ))}
                
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    setShowLocationPicker(true);
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest hover:border-red-500/50 hover:text-red-500 transition-all"
                >
                  <Plus size={16} /> Add New Address
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full-screen Loading Overlay for Placing Order */}
      <AnimatePresence>
        {isPlacingOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-gray-100 dark:border-gray-800"></div>
              <div className="absolute inset-0 rounded-full border-4 border-red-500 border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl animate-pulse">🍲</span></div>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 text-center tracking-tight">{state.paymentMethod === 'online' ? 'Securely processing...' : 'Confirming your order...'}</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-center max-w-xs text-sm">Please do not close this window or press back. We are finalizing your delicious meal.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Checkout;
