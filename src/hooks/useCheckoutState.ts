import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useDeliveryState } from '../lib/useDeliveryState';
import { onSnapshot, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { useTenant } from '../context/TenantContext';
import { isTenantStoreOpenNow, resolveStoreSettings } from '../lib/tenantStoreOperations';
import { calculateDeliveryFee as apiCalculateDeliveryFee } from '../services/api';

export function useCheckoutState() {
  const { cart, total, clearCart, updateQuantity, removeFromCart, addToCart, aiAssisted } = useCart();
  const { currentUser, userProfile } = useAuth();
  const { tenantId } = useTenant();
  const [deliveryState, setDeliveryState] = useDeliveryState();

  const [fees, setFees] = useState({ gst: 5, packingFee: 10, deliveryFee: 30, isStoreOpen: true, storeTiming: { openTime: '10:00', closeTime: '22:00' } });
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isProcessing, setIsProcessing] = useState(false);
  
  // Try to load from localStorage first
  const loadStored = (key: string, defaultValue: string) => {
    try { return localStorage.getItem(key) || defaultValue; } catch { return defaultValue; }
  };

  // Details
  const [name, setName] = useState(loadStored('checkout_name', ''));
  const [phone, setPhone] = useState(loadStored('checkout_phone', ''));
  const [email, setEmail] = useState('');
  
  // Address
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressText, setAddressText] = useState(loadStored('checkout_address', '')); // Fallback manual address or structured address

  // Preferences
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState('ASAP');
  
  // Special Instructions
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Promo Code
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const hasInitialized = useRef(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      if (name) localStorage.setItem('checkout_name', name);
      if (phone) localStorage.setItem('checkout_phone', phone);
      if (addressText) localStorage.setItem('checkout_address', addressText);
    } catch (e) {}
  }, [name, phone, addressText]);

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

    let unsub: (() => void) | undefined;
    let unsubTenant: (() => void) | undefined;
    try {
      unsub = onSnapshot(doc(getDb(), 'adminSettings', 'global'), (snap) => {
        if (snap.exists()) {
          const globalData = snap.data() as any;
          setFees((prev) => ({
            ...prev,
            ...globalData,
            isStoreOpen: prev.isStoreOpen,
            storeTiming: prev.storeTiming,
          }));
        }
      });

      if (tenantId) {
        unsubTenant = onSnapshot(doc(getDb(), 'tenants', tenantId), (snap) => {
          const resolved = resolveStoreSettings(snap.exists() ? snap.data() : null);
          setFees((prev) => ({
            ...prev,
            isStoreOpen: isTenantStoreOpenNow(resolved),
            storeTiming: {
              openTime: resolved.storeTiming.openTime,
              closeTime: resolved.storeTiming.closeTime,
            },
          }));
        });
      }
    } catch (e) {}

    return () => {
      if (unsub) unsub();
      if (unsubTenant) unsubTenant();
    };
  }, [tenantId]);

  useEffect(() => {
    if (!currentUser && !hasInitialized.current) return;
    
    // Initialize profile details once
    if (userProfile && !hasInitialized.current) {
      if (!name) setName(userProfile.name || currentUser?.displayName || '');
      if (!phone) setPhone(userProfile.phone || '');
      if (!email) setEmail(userProfile.email || currentUser?.email || '');
      hasInitialized.current = true;
    }

    // Sync delivery state continuously
    if (deliveryState.selectedAddress) {
      setSelectedAddressId(deliveryState.selectedAddress.id);
      setAddressText(deliveryState.selectedAddress.addressText || deliveryState.selectedAddress.address);
    } else if (userProfile?.savedAddresses && userProfile.savedAddresses.length > 0) {
      const defaultAddr = userProfile.savedAddresses.find((a: any) => a.isDefault) || userProfile.savedAddresses[0];
      setSelectedAddressId(defaultAddr.id);
      setAddressText(defaultAddr.address);
      
      // Update global delivery state so header and other components sync
      setDeliveryState((prev: any) => ({
        ...prev,
        selectedAddress: {
          id: defaultAddr.id,
          label: defaultAddr.label || 'Home',
          address: defaultAddr.address,
          houseNumber: defaultAddr.houseNumber,
          buildingName: defaultAddr.buildingName,
          landmark: defaultAddr.landmark,
          city: defaultAddr.city,
          pincode: defaultAddr.pincode,
          lat: defaultAddr.lat || 0,
          lng: defaultAddr.lng || 0,
          isDefault: defaultAddr.isDefault
        }
      }));
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

      const finalDeliveryFee = Math.max(fee, 0); // Allow 0 for free delivery
      const partnerCost = 0;
      const cheapest = ['native'];
      
      const safeFee = Math.round(finalDeliveryFee);
      const cappedDisplayFee = safeFee; // Remove max limit to respect tenant rules

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
    isProcessing, setIsProcessing, deliveryState, setDeliveryState,
    orderType, setOrderType
  };
}
