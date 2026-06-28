import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useDeliveryState } from '../lib/useDeliveryState';
import { onSnapshot, doc } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { useTenant } from '../context/TenantContext';
import { isTenantStoreOpenNow, resolveStoreSettings } from '../lib/tenantStoreOperations';
import { resolveTenantPricing } from '../lib/tenantCheckoutConfig';
import type { TenantInfo } from '../context/TenantContext';

export function useCheckoutState() {
  const { cart, total, clearCart, updateQuantity, removeFromCart, addToCart, aiAssisted } = useCart();
  const { currentUser, userProfile } = useAuth();
  const { tenantId, tenantInfo } = useTenant();
  const [deliveryState, setDeliveryState] = useDeliveryState();

  const [globalFees, setGlobalFees] = useState<Record<string, any>>({});
  const [liveTenant, setLiveTenant] = useState<TenantInfo | null>(tenantInfo);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isProcessing, setIsProcessing] = useState(false);

  const loadStored = (key: string, defaultValue: string) => {
    try { return localStorage.getItem(key) || defaultValue; } catch { return defaultValue; }
  };

  const [name, setName] = useState(loadStored('checkout_name', ''));
  const [phone, setPhone] = useState(loadStored('checkout_phone', ''));
  const [email, setEmail] = useState('');

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressText, setAddressText] = useState(loadStored('checkout_address', ''));

  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('cod');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState('ASAP');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const hasInitialized = useRef(false);
  const paymentInitialized = useRef(false);

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
    setLiveTenant(tenantInfo);
  }, [tenantInfo]);

  useEffect(() => {
    try {
      getDb();
    } catch (e) {
      return;
    }

    let unsubGlobal: (() => void) | undefined;
    let unsubTenant: (() => void) | undefined;

    try {
      if (!tenantId || tenantId === 'mana-inti') {
        unsubGlobal = onSnapshot(doc(getDb(), 'adminSettings', 'global'), (snap) => {
          if (snap.exists()) setGlobalFees(snap.data() as Record<string, any>);
        });
      }

      if (tenantId) {
        unsubTenant = onSnapshot(doc(getDb(), 'tenants', tenantId), (snap) => {
          if (snap.exists()) {
            setLiveTenant({ id: snap.id, ...snap.data() } as TenantInfo);
          }
        });
      }
    } catch (e) {}

    return () => {
      if (unsubGlobal) unsubGlobal();
      if (unsubTenant) unsubTenant();
    };
  }, [tenantId]);

  const pricing = useMemo(
    () => resolveTenantPricing(tenantId, liveTenant, globalFees),
    [tenantId, liveTenant, globalFees]
  );

  const storeSettings = useMemo(
    () => resolveStoreSettings(liveTenant, tenantId === 'mana-inti' ? globalFees : null),
    [liveTenant, globalFees, tenantId]
  );

  const isStoreOpen = isTenantStoreOpenNow(storeSettings, currentTime);

  useEffect(() => {
    if (!currentUser && !hasInitialized.current) return;

    if (userProfile && !hasInitialized.current) {
      if (!name) setName(userProfile.name || currentUser?.displayName || '');
      if (!phone) setPhone(userProfile.phone || '');
      if (!email) setEmail(userProfile.email || currentUser?.email || '');
      hasInitialized.current = true;
    }

    if (deliveryState.selectedAddress) {
      setSelectedAddressId(deliveryState.selectedAddress.id);
      setAddressText(deliveryState.selectedAddress.addressText || deliveryState.selectedAddress.address);
    } else if (userProfile?.savedAddresses && userProfile.savedAddresses.length > 0) {
      const defaultAddr = userProfile.savedAddresses.find((a: any) => a.isDefault) || userProfile.savedAddresses[0];
      setSelectedAddressId(defaultAddr.id);
      setAddressText(defaultAddr.address);

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
          isDefault: defaultAddr.isDefault,
        },
      }));
    }
  }, [currentUser, userProfile, deliveryState]);

  useEffect(() => {
    if (!liveTenant?.paymentConfig || paymentInitialized.current) return;
    const codOn = liveTenant.paymentConfig.providers?.cod?.enabled !== false;
    const onlineOn = liveTenant.paymentConfig.providers?.razorpay?.enabled === true;
    if (onlineOn && !codOn) {
      setPaymentMethod('online');
    } else {
      setPaymentMethod('cod');
    }
    paymentInitialized.current = true;
  }, [liveTenant?.paymentConfig]);

  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');

  const isRaining = globalFees?.isRaining || false;
  const activeOrders = globalFees?.activeOrders || 0;

  const { calculatedFee, cheapestPartner, displayFee } = useMemo(() => {
    try {
      if (orderType === 'pickup') {
        return { calculatedFee: 0, cheapestPartner: null, displayFee: 0 };
      }

      const addressFee = deliveryState.selectedAddress?.deliveryFee;
      let fee =
        typeof addressFee === 'number' && addressFee >= 0
          ? addressFee
          : pricing.feesConfigured
            ? pricing.baseDeliveryFee
            : 0;
      const appliedModifiers: string[] = [];

      if (pricing.peakPricingEnabled) {
        const hour = new Date().getHours();
        const isPeak = (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 22);
        if (isPeak) { fee += 10; appliedModifiers.push('peak'); }
      }

      if (pricing.surgeEnabled && isRaining) { fee += 15; appliedModifiers.push('rain'); }

      if (pricing.surgeEnabled) {
        const surgeMultiplier = Math.min(1 + activeOrders / 50, 1.5);
        fee = Math.round(fee * surgeMultiplier);
        if (surgeMultiplier > 1) appliedModifiers.push(`surge(${surgeMultiplier.toFixed(1)}x)`);
      }

      const safeFee = Math.max(Math.round(fee), 0);
      return {
        calculatedFee: safeFee,
        cheapestPartner: { partner: 'native', cost: 0 },
        displayFee: safeFee,
      };
    } catch (err) {
      console.error('[Pricing Failsafe]', err);
      return { calculatedFee: 0, cheapestPartner: null, displayFee: 0 };
    }
  }, [
    orderType,
    pricing.feesConfigured,
    pricing.baseDeliveryFee,
    pricing.peakPricingEnabled,
    pricing.surgeEnabled,
    deliveryState.selectedAddress?.deliveryFee,
    isRaining,
    activeOrders,
  ]);

  const baseDeliveryFee = displayFee;
  const qualifiesForFreeDelivery =
    pricing.freeDeliveryThreshold < Infinity && total >= pricing.freeDeliveryThreshold;

  const deliveryFee =
    orderType === 'pickup'
      ? 0
      : qualifiesForFreeDelivery
        ? 0
        : orderType === 'delivery'
          ? baseDeliveryFee
          : 0;

  const gstAmount = pricing.gstPercent > 0 ? (total * pricing.gstPercent) / 100 : 0;
  const packingFee = pricing.packingFee > 0 ? pricing.packingFee : 0;

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

  const fees = {
    gst: pricing.gstPercent,
    packingFee: pricing.packingFee,
    deliveryFee: pricing.baseDeliveryFee,
    feesConfigured: pricing.feesConfigured,
    isStoreOpen,
    storeTiming: storeSettings.storeTiming,
  };

  return {
    cart, total, clearCart, updateQuantity, removeFromCart, addToCart, currentUser, userProfile, aiAssisted,
    name, setName, phone, setPhone, email, setEmail,
    selectedAddressId, setSelectedAddressId, addressText, setAddressText,
    paymentMethod, setPaymentMethod, agreedToTerms, setAgreedToTerms,
    deliveryTimeSlot, setDeliveryTimeSlot,
    specialInstructions, setSpecialInstructions,
    appliedCoupon, setAppliedCoupon, discountAmount,
    fees, gstAmount, packingFee, deliveryFee, finalTotal, baseDeliveryFee, cheapestPartner,
    FREE_DELIVERY_THRESHOLD: pricing.freeDeliveryThreshold,
    isProcessing, setIsProcessing, deliveryState, setDeliveryState,
    orderType, setOrderType,
    pricingConfigured: pricing.feesConfigured,
    taxesConfigured: pricing.gstPercent > 0 || pricing.packingFee > 0,
  };
}
