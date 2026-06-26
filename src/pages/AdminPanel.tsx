import React, { useEffect, useState, useRef, lazy, Suspense } from "react";
import axios from "axios";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Utensils, 
  Settings, 
  ShieldCheck,
  LogOut, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Star,
  Home,
  TrendingUp,
  DollarSign,
  Package,
  Bell,
  RefreshCcw,
  Clock,
  Zap,
  FileText,
  Download,
  Mail,
  MessageSquare,
  AlertCircle,
  Volume2,
  VolumeX,
  Maximize,
  Minimize
} from "lucide-react";
import toast from "react-hot-toast";
import { m, AnimatePresence } from 'framer-motion';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  limit
} from "firebase/firestore";
import { getDb } from '../lib/firebase-db';
import { 
  fetchMenu, 
  updateOrderStatus as apiUpdateOrderStatus, 
  getDisplayStatus,
  subscribeToOrders,
  fetchOrders
} from '../services/api';
import { OrderStatus, MenuItem, Order } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { useAdminNotifications } from "../hooks/useAdminNotifications";
import { getStatusColor, formatPrice, safeParseDate } from "../lib/utils";
import OrderCard from "../components/admin/OrderCard";
import { seedMenuItems } from "../populateData";
import PaymentVerificationPanel from "../components/admin/PaymentVerificationPanel";
import { isManualPaymentVerificationEnabled, TENANT_ZERO_ID } from "../config/paymentRollout";
const CourierBookingModal = lazy(() => import("../components/admin/CourierBookingModal"));

export default function AdminPanel() {
  const { logout, userProfile, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  // Enable push notifications for admin
  useAdminNotifications();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [categoryForm, setCategoryForm] = useState({ name: "", image: "", priority: 0, isActive: true, showOnHome: true });
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [settings, setSettings] = useState({ 
    gst: 5, 
    packingFee: 10, 
    deliveryFee: 30, 
    isStoreOpen: true,
    storeTiming: {
      openTime: "09:00",
      closeTime: "22:30",
      isManualOverride: false
    },
    workflow: {
      autoMode: true
    }
  });
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [refundStatus, setRefundStatus] = useState<any>({});
  const [newOrderIds, setNewOrderIds] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingData, setTrackingData] = useState({ deliveryPartner: 'Rapido', trackingLink: '', riderName: '', riderPhone: '' });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const prepAlertCacheRef = useRef<Set<string>>(new Set());
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [selectedOrderForCourier, setSelectedOrderForCourier] = useState<Order | null>(null);
  const [isSeedingMenu, setIsSeedingMenu] = useState(false);
  const orderAudioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrderIdsRef = useRef<string[]>([]);
  const hasLoadedOrdersRef = useRef(false);
  const [oosConfirmId, setOosConfirmId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    orderAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!hasLoadedOrdersRef.current) {
      previousOrderIdsRef.current = orders.map((order) => order.id);
      hasLoadedOrdersRef.current = true;
      return;
    }

    const currentOrderIds = orders.map((order) => order.id);
    const newIds = currentOrderIds.filter((id) => !previousOrderIdsRef.current.includes(id));

    if (newIds.length > 0) {
      setNewOrderIds((prev) => [...new Set([...newIds, ...prev])]);
      if (orderAudioRef.current && soundEnabled) {
        orderAudioRef.current.play().catch(() => {});
      }
    }

    previousOrderIdsRef.current = currentOrderIds;
  }, [orders]);

  useEffect(() => {
    if (!orders || orders.length === 0) return;

    for (const order of orders) {
      if (
        order.deliveryType === 'scheduled' &&
        order.status === OrderStatus.PREPARING &&
        !prepAlertCacheRef.current.has(order.id)
      ) {
        // Backend transitioned this to PREPARING
        prepAlertCacheRef.current.add(order.id);
        if (orderAudioRef.current && soundEnabled) {
          orderAudioRef.current.play().catch(() => {});
        }
        alert(`Time to prepare scheduled Order #${order.orderNumber || order.id.slice(-4)}!`);
      }
    }
  }, [orders, soundEnabled]);

  useEffect(() => {
    // Close sidebar on tab change on mobile
    setIsSidebarOpen(false);
  }, [tab]);

  // ================= ADMIN CHECK =================
  useEffect(() => {
    if (!authLoading && userProfile && userProfile.role !== 'admin' && userProfile.role !== 'superadmin') {
      toast.error("Unauthorized access");
      navigate('/');
    }
  }, [userProfile, authLoading, navigate]);

  const handleSeedMenuItems = async () => {
    setIsSeedingMenu(true);
    try {
      await seedMenuItems();
      toast.success('Menu seed completed. Refresh the menu page to see new items.');
    } catch (error: any) {
      console.error('Menu seed failed:', error);
      toast.error(error?.message || 'Failed to seed menu items');
    } finally {
      setIsSeedingMenu(false);
    }
  };

  const [menuForm, setMenuForm] = useState({
    name: "",
    price: "",
    category: "",
    image: "",
    description: "",
    discount: "0",
    isAvailable: true,
    type: "veg"
  });

  const [editingItem, setEditingItem] = useState<any>(null);
  const [showInvoice, setShowInvoice] = useState<any>(null);
  const [couponForm, setCouponForm] = useState({
    code: "",
    discountType: "fixed",
    discountValue: "",
    minOrder: "0",
    expiryDate: "",
    isActive: true
  });

  const [bannerForm, setBannerForm] = useState({
    title: "",
    image: "",
    link: "",
    priority: 1,
    isActive: true
  });

  // ================= REAL-TIME LISTENERS =================
  useEffect(() => {
    if (authLoading || !userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'superadmin')) return;
    setLoading(true);

    // Menu Listener
    const menuQuery = query(collection(getDb(), "menu"), orderBy("name"));
    const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
      const menuItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        price: Number(doc.data().price || 0)
      } as MenuItem));
      setMenu(menuItems);
      console.log("Admin Menu Loaded:", menuItems.length, menuItems);
    }, (err) => {
      console.error("Menu Listener Error:", err);
      if (err.code === 'permission-denied') {
        toast.error("Menu data is unavailable due to permissions.");
        setLoading(false);
        return;
      }
      toast.error("Failed to sync menu data. Check permissions.");
      setLoading(false);
    });

    // Orders Listener
    const unsubscribeOrders = subscribeToOrders((ordersList) => {
      setOrders(ordersList);
      setLoading(false);
      setLastUpdated(new Date());
    }, undefined, (err) => {
      console.error("Orders Listener Error:", err);
      setLoading(false);
    });

    // Coupons Listener
    const unsubscribeCoupons = onSnapshot(collection(getDb(), "coupons"), (snapshot) => {
      setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Reviews Listener
    const unsubscribeReviews = onSnapshot(query(collection(getDb(), "reviews"), orderBy("createdAt", "desc"), limit(100)), (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Banners Listener
    const bannersQuery = query(collection(getDb(), "banners"), orderBy("priority", "desc"));
    const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => {
      setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Banners Listener Error:", err);
      if (err.code === 'permission-denied') {
        toast.error("Banners are unavailable due to permissions.");
        return;
      }
    });

    // Subscriptions Listener
    const subscriptionsQuery = query(collection(getDb(), "subscriptions"), orderBy("createdAt", "desc"), limit(100));
    const unsubscribeSubscriptions = onSnapshot(subscriptionsQuery, (snapshot) => {
      setSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Subscriptions Listener Error:", err);
    });

    // Categories Listener
    const categoriesQuery = query(collection(getDb(), "categories"), orderBy("priority", "desc"));
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Categories Listener Error:", err);
      if (err.code === 'permission-denied') {
        toast.error("Categories are unavailable due to permissions.");
        return;
      }
    });

    // Support Tickets Listener
    const supportQuery = query(collection(getDb(), "supportTickets"), orderBy("createdAt", "desc"), limit(100));
    const unsubscribeSupport = onSnapshot(supportQuery, (snapshot) => {
      setSupportTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Support Tickets Listener Error:", err);
      if (err.code === 'permission-denied') {
        // Do not crash the entire admin page if support tickets are unavailable.
        toast.error("Support tickets are unavailable due to permissions.");
        return;
      }
    });

    // Settings Fetch
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(getDb(), "adminSettings", "global"));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as any);
        }
      } catch (err) {
        console.error("Settings Fetch Error:", err);
      }
    };
    fetchSettings();

    return () => {
      unsubscribeMenu();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeCoupons) unsubscribeCoupons();
      if (unsubscribeReviews) unsubscribeReviews();
      if (unsubscribeBanners) unsubscribeBanners();
      if (unsubscribeCategories) unsubscribeCategories();
      if (unsubscribeSupport) unsubscribeSupport();
      if (unsubscribeSubscriptions) unsubscribeSubscriptions();
    };
  }, [userProfile, authLoading]);

  const loadData = async () => {
    try {
      const settingsDoc = await getDoc(doc(getDb(), "adminSettings", "global"));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as any);
      }
    } catch (err) {
      console.error("Settings Fetch Error:", err);
    }
  };

  // ================= MENU ACTIONS =================
  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(getDb(), "menu"), {
        ...menuForm,
        price: Number(menuForm.price),
        discount: Number(menuForm.discount),
        createdAt: serverTimestamp()
      });
      toast.success("Item added successfully");
      setMenuForm({
        name: "",
        price: "",
        category: "",
        image: "",
        description: "",
        discount: "0",
        isAvailable: true,
        type: "veg"
      });
    } catch (err: any) {
      console.error("Add Item Error:", err);
      if (err.code === 'permission-denied') {
        toast.error("Permission denied while adding menu item.");
        return;
      }
      toast.error("Failed to add item");
    }
  };

  const handleUpdateMenuItem = async (id: string, updates: any) => {
    try {
      const data = { ...updates };
      if (data.price) data.price = Number(data.price);
      if (data.discount) data.discount = Number(data.discount);
      
      await updateDoc(doc(getDb(), "menu", id), data);
      setMenu(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
      toast.success("Item updated");
      setEditingItem(null);
    } catch (err: any) {
      console.error("Update Item Error:", err);
      if (err.code === 'permission-denied') {
        toast.error("Permission denied while updating menu item.");
        return;
      }
      toast.error("Update failed");
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(getDb(), "menu", id));
      setMenu(prev => prev.filter(item => item.id !== id));
      toast.success("Item deleted");
    } catch (err: any) {
      console.error("Delete Item Error:", err);
      if (err.code === 'permission-denied') {
        toast.error("Permission denied while deleting menu item.");
        return;
      }
      toast.error("Delete failed");
    }
  };

  // ================= ORDER ACTIONS =================
  const updateOrderStatus = async (id: string, status: OrderStatus, trackingData?: any) => {
    try {
      await apiUpdateOrderStatus(id, status, trackingData);
      toast.success(`Order updated to ${getDisplayStatus(status)}`);
      
      // Clear highlight when status is updated
      setNewOrderIds(prev => prev.filter(oid => oid !== id));
    } catch (err: any) {
      console.error("Update Status Error:", err);
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleTriggerRefund = async (orderId: string, amount: number) => {
    if (!window.confirm(`Trigger refund of ${formatPrice(amount)} for order #${orderId}?`)) return;

    try {
      await updateDoc(doc(getDb(), "orders", orderId), {
        refundStatus: 'initiated',
        refundAmount: amount,
        refundedAt: serverTimestamp()
      });
      toast.success("Refund initiated successfully");
    } catch (err) {
      console.error("Refund Error:", err);
      toast.error("Failed to initiate refund");
    }
  };

  const handleUpdateRefundStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(getDb(), "orders", orderId), {
        refundStatus: status
      });
      toast.success(`Refund status updated to ${status}`);
    } catch (err) {
      console.error("Refund Update Error:", err);
      toast.error("Failed to update refund status");
    }
  };

  const sortedOrders = React.useMemo(() => {
    return [...orders].sort((a, b) => {
      const aDelivery = a.deliveryType || 'asap';
      const bDelivery = b.deliveryType || 'asap';

      if (aDelivery === 'asap' && bDelivery !== 'asap') return -1;
      if (aDelivery !== 'asap' && bDelivery === 'asap') return 1;

      if (aDelivery === 'scheduled' && bDelivery === 'scheduled') {
        const aScheduled = safeParseDate(a.scheduledTime || a.scheduledFor).getTime();
        const bScheduled = safeParseDate(b.scheduledTime || b.scheduledFor).getTime();
        if (aScheduled !== bScheduled) return aScheduled - bScheduled;
      }

      const aCreated = safeParseDate(a.createdAt).getTime();
      const bCreated = safeParseDate(b.createdAt).getTime();
      return bCreated - aCreated;
    });
  }, [orders]);

  // Split orders into active and scheduled
  const { activeOrders: activeOrderList, scheduledOrders } = React.useMemo(() => {
    const now = new Date();
    const active = [];
    const scheduled = [];

    for (const order of sortedOrders) {
      const deliveryType = order.deliveryType || 'asap';
      if (deliveryType === 'asap') {
        active.push(order);
      } else if (deliveryType === 'scheduled') {
        const scheduledTime = safeParseDate(order.scheduledTime || order.scheduledFor);
        const prepStartTime = new Date(scheduledTime.getTime() - 60 * 60 * 1000); // 60 minutes before
        
        if (now >= prepStartTime) {
          active.push(order);
        } else {
          scheduled.push(order);
        }
      } else {
        active.push(order);
      }
    }

    return { activeOrders: active, scheduledOrders: scheduled };
  }, [sortedOrders]);

  const handleHandOver = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowTrackingModal(true);
  };

  const submitHandOver = async () => {
    if (!selectedOrderId) return;
    const order = orders.find(o => o.id === selectedOrderId);
    // Default to out_for_delivery if tracking data is provided, otherwise handed_over
    const status = trackingData.trackingLink || trackingData.riderName ? OrderStatus.OUT_FOR_DELIVERY : OrderStatus.READY;
    
    // Map trackingData to the fields expected by updateOrderStatus and the database
    const finalTrackingData = {
      deliveryPartner: trackingData.deliveryPartner,
      trackingLink: trackingData.trackingLink,
      riderName: trackingData.riderName,
      riderPhone: trackingData.riderPhone,
      assignedDelivery: trackingData.deliveryPartner // For backward compatibility if needed
    };

    await updateOrderStatus(selectedOrderId, status, finalTrackingData);
    setShowTrackingModal(false);
    setSelectedOrderId(null);
    setTrackingData({ deliveryPartner: 'Rapido', trackingLink: '', riderName: '', riderPhone: '' });
  };

  // ================= COUPON ACTIONS =================
  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(getDb(), "coupons"), {
        ...couponForm,
        discountValue: Number(couponForm.discountValue),
        minOrder: Number(couponForm.minOrder),
        createdAt: serverTimestamp()
      });
      toast.success("Coupon created");
      setCouponForm({
        code: "",
        discountType: "fixed",
        discountValue: "",
        minOrder: "0",
        expiryDate: "",
        isActive: true
      });
    } catch (err) {
      toast.error("Failed to create coupon");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm("Delete this coupon?")) return;
    try {
      await deleteDoc(doc(getDb(), "coupons", id));
      toast.success("Coupon deleted");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  // ================= BANNER ACTIONS =================
  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(getDb(), "banners"), {
        ...bannerForm,
        priority: Number(bannerForm.priority),
        createdAt: serverTimestamp()
      });
      setBannerForm({ title: "", image: "", link: "", priority: 1, isActive: true });
      toast.success("Banner added successfully");
    } catch (err) {
      console.error("Banner Add Error:", err);
      toast.error("Failed to add banner");
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) return;
    try {
      await deleteDoc(doc(getDb(), "banners", id));
      toast.success("Banner deleted");
    } catch (err) {
      console.error("Banner Delete Error:", err);
      toast.error("Failed to delete banner");
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(getDb(), "categories"), {
        ...categoryForm,
        createdAt: serverTimestamp()
      });
      setCategoryForm({ name: "", image: "", priority: 0, isActive: true, showOnHome: true });
      toast.success("Category added");
    } catch (err) {
      toast.error("Failed to add category");
    }
  };

  const handleUpdateCategory = async (id: string, data: any) => {
    try {
      await updateDoc(doc(getDb(), "categories", id), data);
      toast.success("Category updated");
      setEditingCategory(null);
    } catch (err) {
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await deleteDoc(doc(getDb(), "categories", id));
      toast.success("Category deleted");
    } catch (err) {
      toast.error("Failed to delete category");
    }
  };

  const handleDownloadReport = async () => {
    try {
      const data = orders.map(o => {
        const items = Array.isArray(o.items) ? o.items : [];
        return {
          OrderNumber: o.orderNumber || o.id,
          Date: safeParseDate(o.createdAt).toLocaleString(),
          Customer: o.phone || 'Guest',
          Total: o.totalAmount || 0,
          Status: o.status || 'unknown',
          Items: items.map((i: any) => `${i.name} (${i.quantity})`).join(", "),
          Payment: o.paymentStatus || 'pending'
        };
      });

      const headers = [
        "OrderNumber",
        "Date",
        "Customer",
        "Total",
        "Status",
        "Items",
        "Payment"
      ];

      const csvRows = [
        headers.join(","),
        ...data.map(row => headers.map(header => JSON.stringify(row[header as keyof typeof row] || "")).join(","))
      ];

      const csvContent = csvRows.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Business_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Report downloaded successfully");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export data");
    }
  };

  const handleSendReportEmail = async () => {
    try {
      const data = orders.map(o => {
        const items = Array.isArray(o.items) ? o.items : [];
        return {
          OrderNumber: o.orderNumber,
          Date: o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString() : new Date(o.createdAt).toLocaleString(),
          Customer: o.phone,
          Total: o.totalAmount,
          Status: o.status,
          Items: items.map((i: any) => `${i.name} (${i.quantity})`).join(", "),
          Payment: o.paymentStatus
        };
      });

      await axios.post('/api/admin/send-report', { data, email: userProfile?.email || 'lucky.lakshmi46@gmail.com' }, { timeout: 30000 });
      toast.success("Report sent to your email");
    } catch (err) {
      toast.error("Failed to send report email");
    }
  };

  const getAnalyticsData = () => {
    // Revenue by date
    const revenueByDate: any = {};
    orders.forEach(o => {
      const date = safeParseDate(o.createdAt).toLocaleDateString();
      revenueByDate[date] = (revenueByDate[date] || 0) + (o.totalAmount || 0);
    });

    const revenueChart = Object.keys(revenueByDate).map(date => ({
      date,
      revenue: revenueByDate[date]
    })).slice(-7);

    // Orders by category
    const categoryCount: any = {};
    orders.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((item: any) => {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + (item.quantity || 0);
      });
    });

    const categoryChart = Object.keys(categoryCount).map(cat => ({
      name: cat,
      value: categoryCount[cat]
    }));

    return { revenueChart, categoryChart };
  };

  const { revenueChart, categoryChart } = getAnalyticsData();
  const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

  const toggleCouponStatus = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(getDb(), "coupons", id), { isActive: !current });
      toast.success("Status updated");
    } catch (err) {
      toast.error("Update failed");
    }
  };
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(getDb(), "adminSettings", "global"), {
        gst: Number(settings.gst),
        packingFee: Number(settings.packingFee),
        deliveryFee: Number(settings.deliveryFee),
        isStoreOpen: settings.isStoreOpen,
        storeTiming: settings.storeTiming
      }, { merge: true });
      toast.success("Settings updated");
      loadData();
    } catch (err: any) {
      console.error("Update Settings Error:", err);
      if (err?.code === 'permission-denied') {
        toast.error("Permission denied while updating settings.");
        return;
      }
      toast.error(err?.message || "Failed to update settings");
    }
  };

  // ================= DASHBOARD STATS =================
  const totalRevenue = orders.reduce((sum, o) => sum + (o.status === OrderStatus.DELIVERED ? (o.totalAmount || 0) : 0), 0);
  const activeOrdersCount = orders.filter(o => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED).length;
  
  const deliveredOrders = orders.filter(o => o.status === OrderStatus.DELIVERED);
  const aov = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;
  const completionRate = orders.length > 0 ? (deliveredOrders.length / orders.length) * 100 : 0;

  const itemSalesCount: Record<string, number> = {};
  deliveredOrders.forEach(o => {
    (o.items || []).forEach((item: any) => {
      itemSalesCount[item.name] = (itemSalesCount[item.name] || 0) + item.quantity;
    });
  });

  const underperformingItems = Object.entries(itemSalesCount)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const toggleStoreStatus = async () => {
    try {
      await setDoc(doc(getDb(), "adminSettings", "global"), {
        isStoreOpen: !settings.isStoreOpen
      }, { merge: true });
      setSettings(prev => ({ ...prev, isStoreOpen: !prev.isStoreOpen }));
      toast.success(settings.isStoreOpen ? "Store Paused" : "Store Accepting Orders");
    } catch (err) {
      toast.error("Failed to update store status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-dark-bg flex flex-col md:flex-row transition-colors duration-300">
      {/* ZOMATO-STYLE NEW ORDER OVERLAY */}
      <AnimatePresence>
        {newOrderIds.length > 0 && (
          <m.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <m.div 
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="bg-white dark:bg-gray-900 rounded-[3rem] p-8 md:p-12 shadow-2xl max-w-lg w-full flex flex-col items-center justify-center text-center relative overflow-hidden border-4 border-red-500"
            >
              <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
              <div className="w-32 h-32 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-red-500/30 animate-bounce">
                <Bell size={64} className="animate-pulse" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 py-1 leading-snug">New Order!</h2>
              <div className="bg-red-50 dark:bg-red-900/20 px-6 py-3 rounded-2xl border border-red-100 dark:border-red-900/50 mb-8">
                <p className="text-xl md:text-2xl font-bold text-red-600">
                  {newOrderIds.length} {newOrderIds.length === 1 ? 'order' : 'orders'} waiting
                </p>
              </div>
              <button 
                onClick={() => {
                  setNewOrderIds([]);
                  if (orderAudioRef.current) {
                    orderAudioRef.current.pause();
                    orderAudioRef.current.currentTime = 0;
                  }
                  setTab("orders");
                }}
                className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xl hover:bg-red-700 transition-all active:scale-95 shadow-xl shadow-red-600/30 flex items-center justify-center gap-3"
              >
                <Check size={28} />
                Acknowledge
              </button>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>


      {/* SIDEBAR */}
      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <m.div 
            initial={typeof window !== 'undefined' && window.innerWidth < 768 ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={`fixed md:sticky top-0 left-0 h-screen w-80 bg-brand-bg dark:bg-dark-bg border-r border-gray-200 dark:border-white/5 flex flex-col z-[70] md:z-auto shadow-2xl md:shadow-none ${!isSidebarOpen && 'hidden'}`}
          >
            <div className="p-8 border-b border-gray-100 dark:border-gray-800">
              <h1 className="text-2xl font-black text-red-600 tracking-tighter leading-snug py-1">MANA INTI<br/>BOJANAM</h1>
              <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-[0.2em]">Admin Dashboard</p>
            </div>

            <nav className="flex-1 p-6 space-y-1 overflow-y-auto no-scrollbar">
              <SidebarLink icon={<Home size={20}/>} label="Back to Home" active={false} onClick={() => navigate("/?noredirect=true")} />
              <div className="h-4" /> {/* Spacer */}
              <SidebarLink icon={<LayoutDashboard size={20}/>} label="Dashboard" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
              <SidebarLink 
                icon={<ShoppingBag size={20}/>} 
                label="Orders" 
                active={tab === "orders"} 
                onClick={() => setTab("orders")} 
                badge={newOrderIds.length > 0 ? newOrderIds.length : undefined}
              />
              <SidebarLink icon={<RefreshCcw size={20}/>} label="Refunds" active={tab === "refunds"} onClick={() => setTab("refunds")} />
              <SidebarLink icon={<Utensils size={20}/>} label="Menu" active={tab === "menu"} onClick={() => setTab("menu")} />
              <SidebarLink icon={<FileText size={20}/>} label="Categories" active={tab === "categories"} onClick={() => setTab("categories")} />
              <SidebarLink icon={<Zap size={20}/>} label="Coupons" active={tab === "coupons"} onClick={() => setTab("coupons")} />
              <SidebarLink icon={<Package size={20}/>} label="Subscriptions" active={tab === "subscriptions"} onClick={() => setTab("subscriptions")} />
              <SidebarLink icon={<Bell size={20}/>} label="Reviews" active={tab === "reviews"} onClick={() => setTab("reviews")} />
              <SidebarLink icon={<Package size={20}/>} label="Banners" active={tab === "banners"} onClick={() => setTab("banners")} />
              <SidebarLink icon={<MessageSquare size={20}/>} label="Support" active={tab === "support"} onClick={() => setTab("support")} />
              <SidebarLink icon={<TrendingUp size={20}/>} label="Analytics" active={tab === "analytics"} onClick={() => setTab("analytics")} />
              <SidebarLink icon={<Settings size={20}/>} label="Settings" active={tab === "pricing"} onClick={() => setTab("pricing")} />
              <SidebarLink icon={<ShieldCheck size={20}/>} label="System Health" active={false} onClick={() => window.open("/admin/system-health", "_blank")} />
            </nav>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800">
              <button 
                onClick={logout}
                className="flex items-center gap-3 text-gray-500 hover:text-red-600 font-bold transition-colors w-full p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      <AnimatePresence>
        {isSidebarOpen && (
          <m.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[65] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-[#0A0A0A]">
        {/* APP HEADER */}
        <div 
          className="bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-4 flex items-center justify-between sticky top-0 z-[60] flex-shrink-0 transition-all"
          style={{ 
            paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
            paddingBottom: '10px'
          }}
        >
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all active:scale-95 text-gray-600 dark:text-gray-400"
            >
              <LayoutDashboard size={22} />
            </button>
            <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-1" />
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-tight text-red-600 uppercase leading-none">MIB ADMIN</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">DASHBOARD</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors text-gray-500 dark:text-gray-400"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} className="text-red-500" />}
            </button>
            <button 
              onClick={() => navigate("/?noredirect=true")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors text-gray-500 dark:text-gray-400"
              title="Back to Home"
            >
              <Home size={18} />
            </button>
            <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-1" />
            <button 
              onClick={logout}
              className="ml-1 p-2 bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-all"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* STORE STATUS BAR (COMPACT) */}
        <div className="flex-shrink-0 bg-white dark:bg-black border-b border-gray-100 dark:border-white/5 px-4 py-3 flex items-center justify-between gap-4 z-40">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${settings.isStoreOpen ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'} animate-pulse`} />
            <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
              {settings.isStoreOpen ? 'Accepting Orders' : 'Store Paused'}
            </span>
          </div>
          <button 
            onClick={toggleStoreStatus}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${settings.isStoreOpen ? 'bg-green-500' : 'bg-red-500'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${settings.isStoreOpen ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 md:px-8 lg:px-12 md:py-8 lg:py-12 bg-brand-bg dark:bg-dark-bg transition-colors duration-300">
        <AnimatePresence mode="wait">
          {tab === "dashboard" && (
            <m.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Overview</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time business insights</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={loadData}
                      className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-xl text-gray-500 transition-all active:scale-95"
                      title="Refresh Data"
                    >
                      <RefreshCcw size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button 
                    onClick={handleDownloadReport}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                      <Download size={20} />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Excel</span>
                  </button>
                  <button 
                    onClick={handleSendReportEmail}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                      <Mail size={20} />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</span>
                  </button>
                  <button 
                    onClick={handleSeedMenuItems}
                    disabled={isSeedingMenu}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                      <RefreshCcw size={20} className={isSeedingMenu ? 'animate-spin' : ''} />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isSeedingMenu ? 'Seeding' : 'Seed'}</span>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
                <StatCard icon={<TrendingUp className="text-green-600" />} label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} subtext="From delivered orders" />
                <StatCard icon={<ShoppingBag className="text-blue-600" />} label="Total Orders" value={orders.length} subtext="Lifetime orders" />
                <StatCard icon={<Package className="text-red-600" />} label="Active Orders" value={activeOrdersCount} subtext="Pending fulfillment" />
                <StatCard icon={<DollarSign className="text-emerald-600" />} label="AOV" value={`₹${aov.toFixed(0)}`} subtext="Avg Order Value" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                  <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 dark:text-white">Recent Activity</h3>
                  <div className="space-y-3 md:space-y-4">
                    {orders.length > 0 ? orders.slice(0, 5).map(order => (
                      <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 md:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-red-600 font-bold text-xs md:text-sm">
                            #{(order.orderNumber || 0).toString().slice(-3)}
                          </div>
                          <div>
                            <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white">Order #{order.orderNumber || 'N/A'}</p>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : new Date(order.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white">{formatPrice(order.totalAmount)}</p>
                          <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                            {getDisplayStatus(order.status)}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8 md:py-12 text-gray-400 font-medium text-sm">No recent activity</div>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-3xl md:rounded-[2.5rem] p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg md:text-xl font-bold mb-4 dark:text-white">Analytics Summary</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Completion Rate</p>
                        <p className="text-2xl font-black text-emerald-600">{completionRate.toFixed(1)}%</p>
                      </div>
                      
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Trim Menu (Low Sales)</p>
                        <ul className="space-y-2">
                          {underperformingItems.length > 0 ? underperformingItems.map((item, idx) => (
                            <li key={idx} className="flex justify-between items-center text-sm">
                              <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-2">{item.name}</span>
                              <span className="font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded text-xs">{item.count} sold</span>
                            </li>
                          )) : (
                            <li className="text-xs text-gray-400">Not enough data</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </m.div>
          )}

          {tab === "analytics" && (
            <m.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Business Analytics</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Insights and growth predictions</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                <div className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                  <h3 className="text-base md:text-lg lg:text-xl font-black mb-4 md:mb-6 lg:mb-8 dark:text-white">Revenue Trend (Last 7 Days)</h3>
                  <div className="h-[250px] md:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueChart}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <Tooltip 
                          formatter={(value: any) => [`₹${value?.toFixed(2)}`, 'Revenue']}
                          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff' }}
                          itemStyle={{ fontWeight: 800, color: '#dc2626' }}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={4} dot={{ r: 6, fill: '#dc2626', strokeWidth: 2, stroke: theme === 'dark' ? '#0f172a' : '#fff' }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                  <h3 className="text-base md:text-lg lg:text-xl font-black mb-4 md:mb-6 lg:mb-8 dark:text-white">Orders by Category</h3>
                  <div className="h-[280px] md:h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChart}
                          cx="50%"
                          cy="45%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryChart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [`${value} Orders`, 'Count']}
                          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff' }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          align="center"
                          iconType="circle"
                          wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 700, color: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-gray-800 col-span-1 lg:col-span-2">
                  <h3 className="text-base md:text-lg lg:text-xl font-black mb-4 md:mb-6 lg:mb-8 dark:text-white">Daily Sales Performance</h3>
                  <div className="h-[250px] md:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueChart}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <Tooltip 
                          cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f8fafc' }} 
                          formatter={(value: any) => [`₹${value?.toFixed(2)}`, 'Revenue']}
                          contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', border: 'none', borderRadius: '1rem' }} 
                        />
                        <Bar dataKey="revenue" fill="#dc2626" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-red-600 rounded-2xl md:rounded-[2.5rem] lg:rounded-[3rem] p-6 md:p-8 lg:p-12 text-white relative overflow-hidden">
                <div className="relative z-10 space-y-2">
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-black">Growth Prediction</h3>
                  <p className="text-sm md:text-base text-red-100 font-medium max-w-xl leading-relaxed">
                    Based on your current growth rate of {((revenueChart[revenueChart.length-1]?.revenue / revenueChart[0]?.revenue - 1) * 100 || 0).toFixed(1)}% over the last week, 
                    we predict a {((revenueChart[revenueChart.length-1]?.revenue / revenueChart[0]?.revenue - 1) * 110 || 0).toFixed(1)}% increase in revenue for the next month.
                    Consider adding more items to the '{categoryChart[0]?.name || 'popular'}' category to maximize profits.
                  </p>
                </div>
                <TrendingUp size={150} className="absolute -right-5 md:-right-10 -bottom-5 md:-bottom-10 text-white/10 rotate-12" />
              </div>
            </m.div>
          )}

          {tab === "categories" && (
            <m.div key="categories" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <div className="flex flex-col gap-2 md:gap-0 md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Category Management</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Organize your menu categories</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                <div className="lg:col-span-1">
                  <form onSubmit={editingCategory ? (e) => { e.preventDefault(); handleUpdateCategory(editingCategory.id, editingCategory); } : handleAddCategory} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-800 sticky top-32">
                    <h3 className="text-base md:text-lg lg:text-xl font-bold mb-4 md:mb-6 dark:text-white">{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
                    <div className="space-y-3 md:space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4">Category Name</label>
                        <input
                          type="text"
                          placeholder="e.g., Main Course"
                          className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 md:px-6 py-3 md:py-4 font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm"
                          value={editingCategory ? editingCategory.name : categoryForm.name}
                          onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, name: e.target.value}) : setCategoryForm({...categoryForm, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4">Image URL</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 md:px-6 py-3 md:py-4 font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm"
                          value={editingCategory ? editingCategory.image : categoryForm.image}
                          onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, image: e.target.value}) : setCategoryForm({...categoryForm, image: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4">Priority</label>
                        <input
                          type="number"
                          className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 md:px-6 py-3 md:py-4 font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm"
                          value={editingCategory ? editingCategory.priority : categoryForm.priority}
                          onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, priority: Number(e.target.value)}) : setCategoryForm({...categoryForm, priority: Number(e.target.value)})}
                          required
                        />
                      </div>
                      <div className="flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            checked={editingCategory ? editingCategory.isActive : categoryForm.isActive}
                            onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, isActive: e.target.checked}) : setCategoryForm({...categoryForm, isActive: e.target.checked})}
                          />
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Active</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            checked={editingCategory ? editingCategory.showOnHome : categoryForm.showOnHome}
                            onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, showOnHome: e.target.checked}) : setCategoryForm({...categoryForm, showOnHome: e.target.checked})}
                          />
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Show on Home</span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        {editingCategory && (
                          <button type="button" onClick={() => setEditingCategory(null)} className="flex-1 py-3 md:py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest">
                            Cancel
                          </button>
                        )}
                        <button type="submit" className="flex-[2] py-3 md:py-4 bg-red-600 text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all">
                          {editingCategory ? 'Update' : 'Create'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {categories.map(cat => (
                    <div key={cat.id} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <h4 className="text-base md:text-lg font-black text-gray-900 dark:text-white">{cat.name}</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cat.isActive ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                              {cat.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {cat.showOnHome && (
                              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600">
                                Home
                              </span>
                            )}
                            <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest ml-auto sm:ml-2">Priority: {cat.priority}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setEditingCategory(cat)} className="p-2 md:p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-600 rounded-xl transition-all">
                          <Edit2 size={18} className="md:size-5" />
                        </button>
                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 md:p-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 rounded-xl transition-all">
                          <Trash2 size={18} className="md:size-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="col-span-full text-center py-12 md:py-24 bg-white dark:bg-gray-900 rounded-2xl md:rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
                      <Package size={40} className="md:size-12 mx-auto text-gray-200 dark:text-gray-700 mb-3 md:mb-4" />
                      <p className="text-gray-400 dark:text-gray-500 font-bold text-sm">No categories defined</p>
                    </div>
                  )}
                </div>
              </div>
            </m.div>
          )}

          {tab === "orders" && (
            <m.div key="orders" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="flex flex-col gap-2 md:gap-0 md:justify-between md:items-center mb-8 md:mb-12">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Manage Orders</h2>
                  <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Last updated: {lastUpdated.toLocaleTimeString()}</p>
                </div>
                {newOrderIds.length > 0 && (
                  <button 
                    onClick={() => setNewOrderIds([])}
                    className="px-4 sm:px-6 py-2 md:py-3 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-200 dark:hover:bg-red-900/30 transition-all animate-pulse text-xs md:text-sm"
                  >
                    <Bell size={16} />
                    <span>Clear {newOrderIds.length} New Notifications</span>
                  </button>
                )}
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
                <input
                  type="text"
                  placeholder="Search by Order ID or Phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 dark:text-white transition-all"
                />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 dark:text-white transition-all md:w-56"
                >
                  <option value="all">All Orders</option>
                  <option value={OrderStatus.PLACED}>Placed</option>
                  <option value={OrderStatus.ACCEPTED}>Accepted</option>
                  <option value={OrderStatus.PAYMENT_PENDING}>Payment Pending</option>
                  <option value={OrderStatus.PAYMENT_VERIFICATION}>Payment Verification</option>
                  <option value={OrderStatus.PREPARING}>Preparing</option>
                  <option value={OrderStatus.READY}>Ready</option>
                  <option value={OrderStatus.OUT_FOR_DELIVERY}>Out for Delivery</option>
                  <option value={OrderStatus.DELIVERED}>Delivered</option>
                  <option value={OrderStatus.CANCELLED}>Cancelled</option>
                </select>
              </div>

              {/* New Orders Section */}
              <div className="mb-8 md:mb-12">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className="w-2 h-8 bg-red-500 rounded-full"></div>
                  <h3 className="text-lg md:text-xl lg:text-2xl font-black text-gray-900 dark:text-white">New Orders</h3>
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full font-bold text-xs uppercase tracking-widest">
                    {activeOrderList.filter(o => [OrderStatus.PLACED, OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PAYMENT_VERIFICATION, OrderStatus.PAYMENT_PENDING].includes(o.status as any) && 
                                               (o.orderNumber?.toString().includes(search) || o.phone?.includes(search))).length}
                  </span>
                </div>
                <div className={`grid gap-2 md:gap-4 lg:gap-6 ${compactMode ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                  {activeOrderList
                    .filter(o => [OrderStatus.PLACED, OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PAYMENT_VERIFICATION, OrderStatus.PAYMENT_PENDING].includes(o.status as any) && 
                                 (o.orderNumber?.toString().includes(search) || o.phone?.includes(search)))
                    .map(order => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        updateOrderStatus={updateOrderStatus} 
                        getStatusColor={getStatusColor}
                        onHandOver={() => handleHandOver(order.id)}
                        compactMode={compactMode}
                      />
                    ))}
                </div>
                {activeOrderList.filter(o => [OrderStatus.PLACED, OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PAYMENT_VERIFICATION, OrderStatus.PAYMENT_PENDING].includes(o.status as any)).length === 0 && (
                  <div className="text-center py-8 md:py-12 bg-white dark:bg-gray-900 rounded-2xl md:rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
                    <Package size={40} className="md:size-12 mx-auto text-gray-200 dark:text-gray-700 mb-3 md:mb-4" />
                    <p className="text-gray-400 dark:text-gray-500 font-bold text-sm">No new orders</p>
                  </div>
                )}
              </div>

              {/* Preparing Section */}
              <div className="mb-8 md:mb-12">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
                  <h3 className="text-lg md:text-xl lg:text-2xl font-black text-gray-900 dark:text-white">Preparing</h3>
                  <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-600 rounded-full font-bold text-xs uppercase tracking-widest">
                    {activeOrderList.filter(o => o.status === OrderStatus.PREPARING && 
                                               (o.orderNumber?.toString().includes(search) || o.phone?.includes(search))).length}
                  </span>
                </div>
                <div className={`grid gap-3 md:gap-4 lg:gap-6 ${compactMode ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                  {activeOrderList
                    .filter(o => o.status === OrderStatus.PREPARING && 
                                 (o.orderNumber?.toString().includes(search) || o.phone?.includes(search)))
                    .map(order => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        updateOrderStatus={updateOrderStatus} 
                        getStatusColor={getStatusColor}
                        onHandOver={() => handleHandOver(order.id)}
                        compactMode={compactMode}
                      />
                    ))}
                </div>
              </div>

              {/* Ready Section */}
              <div className="mb-8 md:mb-12">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className="w-2 h-8 bg-green-500 rounded-full"></div>
                  <h3 className="text-lg md:text-xl lg:text-2xl font-black text-gray-900 dark:text-white">Ready for Dispatch</h3>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full font-bold text-xs uppercase tracking-widest">
                    {activeOrderList.filter(o => [OrderStatus.READY, OrderStatus.COURIER_BOOKED, OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY].includes(o.status as any) && 
                                               (o.orderNumber?.toString().includes(search) || o.phone?.includes(search))).length}
                  </span>
                </div>
                <div className={`grid gap-3 md:gap-4 lg:gap-6 ${compactMode ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                  {activeOrderList
                    .filter(o => [OrderStatus.READY, OrderStatus.COURIER_BOOKED, OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY].includes(o.status as any) && 
                                 (o.orderNumber?.toString().includes(search) || o.phone?.includes(search)))
                    .map(order => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        updateOrderStatus={updateOrderStatus} 
                        getStatusColor={getStatusColor}
                        onHandOver={() => handleHandOver(order.id)}
                        compactMode={compactMode}
                      />
                    ))}
                </div>
              </div>

              {/* Scheduled Orders Section */}
              <div className="mb-8 md:mb-12">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                  <h3 className="text-lg md:text-xl lg:text-2xl font-black text-gray-900 dark:text-white">Scheduled Orders</h3>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-full font-bold text-xs uppercase tracking-widest">
                    {scheduledOrders.filter(o => (filter === "all" || o.status === filter) && 
                                                (o.orderNumber?.toString().includes(search) || o.phone?.includes(search))).length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
                  {scheduledOrders
                    .filter(o => (filter === "all" || o.status === filter) && 
                                 (o.orderNumber?.toString().includes(search) || o.phone?.includes(search)))
                    .map(order => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        updateOrderStatus={updateOrderStatus} 
                        getStatusColor={getStatusColor}
                        onHandOver={() => handleHandOver(order.id)}
                      />
                    ))}
                </div>
                {scheduledOrders.filter(o => (filter === "all" || o.status === filter) && 
                                           (o.orderNumber?.toString().includes(search) || o.phone?.includes(search))).length === 0 && (
                  <div className="text-center py-8 md:py-12 bg-white dark:bg-gray-900 rounded-2xl md:rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
                    <Clock size={40} className="md:size-12 mx-auto text-gray-200 dark:text-gray-700 mb-3 md:mb-4" />
                    <p className="text-gray-400 dark:text-gray-500 font-bold text-sm">No scheduled orders</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-2">Orders scheduled for later will appear here until 1 hour before delivery time</p>
                  </div>
                )}
              </div>
            </m.div>
          )}

          {tab === "refunds" && (
            <m.div key="refunds" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-8 md:mb-12 tracking-tight">Refund Management</h2>
              
              <div className="space-y-6">
                {orders.filter(o => o.refundStatus || o.status === OrderStatus.CANCELLED).map(order => (
                  <div key={order.id} className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold dark:text-white">Order #{order.orderNumber}</h3>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                            order.refundStatus === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 
                            order.refundStatus === 'initiated' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                          }`}>
                            {order.refundStatus || 'Not Initiated'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Customer: {order.phone}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Reason: {order.status === OrderStatus.CANCELLED ? 'Customer Cancelled' : 'Other'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 dark:text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-1">Refund Amount</p>
                        <p className="text-2xl font-black text-red-600">{formatPrice(order.totalAmount)}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-gray-50 dark:border-gray-800">
                      {!order.refundStatus ? (
                        <button 
                          onClick={() => handleTriggerRefund(order.id, order.totalAmount)}
                          className="px-6 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-red-700 shadow-lg shadow-red-600/20"
                        >
                          Initiate Refund
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleUpdateRefundStatus(order.id, 'processing')}
                            className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-blue-100"
                          >
                            Mark Processing
                          </button>
                          <button 
                            onClick={() => handleUpdateRefundStatus(order.id, 'completed')}
                            className="px-6 py-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-green-100"
                          >
                            Mark Completed
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {orders.filter(o => o.refundStatus || o.status === OrderStatus.CANCELLED).length === 0 && (
                  <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
                    <RefreshCcw size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
                    <p className="text-gray-400 dark:text-gray-500 font-bold">No refunds to manage</p>
                  </div>
                )}
              </div>
            </m.div>
          )}

          {tab === "menu" && (
            <m.div key="menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8 md:mb-12">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Menu Management</h2>
                <button 
                  onClick={() => setTab("add_item")}
                  className="bg-red-600 text-white px-4 sm:px-6 py-3 md:py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 text-sm md:text-base"
                >
                  <Plus size={18} />
                  <span>Add New Item</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                {menu.length > 0 ? menu.map(item => (
                  <div key={item.id} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:gap-4 md:gap-6 group">
                    <div className="w-full sm:w-32 md:w-32 h-32 md:h-32 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{item.category}</span>
                            <h3 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">{item.name}</h3>
                          </div>
                          <p className="text-lg md:text-xl font-black text-gray-900 dark:text-white">₹{item.price}</p>
                        </div>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">{item.description}</p>
                      </div>

                      <div className="flex items-center justify-between mt-3 md:mt-4 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${item.isAvailable !== false ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{item.isAvailable !== false ? 'Available' : 'Sold Out'}</span>
                          </div>
                          {(item.discount || 0) > 0 && (
                            <span className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-black px-2 py-1 rounded-full">-{item.discount}% OFF</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              if (oosConfirmId === item.id) {
                                handleUpdateMenuItem(item.id, { isAvailable: item.isAvailable === false });
                                setOosConfirmId(null);
                              } else {
                                setOosConfirmId(item.id);
                                setTimeout(() => setOosConfirmId(null), 3000);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1 shadow-sm ${oosConfirmId === item.id ? 'bg-red-500 text-white scale-105' : item.isAvailable !== false ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200'}`}
                            title="Quick OOS Toggle"
                          >
                            {oosConfirmId === item.id ? 'Confirm?' : item.isAvailable !== false ? 'In Stock' : 'Out of Stock'}
                          </button>
                          
                          <button 
                            onClick={() => {
                              setEditingItem(item);
                              setTab("edit_item");
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit Item"
                          >
                            <Edit2 size={16} className="md:size-4.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteMenuItem(item.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} className="md:size-4.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full text-center py-16 md:py-24 bg-white dark:bg-gray-900 rounded-2xl md:rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
                    <Utensils size={40} className="md:size-12 mx-auto text-gray-200 dark:text-gray-700 mb-3 md:mb-4" />
                    <p className="text-gray-400 dark:text-gray-500 font-bold text-sm">Menu is empty</p>
                  </div>
                )}
              </div>
            </m.div>
          )}

          {tab === "add_item" && (
            <m.div key="add_item" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-12">
                <button onClick={() => setTab("menu")} className="p-2 md:p-3 hover:bg-white dark:hover:bg-gray-800 rounded-2xl text-gray-400 hover:text-red-600 transition-all">
                  <X size={20} className="md:size-6" />
                </button>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Add New Dish</h2>
              </div>

              <form onSubmit={handleAddMenuItem} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-[2.5rem] p-6 md:p-8 lg:p-12 shadow-sm border border-gray-100 dark:border-gray-800 max-w-3xl lg:max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                  <div className="space-y-4 md:space-y-6">
                    <InputGroup label="Dish Name" placeholder="e.g. Special Chicken Biryani" value={menuForm.name} onChange={v => setMenuForm({...menuForm, name: v})} />
                    <div className="grid grid-cols-2 gap-3 md:gap-6">
                      <InputGroup label="Base Price (₹)" type="number" placeholder="199" value={menuForm.price} onChange={v => setMenuForm({...menuForm, price: v})} />
                      <InputGroup label="Discount (%)" type="number" placeholder="0" value={menuForm.discount} onChange={v => setMenuForm({...menuForm, discount: v})} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        className="w-full p-3 md:p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm"
                        value={menuForm.category}
                        onChange={(e) => setMenuForm({...menuForm, category: e.target.value})}
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                        {/* Fallback categories if none defined */}
                        {categories.length === 0 && ['Veg Meals', 'Biryani', 'Tiffins', 'Combos', 'Desserts', 'Starters', 'Main Course'].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="other">Other (Type below)</option>
                      </select>
                      {menuForm.category === 'other' && (
                        <input 
                          type="text"
                          placeholder="Enter new category"
                          className="w-full p-3 md:p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none mt-2 text-sm"
                          onChange={(e) => setMenuForm({...menuForm, category: e.target.value})}
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Type</label>
                      <div className="flex gap-3 md:gap-4">
                        <button 
                          type="button"
                          onClick={() => setMenuForm({...menuForm, type: 'veg'})}
                          className={`flex-1 py-2 md:py-3 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${menuForm.type === 'veg' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30 text-green-600' : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400'}`}
                        >
                          Veg
                        </button>
                        <button 
                          type="button"
                          onClick={() => setMenuForm({...menuForm, type: 'non-veg'})}
                          className={`flex-1 py-2 md:py-3 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${menuForm.type === 'non-veg' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30 text-red-600' : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400'}`}
                        >
                          Non-Veg
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Image URL</label>
                      <input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        className="w-full p-3 md:p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        value={menuForm.image}
                        onChange={(e) => setMenuForm({...menuForm, image: e.target.value})}
                      />
                      {menuForm.image && (
                        <div className="rounded-2xl md:rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-700">
                          <img src={menuForm.image} alt="Dish preview" className="w-full h-auto object-cover" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Description</label>
                      <textarea 
                        className="w-full p-3 md:p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none min-h-[100px] md:min-h-[120px] text-sm"
                        placeholder="Describe the dish..."
                        value={menuForm.description}
                        onChange={(e) => setMenuForm({...menuForm, description: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 md:mt-12 flex justify-end">
                  <button type="submit" className="bg-orange-600 text-white px-8 md:px-12 py-3 md:py-4 rounded-2xl font-black text-sm md:text-base hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30">
                    Create Menu Item
                  </button>
                </div>
              </form>
            </m.div>
          )}

          {tab === "edit_item" && editingItem && (
            <m.div key="edit_item" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-12">
                <button onClick={() => { setEditingItem(null); setTab("menu"); }} className="p-2 md:p-3 hover:bg-white dark:hover:bg-gray-800 rounded-2xl text-gray-400 hover:text-red-600 transition-all">
                  <X size={20} className="md:size-6" />
                </button>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Edit Dish</h2>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateMenuItem(editingItem.id, editingItem);
                  setTab("menu");
                }} 
                className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-[2.5rem] p-6 md:p-8 lg:p-12 shadow-sm border border-gray-100 dark:border-gray-800 max-w-3xl lg:max-w-4xl"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                  <div className="space-y-4 md:space-y-6">
                    <InputGroup label="Dish Name" placeholder="e.g. Special Chicken Biryani" value={editingItem.name} onChange={v => setEditingItem({...editingItem, name: v})} />
                    <div className="grid grid-cols-2 gap-3 md:gap-6">
                      <InputGroup label="Base Price (₹)" type="number" placeholder="199" value={(editingItem.price ?? "").toString()} onChange={v => setEditingItem({...editingItem, price: v})} />
                      <InputGroup label="Discount (%)" type="number" placeholder="0" value={(editingItem.discount ?? "").toString()} onChange={v => setEditingItem({...editingItem, discount: v})} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        className="w-full p-3 md:p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm"
                        value={editingItem.category}
                        onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                        {/* Fallback categories if none defined */}
                        {categories.length === 0 && ['Veg Meals', 'Biryani', 'Tiffins', 'Combos', 'Desserts', 'Starters', 'Main Course'].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="other">Other (Type below)</option>
                      </select>
                      {editingItem.category === 'other' && (
                        <input 
                          type="text"
                          placeholder="Enter new category"
                          className="w-full p-3 md:p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none mt-2 text-sm"
                          onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Type</label>
                      <div className="flex gap-3 md:gap-4">
                        <button 
                          type="button"
                          onClick={() => setEditingItem({...editingItem, type: 'veg'})}
                          className={`flex-1 py-2 md:py-3 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${editingItem.type === 'veg' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30 text-green-600' : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400'}`}
                        >
                          Veg
                        </button>
                        <button 
                          type="button"
                          onClick={() => setEditingItem({...editingItem, type: 'non-veg'})}
                          className={`flex-1 py-2 md:py-3 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${editingItem.type === 'non-veg' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30 text-red-600' : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400'}`}
                        >
                          Non-Veg
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Image URL</label>
                      <input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        className="w-full p-3 md:p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        value={editingItem.image}
                        onChange={(e) => setEditingItem({...editingItem, image: e.target.value})}
                      />
                      {editingItem.image && (
                        <div className="rounded-2xl md:rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-700">
                          <img src={editingItem.image} alt="Dish preview" className="w-full h-auto object-cover" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Description</label>
                      <textarea 
                        className="w-full p-3 md:p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none min-h-[100px] md:min-h-[120px] text-sm"
                        placeholder="Describe the dish..."
                        value={editingItem.description}
                        onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center gap-3 p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <input 
                        type="checkbox" 
                        id="isAvailableEdit"
                        checked={editingItem.isAvailable !== false}
                        onChange={(e) => setEditingItem({...editingItem, isAvailable: e.target.checked})}
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      />
                      <label htmlFor="isAvailableEdit" className="text-sm font-bold text-gray-700 dark:text-gray-300">Item is Available</label>
                    </div>
                  </div>
                </div>

                <div className="mt-8 md:mt-12 flex justify-end">
                  <button type="submit" className="bg-orange-600 text-white px-8 md:px-12 py-3 md:py-4 rounded-2xl font-black text-sm md:text-base hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30">
                    Update Menu Item
                  </button>
                </div>
              </form>
            </m.div>
          )}

          {tab === "coupons" && (
            <m.div key="coupons" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-8 md:mb-12 tracking-tight">Coupon Management</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                <div className="lg:col-span-1">
                  <form onSubmit={handleAddCoupon} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-800 sticky top-32">
                    <h3 className="text-base md:text-lg lg:text-xl font-bold mb-4 md:mb-6 dark:text-white">Create Coupon</h3>
                    <div className="space-y-3 md:space-y-4">
                      <InputGroup label="Coupon Code" placeholder="e.g. WELCOME50" value={couponForm.code} onChange={v => setCouponForm({...couponForm, code: v.toUpperCase()})} />
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Type</label>
                          <select 
                            className="w-full p-3 md:p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-bold text-xs md:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                            value={couponForm.discountType}
                            onChange={(e) => setCouponForm({...couponForm, discountType: e.target.value})}
                          >
                            <option value="fixed">Fixed (₹)</option>
                            <option value="percentage">Percentage (%)</option>
                          </select>
                        </div>
                        <InputGroup label="Value" type="number" placeholder="50" value={couponForm.discountValue} onChange={v => setCouponForm({...couponForm, discountValue: v})} />
                      </div>
                      <InputGroup label="Min Order (₹)" type="number" placeholder="199" value={couponForm.minOrder} onChange={v => setCouponForm({...couponForm, minOrder: v})} />
                      <InputGroup label="Expiry Date" type="date" value={couponForm.expiryDate} onChange={v => setCouponForm({...couponForm, expiryDate: v})} />
                      <button type="submit" className="w-full py-3 md:py-4 bg-red-600 text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95">
                        Create Coupon
                      </button>
                    </div>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-3 md:space-y-4">
                  {coupons.map(coupon => (
                    <div key={coupon.id} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 md:gap-6">
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-600 font-black text-lg md:text-xl flex-shrink-0">
                          %
                        </div>
                        <div>
                          <h4 className="text-base md:text-lg font-black text-gray-900 dark:text-white">{coupon.code}</h4>
                          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`} • Min ₹{coupon.minOrder}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Expires: {coupon.expiryDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button 
                          onClick={() => toggleCouponStatus(coupon.id, coupon.isActive)}
                          className={`px-3 md:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-nowrap ${coupon.isActive ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}
                        >
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button onClick={() => handleDeleteCoupon(coupon.id)} className="p-2 md:p-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 rounded-xl transition-all">
                          <Trash2 size={16} className="md:size-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {coupons.length === 0 && (
                    <div className="text-center py-12 md:py-24 bg-white dark:bg-gray-900 rounded-2xl md:rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
                      <Zap size={40} className="md:size-12 mx-auto text-gray-200 dark:text-gray-700 mb-3 md:mb-4" />
                      <p className="text-gray-400 dark:text-gray-500 font-bold text-sm">No coupons created</p>
                    </div>
                  )}
                </div>
              </div>
            </m.div>
          )}

          {tab === "subscriptions" && (
            <m.div key="subscriptions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 md:mb-12 gap-4">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Subscriptions</h2>
                <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Active Users</span>
                    <span className="text-lg font-black text-gray-900 dark:text-white">{subscriptions.filter(s => s.status === 'active').length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Plan & User</th>
                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Meals & Pref</th>
                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Finances</th>
                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Delivery Stats</th>
                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {subscriptions.map(sub => (
                        <tr key={sub.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-gray-900 dark:text-white block">{sub.planType?.replace('_', ' ').toUpperCase()}</span>
                            <span className="text-xs text-gray-500">{sub.userId?.slice(0, 8)}...</span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-medium text-gray-900 dark:text-white block">{sub.mealsPerDay * 30} Total Meals</span>
                            <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg uppercase inline-block mt-1">
                              {sub.mealPreference}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-black text-gray-900 dark:text-white">₹{sub.finalPrice}</div>
                            {sub.referralCodeUsed && <div className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Ref: {sub.referralCodeUsed}</div>}
                          </td>
                          <td className="p-4">
                            <div className="text-xs text-gray-500 flex flex-col gap-0.5">
                              <span>Fee Charged: ₹{sub.deliveryFeeCharged || 0}</span>
                              <span>Partner Cost: ₹{sub.deliveryPartnerCost || 0}</span>
                              <span className={`${(sub.profitMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600'} font-bold`}>
                                Profit: ₹{sub.profitMargin || 0}
                              </span>
                              {sub.absorbedCost > 0 && <span className="text-orange-500">Absorbed: ₹{sub.absorbedCost}</span>}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                              sub.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </m.div>
          )}

          {tab === "reviews" && (
            <m.div key="reviews" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-8 md:mb-12 tracking-tight">Customer Reviews</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
                {reviews.map(review => (
                  <div key={review.id} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start gap-3 mb-4 md:mb-6">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500 font-black text-xs md:text-sm flex-shrink-0">
                          {review.userEmail?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white truncate">{review.userEmail}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Order #{review.orderId?.slice(-6)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 md:px-3 py-1 md:py-1.5 rounded-xl flex-shrink-0">
                        <Star size={12} className="md:size-3.5 fill-red-600 text-red-600" />
                        <span className="text-xs md:text-sm font-black text-red-600">{review.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed mb-4 md:mb-6 italic">"{review.feedback}"</p>
                    {review.reply && (
                      <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                        <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Admin Reply</p>
                        <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-medium italic">"{review.reply}"</p>
                      </div>
                    )}
                    <div className="flex flex-col md:gap-3 pt-4 md:pt-6 border-t border-gray-50 dark:border-gray-800 gap-2">
                      <div className="flex items-center justify-between text-xs md:text-sm">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                          {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : new Date(review.createdAt).toLocaleDateString()}
                        </span>
                        <button 
                          onClick={() => {
                            if (replyingTo === review.id) {
                              setReplyingTo(null);
                              setReplyText("");
                            } else {
                              setReplyingTo(review.id);
                              setReplyText(review.reply || "");
                            }
                          }}
                          className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline"
                        >
                          {review.reply ? 'Edit Reply' : 'Reply'}
                        </button>
                      </div>
                      
                      {replyingTo === review.id && (
                        <div className="space-y-2 md:space-y-3">
                          <textarea 
                            className="w-full p-3 md:p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-xs md:text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none min-h-[60px] md:min-h-[80px]"
                            placeholder="Type your reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setReplyingTo(null)}
                              className="px-3 md:px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={async () => {
                                if (!replyText.trim()) return;
                                try {
                                  await updateDoc(doc(getDb(), "reviews", review.id), {
                                    reply: replyText,
                                    repliedAt: serverTimestamp()
                                  });
                                  toast.success("Reply sent!");
                                  setReplyingTo(null);
                                  setReplyText("");
                                } catch (err) {
                                  toast.error("Failed to send reply");
                                }
                              }}
                              className="px-3 md:px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest"
                            >
                              Send Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <div className="col-span-full text-center py-16 md:py-24 bg-white dark:bg-gray-900 rounded-2xl md:rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
                    <Bell size={40} className="md:size-12 mx-auto text-gray-200 dark:text-gray-700 mb-3 md:mb-4" />
                    <p className="text-gray-400 dark:text-gray-500 font-bold text-sm">No reviews yet</p>
                  </div>
                )}
              </div>
            </m.div>
          )}

          {tab === "banners" && (
            <m.div key="banners" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <div className="flex flex-col gap-2 md:gap-0 md:items-center md:justify-between mb-8 md:mb-12">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Banners</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Manage promotional banners</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 lg:p-10 shadow-sm border border-gray-100 dark:border-gray-800 mb-8 md:mb-12">
                <h3 className="text-base md:text-lg lg:text-xl font-black mb-4 md:mb-8 dark:text-white">Add New Banner</h3>
                <form onSubmit={handleAddBanner} className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4">Banner Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Summer Special Offer"
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 md:px-6 py-3 md:py-4 font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                      value={bannerForm.title}
                      onChange={(e) => setBannerForm({...bannerForm, title: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4">Image URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 md:px-6 py-3 md:py-4 font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                      value={bannerForm.image}
                      onChange={(e) => setBannerForm({...bannerForm, image: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4">Link (Optional)</label>
                    <input
                      type="text"
                      placeholder="/menu?category=Main Course"
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 md:px-6 py-3 md:py-4 font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                      value={bannerForm.link}
                      onChange={(e) => setBannerForm({...bannerForm, link: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4">Priority (Higher = First)</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 md:px-6 py-3 md:py-4 font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                      value={bannerForm.priority}
                      onChange={(e) => setBannerForm({...bannerForm, priority: Number(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button type="submit" className="w-full bg-red-600 text-white py-3 md:py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-[0.98]">
                      Add Banner
                    </button>
                  </div>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                {banners.map(banner => (
                  <div key={banner.id} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 group">
                    <div className="relative h-32 md:h-48">
                      <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDeleteBanner(banner.id)}
                          className="bg-red-600 text-white p-3 md:p-4 rounded-2xl shadow-xl active:scale-90 transition-transform"
                        >
                          <Trash2 size={20} className="md:size-6" />
                        </button>
                      </div>
                      <div className="absolute top-2 md:top-4 left-2 md:left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md px-2 md:px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm dark:text-white">
                        Priority: {banner.priority}
                      </div>
                    </div>
                    <div className="p-4 md:p-6">
                      <h4 className="text-base md:text-lg font-black text-gray-900 dark:text-white mb-1">{banner.title}</h4>
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 truncate">{banner.link || 'No Link'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </m.div>
          )}

          {tab === "pricing" && (
            <m.div key="pricing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-8 md:mb-12 tracking-tight">Pricing & Fees</h2>
              
              <form onSubmit={handleUpdateSettings} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-[2.5rem] p-6 md:p-8 lg:p-12 shadow-sm border border-gray-100 dark:border-gray-800 max-w-2xl">
                <div className="space-y-4 md:space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 p-4 md:p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl md:rounded-3xl border-2 border-red-100 dark:border-red-900/30">
                    <div>
                      <h4 className="font-bold text-sm md:text-base text-gray-900 dark:text-white">Store Status</h4>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{settings.isStoreOpen ? "ONLINE - Accepting orders" : "OFFLINE - Not accepting orders"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, isStoreOpen: !settings.isStoreOpen })}
                      className={`w-14 md:w-16 h-7 md:h-8 rounded-full transition-all relative flex-shrink-0 ${settings.isStoreOpen ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-5 md:w-6 h-5 md:h-6 bg-white rounded-full transition-all ${settings.isStoreOpen ? 'left-8 md:left-9' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* STORE TIMINGS */}
                  <div className="p-4 md:p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl md:rounded-3xl border-2 border-blue-100 dark:border-blue-900/30 space-y-4 md:space-y-6">
                    <div>
                      <h4 className="font-bold text-sm md:text-base text-blue-900 dark:text-blue-400">Store Timings</h4>
                      <p className="text-xs md:text-sm text-blue-600 dark:text-blue-500">Manage when your kitchen is open for orders</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Opening Time</label>
                        <input 
                          type="time"
                          className="w-full p-2 md:p-3 bg-white dark:bg-gray-800 border-none rounded-xl font-bold text-xs md:text-sm text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={settings.storeTiming?.openTime || "09:00"}
                          onChange={(e) => setSettings({...settings, storeTiming: { ...settings.storeTiming, openTime: e.target.value }})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Closing Time</label>
                        <input 
                          type="time"
                          className="w-full p-2 md:p-3 bg-white dark:bg-gray-800 border-none rounded-xl font-bold text-xs md:text-sm text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={settings.storeTiming?.closeTime || "22:30"}
                          onChange={(e) => setSettings({...settings, storeTiming: { ...settings.storeTiming, closeTime: e.target.value }})}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-blue-100 dark:border-blue-900/30">
                      <div>
                        <p className="text-xs md:text-sm font-bold text-blue-900 dark:text-blue-400">Manual Override</p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-500 font-medium">Ignore timings and use master toggle</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettings({...settings, storeTiming: { ...settings.storeTiming, isManualOverride: !settings.storeTiming?.isManualOverride }})}
                        className={`w-12 md:w-14 h-6 md:h-7 rounded-full transition-all relative flex-shrink-0 ${settings.storeTiming?.isManualOverride ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                      >
                        <div className={`absolute top-1 w-4 md:w-5 h-4 md:h-5 bg-white rounded-full transition-all ${settings.storeTiming?.isManualOverride ? 'left-7 md:left-8' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* AUTO WORKFLOW */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 md:p-6 bg-purple-50 dark:bg-purple-900/10 rounded-2xl md:rounded-3xl border-2 border-purple-100 dark:border-purple-900/30">
                    <div>
                      <h4 className="font-bold text-sm md:text-base text-purple-900 dark:text-purple-400">Auto Kitchen Workflow</h4>
                      <p className="text-xs md:text-sm text-purple-600 dark:text-purple-500">Auto update: Placed → Preparing → Ready</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({...settings, workflow: { ...settings.workflow, autoMode: !settings.workflow?.autoMode }})}
                      className={`w-14 md:w-16 h-7 md:h-8 rounded-full transition-all relative flex-shrink-0 ${settings.workflow?.autoMode ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-5 md:w-6 h-5 md:h-6 bg-white rounded-full transition-all ${settings.workflow?.autoMode ? 'left-8 md:left-9' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">GST Percentage</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Applied to the subtotal of every order</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        className="w-24 p-3 bg-white dark:bg-gray-800 border-none rounded-xl font-black text-center text-red-600 focus:ring-2 focus:ring-red-500 outline-none"
                        value={settings.gst}
                        onChange={(e) => setSettings({...settings, gst: Number(e.target.value)})}
                      />
                      <span className="font-black text-gray-400 dark:text-gray-500">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Packing Fee</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Fixed charge for containers and bags</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-gray-400 dark:text-gray-500">₹</span>
                      <input 
                        type="number" 
                        className="w-24 p-3 bg-white dark:bg-gray-800 border-none rounded-xl font-black text-center text-red-600 focus:ring-2 focus:ring-red-500 outline-none"
                        value={settings.packingFee}
                        onChange={(e) => setSettings({...settings, packingFee: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Delivery Fee</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Standard delivery charge per order</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-gray-400 dark:text-gray-500">₹</span>
                      <input 
                        type="number" 
                        className="w-24 p-3 bg-white dark:bg-gray-800 border-none rounded-xl font-black text-center text-red-600 focus:ring-2 focus:ring-red-500 outline-none"
                        value={settings.deliveryFee}
                        onChange={(e) => setSettings({...settings, deliveryFee: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex justify-end">
                  <button type="submit" className="bg-red-600 text-white px-12 py-4 rounded-2xl font-black text-lg hover:bg-red-700 transition-all shadow-xl shadow-red-600/30">
                    Save Changes
                  </button>
                </div>
              </form>
            </m.div>
          )}

          {tab === "payments" && (
            <m.div key="payments" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {isManualPaymentVerificationEnabled(TENANT_ZERO_ID) ? (
                <Suspense fallback={<div className="py-16 text-center text-gray-500">Loading payment verification...</div>}>
                  <PaymentVerificationPanel />
                </Suspense>
              ) : (
                <div className="max-w-2xl mx-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
                  <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Razorpay gateway only</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Mana Inti Bojanam uses verified Razorpay payments. Manual UPI confirmation is disabled until Phase 2.
                    Orders unlock for kitchen only after Razorpay verification on the server.
                  </p>
                </div>
              )}
            </m.div>
          )}

          {tab === "support" && (
            <m.div key="support" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-8 md:mb-12 tracking-tight">Customer Support</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
                {supportTickets.map(ticket => (
                  <div key={ticket.id} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start gap-3 mb-4 md:mb-6">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500 font-black text-xs md:text-sm flex-shrink-0">
                          {ticket.userName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white truncate">{ticket.userName}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Order #{ticket.orderId?.slice(-6)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${ticket.status === 'open' ? 'bg-red-100 dark:bg-red-900/20 text-red-600' : 'bg-green-100 dark:bg-green-900/20 text-green-600'}`}>
                          {ticket.status}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600">
                          {ticket.issueType}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed mb-4 md:mb-6">"{ticket.message}"</p>
                    {ticket.adminReply && (
                      <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                        <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Admin Reply</p>
                        <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-medium">"{ticket.adminReply}"</p>
                      </div>
                    )}
                    <div className="flex flex-col md:gap-3 pt-4 md:pt-6 border-t border-gray-50 dark:border-gray-800 gap-2">
                      <div className="flex items-center justify-between text-xs md:text-sm">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                          {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                        <button 
                          onClick={() => {
                            if (replyingTo === ticket.id) {
                              setReplyingTo(null);
                              setReplyText("");
                            } else {
                              setReplyingTo(ticket.id);
                              setReplyText(ticket.adminReply || "");
                            }
                          }}
                          className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline"
                        >
                          {ticket.adminReply ? 'Edit Reply' : 'Reply'}
                        </button>
                      </div>
                      
                      {replyingTo === ticket.id && (
                        <div className="space-y-2 md:space-y-3">
                          <textarea 
                            className="w-full p-3 md:p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-xs md:text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none min-h-[60px] md:min-h-[80px]"
                            placeholder="Type your reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setReplyingTo(null)}
                              className="px-3 md:px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={async () => {
                                if (!replyText.trim()) return;
                                try {
                                  await updateDoc(doc(getDb(), "supportTickets", ticket.id!), {
                                    adminReply: replyText,
                                    status: "resolved",
                                    updatedAt: serverTimestamp()
                                  });
                                  toast.success("Reply sent!");
                                  setReplyingTo(null);
                                  setReplyText("");
                                } catch (err) {
                                  toast.error("Failed to send reply");
                                }
                              }}
                              className="px-3 md:px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest"
                            >
                              Send Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {supportTickets.length === 0 && (
                  <div className="col-span-full text-center py-16 md:py-24 bg-white dark:bg-gray-900 rounded-2xl md:rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
                    <MessageSquare size={40} className="md:size-12 mx-auto text-gray-200 dark:text-gray-700 mb-3 md:mb-4" />
                    <p className="text-gray-400 dark:text-gray-500 font-bold text-sm">No support tickets yet</p>
                  </div>
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* TRACKING MODAL */}
        <AnimatePresence>
          {showTrackingModal && (
            <m.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
            >
              <m.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-2 bg-red-600" />
                
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Delivery Details</h2>
                  <button onClick={() => setShowTrackingModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Delivery Partner</label>
                    <select 
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                      value={trackingData.deliveryPartner}
                      onChange={(e) => setTrackingData({...trackingData, deliveryPartner: e.target.value})}
                    >
                      <option value="Rapido">Rapido</option>
                      <option value="Dunzo">Dunzo</option>
                      <option value="Shadowfax">Shadowfax</option>
                      <option value="Uber">Uber</option>
                      <option value="Porter">Porter</option>
                      <option value="Self">Self Delivery</option>
                    </select>
                  </div>

                  <InputGroup 
                    label="Rider Name" 
                    value={trackingData.riderName} 
                    onChange={(v) => setTrackingData({...trackingData, riderName: v})} 
                    placeholder="Enter rider name"
                  />

                  <InputGroup 
                    label="Rider Phone" 
                    value={trackingData.riderPhone} 
                    onChange={(v) => setTrackingData({...trackingData, riderPhone: v})} 
                    placeholder="Enter rider contact number"
                    type="tel"
                  />

                  <InputGroup 
                    label="Tracking Link" 
                    value={trackingData.trackingLink} 
                    onChange={(v) => setTrackingData({...trackingData, trackingLink: v})} 
                    placeholder="Paste tracking URL here"
                  />
                </div>

                <div className="mt-10 flex gap-4">
                  <button
                    onClick={() => setShowTrackingModal(false)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitHandOver}
                    className="flex-2 py-4 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-600/20"
                  >
                    Update Tracking
                  </button>
                </div>
              </m.div>
            </m.div>
          )}
        </AnimatePresence>

        {/* COURIER BOOKING MODAL */}
        {showCourierModal && selectedOrderForCourier && (
          <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center"><div className="w-16 h-16 rounded-full border-4 border-white/30 border-t-white animate-spin" /></div>}>
            <CourierBookingModal
              order={selectedOrderForCourier}
              isOpen={showCourierModal}
              onClose={() => {
                setShowCourierModal(false);
                setSelectedOrderForCourier(null);
              }}
              onSuccess={(tripId, provider) => {
                toast.success(`Courier booked! Trip ID: ${tripId} (${provider})`);
                setShowCourierModal(false);
                setSelectedOrderForCourier(null);
                // Refresh orders
                setLastUpdated(new Date());
              }}
            />
          </Suspense>
        )}
      </div>
    </div>
  </div>
);
}

function SidebarLink({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${
        active 
          ? "bg-red-50 dark:bg-red-900/20 text-red-600 shadow-sm" 
          : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200"
      }`}
    >
      <div className="flex items-center gap-4">
        {icon}
        <span>{label}</span>
      </div>
      {badge && (
        <span className="bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string | number, subtext: string }) {
  return (
    <div className="bg-white dark:bg-[#111111] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mb-1">{label}</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{value}</h3>
        </div>
        <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-600">
          {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 20 })}
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
        <div className="w-1 h-1 rounded-full bg-red-500" />
        {subtext}
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, type = "text", placeholder }: { label: string, value: string, onChange: (v: string) => void, type?: string, placeholder?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">{label}</label>
      <input 
        type={type}
        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-colors"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}


