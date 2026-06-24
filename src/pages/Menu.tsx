import React, { useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Search, 
  Star, 
  Clock, 
  ChevronRight,
  ChevronDown,
  Info,
  ArrowLeft,
  ArrowRight,
  Utensils,
  Sparkles,
  History,
  TrendingUp,
  MessageSquare,
  HelpCircle,
  X,
  MapPin,
  Menu as MenuIcon
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MenuItem } from '../types';
import { formatPrice, cn } from '../lib/utils';
import { getDb } from '../lib/firebase-db';
import { activeTenantId as fallbackTenantId } from '../services/api';
import MenuItemCard from '../components/MenuItemCard';
import Banner from '../components/Banner';
import { collection, query, where, orderBy, onSnapshot, doc, limit, getDocs, addDoc, getDoc, updateDoc } from 'firebase/firestore';
import AiOrderingWidget from '../components/AiOrderingWidget';
import HelpMeChooseModal from '../components/HelpMeChooseModal';
import { triggerHaptic } from '../utils/haptics';
import { MenuItemSkeleton, CategorySkeleton, Skeleton } from '../components/SkeletonSystem';

// SkeletonCard removed in favor of centralized SkeletonSystem

import { useTenant } from '../context/TenantContext';
import { getSmartReorderRecommendations } from '../services/RecommendationEngine';
import { trackEvent } from '../services/AnalyticsService';

const Menu: React.FC = () => {
  const navigate = useNavigate();
  const { tenantSlug, tenantId: contextTenantId } = useTenant();
  const activeTenantId = contextTenantId || fallbackTenantId;
  const basePath = tenantSlug ? `/k/${tenantSlug}` : '';
  const [searchParams, setSearchParams] = useSearchParams();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState('all');
  const [activeFilters, setActiveFilters] = useState({ veg: false, nonVeg: false, priceRange: 'all', popular: false });
  const [orderAgain, setOrderAgain] = useState<MenuItem[]>([]);
  const [trending, setTrending] = useState<MenuItem[]>([]);
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);
  const [showHelpMeChoose, setShowHelpMeChoose] = useState(false);
  const [timeBasedRecs, setTimeBasedRecs] = useState<{title: string, items: MenuItem[]}>({ title: '', items: [] });

  // Calculate Time-Based Recommendations
  useEffect(() => {
    if (menu.length > 0) {
      const hour = new Date().getHours();
      let title = '';
      let filteredItems: MenuItem[] = [];

      if (hour >= 6 && hour < 11) {
        title = "Recommended for Breakfast";
        filteredItems = menu.filter(m => m.category.toLowerCase().includes('tiffin') || m.name.toLowerCase().includes('dosa') || m.name.toLowerCase().includes('idli'));
      } else if (hour >= 11 && hour < 16) {
        title = "Recommended for Lunch";
        filteredItems = menu.filter(m => m.category.toLowerCase().includes('meal') || m.name.toLowerCase().includes('biryani') || m.name.toLowerCase().includes('rice'));
      } else if (hour >= 16 && hour < 19) {
        title = "Evening Snacks";
        filteredItems = menu.filter(m => m.category.toLowerCase().includes('snack') || m.name.toLowerCase().includes('samosa') || m.name.toLowerCase().includes('vada') || m.price < 100);
      } else {
        title = "Recommended for Dinner";
        filteredItems = menu.filter(m => m.category.toLowerCase().includes('meal') || m.name.toLowerCase().includes('biryani') || m.name.toLowerCase().includes('roti'));
      }

      if (filteredItems.length === 0) {
        // Fallback to trending
        filteredItems = [...menu].sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0)).slice(0, 4);
      }

      setTimeBasedRecs({ title, items: filteredItems.slice(0, 4) });
    }
  }, [menu]);

  // Scroll to menu grid when filters change on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && (search || activeFilters.veg || activeFilters.nonVeg || activeFilters.priceRange !== 'all' || activeFilters.popular || category !== 'all')) {
      const menuGrid = document.getElementById('menu-grid-start');
      if (menuGrid) {
        requestAnimationFrame(() => {
          menuGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }
  }, [search, activeFilters, category]);

  // Scroll to category if deep linked
  useEffect(() => {
    const cat = searchParams.get('cat');
    if (cat && !loading && menu.length > 0) {
      const id = `category-${encodeURIComponent(cat)}`;
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          const y = element.getBoundingClientRect().top + window.scrollY - 150;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }, 300);
      }
    }
  }, [searchParams, loading, menu]);
  const { cart, addToCart, updateQuantity, total, triggerFlyToCart } = useCart();
  const { currentUser, userProfile } = useAuth();

  const [userPrefs, setUserPrefs] = useState<any>(null);
  const [selectedItemForReviews, setSelectedItemForReviews] = useState<any>(null);
  const [itemReviews, setItemReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewFeedback, setNewReviewFeedback] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasOrderedItem, setHasOrderedItem] = useState(false);
  const [checkingPurchaseStatus, setCheckingPurchaseStatus] = useState(false);

  const [showFAB, setShowFAB] = useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const lastScrollY = React.useRef(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        if (currentY > 400) {
           if (currentY > lastScrollY.current + 5) {
             setShowFAB(false);
           } else if (currentY < lastScrollY.current - 5) {
             setShowFAB(true);
           }
        } else {
           setShowFAB(false);
        }
        lastScrollY.current = currentY;
        ticking = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Category Scroll Spy
    const observer = new IntersectionObserver((entries) => {
      // Find the currently visible section with the highest intersection ratio
      const visibleEntries = entries.filter(entry => entry.isIntersecting);
      if (visibleEntries.length > 0) {
        // Sort by intersection ratio (highest first)
        visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const activeId = visibleEntries[0].target.id;
        const catId = activeId.replace('category-', '');
        setCategory(decodeURIComponent(catId));
      }
    }, { rootMargin: '-150px 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });

    // We need to attach observer to all category divs. Since they are rendered later, we can use a MutationObserver or just wait for them.
    // Instead of waiting, we can query them when menu changes.
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  // Effect to attach IntersectionObserver when menu items render
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visibleEntries = entries.filter(entry => entry.isIntersecting);
      if (visibleEntries.length > 0) {
        // Find the top-most visible entry
        const topEntry = visibleEntries.reduce((prev, curr) => {
          return prev.boundingClientRect.top < curr.boundingClientRect.top ? prev : curr;
        });
        const activeId = topEntry.target.id;
        if (activeId.startsWith('category-')) {
          const catId = activeId.replace('category-', '');
          setCategory(decodeURIComponent(catId));
        }
      }
    }, { rootMargin: '-100px 0px -60% 0px', threshold: 0 });

    const categoryElements = document.querySelectorAll('[id^="category-"]');
    categoryElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [menu, search, activeFilters]);

  const parseNumericValue = (value: any): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const normalized = String(value).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const fetchItemReviews = async (itemId: string) => {
    setLoadingReviews(true);
    try {
      const q = query(collection(getDb(), "reviews"), where("menuItemId", "==", itemId), orderBy("createdAt", "desc"), limit(10));
      const snapshot = await getDocs(q);
      setItemReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const verifyItemPurchase = async (itemId: string) => {
    if (!currentUser) {
      setHasOrderedItem(false);
      return;
    }
    
    setCheckingPurchaseStatus(true);
    try {
      // Fetch all DELIVERED orders for this user
      const ordersQuery = query(
        collection(getDb(), "orders"), 
        where("tenantId", "==", activeTenantId),
        where("userId", "==", currentUser.uid),
        where("status", "==", "DELIVERED"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snapshot = await getDocs(ordersQuery);
      
      // Check if any order contains the itemId
      const userHasOrdered = snapshot.docs.some(doc => {
        const orderData = doc.data();
        return orderData.items && Array.isArray(orderData.items) && 
               orderData.items.some((item: any) => item.menuItemId === itemId || item.id === itemId);
      });
      
      setHasOrderedItem(userHasOrdered);
    } catch (err) {
      console.error("Error verifying item purchase:", err);
      setHasOrderedItem(false);
    } finally {
      setCheckingPurchaseStatus(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!currentUser) {
      toast.error("Please login to submit a review");
      return;
    }
    if (!newReviewFeedback.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const reviewRef = await addDoc(collection(getDb(), "reviews"), {
        menuItemId: selectedItemForReviews.id,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        rating: newReviewRating,
        feedback: newReviewFeedback,
        createdAt: new Date().toISOString()
      });

      const menuItemRef = doc(getDb(), "menu", selectedItemForReviews.id);
      const menuItemSnap = await getDoc(menuItemRef);
      
      if (menuItemSnap.exists()) {
        const data = menuItemSnap.data();
        const currentRating = data.rating || 0;
        const currentCount = data.ratingCount || 0;
        
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + newReviewRating) / newCount;
        
        await updateDoc(menuItemRef, {
          rating: newRating,
          ratingCount: newCount
        });
      }
      
      toast.success("Review submitted successfully!");
      setNewReviewFeedback('');
      setNewReviewRating(5);
      fetchItemReviews(selectedItemForReviews.id);
    } catch (err) {
      console.error("Error submitting review:", err);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchStorefrontData = async () => {
      setLoading(true);
      try {
        const db = getDb();
        
        // Fetch Menu
        const menuSnap = await getDocs(query(collection(db, "menu"), where("tenantId", "==", activeTenantId)));
        const menuItems = menuSnap.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            name: data.name || 'Unknown dish',
            description: data.description || '',
            category: data.category || 'All',
            image: data.image || data.imageUrl || '',
            isAvailable: data.isAvailable !== false,
            isActive: data.isActive !== false,
            createdAt: data.createdAt || null,
            type: data.type === 'non-veg' ? 'non-veg' : 'veg',
            price: Number(data.price ?? 0),
            discount: Number(data.discount ?? 0),
            rating: Number(data.rating ?? 0)
          } as MenuItem & { isActive?: boolean };
        }).filter(item => item.isAvailable && item.isActive !== false);
        
        menuItems.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
          const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
          return timeB - timeA;
        });
        
        if (isMounted) setMenu(menuItems as MenuItem[]);

        // Fetch Categories
        const catSnap = await getDocs(query(collection(db, "categories"), where("tenantId", "==", activeTenantId), where("isActive", "==", true)));
        const cats = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        cats.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        if (isMounted) setCategories(cats);

        // Fetch Settings
        const settingsSnap = await getDoc(doc(db, "adminSettings", "global"));
        if (settingsSnap.exists() && isMounted) {
          setSettings(settingsSnap.data());
        }

      } catch (err) {
        console.error("Storefront Fetch Error:", err);
        if (isMounted) toast.error("Failed to load storefront data");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStorefrontData();

    return () => {
      isMounted = false;
    };
  }, [activeTenantId]);

  // SMART REORDER LOGIC
  useEffect(() => {
    if (currentUser?.uid && activeTenantId && menu.length > 0) {
      const fetchReorders = async () => {
        const result = await getSmartReorderRecommendations(currentUser.uid, activeTenantId, menu);
        setOrderAgain(result);
        if (result.length > 0) {
          trackEvent(activeTenantId, 'reorderViewed');
        }
      };
      fetchReorders();
    }
  }, [currentUser?.uid, activeTenantId, menu.length]);

  // Helper functions for tracking
  const handleReorderAdd = (item: MenuItem) => {
    trackEvent(activeTenantId, 'reorderClicked', { itemId: item.id });
    addToCart(item);
    toast.success(`${item.name} added to cart`);
  };

  useEffect(() => {
    if (userPrefs && menu.length > 0) {
      const favIds = userPrefs.favoriteItems || [];
      const recs = menu.filter(item => favIds.includes(item.id)).slice(0, 4);
      setRecommendations(recs);
    }
  }, [userPrefs, menu]);

  useEffect(() => {
    if (menu.length > 0) {
      setTrending(menu.filter(item => item.isAvailable && item.isActive !== false && (item.rating || 0) > 4.5).slice(0, 4));
    }
  }, [menu]);

  const categoryList = ['all', ...categories.map(c => c.name)];
  if (categoryList.length === 1) { // Fallback if categories collection is empty
    const derived = Array.from(new Set(menu.map(item => item.category)));
    categoryList.push(...derived);
  }

  const trendingIds = useMemo(() => trending.map(item => item.id), [trending]);

  const filteredMenu = useMemo(() => {
    let result = menu.filter(item => {
      const matchesSearch = (item.name || '').toLowerCase().includes(search.toLowerCase()) || 
                           (item.category || '').toLowerCase().includes(search.toLowerCase()) ||
                           (item.description || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || item.category === category;

      let matchesType = true;
      if (activeFilters.veg && activeFilters.nonVeg) {
        matchesType = item.type ? ['veg', 'non-veg'].includes(item.type) : false;
      } else if (activeFilters.veg) {
        matchesType = item.type === 'veg';
      } else if (activeFilters.nonVeg) {
        matchesType = item.type === 'non-veg';
      }

      let matchesPrice = true;
      if (activeFilters.priceRange === 'low') matchesPrice = item.price < 200;
      if (activeFilters.priceRange === 'mid') matchesPrice = item.price >= 200 && item.price <= 400;
      if (activeFilters.priceRange === 'high') matchesPrice = item.price > 400;

      const matchesPopular = !activeFilters.popular || trendingIds.includes(item.id);

      return matchesSearch && matchesCategory && matchesType && matchesPrice && matchesPopular;
    });

    if (result.length === 0 && activeFilters.popular) {
      // Fallback to top items if no items explicitly matched the popular criteria
      result = [...menu].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
    }
    
    return result;
  }, [menu, search, category, activeFilters, trendingIds]);

  const getItemQuantity = (id: string) => {
    const cartItem = cart.find(item => item.id === id);
    const quantity = cartItem ? cartItem.quantity : 0;
    return quantity;
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const isStoreOpenNow = () => {
    if (!settings) return true;
    if (settings.isStoreOpen === false) return false;
    if (!settings.storeTiming || settings.storeTiming.isManualOverride) return settings.isStoreOpen !== false;

    const now = currentTime;
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTimeStr >= settings.storeTiming.openTime && currentTimeStr <= settings.storeTiming.closeTime;
  };

  const getClosingSoonStatus = () => {
    if (!settings || !settings.storeTiming || settings.storeTiming.isManualOverride) return false;
    const now = new Date();
    const closeTimeParts = settings.storeTiming.closeTime.split(':');
    const closeDate = new Date();
    closeDate.setHours(parseInt(closeTimeParts[0]), parseInt(closeTimeParts[1]), 0);
    
    const diffMinutes = (closeDate.getTime() - now.getTime()) / 60000;
    return diffMinutes > 0 && diffMinutes <= 30;
  };

  const storeStatus = isStoreOpenNow();
  const closingSoon = getClosingSoonStatus();

  const getSmartRecommendations = (cartItems: any[]) => {
    const recs: any[] = [];
    cartItems.forEach(item => {
      const name = item.name.toLowerCase();
      if (name.includes('dosa') || name.includes('idli')) {
        const idli = menu.find(m => m.name.toLowerCase().includes('idli') && m.id !== item.id);
        const dosa = menu.find(m => m.name.toLowerCase().includes('dosa') && m.id !== item.id);
        if (name.includes('dosa') && idli) recs.push(idli);
        if (name.includes('idli') && dosa) recs.push(dosa);
      }
      if (name.includes('rice') || name.includes('biryani')) {
        const curry = menu.find(m => (m.category.toLowerCase().includes('curry') || m.name.toLowerCase().includes('curry')) && m.id !== item.id);
        if (curry) recs.push(curry);
      }
    });
    const uniqueRecs = recs.reduce((acc: any[], item) => {
      if (!acc.some(existing => existing.id === item.id)) acc.push(item);
      return acc;
    }, []);
    return uniqueRecs.slice(0, 4);
  };

  const smartRecs = getSmartRecommendations(cart);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <m.div 
          key="loading"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="min-h-screen bg-gray-50 dark:bg-[#111111] pb-32"
        >
          <div className="sticky top-0 z-40 border-b border-gray-200 dark:border-white/5 bg-gray-50/95 dark:bg-[#111111]/95 px-3 py-4 backdrop-blur-xl sm:px-4">
            <Skeleton className="h-14 rounded-2xl" />
          </div>
          <div className="w-full px-3 py-5 sm:px-4">
            <div className="mb-5 flex flex-col gap-3">
              <Skeleton className="h-8 w-44 rounded-full" />
              <CategorySkeleton />
            </div>
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => <MenuItemSkeleton key={i} />)}
            </div>
          </div>
        </m.div>
      ) : (
        <m.div 
          key="content"
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: isCategorySheetOpen ? 0.96 : 1 }}
          transition={{ duration: 0.3, type: 'spring', bounce: 0, opacity: { duration: 0.2 } }}
          style={{ transformOrigin: "top center", borderRadius: isCategorySheetOpen ? '2rem' : '0', overflow: 'hidden' }}
          className="min-h-screen bg-gray-50 dark:bg-[#111111] pb-32 transition-all"
        >


      {/* ULTRA-COMPACT STICKY HEADER */}
      <div className="sticky top-0 z-40 border-b border-gray-200 dark:border-white/5 bg-gray-50/95 dark:bg-[#111111]/95 backdrop-blur-xl mib-premium-sticky shadow-sm">
        {/* COMPACT STORE STATUS BANNER */}
        {!storeStatus && (
          <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-400">
            <Clock size={14} className="text-orange-500" />
            Kitchen Closed {settings?.storeTiming?.openTime ? `• Reopening at ${settings.storeTiming.openTime}` : ''}
          </div>
        )}
        
        <div className="px-3 py-3 sm:px-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => navigate(`${basePath}/`)}
                className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 active:scale-90 transition-all border border-white/5"
             >
                <ArrowLeft size={20} />
             </button>
             <div className="flex-1">
                <AiOrderingWidget 
                  menuItems={menu} 
                  searchQuery={search}
                  onSearchChange={setSearch}
                  compact={true} 
                />
             </div>
          </div>
          
          <div className="flex md:hidden gap-2.5 overflow-x-auto no-scrollbar pb-1 p-1 bg-white/[0.02] rounded-2xl border border-white/5" role="tablist">
            <button
              onClick={() => {
                triggerHaptic('light');
                setCategory('all');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={cn(
                "min-h-0 flex-shrink-0 flex items-center justify-center rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                category === 'all' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60"
              )}
            >
              Full Menu
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  triggerHaptic('light');
                  setCategory(cat.name);
                  const id = `category-${encodeURIComponent(cat.name)}`;
                  const element = document.getElementById(id);
                  if (element) {
                    const y = element.getBoundingClientRect().top + window.scrollY - 160;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
                className={cn(
                  "min-h-0 flex-shrink-0 flex items-center justify-center rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                  category === cat.name ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DESKTOP LAYOUT WRAPPER */}
      <div className="max-w-[1400px] mx-auto w-full flex flex-col md:flex-row gap-8 xl:gap-12 px-4 sm:px-6 xl:px-8 pb-24">
        {/* DESKTOP CATEGORY SIDEBAR */}
        <div className="hidden md:block w-64 xl:w-72 flex-shrink-0 pt-6">
          <div className="sticky top-32 space-y-2 bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/5 rounded-3xl p-5 shadow-sm">
            <h3 className="text-gray-400 dark:text-white/40 font-black uppercase tracking-widest text-[10px] mb-4 px-2">Menu Categories</h3>
            <button
              onClick={() => {
                triggerHaptic('light');
                setCategory('all');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300",
                category === 'all' ? "bg-orange-500 text-white font-bold shadow-[0_4px_20px_rgba(255,107,53,0.3)]" : "text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white font-bold"
              )}
            >
              <span>Full Menu</span>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-black", category === 'all' ? "bg-black/20" : "bg-gray-100 dark:bg-white/10")}>{menu.length}</span>
            </button>
            {categories.map(cat => {
              const count = menu.filter(m => m.category === cat.name || m.category === cat.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setCategory(cat.name);
                    const id = `category-${encodeURIComponent(cat.name)}`;
                    const element = document.getElementById(id);
                    if (element) {
                      const y = element.getBoundingClientRect().top + window.scrollY - 120;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300",
                    category === cat.name ? "bg-orange-500 text-white font-bold shadow-[0_4px_20px_rgba(255,107,53,0.3)]" : "text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white font-bold"
                  )}
                >
                  <span className="text-left line-clamp-1">{cat.name}</span>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-black", category === cat.name ? "bg-black/20" : "bg-gray-100 dark:bg-white/10")}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN MENU CONTENT */}
        <div className="flex-1 min-w-0">

      <div className="pt-6">
        {/* TIME-BASED RECOMMENDATIONS - BENTO STYLE */}
        {!search && category === 'all' && timeBasedRecs.items.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
              <h2 className="text-xl font-black text-white tracking-tight">{timeBasedRecs.title}</h2>
            </div>
            <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
               {timeBasedRecs.items.map(item => (
                 <div key={`time-rec-${item.id}`} className="min-w-[200px] bg-white/[0.03] border border-white/5 rounded-[2rem] p-3 flex flex-col group">
                    <div className="h-32 rounded-2xl overflow-hidden mb-3 relative">
                      <img src={item.image} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-2 left-2 text-[10px] font-black text-white/90 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg">{formatPrice(item.price)}</span>
                    </div>
                    <h3 className="text-xs font-black text-white/90 line-clamp-1 mb-3 px-1">{item.name}</h3>
                    <button 
                      onClick={() => {
                        triggerHaptic('light');
                        addToCart(item);
                        toast.success(`Added ${item.name}`);
                      }}
                      className="w-full py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all active:scale-95"
                    >
                      Add to cart
                    </button>
                 </div>
               ))}
            </div>
          </section>
        )}
      </div>

      <HelpMeChooseModal 
        isOpen={showHelpMeChoose} 
        onClose={() => setShowHelpMeChoose(false)} 
        menuItems={menu} 
      />

      {/* SMART REORDER: BUY AGAIN CAROUSEL */}
      {orderAgain.length > 0 && category === 'all' && search === '' && !activeFilters.popular && !activeFilters.veg && !activeFilters.nonVeg && (
        <div className="px-3 sm:px-4 pt-2 pb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-1.5 h-6 bg-red-500 rounded-full" />
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Buy Again
              <span className="bg-red-500/20 text-red-400 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-red-500/30">Favorites</span>
            </h2>
          </div>
          <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
            {orderAgain.map(item => (
              <div key={`reorder-${item.id}`} className="min-w-[160px] max-w-[160px] bg-white/[0.03] border border-white/5 rounded-2xl p-2 flex flex-col group relative">
                <div className="h-24 rounded-xl overflow-hidden mb-2 relative">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-black text-white px-2 py-0.5 bg-black/50 backdrop-blur-md rounded-md">{formatPrice(item.price)}</span>
                </div>
                <h3 className="text-[11px] font-bold text-white/90 line-clamp-2 px-1 mb-2 h-8 leading-tight">{item.name}</h3>
                <button
                  onClick={() => handleReorderAdd(item)}
                  className="w-full py-2 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Menu Grid */}
      <div id="menu-grid-start" className="px-3 sm:px-4 pb-12">
        <div className="pointer-events-none absolute inset-x-0 top-[240px] -z-10 mx-auto h-64 max-w-4xl bg-gradient-to-b from-orange-500/10 via-red-500/5 to-transparent blur-3xl opacity-70" />

        {/* Removed heavy STORE STATUS STRIP */}

        {/* MENU GRID AREA */}
        <div className="space-y-4">
          {/* TRENDING SECTION */}
          {trending.length > 0 && !(search || activeFilters.veg || activeFilters.nonVeg || activeFilters.priceRange !== 'all' || activeFilters.popular || category !== 'all') && (
            <div>
              <div className="mb-4 flex items-end justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-orange-200 border border-white/10 shadow-[0_0_15px_rgba(255,107,53,0.15)]">
                    <Sparkles size={18} className="text-orange-400" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-orange-200/70">Authentic Flavors</p>
                    <h2 className="text-xl font-bold tracking-tight text-white">Handpicked Comforts</h2>
                  </div>
                </div>
                <span className="mib-soft-pill min-h-0 text-white/70">Chef's Choice</span>
              </div>
              <div className="flex overflow-x-auto no-scrollbar gap-2 sm:gap-3 pb-3 -mx-3 px-3">
                {trending.map((item) => (
                  <div key={item.id} className="min-w-[280px]">
                    <MenuItemCard 
                      item={item} 
                      addToCart={addToCart}
                      updateQuantity={updateQuantity}
                      getItemQuantity={getItemQuantity}
                      isStoreOpenNow={isStoreOpenNow}
                      onViewReviews={(item) => {
                        setSelectedItemForReviews(item);
                        fetchItemReviews(item.id);
                        verifyItemPurchase(item.id);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALL ITEMS GROUPED BY CATEGORY */}
          <div>
            {filteredMenu.length > 0 ? (
              <div className="space-y-8">
                {categoryList.filter(c => c !== 'all').map(catName => {
                  const catItems = filteredMenu.filter(item => item.category === catName);
                  if (catItems.length === 0) return null;
                  
                  return (
                    <div key={catName} id={`category-${encodeURIComponent(catName)}`} className="scroll-mt-32">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold tracking-tight text-white">
                          {catName}
                        </h2>
                        <span className="mib-soft-pill min-h-0 text-white/65">
                          {catItems.length} items
                        </span>
                      </div>
                      <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:bg-transparent dark:md:bg-transparent md:border-none md:shadow-none bg-white dark:bg-[#151515] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/5 shadow-sm">
                        {catItems.map((item, index) => (
                          <div key={item.id} className="md:bg-white dark:md:bg-[#151515] md:rounded-[1.5rem] md:border md:border-gray-200 dark:md:border-white/5 md:shadow-sm md:overflow-hidden md:[&>article]:border-b-0 md:[&>article]:h-full md:[&>article]:bg-transparent">
                            <MenuItemCard 
                              item={item} 
                              index={index}
                              addToCart={addToCart}
                              updateQuantity={updateQuantity}
                              getItemQuantity={getItemQuantity}
                              isStoreOpenNow={isStoreOpenNow}
                              onViewReviews={(item: any) => {
                                setSelectedItemForReviews(item);
                                fetchItemReviews(item.id);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mib-glass rounded-[1.75rem] px-6 py-14 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                  <Search size={30} className="text-orange-200/70" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">We're searching the kitchen</h3>
                <p className="mib-muted-copy mx-auto mb-6 max-w-xs text-sm font-semibold leading-relaxed">
                  We couldn't find exactly what you're looking for, but we have plenty of other authentic Telugu meals to explore.
                </p>
                <button 
                  onClick={() => {
                    setSearch('');
                    setCategory('all');
                    setActiveFilters({ veg: false, nonVeg: false, priceRange: 'all', popular: false });
                  }}
                  className="mib-primary-action px-6 py-3"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      </div>

      {/* REVIEWS MODAL */}
      <AnimatePresence>
        {selectedItemForReviews && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <m.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItemForReviews(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <m.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-5 sm:p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <img src={selectedItemForReviews.image} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover" />
                  <div>
                    <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">{selectedItemForReviews.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-lg">
                        <Star size={12} className="fill-green-600 text-green-600" />
                        <span className="text-xs font-black text-green-700 dark:text-green-400">{selectedItemForReviews.rating || '4.5'}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{selectedItemForReviews.reviewCount || '0'} Reviews</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedItemForReviews(null)} className="p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all text-gray-500 dark:text-gray-400">
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="p-6 sm:p-10 overflow-y-auto no-scrollbar space-y-8 sm:space-y-10 flex-1">
                {/* SUBMIT REVIEW FORM */}
                {currentUser ? (
                  checkingPurchaseStatus ? (
                    <div className="bg-gray-50 dark:bg-gray-800/30 rounded-[2.5rem] p-6 sm:p-8 border border-gray-100 dark:border-gray-800 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-200 border-t-red-600 mr-3"></div>
                      <span className="text-sm font-bold text-gray-500">Verifying purchase...</span>
                    </div>
                  ) : hasOrderedItem ? (
                    <div className="bg-red-50 dark:bg-red-900/10 rounded-[2.5rem] p-6 sm:p-8 border border-red-100 dark:border-red-900/30 shadow-inner">
                      <h4 className="text-[10px] sm:text-xs font-black text-red-600 uppercase tracking-widest mb-4">Write a Review</h4>
                      <div className="flex items-center gap-3 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                            key={star} 
                            onClick={() => setNewReviewRating(star)}
                            className="transition-transform active:scale-90"
                          >
                            <Star 
                              size={24} 
                              className={`sm:w-8 sm:h-8 ${star <= newReviewRating ? "fill-red-500 text-red-500" : "text-gray-300 dark:text-gray-600"}`} 
                            />
                          </button>
                        ))}
                      </div>
                      <textarea 
                        placeholder="What did you think of this dish?"
                        className="w-full p-4 sm:p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl sm:rounded-3xl text-sm font-medium text-gray-900 dark:text-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all min-h-[100px] sm:min-h-[120px] mb-6 resize-none shadow-sm"
                        value={newReviewFeedback}
                        onChange={(e) => setNewReviewFeedback(e.target.value)}
                      />
                      <button 
                        onClick={handleSubmitReview}
                        disabled={isSubmittingReview}
                        className="w-full py-4 sm:py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl sm:rounded-3xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-xl shadow-red-600/30 transition-all disabled:opacity-50 active:scale-95"
                      >
                        {isSubmittingReview ? "Submitting..." : "Submit Review"}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800/30 rounded-[2.5rem] p-6 sm:p-8 border border-gray-100 dark:border-gray-800 text-center">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl">🔒</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-gray-900 dark:text-white mb-1">Verified Buyers Only</h4>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium max-w-[250px] mx-auto">
                        Only customers who ordered and tasted this item can write a review.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800/30 rounded-[2.5rem] p-6 sm:p-8 border border-gray-100 dark:border-gray-800 text-center">
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Login to write a review</p>
                  </div>
                )}

                <div className="space-y-6 sm:space-y-8">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Reviews</h4>
                  {loadingReviews ? (
                    <div className="py-12 sm:py-16 flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-4 border-red-100 dark:border-red-900/30 border-t-red-600"></div>
                    </div>
                  ) : itemReviews.length > 0 ? (
                    itemReviews.map(review => (
                      <div key={review.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl sm:rounded-[2rem] p-5 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-start mb-4 sm:mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-300 font-black text-sm sm:text-base shadow-sm border border-gray-100 dark:border-gray-600">
                              {review.userEmail?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-gray-900 dark:text-white text-sm sm:text-base tracking-tight">{review.userEmail}</p>
                              <p className="text-[9px] sm:text-[10px] text-gray-400 font-black uppercase tracking-widest">Verified Buyer</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-xl">
                            <Star size={12} className="fill-red-600 text-red-600" />
                            <span className="text-xs font-black text-red-600">{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base font-medium italic leading-relaxed">"{review.feedback}"</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 sm:py-16 text-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Star size={32} className="sm:w-10 sm:h-10 text-gray-200 dark:text-gray-700" />
                      </div>
                      <p className="text-gray-400 font-black text-xs sm:text-sm uppercase tracking-widest">No reviews yet</p>
                    </div>
                  )}
                </div>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>



      {/* BRAND Q&A SECTION */}
      <div className="w-full px-4 md:px-6 hidden">
        <section className="mt-24 mb-16">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-full text-red-600 dark:text-red-400 font-black text-[10px] uppercase tracking-widest mb-4">
              <HelpCircle size={14} />
              Got Questions?
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter-extra mb-4">Everything You <br className="md:hidden" /> <span className="text-red-600">Need to Know</span></h2>
            <p className="text-sm md:text-lg text-gray-500 dark:text-gray-400 font-medium italic">"BhojanOS - Where every bite feels like home."</p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            <FAQItem 
              question="Is the food really home-cooked?" 
              answer="Absolutely! We use traditional family recipes and cook in small batches to maintain that authentic home-style taste and quality."
            />
            <FAQItem 
              question="What kind of oil do you use?" 
              answer="We prioritize your health. We use high-quality cold-pressed oils and strictly avoid palm oil or reused oils."
            />
            <FAQItem 
              question="Do you add preservatives?" 
              answer="Never. Our food is 100% natural, made with fresh ingredients and hand-ground spices, just like at home."
            />
            <FAQItem 
              question="How do you ensure hygiene?" 
              answer="Our kitchen follows strict safety protocols. From sourcing fresh produce to eco-friendly packaging, hygiene is our top priority."
            />
          </div>
        </section>
      </div>

      {/* FLOATING ACTION BUTTON (BROWSE MENU) */}
      <AnimatePresence>
        {showFAB && !isCategorySheetOpen && (
          <m.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
              setIsCategorySheetOpen(true);
            }}
            className={`fixed ${cart.length > 0 ? 'bottom-[168px]' : 'bottom-24'} left-1/2 -translate-x-1/2 z-[45] bg-gray-900/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-black px-6 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-black/30 flex items-center gap-2 border border-white/10 dark:border-black/10 transition-all press-feedback`}
          >
            <MenuIcon size={16} />
            Browse Menu
          </m.button>
        )}
      </AnimatePresence>

      {/* CATEGORY BOTTOM SHEET */}
      <AnimatePresence>
        {isCategorySheetOpen && (
          <>
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategorySheetOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <m.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.4}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) {
                  setIsCategorySheetOpen(false);
                }
              }}
              className="fixed bottom-0 left-0 right-0 max-h-[70vh] bg-white dark:bg-gray-900 rounded-t-[2.5rem] z-50 shadow-2xl flex flex-col"
            >
              <div className="flex-shrink-0 pt-4 pb-2 flex justify-center">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
              </div>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Menu Categories</h3>
                <button 
                  onClick={() => setIsCategorySheetOpen(false)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar pb-safe">
                <button
                  onClick={() => {
                    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);
                    setCategory('all');
                    setIsCategorySheetOpen(false);
                    const menuGrid = document.getElementById('menu-grid-start');
                    if (menuGrid) menuGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl press-feedback ${
                    category === 'all' 
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50' 
                      : 'bg-gray-50 dark:bg-gray-800/50 border border-transparent'
                  }`}
                >
                  <span className={`font-black tracking-tight ${category === 'all' ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>All Items</span>
                  <span className="text-xs font-bold bg-white/50 dark:bg-black/20 px-2 py-1 rounded-lg text-gray-500">{menu.length}</span>
                </button>
                {categories.map((cat) => {
                  const count = menu.filter(m => m.category === cat.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);
                        setCategory(cat.id);
                        setIsCategorySheetOpen(false);
                        setTimeout(() => {
                          const section = document.getElementById(`category-${cat.id}`);
                          if (section) {
                            const y = section.getBoundingClientRect().top + window.scrollY - 150;
                            window.scrollTo({ top: y, behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl press-feedback ${
                        category === cat.id 
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50' 
                          : 'bg-gray-50 dark:bg-gray-800/50 border border-transparent'
                      }`}
                    >
                      <span className={`font-black tracking-tight ${category === cat.id ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        {cat.name}
                      </span>
                      <span className="text-xs font-bold bg-white/50 dark:bg-black/20 px-2 py-1 rounded-lg text-gray-500">{count}</span>
                    </button>
                  );
                })}
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>



      </m.div>
      )}
    </AnimatePresence>
  );
};

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bento-card !p-6 !rounded-3xl">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group"
      >
        <span className="text-base font-black text-gray-900 dark:text-white tracking-tight group-hover:text-red-600 transition-colors">{question}</span>
        <m.div animate={{ rotate: isOpen ? 180 : 0 }} className="text-red-600">
          <ChevronDown size={18} />
        </m.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pt-4 text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{answer}</p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}


export default Menu;
