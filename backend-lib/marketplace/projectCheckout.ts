import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { formatOrderNumberLabel } from './orderNumberAllocator.js';
import { normalizeDeliveryAddressFields } from './deliveryAddressFields.js';
import {
  DEFAULT_PREP_TIME_MINUTES,
  estimateDeliveryEtaMinutes,
} from './etaEstimate.js';
import {
  buildUpiPayUrl,
  isValidUpiId,
  UPI_PAYMENT_EXPIRY_MS,
} from './upiPayUrl.js';
import {
  computeTenantDeliveryFee,
  haversineKm,
  readTenantDeliveryConfig,
  resolveStoreTiming,
  isStoreOpenNow,
} from './tenantProjectionHelpers.js';
import {
  buildDeliveryTimeSlots,
  getStoreClosedMessage,
  validateMarketplaceSchedule,
} from './deliveryTimeSlots.js';
import {
  assertCouponBelongsToTenant,
  couponBelongsToTenant,
} from './projectPublicCoupons.js';

export interface MarketplaceQuoteLine {
  itemId: string;
  quantity: number;
  unitPrice?: number;
  name?: string;
}

export interface MarketplaceQuoteRequest {
  restaurantId: string;
  contextToken?: string;
  orderType: 'delivery' | 'pickup';
  lines: MarketplaceQuoteLine[];
  deliveryAddress?: { lat?: number; lng?: number; distanceKm?: number };
  couponCode?: string;
  deliveryType?: 'asap' | 'scheduled';
  scheduledFor?: string;
  deliveryTimeSlot?: string;
}

export interface BillQuote {
  subtotal: number;
  gstAmount: number;
  gstPercent: number;
  packagingFee: number;
  deliveryFee: number;
  deliveryPending: boolean;
  discountAmount: number;
  grandTotal: number;
  taxLabel: string;
  lineItems: { label: string; amount: number }[];
}

export interface CheckoutSchedulingContext {
  isStoreOpen: boolean;
  storeTiming: {
    openTime: string;
    closeTime: string;
    businessHoursEnabled: boolean;
    offlineMessage?: string;
  };
  prepMinutes: number;
  deliverySlots: string[];
  closedMessage?: string;
}

type TenantRaw = Record<string, unknown>;

function readPackagingFee(tenant: TenantRaw): number {
  const pricing = (tenant.pricingConfig ?? {}) as Record<string, unknown>;
  return Number(pricing.packingFee ?? pricing.packagingFee ?? 0);
}

function readGstPercent(tenant: TenantRaw): number {
  const pricing = (tenant.pricingConfig ?? {}) as Record<string, unknown>;
  return Number(pricing.gstPercent ?? 0);
}

function isDeliveryFeesConfigured(tenant: TenantRaw): boolean {
  const delivery = (tenant.deliveryConfig ?? {}) as Record<string, unknown>;
  return delivery.feesConfigured === true || Number(delivery.baseFee ?? 0) > 0;
}

function resolveDeliveryFee(
  tenant: TenantRaw,
  orderType: 'delivery' | 'pickup',
  deliveryAddress?: { lat?: number; lng?: number; distanceKm?: number },
): { fee: number; pending: boolean } {
  if (orderType === 'pickup') return { fee: 0, pending: false };

  const kitchen = (tenant.location ?? {}) as { lat?: number; lng?: number };

  const hasCoords =
    typeof deliveryAddress?.lat === 'number' &&
    typeof deliveryAddress?.lng === 'number' &&
    Number.isFinite(deliveryAddress.lat) &&
    Number.isFinite(deliveryAddress.lng) &&
    !(deliveryAddress.lat === 0 && deliveryAddress.lng === 0);

  if (!hasCoords) {
    return { fee: 0, pending: true };
  }

  if (!isDeliveryFeesConfigured(tenant)) {
    return { fee: 0, pending: false };
  }

  const deliveryConfig = readTenantDeliveryConfig(tenant);
  if (!deliveryConfig) {
    return { fee: 0, pending: false };
  }

  let distanceKm = Number(deliveryAddress?.distanceKm ?? 0);
  if ((!Number.isFinite(distanceKm) || distanceKm <= 0) && kitchen.lat && kitchen.lng) {
    distanceKm = haversineKm(kitchen.lat, kitchen.lng, deliveryAddress!.lat!, deliveryAddress!.lng!);
  }

  const computed = computeTenantDeliveryFee(distanceKm, deliveryConfig);
  if (computed < 0) {
    return { fee: 0, pending: false };
  }

  return { fee: Math.round(computed), pending: false };
}

function formatTaxLabel(gstPercent: number, packagingFee: number): string {
  if (gstPercent > 0 && packagingFee > 0) return `GST (${gstPercent}%) + Packaging`;
  if (gstPercent > 0) return `GST (${gstPercent}%)`;
  if (packagingFee > 0) return 'Packaging';
  return 'Taxes and Charges';
}

async function loadTenantByRestaurantId(db: Firestore, restaurantId: string) {
  const trimmed = restaurantId.trim();
  if (!trimmed) return null;

  const direct = await db.collection('tenants').doc(trimmed).get();
  if (direct.exists) return { id: direct.id, raw: direct.data() as TenantRaw };

  const slugCandidates = new Set<string>([trimmed]);
  if (trimmed.startsWith('obr_')) slugCandidates.add(trimmed.slice(4));
  if (trimmed.startsWith('rest_')) slugCandidates.add(trimmed.slice(5).replace(/_/g, '-'));

  const slugQueries = await Promise.all(
    [...slugCandidates].map((slug) =>
      db.collection('tenants').where('slug', '==', slug).limit(1).get(),
    ),
  );

  for (const snap of slugQueries) {
    if (!snap.empty) {
      const doc = snap.docs[0];
      return { id: doc.id, raw: doc.data() as TenantRaw };
    }
  }

  return null;
}

async function loadMenuPriceMap(db: Firestore, tenantId: string): Promise<Map<string, { price: number; name: string }>> {
  const snapshot = await db.collection('menu').where('tenantId', '==', tenantId).get();
  const map = new Map<string, { price: number; name: string }>();
  for (const doc of snapshot.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (data.isAvailable === false || data.isActive === false) continue;
    map.set(doc.id, {
      price: Number(data.price ?? 0),
      name: String(data.name ?? 'Item'),
    });
  }
  return map;
}

type MenuPriceMap = Map<string, { price: number; name: string }>;

interface ResolvedCouponDiscount {
  readonly code: string;
  readonly discountAmount: number;
}

function readCouponDiscountType(coupon: Record<string, unknown>): 'fixed' | 'percentage' {
  if (coupon.discountType === 'percentage' || coupon.type === 'percentage') return 'percentage';
  return 'fixed';
}

function readCouponDiscountValue(coupon: Record<string, unknown>): number {
  const raw = coupon.discountValue ?? coupon.discount ?? 0;
  return Number(raw);
}

function isCouponExpired(coupon: Record<string, unknown>): boolean {
  if (!coupon.expiryDate) return false;
  return new Date(String(coupon.expiryDate)).setHours(23, 59, 59, 999) < Date.now();
}

async function resolveMarketplaceCouponDiscount(
  db: Firestore,
  tenantId: string,
  tenantSlug: string | undefined,
  couponCode: string | undefined,
  subtotal: number,
  options?: { strict?: boolean },
): Promise<ResolvedCouponDiscount | null> {
  const normalized = couponCode?.trim().toUpperCase();
  if (!normalized) return null;

  const couponSnap = await db
    .collection('coupons')
    .where('code', '==', normalized)
    .where('isActive', '==', true)
    .limit(15)
    .get();

  const matchedDoc = couponSnap.docs.find((doc) =>
    couponBelongsToTenant(doc.data() as Record<string, unknown>, tenantId, tenantSlug),
  );

  if (!matchedDoc) {
    if (options?.strict) {
      throw Object.assign(new Error('This promo code is not valid for this kitchen'), { statusCode: 400 });
    }
    return { code: normalized, discountAmount: 0 };
  }

  const coupon = matchedDoc.data() as Record<string, unknown>;
  assertCouponBelongsToTenant(coupon, tenantId, tenantSlug);
  if (isCouponExpired(coupon)) {
    if (options?.strict) {
      throw Object.assign(new Error('This promo code has expired'), { statusCode: 400 });
    }
    return { code: normalized, discountAmount: 0 };
  }

  const minOrder = Number(coupon.minOrder ?? 0);
  if (subtotal < minOrder) {
    if (options?.strict) {
      throw Object.assign(
        new Error(`Minimum order ₹${minOrder} required for promo code ${normalized}`),
        { statusCode: 400 },
      );
    }
    return { code: normalized, discountAmount: 0 };
  }

  const discountType = readCouponDiscountType(coupon);
  const discountValue = readCouponDiscountValue(coupon);
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = Math.round((subtotal * discountValue) / 100);
  } else {
    discountAmount = Math.round(discountValue);
  }

  return {
    code: normalized,
    discountAmount: Math.min(Math.max(0, discountAmount), Math.round(subtotal)),
  };
}

interface MarketplaceQuoteContext {
  tenantId: string;
  tenantRaw: TenantRaw;
  quote: BillQuote;
  menuPrices: MenuPriceMap;
  etaMinutes: { min: number; max: number };
}

function resolveDeliveryDistanceKm(
  tenant: TenantRaw,
  deliveryAddress?: { lat?: number; lng?: number; distanceKm?: number },
): number | undefined {
  let distanceKm = Number(deliveryAddress?.distanceKm ?? 0);
  const kitchen = (tenant.location ?? {}) as { lat?: number; lng?: number };
  if (
    (!Number.isFinite(distanceKm) || distanceKm <= 0) &&
    kitchen.lat &&
    kitchen.lng &&
    typeof deliveryAddress?.lat === 'number' &&
    typeof deliveryAddress?.lng === 'number'
  ) {
    distanceKm = haversineKm(kitchen.lat, kitchen.lng, deliveryAddress.lat, deliveryAddress.lng);
  }
  return Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : undefined;
}

async function buildMarketplaceQuoteContext(
  db: Firestore,
  request: MarketplaceQuoteRequest,
): Promise<MarketplaceQuoteContext> {
  const restaurantId = request.restaurantId?.trim();
  if (!restaurantId) throw Object.assign(new Error('restaurantId is required'), { statusCode: 400 });
  if (!Array.isArray(request.lines) || request.lines.length === 0) {
    throw Object.assign(new Error('At least one line item is required'), { statusCode: 400 });
  }

  const loaded = await loadTenantByRestaurantId(db, restaurantId);
  if (!loaded) throw Object.assign(new Error('Restaurant not found'), { statusCode: 404 });

  const menuPrices = await loadMenuPriceMap(db, loaded.id);
  let subtotal = 0;
  const resolvedLines: MarketplaceQuoteLine[] = [];

  for (const line of request.lines) {
    const itemId = String(line.itemId ?? '').trim();
    const quantity = Math.max(1, Math.floor(Number(line.quantity ?? 1)));
    const menuItem = menuPrices.get(itemId);
    if (!menuItem) {
      throw Object.assign(new Error(`Menu item not found: ${itemId}`), { statusCode: 400 });
    }
    const unitPrice = Number(line.unitPrice ?? menuItem.price);
    subtotal += unitPrice * quantity;
    resolvedLines.push({
      itemId,
      quantity,
      unitPrice,
      name: line.name ?? menuItem.name,
    });
  }

  const gstPercent = readGstPercent(loaded.raw);
  const packagingFee = readPackagingFee(loaded.raw);
  const gstAmount = Math.round((subtotal * gstPercent) / 100);
  const { fee: deliveryFee, pending: deliveryPending } = resolveDeliveryFee(
    loaded.raw,
    request.orderType ?? 'delivery',
    request.deliveryAddress,
  );

  let discountAmount = 0;
  let discountLabel = 'Discount';
  const tenantSlug = String(loaded.raw.slug ?? '').trim() || undefined;
  const couponDiscount = await resolveMarketplaceCouponDiscount(
    db,
    loaded.id,
    tenantSlug,
    request.couponCode,
    subtotal,
    { strict: Boolean(request.couponCode?.trim()) },
  );
  if (couponDiscount) {
    discountAmount = couponDiscount.discountAmount;
    if (discountAmount > 0) {
      discountLabel = `Discount (${couponDiscount.code})`;
    }
  }

  const grandTotal = Math.max(0, subtotal - discountAmount + gstAmount + packagingFee + deliveryFee);
  const lineItems: { label: string; amount: number }[] = [{ label: 'Item Total', amount: Math.round(subtotal) }];
  if (discountAmount > 0) lineItems.push({ label: discountLabel, amount: -discountAmount });
  if (gstAmount > 0) lineItems.push({ label: `GST (${gstPercent}%)`, amount: gstAmount });
  if (packagingFee > 0) lineItems.push({ label: 'Packaging', amount: packagingFee });
  if (deliveryFee > 0) lineItems.push({ label: 'Delivery', amount: deliveryFee });

  const delivery = (loaded.raw.deliveryConfig ?? {}) as Record<string, unknown>;
  const prepTime = Number(delivery.prepTime ?? DEFAULT_PREP_TIME_MINUTES);
  const distanceKm = resolveDeliveryDistanceKm(loaded.raw, request.deliveryAddress);
  const etaMinutes = estimateDeliveryEtaMinutes(prepTime, distanceKm);

  return {
    tenantId: loaded.id,
    tenantRaw: loaded.raw,
    menuPrices,
    etaMinutes,
    quote: {
      subtotal: Math.round(subtotal),
      gstAmount,
      gstPercent,
      packagingFee,
      deliveryFee,
      deliveryPending,
      discountAmount,
      grandTotal,
      taxLabel: formatTaxLabel(gstPercent, packagingFee),
      lineItems,
    },
  };
}

export async function buildMarketplaceQuote(
  db: Firestore,
  request: MarketplaceQuoteRequest,
): Promise<{ tenantId: string; quote: BillQuote }> {
  const { tenantId, quote } = await buildMarketplaceQuoteContext(db, request);
  return { tenantId, quote };
}

export function buildCheckoutSchedulingFromTenant(raw: TenantRaw): CheckoutSchedulingContext {
  const storeTiming = resolveStoreTiming(raw as never, raw);
  const delivery = (raw.deliveryConfig ?? {}) as Record<string, unknown>;
  const prepMinutes = Number(delivery.prepTime ?? DEFAULT_PREP_TIME_MINUTES);
  const now = new Date();
  const isStoreOpen = isStoreOpenNow(storeTiming, now);
  const deliverySlots = buildDeliveryTimeSlots({ storeTiming, now, prepMinutes });
  const closedMessage = isStoreOpen ? undefined : getStoreClosedMessage(storeTiming, now);

  return {
    isStoreOpen,
    storeTiming: {
      openTime: storeTiming.openTime,
      closeTime: storeTiming.closeTime,
      businessHoursEnabled: storeTiming.businessHoursEnabled,
      offlineMessage: storeTiming.offlineMessage,
    },
    prepMinutes,
    deliverySlots,
    closedMessage: closedMessage || undefined,
  };
}

export async function buildMarketplaceCheckoutPrepare(
  db: Firestore,
  request: MarketplaceQuoteRequest,
): Promise<{
  tenantId: string;
  quote: BillQuote;
  scheduling: CheckoutSchedulingContext;
  paymentMethods: string[];
}> {
  const { tenantId, tenantRaw, quote } = await buildMarketplaceQuoteContext(db, request);
  return {
    tenantId,
    quote,
    scheduling: buildCheckoutSchedulingFromTenant(tenantRaw),
    paymentMethods: enabledPaymentMethods(tenantRaw),
  };
}

export async function buildCheckoutSchedulingContext(
  db: Firestore,
  tenantId: string,
): Promise<CheckoutSchedulingContext> {
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  const raw = (tenantDoc.data() ?? {}) as TenantRaw;
  return buildCheckoutSchedulingFromTenant(raw);
}

export function enabledPaymentMethods(tenant: TenantRaw): string[] {
  const paymentConfig = (tenant.paymentConfig ?? {}) as Record<string, unknown>;
  const providers = (paymentConfig.providers ?? {}) as Record<string, { enabled?: boolean; upiId?: string }>;
  const methods: string[] = [];
  if (providers.cod?.enabled !== false) methods.push('cod');
  if (providers.razorpay?.enabled === true) methods.push('razorpay');
  if (providers.upi?.enabled === true && providers.upi.upiId) methods.push('upi');
  return methods.length > 0 ? methods : ['cod'];
}

export interface MarketplacePlaceRequest extends MarketplaceQuoteRequest {
  paymentMethod: 'cod' | 'razorpay' | 'upi';
  phone: string;
  customerName?: string;
  userId?: string | null;
  userEmail?: string | null;
  notificationEmail?: string | null;
  deliveryAddress?: Record<string, unknown>;
  instructions?: string;
}

export type MarketplacePlaceResult =
  | { kind: 'cod'; orderId: string; orderNumber: number; tenantId: string; quote: BillQuote }
  | {
      kind: 'upi';
      orderId: string;
      orderNumber: number;
      tenantId: string;
      quote: BillQuote;
      upiUrl: string;
      paymentStatus: 'pending';
      expiresAt: string;
    }
  | {
      kind: 'razorpay';
      draftId: string;
      orderNumber: number;
      tenantId: string;
      quote: BillQuote;
      amountInPaise: number;
    };

function buildResolvedOrderItems(
  request: MarketplacePlaceRequest,
  quote: BillQuote,
  menuPrices: MenuPriceMap,
) {
  return request.lines.map((line) => {
    const itemId = String(line.itemId);
    const quantity = Math.max(1, Math.floor(Number(line.quantity ?? 1)));
    const menuItem = menuPrices.get(itemId);
    const unitPrice = Number(line.unitPrice ?? menuItem?.price ?? 0);
    const lineSubtotal = unitPrice * quantity;
    const lineTax = Math.round((lineSubtotal * quote.gstPercent) / 100);
    return {
      menuItemId: itemId,
      name: line.name ?? menuItem?.name ?? 'Item',
      unitPrice,
      quantity,
      lineSubtotal,
      discount: 0,
      discountApplied: false,
      lineTax,
      lineTotal: lineSubtotal + lineTax,
    };
  });
}

function buildOrderPayload(
  tenantId: string,
  request: MarketplacePlaceRequest,
  quote: BillQuote,
  orderItems: Awaited<ReturnType<typeof buildResolvedOrderItems>>,
  paymentMethod: 'cod' | 'razorpay' | 'upi',
  orderNumber: number,
  etaMinutes: { min: number; max: number },
  schedule: { deliveryType: 'asap' | 'scheduled'; scheduledFor: string | null; deliveryTimeSlot: string },
) {
  const { address, deliveryAddress } = normalizeDeliveryAddressFields(
    request.deliveryAddress as Record<string, unknown> | undefined,
  );
  const isAsap = schedule.deliveryType === 'asap';
  const resolvedEmail =
    (typeof request.notificationEmail === 'string' && request.notificationEmail.trim()) ||
    (typeof request.userEmail === 'string' && request.userEmail.trim()) ||
    null;

  return {
    tenantId,
    orderNumber,
    userId: request.userId ?? null,
    customerName: request.customerName ?? null,
    userEmail: resolvedEmail,
    notificationEmail: resolvedEmail,
    phone: request.phone.trim(),
    address,
    deliveryAddress,
    items: orderItems,
    subtotal: quote.subtotal,
    discountAmount: quote.discountAmount,
    gst: quote.gstPercent,
    gstAmount: quote.gstAmount,
    packingFee: quote.packagingFee,
    deliveryFee: quote.deliveryFee,
    totalAmount: quote.grandTotal,
    total: quote.grandTotal,
    status: paymentMethod === 'cod' ? 'PLACED' : 'PENDING_PAYMENT',
    paymentMethod,
    paymentStatus: 'pending',
    isCOD: paymentMethod === 'cod',
    instructions: request.instructions ?? null,
    deliveryType: schedule.deliveryType,
    orderType: isAsap ? 'instant' : 'scheduled',
    deliveryTimeSlot: schedule.deliveryTimeSlot,
    scheduledFor: schedule.scheduledFor,
    scheduledTime: schedule.scheduledFor,
    prepAlertSent: isAsap ? null : false,
    eta: etaMinutes.min,
    etaMinutes,
    source: 'marketplace_checkout_v1',
    contextToken: request.contextToken ?? null,
  };
}

export async function placeMarketplaceOrder(
  db: Firestore,
  fieldValue: typeof FieldValue,
  request: MarketplacePlaceRequest,
): Promise<MarketplacePlaceResult> {
  if (!request.phone?.trim()) {
    throw Object.assign(new Error('phone is required'), { statusCode: 400 });
  }

  const paymentMethod =
    request.paymentMethod === 'razorpay'
      ? 'razorpay'
      : request.paymentMethod === 'upi'
        ? 'upi'
        : 'cod';
  const [{ tenantId, quote, menuPrices, etaMinutes }] = await Promise.all([
    buildMarketplaceQuoteContext(db, request),
  ]);

  const docId =
    paymentMethod === 'razorpay'
      ? db.collection('order_drafts').doc().id
      : db.collection('orders').doc().id;
      
  const orderNumber = Number(formatOrderNumberLabel(undefined, docId));

  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  const tenantRaw = (tenantDoc.data() ?? {}) as TenantRaw;
  const storeTiming = resolveStoreTiming(tenantRaw as never, tenantRaw);
  const delivery = (tenantRaw.deliveryConfig ?? {}) as Record<string, unknown>;
  const prepMinutes = Number(delivery.prepTime ?? DEFAULT_PREP_TIME_MINUTES);
  const schedule = validateMarketplaceSchedule(request, storeTiming, prepMinutes);

  const orderItems = buildResolvedOrderItems(request, quote, menuPrices);
  const orderPayload = buildOrderPayload(
    tenantId,
    request,
    quote,
    orderItems,
    paymentMethod,
    orderNumber,
    etaMinutes,
    schedule,
  );

  if (paymentMethod === 'upi') {
    const paymentConfig = (tenantRaw.paymentConfig ?? {}) as Record<string, unknown>;
    const providers = (paymentConfig.providers ?? {}) as Record<string, { upiId?: string; merchantName?: string }>;
    const upiId = providers.upi?.upiId;
    if (!upiId || !isValidUpiId(upiId)) {
      throw Object.assign(new Error('Direct UPI is not configured for this kitchen'), { statusCode: 400 });
    }

    const expiresAt = new Date(Date.now() + UPI_PAYMENT_EXPIRY_MS).toISOString();
    await db.collection('orders').doc(docId).set({
      ...orderPayload,
      expiresAt,
      createdAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp(),
    });

    const merchantName =
      typeof providers.upi?.merchantName === 'string'
        ? providers.upi.merchantName
        : typeof tenantRaw.name === 'string'
          ? tenantRaw.name
          : 'Merchant';
    const upiUrl = buildUpiPayUrl({
      upiId,
      merchantName,
      amount: quote.grandTotal,
      orderId: docId,
      transactionNote: `OrderBhojan #${orderNumber}`,
    });

    const batch = db.batch();
    for (const item of orderItems) {
      if (item.menuItemId) {
        batch.update(db.collection('menu').doc(item.menuItemId), {
          itemOrderCount: fieldValue.increment(item.quantity),
        });
      }
    }
    await batch.commit().catch(() => undefined);

    return {
      kind: 'upi',
      orderId: docId,
      orderNumber,
      tenantId,
      quote,
      upiUrl,
      paymentStatus: 'pending',
      expiresAt,
    };
  }

  if (paymentMethod === 'razorpay') {
    const draftRef = db.collection('order_drafts').doc(docId);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await draftRef.set({
      id: draftRef.id,
      tenantId,
      orderPayload,
      subscriptionPayload: null,
      status: 'pending_payment',
      source: 'marketplace_checkout_v1',
      createdAt: fieldValue.serverTimestamp(),
      expiresAt: expiresAt.toISOString(),
    });

    return {
      kind: 'razorpay',
      draftId: draftRef.id,
      orderNumber,
      tenantId,
      quote,
      amountInPaise: Math.round(quote.grandTotal * 100),
    };
  }

  await db.collection('orders').doc(docId).set({
    ...orderPayload,
    createdAt: fieldValue.serverTimestamp(),
    updatedAt: fieldValue.serverTimestamp(),
  });

  const batch = db.batch();
  for (const item of orderItems) {
    if (item.menuItemId) {
      batch.update(db.collection('menu').doc(item.menuItemId), {
        itemOrderCount: fieldValue.increment(item.quantity),
      });
    }
  }
  await batch.commit().catch(() => undefined);

  return { kind: 'cod', orderId: docId, orderNumber, tenantId, quote };
}

export function createCheckoutCorrelationId(): string {
  return randomUUID();
}
