type CheckoutState = {
  name?: string;
  phone?: string;
  email?: string;
  houseFlat?: string;
  area?: string;
  landmark?: string;
  city?: string;
  pincode?: string;
  paymentMethod?: string;
  selectedSlot?: any;
  deliveryTimeSlot?: string;
  agreedToTerms?: boolean;
  instructions?: any;
  couponCode?: string;
  appliedCoupon?: any;
};

const shouldRestoreCheckoutState = (checkoutState: CheckoutState, currentUser: unknown) => {
  return Boolean(
    currentUser ||
    checkoutState.name ||
    checkoutState.phone ||
    checkoutState.email ||
    checkoutState.selectedSlot ||
    checkoutState.deliveryTimeSlot ||
    checkoutState.agreedToTerms ||
    checkoutState.couponCode ||
    checkoutState.appliedCoupon
  );
};

const shouldPersistCheckoutState = (checkoutState: CheckoutState) => {
  return Boolean(
    checkoutState.name ||
    checkoutState.phone ||
    checkoutState.email ||
    checkoutState.houseFlat ||
    checkoutState.area ||
    checkoutState.landmark ||
    checkoutState.pincode ||
    checkoutState.agreedToTerms ||
    checkoutState.selectedSlot ||
    (checkoutState.deliveryTimeSlot && checkoutState.deliveryTimeSlot !== 'ASAP') ||
    checkoutState.couponCode ||
    checkoutState.appliedCoupon
  );
};

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// Guard: guest returns after add-more-items flow with schedule selected but no personal details.
const guestDraft: CheckoutState = {
  selectedSlot: {
    value: '1740000000000',
    label: 'Tomorrow 6:00 PM',
    isASAP: false
  },
  deliveryTimeSlot: '1740000000000'
};

assert(shouldPersistCheckoutState(guestDraft), 'Checkout draft with a selected slot must persist.');
assert(shouldRestoreCheckoutState(guestDraft, null), 'Guest checkout should restore selected slot state even without name/email.');

console.log('checkoutScheduleGuard: PASS');
