import React, { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { getDb } from '../../lib/firebase-db';
import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, Truck, ChefHat, Bell, Phone, MessageCircle, PackageX } from 'lucide-react';
import toast from 'react-hot-toast';
import logo from '../../assets/bhojan-os-logo.png';
import { auth } from '../../firebase';
import { recordOrderCompletion } from '../../services/AnalyticsService';
import { updateMenuItem } from '../../services/api';

const OWNER_API_BASE_URL = import.meta.env.VITE_API_URL || 'https://manaintibojanam-backend.onrender.com';

interface Order {
  id: string;
  customerName?: string;
  customerPhone?: string;
  phone?: string;
  address?: string;
  deliveryAddress?: { addressLine1: string; city: string };
  totalAmount: number;
  status: string;
  createdAt: any;
  items?: any[];
}

const OwnerOrders: React.FC = () => {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [orderLimit, setOrderLimit] = useState(50);
  const [hasMore, setHasMore] = useState(true);

  // Dispatch Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchOrder, setDispatchOrder] = useState<string | null>(null);
  const [dispatchData, setDispatchData] = useState({
    deliveryPartner: 'Manual Delivery',
    trackingUrl: '',
    riderName: '',
    riderPhone: '',
    notifyCustomer: true
  });

  // Quick Stock Modal State
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [fetchingMenu, setFetchingMenu] = useState(false);

  const tenantId = userProfile?.ownedTenantIds?.[0];

  const parseTrialDate = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  useEffect(() => {
    if (!tenantId) return;

    const db = getDb();
    const q = query(
      collection(db, 'orders'),
      where('tenantId', '==', tenantId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      // Sort and limit in memory to avoid needing a composite index
      fetchedOrders = fetchedOrders.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      }).slice(0, orderLimit);
      
      setOrders(fetchedOrders);
      setHasMore(snapshot.docs.length === orderLimit);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load live orders");
      setLoading(false);
    });

    const fetchTenant = async () => {
      const db = getDb();
      const tDoc = await getDoc(doc(db, 'tenants', tenantId));
      if (tDoc.exists()) {
        setTenantInfo(tDoc.data());
      }
    };
    fetchTenant();

    return () => unsubscribe();
  }, [tenantId, orderLimit]);

  const loadMoreOrders = () => {
    setOrderLimit(prev => prev + 50);
  };

  const updateOrderStatus = async (orderId: string, status: string, deliveryData?: any): Promise<boolean> => {
    try {
      setUpdatingOrderId(orderId);
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Owner session expired. Please sign in again.');

      const response = await fetch(`${OWNER_API_BASE_URL}/api/owner/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
          'x-tenant-id': tenantId || ''
        },
        body: JSON.stringify({ status, deliveryData })
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || "Failed to update status");
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? { ...order, status, ...deliveryData } : order
        )
      );
      toast.success(`Order marked as ${status}`);

      // Update analytics if order is completed
      if (status === 'DELIVERED') {
        const completedOrder = orders.find(o => o.id === orderId);
        if (completedOrder) {
          recordOrderCompletion(tenantId, completedOrder as any);
        }
      }

      return true;
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Action failed");
      return false;
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder) return;
    
    const updated = await updateOrderStatus(dispatchOrder, 'OUT_FOR_DELIVERY', {
      ...dispatchData,
      deliveryAssignedAt: new Date().toISOString()
    });

    if (!updated) return;
    
    setDispatchModalOpen(false);
    setDispatchOrder(null);
  };

  const handleOpenStockModal = async () => {
    setStockModalOpen(true);
    setFetchingMenu(true);
    try {
      const q = query(collection(getDb(), 'menu'), where('tenantId', '==', tenantId));
      onSnapshot(q, (snapshot) => {
        setMenuItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setFetchingMenu(false);
      });
    } catch (e) {
      console.error(e);
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

  const pendingOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'CREATED' || o.status === 'PLACED');

  const trialEndsAt = parseTrialDate(tenantInfo?.trialEndsAt);
  const isTrialExpired = trialEndsAt && trialEndsAt < new Date();
  const trialDaysRemaining = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0;
  const isSuspended = tenantInfo?.status === 'suspended' || isTrialExpired;

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-8 lg:p-12 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pb-[calc(2rem+env(safe-area-inset-bottom))] md:pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 sm:mb-8 gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <img src={logo} alt="BhojanOS" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Orders Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Manage incoming orders for your kitchen</p>
            </div>
          </div>
          
          <div className="flex w-full items-center gap-2 md:w-auto">
            <button 
              onClick={handleOpenStockModal}
              className="flex w-full md:w-auto items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 px-4 py-3 md:py-2 rounded-2xl md:rounded-full font-bold transition-all whitespace-nowrap border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <PackageX size={16} className="mr-2" />
              Quick Stock
            </button>
            {pendingOrders.length > 0 && (
              <m.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex w-full items-center justify-center bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-4 py-3 md:py-2 rounded-2xl md:rounded-full font-medium"
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
              <span><strong>Your Free Trial has expired.</strong> You can no longer accept new orders.</span>
            </div>
            <button className="w-full md:w-auto px-4 py-3 md:py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
              Upgrade to Starter Plan (₹599/mo)
            </button>
          </div>
        )}

        {!isTrialExpired && tenantInfo?.status === 'trialing' && (
          <div className="mb-6 sm:mb-8 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start text-blue-800 dark:text-blue-400">
              <Clock className="w-5 h-5 mr-2 flex-shrink-0" />
              <span><strong>Trial Active.</strong> You have {trialDaysRemaining} days remaining on your free trial.</span>
            </div>
            <button className="w-full md:w-auto px-4 py-3 md:py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              Upgrade Now
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            <AnimatePresence>
              {orders.map((order) => (
                <m.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6"
                >
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    
                    <div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <span className="text-sm font-mono text-gray-500 dark:text-gray-400">#{order.id.slice(-6).toUpperCase()}</span>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-md 
                          ${order.status === 'PENDING' || order.status === 'CREATED' || order.status === 'PLACED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                          ${order.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                          ${order.status === 'PREPARING' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : ''}
                          ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                          ${order.status === 'REJECTED' || order.status === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                        `}>
                          {order.status}
                        </span>
                        <span className="text-sm text-gray-400 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {order.createdAt ? format(order.createdAt.toDate(), 'h:mm a') : 'Just now'}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {order.customerName || 'Guest Customer'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
                        {order.customerPhone || order.phone || 'Phone unavailable'} • {order.deliveryAddress?.addressLine1 || order.address || 'No address provided'}
                      </p>
                      
                      {/* LIVE SUPPORT CONTACT BUTTONS */}
                      {!['DELIVERED', 'CANCELLED', 'REJECTED'].includes(order.status || '') && (order.customerPhone || order.phone) && (
                        <div className="flex items-center gap-3 mt-3">
                          <a 
                            href={`tel:${order.customerPhone || order.phone}`} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call Customer
                          </a>
                          <a 
                            href={`https://wa.me/${(order.customerPhone || order.phone)?.replace(/\D/g, '')}?text=Hi%20${order.customerName || 'Customer'}!%20This%20is%20regarding%20your%20recent%20order%20%23${order.id.slice(-6).toUpperCase()}.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:items-end gap-4 w-full">
                      {/* ORDER ITEMS LIST */}
                      <div className="w-full bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
                        <h4 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-2">Order Items</h4>
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-brand-primary">{item.quantity}x</span>
                                <span className="font-medium text-white">{item.name}</span>
                              </div>
                              {item.specialInstructions && (
                                <p className="text-sm text-yellow-500/80 mt-1 pl-6">Note: {item.specialInstructions}</p>
                              )}
                            </div>
                            <span className="text-white/70">₹{(Number(item.unitPrice ?? item.price ?? 0)) * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-2">
                        Total: ₹{order.totalAmount}
                      </div>

                      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                        {isSuspended ? (
                          <div className="text-sm text-red-500 font-medium px-3 py-1.5 border border-red-200 bg-red-50 rounded-md">
                            Action Disabled (Trial Expired)
                          </div>
                        ) : (
                          <>
                            {(order.status === 'PENDING' || order.status === 'CREATED' || order.status === 'PLACED') && (
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
                                  className="flex items-center justify-center px-4 py-3 sm:py-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                  <XCircle className="w-4 h-4 mr-2" /> Reject
                                </button>
                              </>
                            )}
                            
                            {order.status === 'ACCEPTED' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                                disabled={updatingOrderId === order.id}
                                className="col-span-2 flex items-center justify-center px-4 py-3 sm:py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                              >
                                <ChefHat className="w-4 h-4 mr-2" /> {updatingOrderId === order.id ? 'Saving...' : 'Mark Preparing'}
                              </button>
                            )}

                            {order.status === 'PREPARING' && (
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

                            {order.status === 'OUT_FOR_DELIVERY' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                                disabled={updatingOrderId === order.id}
                                className="col-span-2 flex items-center justify-center px-4 py-3 sm:py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" /> {updatingOrderId === order.id ? 'Saving...' : 'Mark Delivered'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </m.div>
              ))}
              
              {orders.length === 0 && (
                <div className="text-center py-16 sm:py-20 px-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No orders yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">When customers place orders, they will appear here.</p>
                </div>
              )}
            </AnimatePresence>
            
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

      {/* Dispatch Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-3 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-blue-500" /> Dispatch Delivery
            </h2>
            <form onSubmit={handleDispatch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Partner</label>
                <select 
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  value={dispatchData.deliveryPartner}
                  onChange={e => setDispatchData({...dispatchData, deliveryPartner: e.target.value})}
                >
                  <option value="Porter">Porter</option>
                  <option value="Rapido">Rapido</option>
                  <option value="Dunzo">Dunzo</option>
                  <option value="Shadowfax">Shadowfax</option>
                  <option value="Self Pickup">Self Pickup</option>
                  <option value="Manual Delivery">Manual / Own Delivery</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tracking URL (Optional)</label>
                <input 
                  type="url"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  placeholder="https://porter.in/track/..."
                  value={dispatchData.trackingUrl}
                  onChange={e => setDispatchData({...dispatchData, trackingUrl: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rider Name</label>
                  <input 
                    type="text"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    placeholder="Raju"
                    value={dispatchData.riderName}
                    onChange={e => setDispatchData({...dispatchData, riderName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rider Phone</label>
                  <input 
                    type="tel"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    placeholder="9876543210"
                    value={dispatchData.riderPhone}
                    onChange={e => setDispatchData({...dispatchData, riderPhone: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center mt-2">
                <input 
                  type="checkbox" 
                  id="notifyCustomer" 
                  checked={dispatchData.notifyCustomer}
                  onChange={e => setDispatchData({...dispatchData, notifyCustomer: e.target.checked})}
                  className="rounded text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor="notifyCustomer" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Notify customer via WhatsApp/Push
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
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
