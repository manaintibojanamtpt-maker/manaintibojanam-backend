export interface Addon {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  tenantId?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isAvailable: boolean;
  createdAt: any;
  type?: 'veg' | 'non-veg'; // Keep for UI logic
  discount?: number;
  isPopular?: boolean;
  isActive?: boolean;
  rating?: number;
  isVegetarian?: boolean;
  addons?: Addon[];
  isUpsell?: boolean;
  upsellPriority?: number;
  pairWith?: string[];
  isBestSeller?: boolean;
  // Inventory Extensions (Phase 6C)
  stockCount?: number;
  lowStockThreshold?: number;
  autoLockEnabled?: boolean;
}

export interface CartItem {
  id: string;
  menuItemId?: string; // Original menu item ID
  name: string;
  price: number;
  quantity: number;
  selectedAddons?: Addon[];
  discount?: number;
  isSubscription?: boolean;
  subscriptionDetails?: {
    preference?: string;
    startDate?: string;
    slot?: string;
    frequency?: 'daily' | 'mon-fri' | 'custom';
  };
  isRecurringAddon?: boolean;
  image?: string;
}

/**
 * OrderItem - Immutable pricing snapshot from time of order
 * Used to preserve per-item pricing even if menu prices change
 * CRITICAL: This replaces CartItem in Order.items for accurate invoicing
 */
export interface OrderItem {
  menuItemId: string;        // Reference to MenuItem.id
  name: string;              // Item name (immutable copy)
  unitPrice: number;         // Price per unit at time of order
  quantity: number;          // Quantity ordered
  addOns?: Array<{          // Optional add-ons (toppings, sides, etc.)
    id: string;
    name: string;
    price: number;
    selected: boolean;
  }>;
  addOnsTotal?: number;      // Sum of selected add-on prices
  lineSubtotal: number;      // unitPrice * quantity
  discount?: number;         // Per-item discount amount
  discountApplied?: boolean;
  lineTax?: number;          // Tax on this line item
  lineTotal: number;         // Final amount for this line (unitPrice * quantity + addOnsTotal + lineTax - discount)
  notes?: string;            // Special instructions for this item
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  isDefault: boolean;
  lat?: number;
  lng?: number;
  houseNumber?: string;
  buildingName?: string;
  landmark?: string;
  city?: string;
  pincode?: string;
}

export interface UserProfile {
  userId: string;
  tenantId?: string;
  name: string;
  displayName?: string;
  phone: string;
  email: string;
  address: string;
  role: 'user' | 'admin' | 'owner' | 'superadmin';
  referralCode?: string;     // Unique referral code for this user
  fcmTokens?: string[];      // For push notifications
  savedAddresses?: SavedAddress[];
  preferences?: {
    lastPaymentMethod?: 'online' | 'cod';
    spiceLevel?: 'less' | 'normal' | 'extra';
    noCutlery?: boolean;
    noOnion?: boolean;
    lessOil?: boolean;
  };
  createdAt: any;
  updatedAt: any;
  isSaaSOwner?: boolean;
  ownedTenantIds?: string[];
  // Loyalty & CRM Extensions (Phase 6C)
  bhojanPoints?: number;
  availablePoints?: number;
  lifetimePointsEarned?: number;
  lifetimePointsRedeemed?: number;
  rewardTier?: string;
  lifetimeSpend?: number;
  lastPointsActivityAt?: any;
}

export enum OrderStatus {
  CREATED = 'CREATED',
  CONFIRMED = 'CONFIRMED',
  SCHEDULED = 'SCHEDULED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED',
  FAILED_DELIVERY = 'FAILED_DELIVERY',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  ACTIVE = 'ACTIVE', // For active subscriptions
  // Legacy statuses for backward compatibility
  PLACED = 'PLACED',                  // New alias for PENDING
  ACCEPTED = 'ACCEPTED',              // Admin accepts order
  COURIER_BOOKED = 'COURIER_BOOKED',  // Courier assigned
  PICKED_UP = 'PICKED_UP',            // By courier
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  PENDING = 'PENDING',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_VERIFICATION = 'PAYMENT_VERIFICATION',
  REJECTED = 'REJECTED',
}

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired' | 'pending_verification' | 'verified' | 'paid' | 'unpaid';
export type FulfillmentType = 'instant' | 'scheduled';
export type OrderPhase = 'created' | 'confirmed' | 'scheduled' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled' | 'expired';

export enum FeedbackStatus {
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',      // Order not delivered yet
  PENDING = 'PENDING',                 // Delivered but no feedback given
  SUBMITTED = 'SUBMITTED',             // Feedback already submitted
}

/**
 * OrderTimelineEvent - Immutable audit trail for order lifecycle
 * Tracks every status change, payment event, and significant action
 */
export interface OrderTimelineEvent {
  id: string;
  eventType: 'status_change' | 'payment_verified' | 'payment_failed' | 'courier_assigned' | 'admin_note' | 'feedback_submitted' | 'cancellation';
  description: string;
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
  triggeredBy: 'system' | 'admin' | 'customer' | 'courier';
  triggeredByUser?: string;    // User ID who triggered
  metadata?: Record<string, any>;
  timestamp: any;
}

export interface CourierDispatch {
  id: string;
  tenantId: string;
  orderId: string;
  courierProvider: 'porter' | 'rapido';
  courierTripId?: string;
  trackingUrl?: string;
  riderName?: string;
  riderPhone?: string;
  bookingTime?: any;
  pickupTime?: any;
  estimatedDeliveryTime?: any;
  deliveredTime?: any;
  latestCourierStatus?: string; // From courier API
  latestCourierStatusAt?: any;
  proofOfDeliveryType?: 'photo' | 'signature' | 'auto' | 'manual';
  proofOfDeliveryValue?: string; // URL or value
  exceptionReason?: string; // For failed deliveries
  rawCourierPayload?: any; // Store raw API response for debugging
  createdAt?: any;
  updatedAt?: any;
}

export interface PaymentProof {
  type: 'gateway_webhook' | 'utr' | 'screenshot' | 'admin_marked' | 'cod';
  value: string; // UTR number, screenshot URL, etc.
  submittedAt?: any;
  verifiedAt?: any;
  verifiedBy?: string; // Admin user ID who verified
  riskFlag?: 'none' | 'self_claimed' | 'screenshot_only' | 'duplicate_utr' | 'amount_mismatch';
}

/**
 * OrderFeedback - Customer feedback and rating
 * Submitted after delivery is complete
 */
export interface OrderFeedback {
  id: string;
  tenantId: string;
  orderId: string;
  userId: string;
  rating: number;                    // 1-5 stars
  feedback?: string;                 // Detailed feedback text
  experienceTags?: Array<{           // Structured feedback tags
    category: 'food_quality' | 'delivery_speed' | 'driver_behavior' | 'packaging' | 'app_experience';
    sentiment: 'positive' | 'negative' | 'neutral';
    text?: string;
  }>;
  submittedAt: any;
}

export interface Order {
  id: string;
  tenantId: string;
  userId: string;
  customerName: string;
  phone: string;
  items: OrderItem[];           // Changed from CartItem[] to OrderItem[] (immutable snapshot)
  subtotal: number;
  gst: number;
  packingFee: number;
  deliveryFee: number;
  totalAmount: number;
  distance?: number;
  discountAmount?: number;
  paymentMethod: 'razorpay' | 'cod';
  paymentStatus: PaymentStatus;
  paymentSubmittedAt?: any;
  paymentVerifiedAt?: any;
  paymentProofType?: 'gateway_webhook' | 'utr' | 'screenshot' | 'admin_marked' | 'cod';
  paymentProofValue?: string; // UTR, screenshot URL, etc.
  paymentReferenceNumber?: string;
  paymentVerifiedBy?: string; // Admin user ID
  paymentRiskFlag?: 'none' | 'self_claimed' | 'screenshot_only' | 'duplicate_utr' | 'amount_mismatch';

  fulfillmentType?: FulfillmentType;
  deliveryType?: 'asap' | 'scheduled';
  orderType?: 'instant' | 'scheduled';
  isScheduled?: boolean;
  scheduledDate?: string;
  scheduledTime?: any;
  scheduledFor?: any;
  deliveryTimeSlot?: string;
  prepAlertSent?: boolean;
  
  status: OrderStatus;
  expiresAt?: any;
  prepTime?: number;
  deliveryTime?: number;
  isCOD?: boolean;
  
  // Feedback flow
  feedbackStatus: FeedbackStatus;    // NEW: Track if feedback given
  rating?: number;                   // 1-5 star rating (only if feedbackStatus = SUBMITTED)
  feedback?: string;                 // Customer feedback text
  feedbackTags?: string[];           // e.g., ['food_quality', 'delivery_speed']
  feedbackSubmittedAt?: any;
  
  // Courier/Dispatch fields
  courierDispatchId?: string; // Reference to CourierDispatch document
  courierProvider?: 'porter' | 'rapido';
  courierTripId?: string;
  
  // Phase 7 MVP fields
  deliveryPartner?: string | {
    name: string;
    phone: string;
  };
  trackingUrl?: string;
  riderName?: string;
  riderPhone?: string;
  deliveryAssignedAt?: any;
  deliveryStatus?: string;
  statusHistory?: any[];
  
  estimatedDeliveryTime?: any;
  deliveredTime?: any;
  latestCourierStatus?: string;
  latestCourierStatusAt?: any;
  
  // Order timeline/audit trail
  timeline?: OrderTimelineEvent[];   // NEW: Immutable event log
  
  // Customer notes
  specialInstructions?: string;      // For delivery or special requests
  
  // Legacy fields for backward compatibility
  trackingLink?: string;
  
  address: string;
  createdAt: any;
  updatedAt: any;
  orderNumber?: number;
  
  // Email confirmation sent
  emailSentAt?: any;
  smsConfirmationSentAt?: any;
  
  // Refunds
  refundStatus?: string;
  refundAmount?: number;
  refundedAt?: any;
}

export type SupportTicketStatus = 'open' | 'resolved';
export type SupportIssueType = 'order' | 'payment' | 'invoice';

export interface SupportTicket {
  id?: string;
  tenantId: string;
  orderId: string;
  userId: string;
  userName: string;
  phone: string;
  issueType: SupportIssueType;
  message: string;
  status: SupportTicketStatus;
  createdAt: any;
  adminReply?: string;
  updatedAt?: any;
}

// ================= SUBSCRIPTION & REFERRAL SYSTEM =================

export type MealPreference = 'veg' | 'egg' | 'nonveg';
export type DeliverySlot = 'breakfast' | 'lunch' | 'dinner' | 'breakfast_lunch' | 'lunch_dinner' | 'all_day';
export type SubscriptionStatus = 'active' | 'paused' | 'expired';

export interface Subscription {
  id?: string;
  tenantId: string;
  userId: string;
  planType: '1_meal' | '2_meals' | '3_meals';
  price: number;
  finalPrice: number;
  startDate: any;
  endDate: any;
  mealsPerDay: number;
  mealPreference: MealPreference;
  weeklyPlan: {
    vegDays: number;
    eggDays: number;
    nonVegDays: number;
  };
  deliverySlot: DeliverySlot;
  status: SubscriptionStatus;
  usedReferral: boolean;
  referralCodeUsed?: string;
  pendingDiscount?: number;  // Discounts earned from referring others
  
  pausedAt?: any;
  totalPausedDays?: number;
  pauseCount?: number;

  // Tracking Metrics
  deliveryFeeCharged?: number;
  deliveryPartnerCost?: number;
  profitMargin?: number;
  isFreeDelivery?: boolean;
  absorbedCost?: number;
  
  createdAt: any;
}

export interface Referral {
  id?: string;
  tenantId: string;
  userId: string;
  referralCode: string;
  referredUsers: string[]; // Array of user IDs who used this code
  totalEarnings: number;
  discountGiven: number;
  createdAt: any;
}

// ================= BHOJANOS SAAS PLATFORM =================

export type TenantLifecycleStatus = 'draft' | 'pending_verification' | 'approved' | 'trial' | 'active' | 'payment_due' | 'compliance_overdue' | 'suspended' | 'rejected' | 'archived';
export type StoreLifecycleStatus = 'draft' | 'verification_pending' | 'approved' | 'published' | 'paused' | 'suspended' | 'archived';

export interface ReleaseNote {
  id: string;
  version: string;
  title: string;
  summary: string;
  category: 'security' | 'performance' | 'bugfix' | 'stability' | 'merchant_growth' | 'storefront' | 'payments' | 'mobile';
  highlights: string[];
  publishedAt: any;
  publishedBy: string;
  isPublished: boolean;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  
  // Phase 1: Governance
  status: TenantLifecycleStatus;
  storeStatus: StoreLifecycleStatus;
  lastViewedReleaseVersion?: string;

  // Phase 2: KYC
  kyc?: {
    ownerName?: string;
    businessName?: string;
    phone?: string;
    email?: string;
    emailVerificationStatus?: 'pending' | 'verified';
    emailVerifiedAt?: any;
    mobileNumber?: string;
    mobileVerificationStatus?: 'pending' | 'verified' | 'failed' | 'blocked';
    otpAttempts?: number;
    lastOtpSentAt?: any;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    gstNumber?: string;
    panNumber?: string;
    verificationLevel: 0 | 1 | 2 | 3;
    documents?: {
      businessProof?: { url: string; uploadedAt: any; status: string };
      identityProof?: { url: string; uploadedAt: any; status: string };
      addressProof?: { url: string; uploadedAt: any; status: string };
      tradeLicense?: { url: string; uploadedAt: any; status: string };
    };
  };

  // Phase 3: Legal
  legal?: {
    status: 'pending' | 'accepted';
    merchantAgreementVersion?: string;
    merchantAgreementAcceptedAt?: any;
    merchantDeclarationAcceptedAt?: any;
    termsAcceptedAt?: any;
    privacyAcceptedAt?: any;
    acceptedByIp?: string;
    acceptedByBrowser?: string;
  };

  // Phase 4: FSSAI Compliance
  fssai?: {
    number?: string;
    certificateUrl?: string;
    expiryDate?: string;
    verificationStatus: 'not_submitted' | 'pending_submission' | 'submitted' | 'under_review' | 'verified' | 'expired' | 'rejected' | 'compliance_overdue';
    registrationDate?: any;
  };

  // Phase 6 & 8A: Subscription
  subscription?: {
    planId: 'starter' | 'growth' | 'pro' | 'enterprise';
    status: 'trialing' | 'active' | 'past_due' | 'canceled';
    startDate?: any;
    trialActivatedAt?: any;
    trialExpiresAt?: any;
    trialUsed?: boolean;
    trialType?: 'growth' | 'pro' | 'enterprise';
    trialHistory?: { type: string; activatedAt: any; expiresAt: any }[];
    subscriptionEndsAt?: any;
    
    // Payment Gateway Preparation
    razorpayCustomerId?: string;
    razorpaySubscriptionId?: string;
    latestInvoiceId?: string;
    renewalDate?: any;
    paymentStatus?: 'success' | 'failed' | 'pending';
    failureCount?: number;
    dunningStatus?: 'active' | 'in_recovery' | 'suspended';
  };

  onboardingStatus?: {
    isComplete: boolean;
    currentStep: number;
    completedAt?: any;
    migrated?: boolean;
  };

  paymentConfig?: {
    defaultProvider: string;
    providers: {
      razorpay?: {
        enabled: boolean;
        keyId?: string;
        secretRef?: string;
      };
      upi?: {
        enabled: boolean;
        upiId?: string;
        merchantName?: string;
      };
      cod?: {
        enabled: boolean;
      };
      [key: string]: any;
    };
  };
  brandConfig?: {
    logoUrl?: string;
    primaryColor?: string;
  };
  location?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    lat: number;
    lng: number;
  };
  deliveryConfig?: {
    freeRadius: number; // in km
    paidRadius: number; // in km (base limit for standard fee)
    maxRadius: number; // in km (absolute max delivery limit)
    perKmCharge: number; // charge per km beyond freeRadius
    baseFee: number; // base fee for paidRadius
    prepTime: number; // minutes to prepare order
  };
  
  tenantHealthScore?: number; // 0-100
  merchantTrustScore?: number; // 0-100
  launchReadinessScore?: number; // 0-100

  // Phase 19: Beta Tracking
  beta?: {
    isBetaUser?: boolean;
    betaBatch?: string;
    registrationDate?: any;
    publishDate?: any;
    firstOrderDate?: any;
    firstRepeatOrderDate?: any;
    repeatOrderDate?: any;
    trialActivatedDate?: any;
    paidConversionDate?: any;
    betaFeedbackScore?: number;
  };

  // Phase 28: Referral Tracking
  referral?: {
    referralCode?: string;
    referredBy?: string;
    referredTenantId?: string;
    referralCount?: number;
    successfulReferrals?: number;
    rewardBalance?: number;
    rewardHistory?: {
      id: string;
      type: 'free_month' | 'credit' | 'badge';
      amount?: number;
      planType?: 'growth' | 'pro';
      issuedAt: any;
      description: string;
    }[];
  };

  createdAt: any;
}

// ==========================================
// Phase 6D: Recipes & Forecasting Types
// ==========================================

export interface RecipeIngredient {
  ingredient: string; // e.g., "Rice", "Chicken"
  quantity: number;
  unit: string; // e.g., "grams", "kg", "pieces", "L"
}

export interface Recipe {
  id?: string;
  menuItemId: string; // References MenuItem.id
  tenantId: string;
  ingredients: RecipeIngredient[];
}

export interface Forecast {
  id?: string;
  tenantId: string;
  targetDate: string; // YYYY-MM-DD
  type: 'daily' | 'weekend' | 'peak_hour';
  expectedOrders: number;
  expectedRevenue: number;
  expectedAOV: number;
  confidenceScore: 'Low' | 'Medium' | 'High';
  reasoning: string;
  createdAt: any;
  actualOrders?: number;
  actualRevenue?: number;
}

export interface ForecastAccuracy {
  date: string;
  accuracyPercent: number;
  variancePercent: number;
  predictionError: number;
}

export interface InventoryForecastRequirement {
  ingredient: string;
  quantityRequired: number;
  unit: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  reasoning: string;
}

export interface AIOperationsInsight {
  expectedOrders: number;
  expectedRevenue: number;
  inventoryRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  kitchenHealth: number;
  confidence: 'Low' | 'Medium' | 'High';
  recommendations: string[];
}

export interface SimulationResult {
  action: string;
  expectedOrderLift: number; // percentage
  expectedRevenueLift: number; // percentage
  expectedRepeatLift: number; // percentage
}

// ==========================================
// Phase 30: Feedback Engine
// ==========================================

export interface MerchantFeedback {
  id?: string;
  tenantId: string;
  type: 'feature' | 'bug' | 'suggestion' | 'help' | 'rating';
  description: string;
  rating?: number;
  merchantHealthSnapshot?: number;
  plan?: string;
  businessType?: string;
  timestamp: any;
  status?: 'new' | 'reviewed' | 'resolved';
}

// ==========================================
// Phase 37: Case Study Engine
// ==========================================

export interface CaseStudy {
  id?: string;
  tenantId: string;
  tenantName: string;
  createdAt: any;
  beforeStats: {
    revenue: number;
    orders: number;
    retention: number;
  };
  afterStats: {
    revenue: number;
    orders: number;
    retention: number;
  };
  revenueGrowth: number; // %
  retentionGrowth: number; // %
  operationalImprovements: string[];
}
