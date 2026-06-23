import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowRight, 
  Star, 
  Clock, 
  ShieldCheck, 
  UtensilsCrossed, 
  Utensils,
  Sparkles,
  Heart, 
  Leaf, 
  CheckCircle2,
  Plus,
  Minus,
  ShoppingCart,
  MapPin,
  X,
  Menu,
  Search,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Phone,
  MessageCircle,
  MessageSquare,
  ChevronDown,
  HelpCircle,
  Truck,
  ChefHat,
  Timer
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDeliveryState } from '../lib/useDeliveryState';
import { useTimeBasedSection } from '../hooks/useTimeBasedSection';
import { useTenant } from '../context/TenantContext';
import { activeTenantId as fallbackTenantId } from '../services/api';
import toast from 'react-hot-toast';
import { collection, getDocs, limit, query, doc, getDoc, orderBy, where } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import MenuItemCard from '../components/MenuItemCard';
import Testimonials from '../components/Testimonials';
import ReferralBanner from '../components/ReferralBanner';
import SubscriptionWizardModal from '../components/SubscriptionWizardModal';
import { cn } from '../lib/utils';
import { CategorySkeleton, TrendingSkeleton, RecommendedSkeleton, Skeleton, HomeBentoSkeleton } from '../components/SkeletonSystem';
import { triggerHaptic } from '../utils/haptics';

// Centralized skeletons used from SkeletonSystem

const Home: React.FC = () => {
  const navigate = useNavigate();
  const cravingLines = [
    'Slow-cooked comfort, finished restaurant-style',
    'Freshly prepared after your order',
    'Andhra spice that keeps you craving more'
  ];
  const [trendingItems, setTrendingItems] = useState<any[]>([]);
  const [recommendedItems, setRecommendedItems] = useState<any[]>([]);
  const [timeBasedItems, setTimeBasedItems] = useState<any[]>([]);
  const [specialItems, setSpecialItems] = useState<any[]>([]);
  const [orderAgainItems, setOrderAgainItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [storeOpenTime, setStoreOpenTime] = useState('09:00');
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [budgetMeals, setBudgetMeals] = useState<any[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [manualLocation, setManualLocation] = useState('');
  const [manualLocationLabel, setManualLocationLabel] = useState('Home');
  const [cravingLineIndex, setCravingLineIndex] = useState(0);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const { cart, addToCart, updateQuantity, total } = useCart();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { tenantId: contextTenantId, tenantInfo } = useTenant();
  const activeTenantId = contextTenantId || fallbackTenantId;
  const [deliveryState, setDeliveryState] = useDeliveryState();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const timeBasedHeader = useTimeBasedSection();

  useEffect(() => {
    if (authLoading) return;

    if (window.location.hostname.includes('bhojanos') && window.location.pathname === '/') {
      const isPrivileged = currentUser && userProfile && ['admin', 'superadmin', 'owner'].includes(userProfile.role);
      if (!isPrivileged) {
        window.location.href = '/onboard';
        return;
      }
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('noredirect') === 'true') {
      sessionStorage.setItem('skipAdminRedirect', 'true');
      return;
    }
    
    if (sessionStorage.getItem('skipAdminRedirect') === 'true') {
      return;
    }
    
  }, [currentUser, userProfile, authLoading, navigate]);

  // Update FSSAI in Trust Badges
  const fssaiNumber = "20125260000219";

  useEffect(() => {
    setManualLocation(deliveryState.selectedAddress?.address || '');
    setManualLocationLabel(deliveryState.selectedAddress?.label || 'Home');
  }, [deliveryState.selectedAddress]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCravingLineIndex((prev) => (prev + 1) % cravingLines.length);
    }, 2600);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const locationStatus = localStorage.getItem('locationStatus');
    // Removed automatic location prompt to defer until user intent is shown

    const fetchCategories = async () => {
      try {
        const catRef = collection(getDb(), "categories");
        const q = query(catRef, where("tenantId", "==", activeTenantId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          let cats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          cats = cats.filter(c => c.isActive && c.showOnHome);
          cats.sort((a, b) => (b.priority || 0) - (a.priority || 0));
          // Add default images for categories if they don't have one
          const categoryImages: Record<string, string> = {
            'Veg Meals': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400&auto=format&fit=crop',
            'Biryani': 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=400&auto=format&fit=crop',
            'Tiffins': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=400&auto=format&fit=crop',
            'Combos': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=400&auto=format&fit=crop',
            'Desserts': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=400&auto=format&fit=crop',
            'Starters': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?q=80&w=400&auto=format&fit=crop',
            'Meals': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400&auto=format&fit=crop'
          };
          setCategories(cats.map(c => ({
            ...c,
            image: c.image || categoryImages[c.name] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop'
          })));
        } else {
          // Derive categories from menu items to avoid conflict
          const menuRef = collection(getDb(), "menu");
          const menuSnap = await getDocs(query(menuRef, where("tenantId", "==", activeTenantId)));
          if (!menuSnap.empty) {
            const derived = Array.from(new Set(menuSnap.docs.map(doc => doc.data().category))).filter(Boolean);
            const categoryImages: Record<string, string> = {
              'Veg Meals': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400&auto=format&fit=crop',
              'Biryani': 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=400&auto=format&fit=crop',
              'Tiffins': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=400&auto=format&fit=crop',
              'Combos': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=400&auto=format&fit=crop',
              'Desserts': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=400&auto=format&fit=crop',
              'Starters': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?q=80&w=400&auto=format&fit=crop',
              'Meals': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400&auto=format&fit=crop'
            };
            setCategories(derived.map(name => ({
              name,
              image: categoryImages[name as string] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop'
            })));
          } else {
            // Fallback categories if menu is also empty
            setCategories([
              { name: 'Veg Meals', icon: '🍛', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400&auto=format&fit=crop' },
              { name: 'Biryani', icon: '🍗', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=400&auto=format&fit=crop' },
              { name: 'Tiffins', icon: '🥞', image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=400&auto=format&fit=crop' },
              { name: 'Combos', icon: '🍱', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=400&auto=format&fit=crop' },
              { name: 'Desserts', icon: '🍨', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=400&auto=format&fit=crop' },
            ]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch categories", e);
      } finally {
        setCategoriesLoading(false);
      }
    };

    const fetchMenu = async () => {
      try {
        const menuRef = collection(getDb(), "menu");
        
        // Fetch ALL items to do complex client-side filtering 
        const allItemsSnap = await getDocs(query(menuRef, where("tenantId", "==", activeTenantId)));
        const allItems = allItemsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(item => item.isAvailable !== false && item.isActive !== false);

        // 1. Trending Now (top 8 by orderCount)
        const sortedByOrder = [...allItems].sort((a, b) => (b.itemOrderCount || 0) - (a.itemOrderCount || 0));
        setTrendingItems(sortedByOrder.slice(0, 8));

        // 2. Today's Specials
        let specials = allItems.filter(item => item.isSpecial === true);
        if (specials.length === 0) {
          specials = [...allItems].sort((a, b) => (b.prepCount || 0) - (a.prepCount || 0)).slice(0, 6);
        }
        setSpecialItems(specials.slice(0, 6));

        // 3. Recommended for You
        let recommended: any[] = [];
        const anyUserProfile = userProfile as any;
        if (currentUser && anyUserProfile?.orderHistory && anyUserProfile.orderHistory.length > 0) {
          const userCats = new Set<string>();
          anyUserProfile.orderHistory.forEach((oh: any) => {
             if (oh.categories) oh.categories.forEach((c: string) => userCats.add(c));
          });
          if (userCats.size > 0) {
            recommended = allItems.filter(item => userCats.has(item.category));
          }
        }
        if (recommended.length === 0) {
          recommended = [...allItems].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
        setRecommendedItems(recommended.slice(0, 9));

        // 4. Time-based items
        const hour = new Date().getHours();
        let timeBased: any[] = [];
        if (hour >= 5 && hour < 11.5) {
          timeBased = allItems.filter(item => item.availability?.morning === true || ['Idli', 'Dosa', 'Breakfast Combos', 'Tiffins'].includes(item.category));
        } else if (hour >= 11.5 && hour < 16) {
          timeBased = allItems.filter(item => item.availability?.lunch === true || ['Meals', 'Biryani', 'Veg Meals'].includes(item.category));
        } else if (hour >= 16 && hour < 22) {
          timeBased = allItems.filter(item => item.availability?.evening === true || ['Starters', 'Biryani', 'Combos'].includes(item.category));
        } else {
          timeBased = allItems.filter(item => item.availability?.lateNight === true || ['Desserts', 'Biryani'].includes(item.category));
        }
        
        if (timeBased.length === 0) {
          timeBased = sortedByOrder.slice(0, 6);
        }
        setTimeBasedItems(timeBased.slice(0, 6));

        // Budget Meals (Price <= 149)
        const bItems = allItems.filter(item => item.price <= 149);
        setBudgetMeals(bItems.slice(0, 6));

        setUsingFallback(false);
      } catch (e) {
        console.error('Failed to load menu from database', e);
        setTrendingItems([]);
        setRecommendedItems([]);
        setSpecialItems([]);
        setTimeBasedItems([]);
        setBudgetMeals([]);
        setUsingFallback(false);
      } finally {
        setLoading(false);
      }
    };

    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(getDb(), "adminSettings", "global"));
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          setIsStoreOpen(settings.isStoreOpen !== false);
          if (settings.storeTiming?.openTime) {
            setStoreOpenTime(settings.storeTiming.openTime);
          }
        }
      } catch (e) {
        console.error('Failed to fetch settings', e);
      }
    };

    const fetchOrderAgain = async () => {
      if (!currentUser) return;

      try {
        const ordersRef = collection(getDb(), "orders");
        const q = query(ordersRef, where("tenantId", "==", activeTenantId), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"), limit(3));
        
        const [snap, menuSnap] = await Promise.all([
          getDocs(q),
          getDocs(query(collection(getDb(), "menu"), where("tenantId", "==", activeTenantId)))
        ]);
        
        const menuMap = new Map(menuSnap.docs.map(d => [d.id, d.data()]));
        const items: any[] = [];
        
        snap.docs.forEach(doc => {
          const order = doc.data();
          order.items.forEach((item: any) => {
            const price = item.price || item.unitPrice || 0;
            const itemId = item.menuItemId || item.id;
            if (item && itemId && item.name && price > 0) {
              if (!items.find(i => i.id === itemId)) {
                const menuItem = menuMap.get(itemId);
                if (menuItem) {
                  items.push({ id: itemId, ...menuItem });
                } else {
                  items.push({ ...item, id: itemId });
                }
              }
            }
          });
        });
        setOrderAgainItems(items.slice(0, 5));
      } catch (e) {
        console.error('Failed to fetch order again items', e);
      }
    };

    fetchCategories();
    fetchMenu();
    fetchSettings();
    fetchOrderAgain();
  }, [currentUser, activeTenantId]);

  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 500], [1.1, 1]);

    const getItemQuantity = (id: string) => {
    const cartItem = cart.find(item => item.id === id);
    return cartItem ? cartItem.quantity : 0;
  };
  return (
    <div className="flex flex-col min-h-screen bg-dark-bg">
      {/* STICKY SEARCH BAR (Appears on scroll) */}
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ 
          y: scrollY.get() > 400 ? 0 : -100, 
          opacity: scrollY.get() > 400 ? 1 : 0 
        }}
        className="fixed top-0 inset-x-0 z-50 p-3 sm:px-4 bg-dark-bg/95 backdrop-blur-xl border-b border-white/5"
      >
        <div 
          onClick={() => navigate('/menu')}
          className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 cursor-pointer"
        >
          <Search size={18} className="text-orange-500" />
          <span className="text-sm font-bold text-white/50">Search for 'Biryani' or 'Dosa'...</span>
        </div>
      </motion.div>

      {/* UNIFIED HERO SECTION */}
      <section className="relative overflow-hidden min-h-[90vh] bg-transparent flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* HERO IMAGE CONTAINER */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.div 
            style={{ scale }}
            className="w-full h-full"
          >
            <img 
              src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=1200&auto=format&fit=crop" 
              alt="Authentic Andhra Meal" 
              className="w-full h-full object-cover brightness-[0.6] contrast-[1.1] scale-110"
            />
          </motion.div>
          
          {/* CINEMATIC OVERLAY */}
          <div className="absolute inset-0 mib-hero-gradient z-[1]" />
          <div className="absolute inset-0 bg-black/20 z-[2]" />
        </div>

        {/* ABSOLUTE TOP NAVIGATION */}
        <div className="absolute top-4 left-4 right-4 z-40 flex justify-between items-center" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
          {/* Brand Logo */}
          <div className="mib-glass flex items-center gap-2.5 rounded-3xl py-2 pl-2 pr-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 backdrop-blur-xl bg-black/30">
            <img src={tenantInfo?.branding?.logoUrl || "/logo-v20-final.png"} alt={tenantInfo?.name || "MIB"} className="w-10 h-10 object-contain rounded-full bg-black/60 p-1.5" />
            <div className="flex flex-col -gap-1">
              <span className="text-orange-300 font-black text-[9px] tracking-[0.3em] uppercase leading-none mb-0.5">Premium</span>
              <span className="text-white font-black text-[14px] tracking-tight leading-none font-serif truncate max-w-[150px]">
                {tenantInfo?.name || "Mana Inti Bojanam"}
              </span>
            </div>
          </div>
          
          {/* Search Pill (Top right) */}
          <button 
            onClick={() => navigate('/menu')}
            className="mib-glass flex items-center justify-center w-11 h-11 rounded-2xl shadow-lg active:scale-95 transition-all border border-white/10"
          >
            <Search size={20} className="text-white" />
          </button>
        </div>

        {/* MAIN CONTENT LAYER - CENTERED FOR PREMIUM FEEL */}
        <div className="relative z-20 flex flex-1 flex-col justify-center items-center text-center px-6 pt-24 pb-8">
          
          <div className="flex flex-col items-center justify-center flex-1 w-full">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 sm:px-4 sm:py-2 bg-orange-500/10 border border-orange-500/20 rounded-full"
            >
              <Sparkles size={14} className="text-orange-500 shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-orange-400 whitespace-nowrap">Authentic Andhra Home Kitchen</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-[3.5rem] sm:text-7xl md:text-8xl font-black tracking-tight leading-[0.95] text-white drop-shadow-2xl mb-6 font-serif"
            >
              Freshly <br />
              <span className="text-[5rem] sm:text-[7rem] md:text-[8rem] text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-orange-400 to-red-500 drop-shadow-[0_0_30px_rgba(255,107,53,0.5)] block py-2" style={{ fontFamily: "'Great Vibes', cursive", fontWeight: 400 }}>
                Cooked
              </span>
              for You
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/70 font-bold text-base sm:text-lg leading-relaxed max-w-[28ch] mb-8"
            >
              Experience the soul of Telugu cuisine, prepared with love and zero preservatives.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm sm:max-w-xl mb-6"
            >
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  navigate('/menu');
                }}
                className="group relative flex flex-1 items-center justify-center gap-3 bg-white text-black px-8 sm:px-10 py-4 sm:py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(0,0,0,0.4)] active:scale-95 transition-all w-full"
              >
                <span>Browse Menu</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  document.getElementById('best-sellers')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group relative flex flex-1 items-center justify-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-white/20 active:scale-95 transition-all w-full"
              >
                <span>Today's Specials</span>
              </button>
            </motion.div>
          </div>

          {/* DESKTOP TRUST BADGES */}
          <div className="w-full mt-auto pb-8 hidden md:block">
             <div className="flex justify-center items-center gap-6 max-w-5xl mx-auto flex-wrap">
                {[
                  { id: 'verified_merchant', icon: ShieldCheck, title: "Verified Merchant", show: tenantInfo?.kyc?.verificationLevel && tenantInfo.kyc.verificationLevel > 0 },
                  { id: 'fssai_verified', icon: ShieldCheck, title: "FSSAI Verified", show: tenantInfo?.fssai?.verificationStatus === 'verified' },
                  { id: 'premium_verified', icon: Star, title: "Premium Verified", show: ['pro', 'enterprise'].includes(tenantInfo?.subscription?.planId || '') },
                  { id: 'homemade', icon: ChefHat, title: "Homemade", show: !tenantInfo?.businessType || tenantInfo?.businessType === 'home_kitchen' },
                  { id: 'fresh', icon: Clock, title: "Fresh Daily", show: true }
                ].filter(b => b.show).slice(0, 4).map((badge, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl shadow-xl">
                    <badge.icon className="text-orange-400" size={24} />
                    <span className="text-white font-bold text-sm tracking-wide">{badge.title}</span>
                  </div>
                ))}
             </div>
          </div>

          {/* MOBILE STATS */}
          <div className="w-full mt-auto pb-4 md:hidden">
             <div className="flex justify-center items-center gap-4 max-w-md mx-auto">
                <div className="text-center flex-1">
                  <p className="text-white font-black text-base leading-none shadow-black drop-shadow-md">4.9/5</p>
                  <p className="text-white/70 text-[8px] font-black uppercase tracking-widest mt-1.5 shadow-black drop-shadow-sm">Rating</p>
                </div>
                <div className="w-px h-8 bg-white/20"></div>
                <div className="text-center flex-1">
                  <p className="text-white font-black text-base leading-none shadow-black drop-shadow-md">100%</p>
                  <p className="text-white/70 text-[8px] font-black uppercase tracking-widest mt-1.5 shadow-black drop-shadow-sm">Hygienic</p>
                </div>
                <div className="w-px h-8 bg-white/20"></div>
                <div className="text-center flex-1">
                  <p className="text-white font-black text-base leading-none shadow-black drop-shadow-md text-green-400">NO</p>
                  <p className="text-white/70 text-[8px] font-black uppercase tracking-widest mt-1.5 shadow-black drop-shadow-sm">Preservatives</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* BEST SELLERS */}
      <div className="w-full px-4 sm:px-6 relative z-10 mt-8 mb-12" id="best-sellers">
        {(loading || trendingItems.length > 0) && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-12 h-12 bg-white/5 rounded-[1.25rem] flex items-center justify-center text-orange-200 border border-white/10 shadow-lg transition-transform group-hover:scale-110">
                    <TrendingUp size={22} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">Best Sellers</h3>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1.5">Our community's favorite comfort</p>
                </div>
              </div>
              <Link to="/menu" className="flex items-center gap-1 text-orange-200/90 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors">
                View All <ChevronRight size={14} strokeWidth={3} />
              </Link>
            </div>
            
            {loading ? (
              <HomeBentoSkeleton />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingItems.slice(0, 6).map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="relative"
                  >
                    {index < 3 && (
                      <div className="absolute -top-1 -right-1 z-10 bg-amber-500 text-black text-[8px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-3xl shadow-xl border border-white/20">
                        Highly Ordered
                      </div>
                    )}
                    <MenuItemCard 
                      item={item} 
                      index={index}
                      addToCart={addToCart}
                      updateQuantity={updateQuantity}
                      getItemQuantity={getItemQuantity}
                      isStoreOpenNow={() => isStoreOpen}
                      storeOpenTime={storeOpenTime}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* WHAT'S ON YOUR MIND? (CIRCULAR CATEGORIES) */}
      <section className="relative z-10 px-4 sm:px-6 mb-12">
        <div className="bg-dark-bg rounded-[3rem] p-6 shadow-2xl border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">What's on your mind?</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mt-1">Quick bites to heavy meals</p>
            </div>
          </div>

          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-2">
            {categoriesLoading
              ? Array(6).fill(0).map((_, i) => <div key={i} className="flex-shrink-0 w-20 h-20 rounded-full bg-white/5 shimmer" />)
              : categories.map((cat: any, idx: number) => (
                  <motion.button
                    key={cat.id || cat.name || idx}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      navigate(`/menu?cat=${encodeURIComponent(cat.name)}`);
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    className="flex-shrink-0 flex flex-col items-center group"
                  >
                    <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full border-4 border-white/5 group-active:scale-95 transition-all shadow-xl">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                    </div>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.1em] text-white/80 group-hover:text-white transition-colors">
                      {cat.name}
                    </p>
                  </motion.button>
                ))}
          </div>
        </div>
      </section>

      {/* DYNAMIC TIME-BASED SECTION */}
      <div className="w-full px-4 sm:px-6">
        {(loading || timeBasedItems.length > 0) && (
          <section className="mb-14">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 text-orange-500 mb-2">
                  <Timer size={16} strokeWidth={3} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Based on your clock</span>
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight">
                  {timeBasedHeader} Favorites
                </h2>
              </div>
              <Link to="/menu" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                Explore More <ChevronRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array(3).fill(0).map((_, i) => <RecommendedSkeleton key={i} />)
              ) : (
                timeBasedItems.slice(0, 3).map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <MenuItemCard 
                      item={item} 
                      addToCart={addToCart}
                      updateQuantity={updateQuantity}
                      getItemQuantity={getItemQuantity}
                      isStoreOpenNow={() => isStoreOpen}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </section>
        )}

        {/* PREMIUM MEAL SUBSCRIPTION BANNER */}
        {tenantInfo?.features?.subscriptionEnabled && (
          <section className="mb-14">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 to-black rounded-[3rem] p-8 sm:p-12 shadow-2xl border border-indigo-500/20">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter mb-4 leading-[0.9]">
                    Eat like home, <br />
                    <span className="text-indigo-400">every single day.</span>
                  </h2>
                  <p className="text-white/60 text-base font-bold mb-8 max-w-md">
                    Join 200+ foodies who enjoy our monthly meal subscriptions. Zero cooking, zero hassle, pure health.
                  </p>
                  <button 
                    onClick={() => setShowSubscriptionModal(true)}
                    className="px-10 py-5 bg-indigo-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl shadow-indigo-500/30 active:scale-95 transition-all"
                  >
                    View Subscription Plans
                  </button>
                </div>
                <div className="w-48 h-48 bg-white/5 rounded-[2rem] border border-white/10 p-2 transform rotate-3 hidden lg:block">
                  <img src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400&auto=format&fit=crop" className="w-full h-full object-cover rounded-[1.5rem]" alt="" />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TODAY'S SPECIALS */}
        {(loading || specialItems.length > 0) && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-12 h-12 bg-white/5 rounded-[1.25rem] flex items-center justify-center text-red-200 border border-white/10 shadow-lg transition-transform group-hover:scale-110">
                    <Sparkles size={22} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">Today's Specials</h3>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1.5">Freshly prepared comfort meals</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                Array(3).fill(0).map((_, i) => <RecommendedSkeleton key={i} />)
              ) : (
                specialItems.slice(0, 6).map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <MenuItemCard 
                      item={item} 
                      index={index}
                      addToCart={addToCart}
                      updateQuantity={updateQuantity}
                      getItemQuantity={getItemQuantity}
                      isStoreOpenNow={() => isStoreOpen}
                      storeOpenTime={storeOpenTime}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ORDER AGAIN (IF LOGGED IN) */}
        {currentUser && orderAgainItems.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-4 mb-6 bg-white/[0.02] p-5 rounded-[2.5rem] border border-white/5 shadow-inner">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/30 blur-2xl rounded-full" />
                <div className="relative w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center text-orange-400 shadow-[0_8px_16px_rgba(0,0,0,0.4)] border border-white/10">
                  <RefreshCw size={28} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight leading-none">Order Again</h3>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mt-2">Jump right back to your favorites</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {orderAgainItems.map((item) => (
                <MenuItemCard 
                  key={`again-${item.id}`}
                  item={item} 
                  addToCart={addToCart}
                  updateQuantity={updateQuantity}
                  getItemQuantity={getItemQuantity}
                  isStoreOpenNow={() => isStoreOpen}
                  storeOpenTime={storeOpenTime}
                />
              ))}
            </div>
          </section>
        )}


        {/* RECOMMENDED FOR YOU */}
        {(loading || recommendedItems.length > 0) && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-orange-200 border border-white/10">
                <Heart size={16} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Recommended for You</h3>
                <p className="text-[9px] font-bold text-white/45 uppercase tracking-wider">Homestyle flavors we think you'll love</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {loading ? (
                Array(4).fill(0).map((_, i) => <RecommendedSkeleton key={i} />)
              ) : (
                recommendedItems.map((item) => (
                  <MenuItemCard 
                    key={`rec-${item.id}`}
                    item={item} 
                    addToCart={addToCart}
                    updateQuantity={updateQuantity}
                    getItemQuantity={getItemQuantity}
                    isStoreOpenNow={() => isStoreOpen}
                    storeOpenTime={storeOpenTime}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {/* BUDGET FRIENDLY MEALS */}
        {budgetMeals.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-orange-200 border border-white/10">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Budget Meals</h3>
                  <p className="text-[9px] font-bold text-orange-200/90 uppercase tracking-wider">Everyday comfort, affordable prices</p>
                </div>
              </div>
              <Link to="/menu" className="text-orange-200/90 font-bold text-[10px] uppercase tracking-wider hover:underline">View All</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {budgetMeals.map((item) => (
                <MenuItemCard 
                  key={`budget-${item.id}`}
                  item={item} 
                  addToCart={addToCart}
                  updateQuantity={updateQuantity}
                  getItemQuantity={getItemQuantity}
                  isStoreOpenNow={() => isStoreOpen}
                  storeOpenTime={storeOpenTime}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* HIDDEN SECTIONS - REMOVED FOR BETTER CONVERSION */}
      {false && (
        <>
          {/* OUR PROMISE SECTION - HIDDEN */}
          <section className="py-12 sm:py-20 px-3 sm:px-4 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black border-t border-gray-200 dark:border-gray-800">
            <div className="w-full">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
                  The <span className="text-orange-600">{tenantInfo?.name ? tenantInfo.name.split(' ')[0] : "Mana Inti"}</span> Promise
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">
                  We believe food should nourish the soul. Every meal is prepared with the same care as in a mother's kitchen.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    title: "No Preservatives",
                    desc: "No artificial colors, MSG, or chemical preservatives. Pure health.",
                    icon: <ShieldCheck className="text-green-600" size={32} />,
                    bg: "bg-green-50 dark:bg-green-900/20"
                  },
                  {
                    title: "Fresh Ingredients",
                    desc: "Hand-picked vegetables and premium spices sourced daily.",
                    icon: <Sparkles className="text-red-600" size={32} />,
                    bg: "bg-red-50 dark:bg-red-900/20"
                  },
                  {
                    title: "Home Kitchen",
                    desc: "Cooked in small batches with love and traditional methods.",
                    icon: <Utensils className="text-blue-600" size={32} />,
                    bg: "bg-blue-50 dark:bg-blue-900/20"
                  }
                ].map((promise, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-8 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center gap-6 hover:shadow-xl transition-all"
                  >
                    <div className={`w-20 h-20 ${promise.bg} rounded-3xl flex items-center justify-center flex-shrink-0 shadow-inner`}>
                      {promise.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-2">{promise.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{promise.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* SEARCH STRIP (NOT STICKY ON HOME PAGE) - REMOVED, MOVED UP */}
          <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-b border-orange-100 dark:border-white/5 px-4 md:px-6 py-4">
            <div className="w-full flex items-center gap-4">
              <div className="relative group flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                <input 
                  type="text"
                  placeholder="Search for 'Biryani' or 'Meals'..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-xl font-bold text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  onFocus={() => navigate('/menu')}
                />
              </div>
            </div>
          </div>
        </>
      )}


      <SubscriptionWizardModal 
        isOpen={showSubscriptionModal} 
        onClose={() => setShowSubscriptionModal(false)} 
      />

      {/* WHY CHOOSE US - HIDDEN */}
      {false && (
        <section className="mb-12 sm:mb-24 px-3 sm:px-4 md:px-6">
          <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div className="w-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-px bg-orange-600" />
                  <span className="text-xs font-black text-orange-600 uppercase tracking-[0.3em]">Our Philosophy</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter leading-[0.85]">
                  WHY <span className="text-orange-600">CHOOSE</span> US?
                </h2>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-lg leading-relaxed">
                We bring the warmth of a mother's kitchen to your doorstep, ensuring every meal is a celebration of heritage and health.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {[
                {
                  title: "Traditional Recipes",
                  desc: "Authentic Telugu recipes passed down through generations, cooked with love.",
                  icon: <ChefHat size={32} />,
                  bg: "bg-orange-50 dark:bg-orange-900/10",
                  color: "text-orange-600"
                },
                {
                  title: "100% Natural",
                  desc: "No artificial colors, preservatives, or MSG. Only cold-pressed oils.",
                  icon: <Leaf size={32} />,
                  bg: "bg-green-50 dark:bg-green-900/10",
                  color: "text-green-600"
                },
                {
                  title: "Freshly Prepared",
                  desc: "We start cooking only after you place your order. Served hot and fresh.",
                  icon: <Timer size={32} />,
                  bg: "bg-blue-50 dark:bg-blue-900/10",
                  color: "text-blue-600"
                },
                {
                  title: "Hyper-Local Focus",
                  desc: "Fast and reliable delivery within Manjari Bk and nearby areas.",
                  icon: <Truck size={32} />,
                  bg: "bg-purple-50 dark:bg-purple-900/10",
                  color: "text-purple-600"
                }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className={`${item.bg} p-8 rounded-[2.5rem] border border-transparent hover:border-white/10 transition-all group`}
                >
                  <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform">
                    <div className={item.color}>{item.icon}</div>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS - HIDDEN */}
      {false && (
        <section className="mb-12 sm:mb-24 px-3 sm:px-4 md:px-6">
          <div className="w-full">
            <div className="bg-orange-600 rounded-[4rem] p-8 sm:p-12 md:p-20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-3xl -mr-32 -mt-32 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-3xl -ml-32 -mb-32 blur-3xl" />
              
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                  <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none mb-8">
                    Delicious meals in <br /> 3 simple steps
                  </h2>
                  <div className="space-y-8">
                    {[
                      { step: "01", title: "Choose Your Meal", desc: "Browse our daily menu of authentic home-style Telugu dishes." },
                      { step: "02", title: "Place Your Order", desc: "Order via website or WhatsApp. We cook fresh after you order." },
                      { step: "03", title: "Enjoy Home Taste", desc: "Get it delivered hot and fresh to your doorstep in minutes." }
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-6 items-start">
                        <span className="text-4xl font-black text-white/30 tracking-tighter">{item.step}</span>
                        <div>
                          <h4 className="text-xl font-black text-white mb-2">{item.title}</h4>
                          <p className="text-white/80 font-medium">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative hidden lg:block">
                  <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl rotate-3">
                    <img 
                      src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop" 
                      alt="Delicious Meal" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-xl flex items-center gap-4 -rotate-3">
                    <div className="w-12 h-12 bg-green-100 rounded-3xl flex items-center justify-center text-green-600">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
                      <p className="text-sm font-black text-gray-900 dark:text-white">Freshly Prepared</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SERVICE AREA - HIDDEN */}
      {false && (
        <section className="mb-12 sm:mb-24 px-3 sm:px-4 md:px-6">
          <div className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-px bg-red-600" />
                  <span className="text-xs font-black text-red-600 uppercase tracking-[0.3em]">Delivery Zone</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter leading-[0.85] mb-8">
                  WE SERVE <br /> <span className="text-red-600">MANJARI BK</span>
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-xl font-medium leading-relaxed mb-12">
                  Currently delivering authentic home-style meals exclusively in Manjari Bk and nearby areas in Pune.
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {['Manjari Bk', 'Amanora', 'Hadapsar', 'Mundhwa', 'Kharadi', 'Wanowrie'].map((area, idx) => (
                    <motion.div 
                      key={area}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3 p-4 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm group"
                    >
                      <div className="w-8 h-8 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                        <MapPin size={14} />
                      </div>
                      <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">{area}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              <div className="relative aspect-square rounded-[4rem] overflow-hidden shadow-2xl border-8 border-white dark:border-dark-bg bg-red-100 dark:bg-red-900/20 flex items-center justify-center p-12 hidden lg:flex">
                <div className="text-center">
                  <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-red-600/30">
                    <MapPin size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Manjari Bk, Pune</h3>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Serving fresh home-style meals in your neighborhood.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* BUDGET FRIENDLY MEALS - HIDDEN */}
      {false && budgetMeals.length > 0 && (
        <section className="mb-12 sm:mb-24 px-3 sm:px-4 md:px-6">
          <div className="w-full">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Budget-Friendly Meals</h2>
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Starting from just ₹49</p>
                </div>
              </div>
              <Link to="/menu" className="text-red-600 font-black text-[10px] uppercase tracking-widest hover:underline">View All</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {budgetMeals.map((item) => (
                <MenuItemCard 
                  key={`budget-${item.id}`}
                  item={item} 
                  addToCart={addToCart}
                  updateQuantity={updateQuantity}
                  getItemQuantity={getItemQuantity}
                  isStoreOpenNow={() => isStoreOpen}
                  storeOpenTime={storeOpenTime}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CATERING & BULK ORDERS - HIDDEN */}
      {false && (
        <section className="py-24 px-6 bg-white dark:bg-dark-bg transition-colors duration-500">
          <div className="w-full">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-[4rem] p-12 md:p-20 border border-gray-100 dark:border-white/5 flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-3xl mb-8 text-purple-600">
                  <Utensils size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Catering Services</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-8">Planning a <br /> Special Event?</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium text-lg mb-10 leading-relaxed">
                  From intimate house parties to corporate gatherings, we bring the authentic taste of Telugu home-cooking to your guests.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                  {[
                    "Customized Menu",
                    "Freshly Prepared",
                    "Hygienic Service",
                    "Bulk Pricing"
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-3xl flex items-center justify-center text-green-600">
                        <CheckCircle2 size={14} />
                      </div>
                      <span className="text-sm font-black text-gray-700 dark:text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
                <a 
                  href={tenantInfo?.contactPhone ? `https://wa.me/${tenantInfo.contactPhone.replace(/\D/g, '')}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-10 py-5 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95"
                >
                  Inquire Now
                  <ArrowRight size={20} />
                </a>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <img src="https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=400&auto=format&fit=crop" alt="Catering" className="w-full h-64 object-cover rounded-[2.5rem] shadow-lg" referrerPolicy="no-referrer" />
                  <img src="https://images.unsplash.com/photo-1530103043960-ef38714abb15?q=80&w=400&auto=format&fit=crop" alt="Catering" className="w-full h-48 object-cover rounded-[2.5rem] shadow-lg" referrerPolicy="no-referrer" />
                </div>
                <div className="space-y-4 pt-12">
                  <img src="https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=400&auto=format&fit=crop" alt="Catering" className="w-full h-48 object-cover rounded-[2.5rem] shadow-lg" referrerPolicy="no-referrer" />
                  <img src="https://images.unsplash.com/photo-1529516548873-9ce57c8f155e?q=80&w=400&auto=format&fit=crop" alt="Catering" className="w-full h-64 object-cover rounded-[2.5rem] shadow-lg" referrerPolicy="no-referrer" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS - HIDDEN */}
      {false && <Testimonials />}

      {/* FAQ SECTION - HIDDEN */}
      {false && (
        <section className="py-24 px-6 bg-gray-50 dark:bg-gray-900/50">
          <div className="w-full">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter mb-4">Common Questions</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">Everything you need to know about our home kitchen.</p>
            </div>
            
            <div className="space-y-4">
              {[
                { q: "Is the food really home-cooked?", a: "Yes! Every meal is prepared in our home kitchen using traditional family recipes and fresh ingredients bought daily." },
                { q: "Do you use any preservatives or MSG?", a: "Absolutely not. We pride ourselves on serving clean, healthy food. We don't use any artificial colors, MSG, or chemical preservatives." },
                { q: "How long does delivery take?", a: "Since we cook fresh after receiving your order, it typically takes 30-45 minutes to prepare and deliver, depending on your location." },
                { q: "Can I place bulk orders for parties?", a: "Yes, we do cater for small parties and bulk orders. Please contact us at least 24 hours in advance for bulk requirements." },
                { q: "What are your operating hours?", a: "We are open for lunch (12 PM - 3:30 PM) and dinner (7 PM - 10:30 PM) every day." }
              ].map((faq, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
                  <button 
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full px-8 py-6 flex items-center justify-between text-left group"
                  >
                    <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight group-hover:text-red-600 transition-colors">{faq.q}</span>
                    <div className={`p-2 rounded-3xl bg-gray-50 dark:bg-gray-800 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`}>
                      <ChevronDown size={20} className="text-gray-400" />
                    </div>
                  </button>
                  <AnimatePresence>
                    {activeFaq === idx && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <div className="px-8 pb-8 text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FINAL CTA - HIDDEN */}
      {false && (
        <section className="py-24 px-6">
          <div className="w-full bg-gray-900 rounded-[4rem] p-12 md:p-24 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-8 leading-none">Ready for a <br /><span className="text-red-500">Home-Style</span> Treat?</h2>
              <p className="text-gray-400 text-lg md:text-xl font-medium mb-12 w-full max-w-none">
                Join 1000+ happy customers who enjoy our authentic Telugu meals daily. Order now and taste the difference.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button 
                  onClick={() => navigate('/menu')}
                  className="w-full sm:w-auto px-12 py-6 bg-red-600 text-white rounded-2xl font-black text-xl shadow-2xl shadow-red-600/40 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  Order Now
                  <ArrowRight size={24} />
                </button>
                <a 
                  href={tenantInfo?.contactPhone ? `https://wa.me/${tenantInfo.contactPhone.replace(/\D/g, '')}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-12 py-6 bg-white/10 text-white rounded-2xl font-black text-xl hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center gap-3 backdrop-blur-md border border-white/10"
                >
                  <MessageCircle size={24} />
                  WhatsApp Us
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HOME LOCATION MODAL */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-lg rounded-[2.5rem] bg-white dark:bg-gray-950 overflow-hidden shadow-2xl border border-gray-100 dark:border-white/10"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400">Delivery address</p>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Choose location</h3>
                </div>
                <button type="button" onClick={() => setIsLocationModalOpen(false)} className="rounded-3xl p-2 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <X size={20} className="text-gray-600 dark:text-gray-300" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Label</label>
                  <input
                    value={manualLocationLabel}
                    onChange={(e) => setManualLocationLabel(e.target.value)}
                    placeholder="Home, Office, etc."
                    className="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Address</label>
                  <textarea
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    rows={4}
                    placeholder="Enter your delivery address"
                    className="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 resize-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!manualLocation.trim()) {
                      toast.error('Please enter a delivery address.');
                      return;
                    }
                    setDeliveryState({
                      ...deliveryState,
                      selectedAddress: {
                        id: `manual-${Date.now()}`,
                        label: manualLocationLabel || 'Home',
                        address: manualLocation.trim()
                      }
                    });
                    setIsLocationModalOpen(false);
                  }}
                  className="w-full rounded-3xl bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-red-700 transition-all"
                >
                  Save location
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showLocationPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 max-w-sm w-full text-center relative overflow-hidden border border-gray-100 dark:border-white/5"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />
              <button 
                type="button"
                onClick={() => {
                  localStorage.setItem('locationStatus', 'dismissed');
                  setShowLocationPrompt(false);
                }}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-[2rem] flex items-center justify-center text-red-600 mx-auto mb-8">
                <MapPin size={40} />
              </div>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Enable Location</h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-10 leading-relaxed">
                We use your location to check delivery availability and faster service.
              </p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        localStorage.setItem('locationStatus', 'granted');
                        setShowLocationPrompt(false);
                        toast.success('Location enabled!');
                      },
                      () => {
                        localStorage.setItem('locationStatus', 'denied');
                        setShowLocationPrompt(false);
                        toast.error('Location access denied.');
                      }
                    );
                  }}
                  className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-red-600/20 hover:bg-red-700 active:scale-95 transition-all"
                >
                  Enable Location
                </button>
                <button 
                  onClick={() => {
                    localStorage.setItem('locationStatus', 'manual');
                    setShowLocationPrompt(false);
                  }}
                  className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-gray-600 dark:hover:text-gray-300 transition-all"
                >
                  Enter Manually
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
