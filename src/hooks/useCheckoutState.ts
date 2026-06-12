import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useDeliveryState } from '../lib/useDeliveryState';
import { onSnapshot, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { calculateDeliveryFee as apiCalculateDeliveryFee } from '../services/api';

export function useCheckoutState() {
  const { cart, total, clearCart, updateQuantity, removeFromCart, addToCart, aiAssisted } = useCart();
  const { currentUser, userProfile } = useAuth();
  const [deliveryState, setDeliveryState] = useDeliveryState();

  const [fees, setFees] = useState({ gst: 5, packingFee: 10, deliveryFee: 30, isStoreOpen: true, storeTiming: { openTime: '10:00', closeTime: '22:00' } });
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isProcessing, setIsProcessing] = useState(false);
  
  // Details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // Address
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressText, setAddressText] = useState(''); // Fallback manual address or structured address

  // Preferences
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState('ASAP');
  
  // Special Instructions
  // Special Instructions
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Promo Code
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const hasInitialized = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      getDb();
    } catch (e) {
      return;
    }

    let unsub: any;
    try {
      unsub = onSnapshot(doc(getDb(), 'adminSettings', 'global'), (snap) => {
        if (snap.exists()) {
          setFees(snap.data() as any);
        }
      });
    } catch (e) {}

    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    if (!currentUser || hasInitialized.current) return;
    
    if (userProfile) {
      if (!name) setName(userProfile.name || currentUser.displayName || '');
      if (!phone) setPhone(userProfile.phone || '');
      if (!email) setEmail(userProfile.email || currentUser.email || '');

      // if (userProfile.preferences?.lastPaymentMethod) {
      //   setPaymentMethod(userProfile.preferences.lastPaymentMethod);
      // }

      if (deliveryState.selectedAddress) {
        setSelectedAddressId(deliveryState.selectedAddress.id);
        setAddressText(deliveryState.selectedAddress.address);
      } else if (userProfile.savedAddresses && userProfile.savedAddresses.length > 0) {
        const defaultAddr = userProfile.savedAddresses.find(a => a.isDefault) || userProfile.savedAddresses[0];
        setSelectedAddressId(defaultAddr.id);
        setAddressText(defaultAddr.address);
      }
      
      hasInitialized.current = true;
    }
  }, [currentUser, userProfile, deliveryState]);

  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');

  const FREE_DELIVERY_THRESHOLD = 299;

  const isRaining = (fees as any)?.isRaining || false;
  const activeOrders = (fees as any)?.activeOrders || 0;
  const surgeEnabled = (fees as any)?.surgeEnabled ?? true;
  const peakPricingEnabled = (fees as any)?.peakPricingEnabled ?? true;
  const maxDeliveryFeeCap = (fees as any)?.maxDeliveryFeeCap || 120;
  const globalDeliveryFee = fees?.deliveryFee;

  const { calculatedFee, cheapestPartner, displayFee } = useMemo(() => {
    try {
      if (orderType === 'pickup') {
        return { calculatedFee: 0, cheapestPartner: null, displayFee: 0 };
      }
      
      let fee = deliveryState.selectedAddress?.deliveryFee ?? (globalDeliveryFee !== undefined && globalDeliveryFee !== null ? Number(globalDeliveryFee) : 30);
      let appliedModifiers = [];
      
      const hour = new Date().getHours();
      const isPeak = (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 22);
      if (peakPricingEnabled && isPeak) { fee += 10; appliedModifiers.push('peak'); }
      
      if (isRaining) { fee += 15; appliedModifiers.push('rain'); }
      
      if (surgeEnabled) {
        const surgeMultiplier = Math.min(1 + activeOrders / 50, 1.5);
        fee = Math.round(fee * surgeMultiplier);
        if (surgeMultiplier > 1) appliedModifiers.push(`surge(${surgeMultiplier.toFixed(1)}x)`);
      }

      const finalDeliveryFee = Math.max(fee, 30);
      const partnerCost = 0;
      const cheapest = ['native'];
      
      const safeFee = Math.round(finalDeliveryFee);
      const cappedDisplayFee = Math.min(safeFee, maxDeliveryFeeCap);

      console.log('[Pricing Engine]', {
        finalDeliveryFee: safeFee,
        partnerCost,
        partner: cheapest?.[0],
        modifiers: appliedModifiers
      });

      return { 
        calculatedFee: safeFee, 
        cheapestPartner: { partner: cheapest?.[0] || 'unknown', cost: partnerCost },
        displayFee: cappedDisplayFee
      };
    } catch (err) {
      console.error('[Pricing Failsafe]', err);
      return { calculatedFee: 30, cheapestPartner: null, displayFee: 30 };
    }
  }, [orderType, deliveryState.selectedAddress?.distanceKm, deliveryState.selectedAddress?.deliveryFee, globalDeliveryFee, isRaining, activeOrders, surgeEnabled, peakPricingEnabled, maxDeliveryFeeCap]);

  const baseDeliveryFee = displayFee;
  const deliveryFee = (orderType === 'delivery' && total >= FREE_DELIVERY_THRESHOLD) ? 0 : baseDeliveryFee;
  const gstAmount = (total * Number(fees.gst || 0)) / 100;
  const packingFee = Number(fees.packingFee || 0);
  
  // Calculate Promo Discount
  let discountAmount = 0;
  if (appliedCoupon && total >= (appliedCoupon.minOrder || 0)) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = (total * Number(appliedCoupon.discountValue)) / 100;
      if (appliedCoupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, appliedCoupon.maxDiscount);
      }
    } else {
      discountAmount = Number(appliedCoupon.discountValue);
    }
  }

  const finalTotal = Number(Math.max(0, total + gstAmount + packingFee + deliveryFee - discountAmount).toFixed(2));

  return {
    cart, total, clearCart, updateQuantity, removeFromCart, addToCart, currentUser, userProfile, aiAssisted,
    name, setName, phone, setPhone, email, setEmail,
    selectedAddressId, setSelectedAddressId, addressText, setAddressText,
    paymentMethod, setPaymentMethod, agreedToTerms, setAgreedToTerms,
    deliveryTimeSlot, setDeliveryTimeSlot,
    specialInstructions, setSpecialInstructions,
    appliedCoupon, setAppliedCoupon, discountAmount,
    fees, gstAmount, packingFee, deliveryFee, finalTotal, baseDeliveryFee, cheapestPartner, FREE_DELIVERY_THRESHOLD,
    isProcessing, setIsProcessing, setDeliveryState,
    orderType, setOrderType
  };
}
