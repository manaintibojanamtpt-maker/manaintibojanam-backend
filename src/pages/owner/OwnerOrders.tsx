import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { subscribeOwnerOrders, type OwnerOrder } from '../../lib/ownerOrdersReads';
import { peekOwnerOrdersCache } from '../../lib/ownerOrdersCache';
import { formatOwnerOrderTime } from '../../lib/ownerOrderTimeFormat';
import { fetchOwnerMenuItemsCached } from '../../lib/ownerMenuCache';
import { useTenant } from '../../context/TenantContext';
import { useOwnerTenantId } from '../../hooks/useOwnerTenantId';
import { useDashboardOrders } from '../../context/DashboardRealtimeProvider';
import { coerceOwnerOrderDate } from '../../lib/ownerOrderReadModelMapper';
import { CheckCircle, XCircle, Clock, Truck, ChefHat, Bell, Phone, MessageCircle, PackageX, ExternalLink, AlertTriangle, CalendarClock, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import logo from '../../assets/bhojan-os-logo.png';
import { recordOrderCompletion } from '../../services/AnalyticsService';
import { updateMenuItem, updateOrderStatus as apiUpdateOrderStatus } from '../../services/api';
import { updateOwnerOrderStatus, verifyOwnerOrderPayment } from '../../lib/ownerOrdersApi';
import { orchestrateOwnerDispatch } from '../../lib/ownerDeliveryIntegrationsApi';
import { OrderStatus } from '../../types';
import { DELIVERY_PARTNER_OPTIONS, deliveryPartnerLabel, getTrackingUrl, isThirdPartyDeliveryPartner } from '../../lib/deliveryPartners';
import { phoneDigits, safeNumber, safeText } from '../../lib/safeRenderValue';
import { OwnerOrderPrepTimer } from '../../lib/ownerOrderPrepTimer';
import {
  formatOwnerScheduleSlotLabel,
  resolveOwnerDeliveryType,
  splitOwnerOrdersBySchedule,
} from '../../lib/ownerOrderQueue';
import { isAwaitingOwnerUpiVerification, isOwnerActionablePlacedOrder } from '../../lib/ownerUpiPayment';

interface Order extends OwnerOrder {}

const OwnerOrders: React.FC = () => {
  const navigate = useNavigate();
  const { tenantInfo } = useTenant();
  const tenantId = useOwnerTenantId();
  const dashboardOrders = useDashboardOrders();
  const [orderLimit, setOrderLimit] = useState(50);
  const initialCache = tenantId ? peekOwnerOrdersCache(tenantId, 50) : null;
  const [orders, setOrders] = useState<Order[]>(() => {
    if (initialCache?.orders?.length) return initialCache.orders as Order[];
    if (dashboardOrders.orders.length) return dashboardOrders.orders as Order[];
    return [];
  });
  const [loading, setLoading] = useState(() => orders.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(() => initialCache?.hasMore ?? true);

  // Dispatch Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchOrder, setDispatchOrder] = useState<string | null>(null);
  const [dispatchData, setDispatchData] = useState({
    deliveryPartner: 'Rapido',
    trackingUrl: '',
    riderName: '',
    riderPhone: '',
    notifyCustomer: true
  });
  const remindedDeliveriesRef = useRef<Set<string>>(new Set());
  const prepAlertCacheRef = useRef<Set<string>>(new Set());
  const ordersErrorToastRef = useRef(false);

  // Quick Stock Modal State
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [fetchingMenu, setFetchingMenu] = useState(false);

  const formatOrderTime = (createdAt: unknown) => formatOwnerOrderTime(createdAt);

  const parseTrialDate = (value: unknown): Date | null => coerceOwnerOrderDate(value);

  // Hydrate from dashboard poll / session without waiting on auth profile.
  useEffect(() => {
    if (!tenantId || orders.length > 0) return;
    const cached = peekOwnerOrdersCache(tenantId, orderLimit);
    if (cached?.orders?.length) {
      setOrders(cached.orders as Order[]);
      setHasMore(cached.hasMore);
      setLoading(false);
      return;
    }
    if (dashboardOrders.orders.length) {
      setOrders(dashboardOrders.orders as Order[]);
      setLoading(false);
    }
  }, [tenantId, orderLimit, dashboardOrders.orders, orders.length]);

  useEffect(() => {
    if (!tenantId) return;

    ordersErrorToastRef.current = false;
    if (orders.length > 0) setRefreshing(true);
    else setLoading(true);

    const unsubscribe = subscribeOwnerOrders(
      tenantId,
      orderLimit,
      (fetchedOrders, hasMoreOrders) => {
        setOrders(fetchedOrders as Order[]);
        setHasMore(hasMoreOrders);
        setLoading(false);
        setRefreshing(false);
      },
      (error: unknown) => {
        console.error("Error fetching orders:", error);
        const code = typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: string }).code)
          : '';
        if (!ordersErrorToastRef.current && code !== 'permission-denied' && orders.length === 0) {
          ordersErrorToastRef.current = true;
          toast.error("Failed to load live orders");
        }
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per tenant/limit; avoid reset loops
  }, [tenantId, orderLimit]);

  useEffect(() => {
    orders.forEach((order, orderIndex) => {
      if (order.status !== 'OUT_FOR_DELIVERY') return;
      if (!isThirdPartyDeliveryPartner(order.deliveryPartner)) return;
      const orderKey = String(order.id ?? order.orderNumber ?? `order-${orderIndex}`);
      if (remindedDeliveriesRef.current.has(orderKey)) return;

      const assignedAt = order.deliveryAssignedAt ? new Date(order.deliveryAssignedAt).getTime() : 0;
      const ageMs = assignedAt ? Date.now() - assignedAt : 0;
      if (assignedAt && ageMs < 45 * 60 * 1000) return;

      remindedDeliveriesRef.current.add(orderKey);
      const shortId = orderKey.slice(-6).toUpperCase();
      const partner = deliveryPartnerLabel(order.deliveryPartner) || 'partner';
      toast(
        `Order #${shortId} is still out via ${partner}. Confirm delivery in the partner app, then tap Mark Delivered.`,
        { duration: 8000, icon: '🛵' },
      );
    });
  }, [orders]);

  useEffect(() => {
    for (const order of orders) {
      if (
        resolveOwnerDeliveryType(order) === 'scheduled' &&
        order.status === OrderStatus.PREPARING &&
        !prepAlertCacheRef.current.has(order.id)
      ) {
        prepAlertCacheRef.current.add(order.id);
        const displayNumber = order.orderNumber
          ? String(order.orderNumber)
          : order.id.slice(-6).toUpperCase();
        toast(`Time to prepare scheduled order #${displayNumber}!`, {
          duration: 8000,
          icon: '⏰',
        });
      }
    }
  }, [orders]);

  const { activeOrders, scheduledOrders } = useMemo(
    () => splitOwnerOrdersBySchedule(orders),
    [orders],
  );

  const loadMoreOrders = () => {
    setOrderLimit(prev => prev + 50);
  };

  const updateOrderStatus = async (orderId: string, status: string, deliveryData?: any): Promise<boolean> => {
    try {
      setUpdatingOrderId(orderId);
      const normalized = status.toUpperCase() as OrderStatus;
      await apiUpdateOrderStatus(orderId, normalized, deliveryData);

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? { ...order, status: normalized, ...deliveryData } : order
        )
      );
      toast.success(`Order marked as ${normalized}`);

      if (normalized === OrderStatus.DELIVERED) {
        const completedOrder = orders.find(o => o.id === orderId);
        if (completedOrder) {
          recordOrderCompletion(tenantId, completedOrder as any);
        }
      }

      return true;
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Action failed';
      if (message.toLowerCase().includes('quota')) {
        toast.error('Firestore quota exceeded. Wait a minute and try again.');
      } else {
        toast.error(message);
      }
      return false;
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder || !tenantId) return;

    const order = orders.find((o) => o.id === dispatchOrder);

    try {
      setUpdatingOrderId(dispatchOrder);

      // Resolve merchant-linked provider booking when connected; else manual tracking fallback.
      let deliveryData: Record<string, unknown> = {
        deliveryPartner: dispatchData.deliveryPartner,
        trackingUrl: dispatchData.trackingUrl.trim() || null,
        trackingLink: dispatchData.trackingUrl.trim() || null,
        riderName: dispatchData.riderName.trim() || null,
        riderPhone: dispatchData.riderPhone.trim() || null,
        notifyCustomer: dispatchData.notifyCustomer,
        deliveryAssignedAt: new Date().toISOString(),
      };
      let orchestrateNote = '';

      try {
        const orderAny = order as Record<string, unknown> | undefined;
        const orchestrated = await orchestrateOwnerDispatch(tenantId, {
          orderId: dispatchOrder,
          deliveryPartner: dispatchData.deliveryPartner,
          customerName: safeText(orderAny?.customerName ?? orderAny?.userName) || 'Customer',
          customerPhone: phoneDigits(orderAny?.phone ?? orderAny?.customerPhone) || '',
          pickupAddress: safeText(orderAny?.restaurantName ?? orderAny?.kitchenName) || 'Kitchen',
          dropoffAddress: safeText(orderAny?.deliveryAddress ?? orderAny?.address) || '',
          orderTotal: safeNumber(orderAny?.totalAmount ?? orderAny?.total),
          trackingUrl: dispatchData.trackingUrl.trim() || undefined,
          riderName: dispatchData.riderName.trim() || undefined,
          riderPhone: dispatchData.riderPhone.trim() || undefined,
          allowManualFallback: true,
        });
        if (orchestrated.mode === 'blocked') {
          toast.error(orchestrated.message || 'Dispatch blocked — link a delivery partner or paste tracking.');
          return;
        }
        deliveryData = {
          ...orchestrated.deliveryData,
          notifyCustomer: dispatchData.notifyCustomer,
        };
        orchestrateNote =
          orchestrated.mode === 'provider_api'
            ? 'Booked via linked partner account. '
            : 'Manual tracking fallback. ';
      } catch (orchErr) {
        // Keep proven manual path if orchestration endpoint is unavailable.
        console.warn('[dispatch] orchestration skipped:', orchErr);
        orchestrateNote = 'Manual dispatch. ';
      }

      await updateOwnerOrderStatus(dispatchOrder, 'OUT_FOR_DELIVERY', deliveryData);
      setOrders((currentOrders) =>
        currentOrders.map((o) =>
          o.id === dispatchOrder
            ? { ...o, status: 'OUT_FOR_DELIVERY' as OrderStatus, ...deliveryData }
            : o,
        ),
      );
      toast.success(
        `${orchestrateNote}${
          dispatchData.notifyCustomer
            ? 'Customer notify (WhatsApp/Push) sent.'
            : 'Customer notify skipped.'
        }`,
      );
      setDispatchModalOpen(false);
      setDispatchOrder(null);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Dispatch failed';
      toast.error(message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleOpenStockModal = async () => {
    if (!tenantId) return;
    setStockModalOpen(true);
    setFetchingMenu(true);
    try {
      const response = await fetchOwnerMenuItemsCached(tenantId);
      setMenuItems(response.items ?? []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load menu for stock updates');
    } finally {
      setFetchingMenu(false);
    }
  };

  const handleToggleStock = async (item: any) => {
    try {
      await updateMenuItem(item.id, { isAvailable: !item.isAvailable });
      toast.success(`${item.name} is ${!item.isAvailable ? 'In Stock' : '86ed (Out of Stock)'}`);
    } catch (e) {
      toast.error('Failed to update stock');
    }
  };

  const handleVerifyUpiPayment = async (order: Order, acceptOrder = true): Promise<boolean> => {
    if (!tenantId) return false;
    try {
      setUpdatingOrderId(order.id);
      const result = await verifyOwnerOrderPayment(tenantId, order.id, { acceptOrder });
      setOrders((currentOrders) =>
        currentOrders.map((current) =>
          current.id === order.id
            ? {
                ...current,
                paymentStatus: result.paymentStatus,
                status: result.status,
              }
            : current,
        ),
      );
      toast.success(
        result.alreadyVerified
          ? acceptOrder
            ? 'Order accepted — payment was already verified'
            : 'Payment was already verified'
          : acceptOrder
            ? 'Payment verified and order accepted'
            : 'Payment verified — you can accept when ready',
      );
      return true;
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to verify payment');
      return false;
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const pendingOrders = orders.filter(
    (o) => isOwnerActionablePlacedOrder(o.status) || isAwaitingOwnerUpiVerification(o),
  );

  const renderOrderCard = (order: Order, orderIndex: number, section: 'active' | 'scheduled') => {
    const orderKey = String(order.id ?? order.orderNumber ?? `order-${orderIndex}`);
    const displayOrderNumber = order.orderNumber
      ? String(order.orderNumber)
      : orderKey.slice(-6).toUpperCase();
    const lineItems = Array.isArray(order.items) ? order.items : [];
    const deliveryPartnerName = deliveryPartnerLabel(order.deliveryPartner);
    const orderStatus = safeText(order.status, 'UNKNOWN');
    const customerName = safeText(order.customerName, 'Guest Customer');
    const customerPhone = safeText(order.customerPhone || order.phone, 'Phone unavailable');
    const customerAddress = safeText(
      order.deliveryAddress?.addressLine1 || order.address,
      'No address provided',
    );
    const riderName = safeText(order.riderName, 'Assigned');
    const riderPhone = safeText(order.riderPhone);
    const orderTotal = safeNumber(order.totalAmount, 0);
    const isScheduledOrder = resolveOwnerDeliveryType(order) === 'scheduled';
    const scheduleLabel = isScheduledOrder ? formatOwnerScheduleSlotLabel(order) : null;
    const scheduledAt = coerceOwnerOrderDate(order.scheduledFor ?? order.scheduledTime);
    const awaitingUpiVerification = isAwaitingOwnerUpiVerification(order);
    const paymentVerified = ['success', 'verified', 'paid'].includes(
      String(order.paymentStatus || '').toLowerCase(),
    );
    const canAcceptVerifiedOrder =
      paymentVerified && isOwnerActionablePlacedOrder(orderStatus) && !awaitingUpiVerification;
    const showPrepWindowAlert =
      section === 'active' &&
      isScheduledOrder &&
      orderStatus !== 'PREPARING' &&
      !['DELIVERED', 'CANCELLED', 'REJECTED', 'OUT_FOR_DELIVERY'].includes(orderStatus);

    return (
      <m.div
        key={orderKey}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-[#0f0f11] rounded-2xl border p-4 sm:p-6 ${
          isScheduledOrder && section === 'active'
            ? 'border-amber-500/30'
            : isScheduledOrder
              ? 'border-blue-500/20'
              : 'border-white/10'
        }`}
      >
        <div className="flex flex-col xl:flex-row xl:justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <span className="text-sm font-mono text-white/40">#{displayOrderNumber}</span>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-md 
                ${orderStatus === 'PENDING' || orderStatus === 'CREATED' || orderStatus === 'PLACED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                ${orderStatus === 'PENDING_PAYMENT' || orderStatus === 'PAYMENT_PENDING' ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300' : ''}
                ${orderStatus === 'ACCEPTED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                ${orderStatus === 'PREPARING' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : ''}
                ${orderStatus === 'OUT_FOR_DELIVERY' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                ${orderStatus === 'DELIVERED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                ${orderStatus === 'REJECTED' || orderStatus === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
              `}>
                {orderStatus}
              </span>
              {isScheduledOrder && scheduleLabel && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/15 text-amber-200 border border-amber-500/25">
                  <CalendarClock className="w-3 h-3" />
                  {scheduleLabel}
                </span>
              )}
              {!isScheduledOrder && (
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  ASAP
                </span>
              )}
              <span className="text-sm text-gray-400 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatOrderTime(order.createdAt)}
              </span>
              <OwnerOrderPrepTimer order={order} />
            </div>

            {awaitingUpiVerification && (
              <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-50 space-y-2">
                <div className="flex items-start gap-2">
                  <IndianRupee className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
                  <div>
                    <p className="font-semibold text-amber-100">
                      UPI payment pending — verify in your UPI app, then confirm here
                    </p>
                    <p className="text-xs text-amber-100/80 mt-1">
                      Direct UPI cannot auto-confirm from the bank. After you see ₹{orderTotal} credited,
                      tap verify to release the order to your kitchen.
                    </p>
                    {order.customerUpiReference && (
                      <p className="text-xs text-amber-100/90 mt-2 font-mono">
                        Customer UPI ref: {order.customerUpiReference}
                      </p>
                    )}
                    {order.customerPaymentClaimed && !order.customerUpiReference && (
                      <p className="text-xs text-amber-100/90 mt-2">
                        Customer notified you they have paid — check your UPI statement.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showPrepWindowAlert && (
              <div className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Prep window open — start preparing for{' '}
                  {scheduledAt
                    ? scheduledAt.toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : scheduleLabel}
                  .
                </span>
              </div>
            )}

            <h3 className="text-lg font-semibold text-white">{customerName}</h3>
            <p className="text-sm text-white/50 mt-1 break-words">
              {customerPhone} • {customerAddress}
            </p>

            {orderStatus === 'OUT_FOR_DELIVERY' && (
              <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Truck className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      {deliveryPartnerName || 'Delivery'} • Out for delivery
                    </p>
                    {(riderName || riderPhone) && (
                      <p className="text-xs text-white/50 mt-1">
                        Rider: {riderName}{riderPhone ? ` • ${riderPhone}` : ''}
                      </p>
                    )}
                    {isThirdPartyDeliveryPartner(order.deliveryPartner) && (
                      <p className="text-xs text-amber-300/90 mt-2 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        Partner apps (Rapido/Uber/Porter/Dunzo/Shadowfox) do not auto-update BhojanOS. Confirm in their app, then mark delivered here.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getTrackingUrl(order) && (
                    <a
                      href={getTrackingUrl(order)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open tracking
                    </a>
                  )}
                  {riderPhone && (
                    <a
                      href={`tel:${riderPhone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white/5 text-blue-300 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call rider
                    </a>
                  )}
                </div>
              </div>
            )}

            {!['DELIVERED', 'CANCELLED', 'REJECTED'].includes(orderStatus) && phoneDigits(order.customerPhone || order.phone) && (
              <div className="flex items-center gap-3 mt-3">
                <a
                  href={`tel:${phoneDigits(order.customerPhone || order.phone)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/15 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Customer
                </a>
                <a
                  href={`https://wa.me/${phoneDigits(order.customerPhone || order.phone)}?text=Hi%20${encodeURIComponent(customerName)}!%20This%20is%20regarding%20your%20recent%20order%20%23${displayOrderNumber}.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </div>
            )}
          </div>

          <div className="w-full xl:w-[340px] shrink-0 flex flex-col gap-4">
            <div className="w-full bg-black/30 rounded-xl p-4 border border-white/10 space-y-3">
              <h4 className="text-sm font-bold text-white/50 uppercase tracking-widest">Order Items</h4>
              {lineItems.map((item: any, idx: number) => {
                const itemQty = safeNumber(item.quantity, 1);
                const itemName = safeText(item.name, 'Item');
                const itemNote = safeText(item.specialInstructions);
                const unitPrice = safeNumber(item.unitPrice ?? item.price, 0);
                return (
                  <div key={idx} className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#FF6B00]">{itemQty}x</span>
                        <span className="font-medium text-white break-words">{itemName}</span>
                      </div>
                      {itemNote && (
                        <p className="text-sm text-yellow-500/80 mt-1">Note: {itemNote}</p>
                      )}
                    </div>
                    <span className="text-white/70 shrink-0">₹{unitPrice * itemQty}</span>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm font-semibold text-white/60">Total</span>
                <span className="text-lg font-bold text-white">₹{orderTotal}</span>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {isSuspended ? (
                <div className="text-sm text-red-500 font-medium px-3 py-1.5 border border-red-200 bg-red-50 rounded-md">
                  Action Disabled (Trial Expired)
                </div>
              ) : (
                <>
                  {(orderStatus === 'PENDING' || orderStatus === 'CREATED' || orderStatus === 'PLACED') && !awaitingUpiVerification && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ACCEPTED')}
                        disabled={updatingOrderId === order.id}
                        className="flex items-center justify-center px-4 py-3 sm:py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> {updatingOrderId === order.id ? 'Saving...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'REJECTED')}
                        disabled={updatingOrderId === order.id}
                        className="flex items-center justify-center px-4 py-3 sm:py-2 bg-white/5 text-white/80 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </button>
                    </>
                  )}

                  {awaitingUpiVerification && (
                    <>
                      <button
                        onClick={() => void handleVerifyUpiPayment(order, true)}
                        disabled={updatingOrderId === order.id}
                        className="col-span-2 flex items-center justify-center px-4 py-3 sm:py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <IndianRupee className="w-4 h-4 mr-2" />
                        {updatingOrderId === order.id ? 'Verifying…' : 'Payment received — Verify & Accept'}
                      </button>
                      <button
                        onClick={() => void handleVerifyUpiPayment(order, false)}
                        disabled={updatingOrderId === order.id}
                        className="flex items-center justify-center px-4 py-3 sm:py-2 bg-white/5 text-white/80 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                      >
                        Verify only
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'REJECTED')}
                        disabled={updatingOrderId === order.id}
                        className="flex items-center justify-center px-4 py-3 sm:py-2 bg-white/5 text-white/80 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </button>
                    </>
                  )}

                  {canAcceptVerifiedOrder && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ACCEPTED')}
                        disabled={updatingOrderId === order.id}
                        className="col-span-2 flex items-center justify-center px-4 py-3 sm:py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> {updatingOrderId === order.id ? 'Saving...' : 'Accept Order'}
                      </button>
                    </>
                  )}

                  {orderStatus === 'ACCEPTED' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                      disabled={updatingOrderId === order.id}
                      className="col-span-2 flex items-center justify-center px-4 py-3 sm:py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <ChefHat className="w-4 h-4 mr-2" /> {updatingOrderId === order.id ? 'Saving...' : 'Mark Preparing'}
                    </button>
                  )}

                  {orderStatus === 'PREPARING' && (
                    <button
                      onClick={() => {
                        setDispatchOrder(order.id);
                        setDispatchModalOpen(true);
                      }}
                      className="col-span-2 flex items-center justify-center px-4 py-3 sm:py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Truck className="w-4 h-4 mr-2" /> Dispatch Order
                    </button>
                  )}

                  {orderStatus === 'OUT_FOR_DELIVERY' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                        disabled={updatingOrderId === order.id}
                        className="col-span-2 flex items-center justify-center px-4 py-3 sm:py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> {updatingOrderId === order.id ? 'Saving...' : 'Mark Delivered'}
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'FAILED_DELIVERY')}
                        disabled={updatingOrderId === order.id}
                        className="col-span-2 flex items-center justify-center px-4 py-3 sm:py-2 bg-white/5 text-white/80 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                      >
                        <PackageX className="w-4 h-4 mr-2" /> Delivery failed / returned
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </m.div>
    );
  };

  const trialEndsAt = parseTrialDate(
    tenantInfo?.subscription?.trialExpiresAt || tenantInfo?.trialEndsAt
  );
  const isTrialExpired = trialEndsAt && trialEndsAt < new Date();
  const trialDaysRemaining = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0;
  const isSuspended = tenantInfo?.status === 'suspended' || isTrialExpired;

  return (
    <div className="min-h-full pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 sm:mb-8 gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <img src={logo} alt="BhojanOS" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl border border-white/10 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Orders Dashboard</h1>
              <p className="text-xs sm:text-sm text-white/50 mt-1">
                Manage incoming orders for your kitchen
                {refreshing ? <span className="ml-2 text-orange-400/80">· updating…</span> : null}
              </p>
            </div>
          </div>
          
          <div className="flex w-full items-center gap-2 md:w-auto">
            <button 
              onClick={handleOpenStockModal}
              className="flex w-full md:w-auto items-center justify-center bg-white/5 hover:bg-white/10 text-white px-4 py-3 md:py-2 rounded-xl font-semibold transition-all whitespace-nowrap border border-white/10"
            >
              <PackageX size={16} className="mr-2" />
              Quick Stock
            </button>
            {pendingOrders.length > 0 && (
              <m.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex w-full items-center justify-center bg-red-500/15 text-red-400 px-4 py-3 md:py-2 rounded-xl font-medium border border-red-500/20"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" />
                {pendingOrders.length} New {pendingOrders.length === 1 ? 'Order' : 'Orders'}
              </m.div>
            )}
          </div>
        </header>

        {isTrialExpired && (
          <div className="mb-6 sm:mb-8 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start text-red-800 dark:text-red-400">
              <XCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span><strong>Your Growth trial has expired.</strong> Upgrade to keep accepting live orders.</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/owner/subscription')}
              className="w-full md:w-auto px-4 py-3 md:py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Upgrade to Growth (₹999/mo)
            </button>
          </div>
        )}

        {!isTrialExpired && tenantInfo?.status === 'trialing' && (
          <div className="mb-6 sm:mb-8 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start text-blue-800 dark:text-blue-400">
              <Clock className="w-5 h-5 mr-2 flex-shrink-0" />
              <span><strong>Growth trial active.</strong> You have {trialDaysRemaining} days left to accept live orders.</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/owner/subscription')}
              className="w-full md:w-auto px-4 py-3 md:py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        )}

        {loading && orders.length === 0 ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-36 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-10">
            <section>
              <div className="flex items-center gap-3 mb-4 sm:mb-5">
                <div className="w-2 h-8 bg-red-500 rounded-full" />
                <h2 className="text-lg sm:text-xl font-bold text-white">Active Queue</h2>
                <span className="px-2.5 py-1 bg-red-500/15 text-red-300 rounded-full text-xs font-semibold border border-red-500/20">
                  {activeOrders.length}
                </span>
              </div>
              <p className="text-sm text-white/45 mb-4">ASAP orders and scheduled orders within the 60-minute prep window.</p>
              <AnimatePresence>
                <div className="grid gap-4 sm:gap-6">
                  {activeOrders.map((order, orderIndex) => renderOrderCard(order, orderIndex, 'active'))}
                </div>
              </AnimatePresence>
              {activeOrders.length === 0 && (
                <div className="text-center py-12 sm:py-16 px-4 bg-[#0f0f11] rounded-2xl border border-dashed border-white/10">
                  <Bell className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-white">No active orders</h3>
                  <p className="text-white/50 mt-1 text-sm">New ASAP orders and scheduled prep-window orders will show here.</p>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4 sm:mb-5">
                <div className="w-2 h-8 bg-blue-500 rounded-full" />
                <h2 className="text-lg sm:text-xl font-bold text-white">Scheduled Orders</h2>
                <span className="px-2.5 py-1 bg-blue-500/15 text-blue-300 rounded-full text-xs font-semibold border border-blue-500/20">
                  {scheduledOrders.length}
                </span>
              </div>
              <p className="text-sm text-white/45 mb-4">Future slots move to Active Queue about 60 minutes before delivery time.</p>
              <AnimatePresence>
                <div className="grid gap-4 sm:gap-6">
                  {scheduledOrders.map((order, orderIndex) => renderOrderCard(order, orderIndex, 'scheduled'))}
                </div>
              </AnimatePresence>
              {scheduledOrders.length === 0 && (
                <div className="text-center py-12 sm:py-16 px-4 bg-[#0f0f11] rounded-2xl border border-dashed border-white/10">
                  <CalendarClock className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-white">No scheduled orders</h3>
                  <p className="text-white/50 mt-1 text-sm">Orders scheduled for later will appear here until prep time.</p>
                </div>
              )}
            </section>

            {orders.length === 0 && (
              <div className="text-center py-16 sm:py-20 px-4 bg-[#0f0f11] rounded-2xl border border-white/10">
                <Bell className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white">No orders yet</h3>
                <p className="text-white/50 mt-1">When customers place orders, they will appear here.</p>
              </div>
            )}

            {orders.length > 0 && hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMoreOrders}
                  className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  Load More Orders
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dispatch Modal — portaled so it sits above owner bottom nav */}
      {dispatchModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="flex w-full max-w-md max-h-[min(92dvh,720px)] flex-col rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl dark:bg-[#141416] sm:max-h-[90dvh]">
            <div className="flex-shrink-0 border-b border-gray-200 px-5 py-4 dark:border-white/10">
              <h2 className="flex items-center text-xl font-bold text-gray-900 dark:text-white">
                <Truck className="mr-2 h-5 w-5 text-blue-500" /> Dispatch Delivery
              </h2>
            </div>

            <form onSubmit={handleDispatch} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Delivery Partner</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    value={dispatchData.deliveryPartner}
                    onChange={(e) => setDispatchData({ ...dispatchData, deliveryPartner: e.target.value })}
                  >
                    {DELIVERY_PARTNER_OPTIONS.map((partner) => (
                      <option key={partner} value={partner}>{partner}</option>
                    ))}
                  </select>
                </div>

                {isThirdPartyDeliveryPartner(dispatchData.deliveryPartner) && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    Paste the partner tracking link if available. BhojanOS cannot auto-detect delivery completion from {dispatchData.deliveryPartner} yet — you will confirm delivery manually when the partner marks it done.
                  </p>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tracking URL (recommended for partner apps)</label>
                  <input
                    type="url"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="https://porter.in/track/..."
                    value={dispatchData.trackingUrl}
                    onChange={(e) => setDispatchData({ ...dispatchData, trackingUrl: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Rider Name</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="Raju"
                      value={dispatchData.riderName}
                      onChange={(e) => setDispatchData({ ...dispatchData, riderName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Rider Phone</label>
                    <input
                      type="tel"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="9876543210"
                      value={dispatchData.riderPhone}
                      onChange={(e) => setDispatchData({ ...dispatchData, riderPhone: e.target.value })}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notifyCustomer"
                    checked={dispatchData.notifyCustomer}
                    onChange={(e) => setDispatchData({ ...dispatchData, notifyCustomer: e.target.checked })}
                    className="rounded text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Notify customer via WhatsApp/Push</span>
                </label>
              </div>

              <div className="grid flex-shrink-0 grid-cols-2 gap-3 border-t border-gray-200 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setDispatchModalOpen(false);
                    setDispatchOrder(null);
                  }}
                  className="min-h-[48px] rounded-xl bg-gray-100 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!updatingOrderId}
                  className="min-h-[48px] rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {updatingOrderId ? 'Saving…' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {/* Quick Stock Modal */}
      <AnimatePresence>
        {stockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <m.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px] border border-gray-200 dark:border-gray-800"
            >
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl z-10">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Quick Stock Control</h3>
                  <p className="text-sm text-gray-500 mt-1">Tap to instantly 86 (disable) an item</p>
                </div>
                <button 
                  onClick={() => setStockModalOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="overflow-y-auto p-4 flex-1">
                {fetchingMenu ? (
                  <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>
                ) : menuItems.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">No menu items found.</div>
                ) : (
                  <div className="space-y-2">
                    {menuItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleToggleStock(item)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all active:scale-[0.98] ${
                          item.isAvailable 
                            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300' 
                            : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-500/30'
                        }`}
                      >
                        <div className="text-left">
                          <div className={`font-bold ${item.isAvailable ? 'text-gray-900 dark:text-white' : 'text-red-700 dark:text-red-400 line-through opacity-70'}`}>
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-500">₹{item.price}</div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                          item.isAvailable ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {item.isAvailable ? 'IN STOCK' : 'OUT OF STOCK'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OwnerOrders;
