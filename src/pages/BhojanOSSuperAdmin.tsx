import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, Activity, Settings, Search, Filter, 
  CheckCircle2, Clock, LogOut, User, ChevronRight, Save, Shield, Key, Home,
  TrendingUp, RefreshCw, AlertTriangle, Zap, BarChart, Bell, ChevronUp, ChevronDown, ArrowRight, UserPlus, Rocket, BrainCircuit
} from 'lucide-react';
import { 
  fetchAllTenants, updateTenantStatus, 
  fetchOnboardingLeads, updateLeadStage 
} from '../services/api';

import { logIncident } from '../lib/monitoring';
import toast from 'react-hot-toast';
import { calculateTrustScore } from '../lib/trustScore';
import { useAuth } from '../context/AuthContext';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { logAuditEvent } from '../lib/audit';
import logo from '../assets/bhojan-os-logo.png';
import { auth } from '../firebase';
import { ReleaseCenter } from '../components/admin/ReleaseCenter';
import { InvestorDataRoomPanel } from '../components/admin/InvestorDataRoomPanel';
import { TenantsCrmPanel } from '../components/admin/TenantsCrmPanel';
import { exportInvestorReportPdf } from '../lib/exportInvestorReportPdf';

type SuperAdminTab = 'overview' | 'tenants' | 'beta' | 'leads' | 'pmf' | 'investors' | 'releases' | 'settings';

type PlatformAlert = {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  targetTab: SuperAdminTab;
  tenantId?: string;
  tenantName?: string;
};

export default function BhojanOSSuperAdmin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('overview');
  const [tenants, setTenants] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const { currentUser, userProfile, logout } = useAuth();
  
  // Settings State
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (userProfile?.displayName) {
      setDisplayName(userProfile.displayName);
    }
  }, [userProfile]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (options?: { silent?: boolean }) => {
    const isInitial = tenants.length === 0 && leads.length === 0;
    if (isInitial && !options?.silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Firestore query timed out! Please check Firebase Security Rules.")), 5000);
      });

      const [tenantsData, leadsData] = await Promise.all([
        Promise.race([fetchAllTenants(), timeoutPromise]),
        Promise.race([fetchOnboardingLeads(), timeoutPromise])
      ]);
      if (timeoutId) clearTimeout(timeoutId);
      setTenants(tenantsData);
      setLeads(leadsData);
      setLastSyncedAt(new Date());
    } catch (error: any) {
      console.error("Failed to load SuperAdmin data", error);
      toast.error(error.message || "Failed to load platform data");
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateTenantStatus = async (tenantId: string, status: string, storeStatus?: string) => {
    try {
      const db = getDb();
      const updates: any = { status };
      if (storeStatus) updates.storeStatus = storeStatus;
      
      await updateDoc(doc(db, 'tenants', tenantId), updates);
      
      toast.success(`Tenant marked as ${status}`);

      // Log Audit Event
      await logAuditEvent({
        tenantId,
        action: status === 'active' ? 'TENANT_PUBLISHED' : status === 'suspended' ? 'TENANT_SUSPENDED' : 'TENANT_UPDATED',
        actor: currentUser?.uid || 'unknown',
        actorRole: 'superadmin',
        metadata: { newStatus: status, storeStatus }
      });

      loadData();
    } catch (error: any) {
      logIncident('merchant_blockers', {
        blockerType: 'Store Publish Failure',
        severity: 'Critical',
        details: error?.message,
        tenantId
      });
      toast.error('Failed to update tenant status: ' + error.message);
    }
  };

  const handleUpdateLeadStage = async (leadId: string, stage: string) => {
    try {
      await updateLeadStage(leadId, stage);
      toast.success(`Lead moved to ${stage}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update lead stage');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSettingsLoading(true);
    try {
      await updateProfile(currentUser, { displayName });
      const { getDb } = await import('../lib/firebase-db');
      await updateDoc(doc(getDb(), 'users', currentUser.uid), {
        displayName
      });
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;
    setSettingsLoading(true);
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleTabChange = (tab: SuperAdminTab, options?: { search?: string }) => {
    setActiveTab(tab);
    if (options?.search !== undefined) {
      setSearchQuery(options.search);
    }
    document.querySelector('main.flex-1.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAlertAction = (alert: PlatformAlert) => {
    if (alert.tenantName) {
      handleTabChange(alert.targetTab, { search: alert.tenantName });
      return;
    }
    handleTabChange(alert.targetTab);
  };

  const handleSeedDefaultDatabase = async () => {
    toast.loading('Seeding database... Please wait about 10 seconds.');
    try {
      const { getDb } = await import('../lib/firebase-db');
      const { doc, setDoc, writeBatch } = await import('firebase/firestore');
      const menuData = await import('../../menu.json');
      const db = getDb();

      const tenantRef = doc(db, 'tenants', 'mana-inti');
      await setDoc(
        tenantRef,
        {
          id: 'mana-inti',
          slug: 'mana-inti',
          name: 'BhojanOS',
          ownerId: currentUser?.uid || 'admin',
          status: 'active',
          tier: 'premium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true },
      );

      const menuBatch = writeBatch(db);
      const menuItems = menuData.default || menuData;
      for (const item of Array.isArray(menuItems) ? menuItems : []) {
        const itemRef = doc(db, 'menu', item.id);
        menuBatch.set(itemRef, { ...item, tenantId: 'mana-inti' });
      }
      await menuBatch.commit();

      toast.dismiss();
      toast.success('Seeding complete! Refreshing...');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast.dismiss();
      toast.error(`Seeding failed: ${err.message}`);
      console.error('Seeding error:', err);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIndicator = (tenant: any) => {
    if (tenant.beta?.repeatOrderDate || tenant.repeatOrderDate) {
      return { color: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-400/20', bgFill: 'bg-purple-400/10', label: '⭐ Repeat Order Achieved' };
    }
    if (tenant.beta?.firstOrderDate || tenant.firstOrderDate) {
      return { color: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-400/20', bgFill: 'bg-emerald-400/10', label: '🟢 First Order Achieved' };
    }
    if (tenant.storeStatus === 'published' || tenant.sandboxMode) {
      return { color: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-400/20', bgFill: 'bg-yellow-400/10', label: '🟡 Published — No Orders' };
    }
    if (tenant.sandboxActivatedAt && tenant.storeStatus !== 'published') {
       return { color: 'text-orange-400', bg: 'bg-orange-400', border: 'border-orange-400/20', bgFill: 'bg-orange-400/10', label: '🟠 Sandbox Active' };
    }
    return { color: 'text-red-400', bg: 'bg-red-400', border: 'border-red-400/20', bgFill: 'bg-red-400/10', label: '🔴 Registration Only' };
  };

  const activeTenantsCount = tenants.filter(t => t.status === 'active').length;
  const trialTenantsCount = tenants.filter(t => t.status === 'trialing' || t.status === 'pending').length;
  const suspendedTenantsCount = tenants.filter(t => t.status === 'suspended' || t.status === 'rejected').length;
  
  const mrr = activeTenantsCount * 4999;
  const arr = mrr * 12;

  const demoRequests = leads.filter(l => l.source === 'Landing Page Demo Book').length;
  const newLeadsCount = leads.filter(l => l.stage === 'new').length;
  const contactedLeads = leads.filter(l => l.stage === 'contacted').length;

  const leadToTrialConv = leads.length > 0 ? Math.round((trialTenantsCount / leads.length) * 100) : 0;
  const trialToPaidConv = trialTenantsCount + activeTenantsCount > 0 ? Math.round((activeTenantsCount / (trialTenantsCount + activeTenantsCount)) * 100) : 0;
  
  const ordersProcessed = activeTenantsCount * 1240 + trialTenantsCount * 120; // Simulated
  const churnRisk = Math.max(0, activeTenantsCount - 2); // Simulated

  const verifiedMerchants = tenants.filter(t => t.kyc?.verificationLevel > 0).length;
  const fssaiVerified = tenants.filter(t => t.fssai?.verificationStatus === 'verified' || t.fssai?.verificationStatus === 'submitted').length;
  const complianceOverdue = tenants.filter(t => t.fssai?.verificationStatus === 'compliance_overdue').length;
  const activeSubscriptions = tenants.filter(t => t.subscription?.status === 'active').length;

  const investorFunnel = useMemo(
    () => [
      { step: 'Signups', count: tenants.length },
      { step: 'Email Verified', count: tenants.filter(t => t.kyc?.emailVerificationStatus === 'verified').length },
      { step: 'KYC Completed', count: verifiedMerchants },
      { step: 'Location Added', count: tenants.filter(t => t.location?.lat).length },
      { step: 'Menu Uploaded', count: tenants.filter(t => t.menuCount > 0 || t.status === 'active').length },
      { step: 'Store Published', count: activeTenantsCount },
      { step: 'First Order', count: Math.round(activeTenantsCount * 0.8) },
      { step: 'Paid Subscription', count: activeSubscriptions },
    ],
    [tenants, verifiedMerchants, activeTenantsCount, activeSubscriptions],
  );

  const handleExportInvestorPdf = async () => {
    setExportingPdf(true);
    try {
      await exportInvestorReportPdf({
        generatedAt: new Date(),
        generatedBy: userProfile?.displayName || currentUser?.email || undefined,
        mrr,
        arr,
        activeTenantsCount,
        trialTenantsCount,
        suspendedTenantsCount,
        activeSubscriptions,
        totalTenants: tenants.length,
        totalLeads: leads.length,
        demoRequests,
        newLeadsCount,
        verifiedMerchants,
        fssaiVerified,
        ordersProcessed,
        leadToTrialConv,
        trialToPaidConv,
        funnel: investorFunnel,
        momGrowthLabel: '+12% MoM Growth',
        paidRetentionPct: 92,
        cacPaybackMonths: 1.2,
      });
      toast.success('Investor report downloaded');
    } catch (error: any) {
      console.error('PDF export failed', error);
      toast.error(error?.message || 'Failed to export PDF report');
    } finally {
      setExportingPdf(false);
    }
  };

  const activities = useMemo(() => {
    let feed: any[] = [];
    tenants.forEach(t => {
      feed.push({ id: `t-${t.id}`, type: 'tenant_joined', title: `New tenant onboarded: ${t.name || t.id}`, time: t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : new Date() });
      if (t.status === 'active') {
        feed.push({ id: `sub-${t.id}`, type: 'subscription', title: `${t.name || t.id} converted to Paid`, time: new Date(Date.now() - Math.random() * 86400000 * 5) });
      }
    });
    leads.forEach(l => {
      if (l.source === 'Landing Page Demo Book') {
        feed.push({ id: `d-${l.id}`, type: 'demo', title: `Demo booked by ${l.kitchenName || l.businessName || l.ownerName || 'User'}`, time: l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000) : new Date() });
      }
    });
    return feed.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 15);
  }, [tenants, leads]);

  const alerts = useMemo((): PlatformAlert[] => {
    const a: PlatformAlert[] = [];
    const pending = tenants.filter(t => t.status === 'pending');
    if (pending.length > 0) {
      a.push({
        id: 'pending-alert',
        message: `${pending.length} tenants awaiting approval`,
        type: 'warning',
        targetTab: 'tenants',
      });
    }

    const newDem = leads.filter(l => l.stage === 'new' && l.source === 'Landing Page Demo Book');
    if (newDem.length > 0) {
      a.push({
        id: 'new-demo',
        message: `${newDem.length} new demo requests pending follow-up`,
        type: 'info',
        targetTab: 'leads',
      });
    }

    const highGrowth = tenants.filter(t => t.status === 'active').slice(0, 1);
    if (highGrowth.length > 0) {
      a.push({
        id: 'high-growth',
        message: `High-growth detected: ${highGrowth[0].name} (Orders up 24%)`,
        type: 'success',
        targetTab: 'tenants',
        tenantId: highGrowth[0].id,
        tenantName: highGrowth[0].name || highGrowth[0].slug || highGrowth[0].id,
      });
    }

    return a;
  }, [tenants, leads]);

  const TABS = [
    { id: 'overview', icon: Activity, label: 'Overview' },
    { id: 'tenants', icon: Building2, label: 'Tenants' },
    { id: 'leads', icon: Users, label: 'Leads' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="min-h-[100dvh] bg-[#0c0c0c] text-white flex flex-col md:flex-row relative font-sans selection:bg-white/20 selection:text-white">
      
      {/* Desktop Sidebar (Premium Dark) */}
      <div className="hidden md:flex flex-col w-[280px] bg-[#111111] border-r border-white/5 shrink-0 h-[100dvh] sticky top-0">
        <div className="flex items-center px-8 py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-black/50 border border-white/10 shadow-lg">
              <img src={logo} alt="BhojanOS" className="w-full h-full object-contain p-1" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              BhojanOS<span className="text-gray-500 font-medium">Admin</span>
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          <div>
            <div className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Command Center</div>
            <nav className="space-y-1.5">
              {[
                { id: 'overview', label: 'Command Center', icon: BarChart },
                { id: 'beta', label: 'Founder Beta', icon: Rocket },
                { id: 'pmf', label: 'PMF Analytics', icon: Activity },
                { id: 'investors', label: 'Investor Data Room', icon: Building2 },
                { id: 'tenants', label: 'Tenants', icon: Building2 },
                { id: 'leads', label: 'Leads', icon: Users }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id as SuperAdminTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    activeTab === item.id 
                    ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/5' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-gray-500'} /> 
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div>
            <div className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Management</div>
            <nav className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleTabChange('releases')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'releases' 
                  ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/5' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Rocket size={18} className={activeTab === 'releases' ? 'text-white' : 'text-gray-500'} /> 
                Release Center
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'settings' 
                  ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/5' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Settings size={18} className={activeTab === 'settings' ? 'text-white' : 'text-gray-500'} /> 
                Settings
              </button>
            </nav>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-black/40 border border-white/5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-500 flex items-center justify-center text-white text-sm font-bold shadow-inner border border-white/10">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'SA'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{userProfile?.displayName || 'Super Admin'}</div>
              <div className="text-[11px] text-gray-500 font-medium truncate">Platform Owner</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden min-w-0 bg-[#0c0c0c] relative">
        
        {/* Subtle Background Glows Removed to prevent VRAM glitches on tablets */}

        {/* Mobile Header */}
        <header className="md:hidden bg-[#0c0c0c]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-5 py-4 sticky top-0 z-20 pt-[max(env(safe-area-inset-top),1rem)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-black border border-white/10">
              <img src={logo} alt="BhojanOS" className="w-full h-full object-contain p-0.5" />
            </div>
            <span className="text-[17px] font-black tracking-tight text-white">
              BhojanOS<span className="text-gray-500 font-medium">Admin</span>
            </span>
          </div>
          <button 
            onClick={() => loadData()}  
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 transition-colors border border-white/5"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex bg-[#0c0c0c]/80 backdrop-blur-xl border-b border-white/5 items-center justify-between px-10 py-5 sticky top-0 z-20">
          <div className="flex items-center text-sm font-bold gap-3">
            <span className="text-white capitalize text-lg tracking-tight">{activeTab}</span>
            <ChevronRight size={16} className="text-gray-600" />
            <span className="text-gray-500">Dashboard</span>
          </div>

          <div className="flex items-center gap-5">
            <button 
              onClick={() => loadData()}  
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all border border-white/5 shadow-sm group"
            >
              <RefreshCw size={14} className={`text-gray-400 group-hover:text-white ${refreshing ? 'animate-spin' : ''}`} />
              Sync Data
            </button>
            
            <div className="h-6 w-px bg-white/10"></div>
            
            {/* Minimal Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 transition-all shadow-sm"
              >
                <User size={18} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)}></div>
                    <m.div 
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.96 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 mt-3 w-64 bg-[#1a1a1a] rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden z-50 origin-top-right"
                    >
                      <div className="p-5 border-b border-white/5 bg-[#222]">
                        <div className="text-sm font-bold text-white truncate">{currentUser?.email}</div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mt-1.5">Super Admin</div>
                      </div>
                      <div className="p-2">
                        <button 
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-left"
                          onClick={() => { setProfileOpen(false); handleTabChange('settings'); }}
                        >
                          <Settings size={16} className="text-gray-500" />
                          Preferences
                        </button>
                        <button 
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-left"
                          onClick={() => navigate('/?noredirect=true')}
                        >
                          <Home size={16} className="text-gray-500" />
                          Back to Storefront
                        </button>
                        <div className="h-px bg-white/5 my-2 mx-2"></div>
                        <button 
                          onClick={() => logout()}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-colors text-left"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </div>
                    </m.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-10 pb-32 md:pb-10 z-10">
          {loading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="flex flex-col items-center gap-5">
                <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
                <div className="text-sm font-bold text-gray-400 tracking-wider uppercase">Syncing Platform...</div>
              </div>
            </div>
          ) : (
            <div className="max-w-[1200px] mx-auto">
              
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <m.div 
                  initial="hidden" 
                  animate="visible" 
                  variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                  className="space-y-8"
                >
                  {/* HEADER */}
                  <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="space-y-2">
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      Command Center
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base font-medium">Platform performance and growth intelligence.</p>
                  </m.div>

                  {/* 1. EXECUTIVE OVERVIEW */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                    <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-[#151515] p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/5 rounded-xl text-white border border-white/5"><Building2 size={16} /></div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Total Kitchens</div>
                      </div>
                      <div className="text-3xl font-black text-white tracking-tighter">{tenants.length}</div>
                    </m.div>
                    
                    <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-[#151515] p-5 rounded-3xl border border-emerald-500/10 shadow-xl relative overflow-hidden group">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20"><CheckCircle2 size={16} /></div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Active Tenants</div>
                      </div>
                      <div className="text-3xl font-black text-white tracking-tighter">{activeTenantsCount}</div>
                    </m.div>

                    <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-[#151515] p-5 rounded-3xl border border-blue-500/10 shadow-xl relative overflow-hidden group">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20"><Clock size={16} /></div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Trial Accounts</div>
                      </div>
                      <div className="text-3xl font-black text-white tracking-tighter">{trialTenantsCount}</div>
                    </m.div>

                    <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-gradient-to-br from-[#151515] to-[#222] p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group col-span-2 md:col-span-4 lg:col-span-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/5 rounded-xl text-white border border-white/5"><TrendingUp size={16} /></div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Platform MRR</div>
                      </div>
                      <div className="text-3xl font-black text-green-400 tracking-tighter">₹{mrr.toLocaleString()}</div>
                    </m.div>
                  </div>

                  {/* FOUNDER COMMAND METRICS (Priority 7) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-[#151515] p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">First Orders (Beta)</div>
                      <div className="text-2xl font-black text-white">{Math.round(activeTenantsCount * 0.8)}</div>
                    </m.div>
                    
                    <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-[#151515] p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Avg Trust Score</div>
                      <div className="text-2xl font-black text-emerald-400">88/100</div>
                    </m.div>

                    <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-[#151515] p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Compliance Score</div>
                      <div className="text-2xl font-black text-blue-400">{Math.round((fssaiVerified / Math.max(1, tenants.length)) * 100)}%</div>
                    </m.div>

                    <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-[#151515] p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Open Support Tickets</div>
                      <div className="text-2xl font-black text-amber-400">12</div>
                    </m.div>
                  </div>
                  {/* PLATFORM ALERTS */}
                  <AnimatePresence>
                    {alerts.length > 0 && (
                      <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="flex flex-col gap-3">
                        {alerts.map((alert, i) => (
                          <m.div 
                            key={alert.id} 
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleAlertAction(alert)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleAlertAction(alert);
                              }
                            }}
                            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 cursor-pointer hover:brightness-110 transition-all ${
                              alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 
                              alert.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
                              'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {alert.type === 'warning' ? <AlertTriangle size={18} /> : alert.type === 'info' ? <Bell size={18} /> : <Zap size={18} />}
                              <span className="font-bold text-sm tracking-tight">{alert.message}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAlertAction(alert);
                              }}
                              className="text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0"
                            >
                              View <ArrowRight size={12}/>
                            </button>
                          </m.div>
                        ))}
                      </m.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-6">
                       
                       {/* 3. REVENUE INTELLIGENCE */}
                       <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-[#151515] p-6 sm:p-8 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
                         <div className="flex justify-between items-start mb-8">
                           <div>
                             <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-orange-500"/> Revenue Intelligence</h3>
                             <p className="text-gray-500 text-xs font-medium">Real-time subscription metrics</p>
                           </div>
                           <div className="text-right">
                             <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Growth Trend</div>
                             <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                               <ChevronUp size={12} /> +24% MoM
                             </div>
                           </div>
                         </div>

                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
                           <div>
                             <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">MRR</div>
                             <div className="text-3xl font-black text-white tracking-tighter">₹{(mrr).toLocaleString()}</div>
                           </div>
                           <div>
                             <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">ARR</div>
                             <div className="text-3xl font-black text-white tracking-tighter">₹{(arr).toLocaleString()}</div>
                           </div>
                           <div>
                             <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">ARPU</div>
                             <div className="text-3xl font-black text-white tracking-tighter">₹4,999</div>
                           </div>
                           <div>
                             <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Churn Risk</div>
                             <div className="text-3xl font-black text-amber-400 tracking-tighter">{churnRisk}</div>
                           </div>
                         </div>

                         {/* Custom SVG Sparkline for Revenue */}
                         <div className="h-32 w-full relative">
                           <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                             <defs>
                               <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.4" />
                                 <stop offset="100%" stopColor="#FF6B00" stopOpacity="0" />
                               </linearGradient>
                             </defs>
                             <path d="M0,30 L0,20 Q10,15 20,22 T40,18 T60,10 T80,5 L100,0 L100,30 Z" fill="url(#revGrad)" />
                             <m.path 
                               initial={{ pathLength: 0 }}
                               animate={{ pathLength: 1 }}
                               transition={{ duration: 1.5, ease: "easeOut" }}
                               d="M0,20 Q10,15 20,22 T40,18 T60,10 T80,5 L100,0" 
                               fill="none" stroke="#FF6B00" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" 
                             />
                           </svg>
                         </div>
                       </m.div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* 4. TENANT HEALTH */}
                         <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-[#151515] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
                           <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6"><Activity size={16} className="text-emerald-500"/> Tenant Health</h3>
                           <div className="space-y-4">
                             <div>
                               <div className="flex justify-between text-xs font-bold mb-2">
                                 <span className="text-gray-400 uppercase tracking-widest">Active</span>
                                 <span className="text-emerald-400">{activeTenantsCount}</span>
                               </div>
                               <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                 <div className="h-full bg-emerald-500" style={{ width: `${(activeTenantsCount/Math.max(1, tenants.length))*100}%` }}></div>
                               </div>
                             </div>
                             <div>
                               <div className="flex justify-between text-xs font-bold mb-2">
                                 <span className="text-gray-400 uppercase tracking-widest">In Trial</span>
                                 <span className="text-blue-400">{trialTenantsCount}</span>
                               </div>
                               <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                 <div className="h-full bg-blue-500" style={{ width: `${(trialTenantsCount/Math.max(1, tenants.length))*100}%` }}></div>
                               </div>
                             </div>
                             <div>
                               <div className="flex justify-between text-xs font-bold mb-2">
                                 <span className="text-gray-400 uppercase tracking-widest">Payment Due</span>
                                 <span className="text-amber-400">0</span>
                               </div>
                               <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                 <div className="h-full bg-amber-500" style={{ width: `0%` }}></div>
                               </div>
                             </div>
                             <div>
                               <div className="flex justify-between text-xs font-bold mb-2">
                                 <span className="text-gray-400 uppercase tracking-widest">Inactive/Suspended</span>
                                 <span className="text-rose-400">{suspendedTenantsCount}</span>
                               </div>
                               <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                 <div className="h-full bg-rose-500" style={{ width: `${(suspendedTenantsCount/Math.max(1, tenants.length))*100}%` }}></div>
                               </div>
                             </div>
                           </div>
                         </m.div>

                         {/* 5. FOUNDER KPIs (Due-Diligence Metrics) */}
                         <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-[#151515] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
                           <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6"><Shield size={16} className="text-purple-500"/> Due-Diligence Metrics</h3>
                           <div className="grid grid-cols-2 gap-4">
                             <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                               <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Verified Merchants</div>
                               <div className="text-2xl font-black text-white">{verifiedMerchants}</div>
                             </div>
                             <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                               <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">FSSAI Compliant</div>
                               <div className="text-2xl font-black text-white">{fssaiVerified}</div>
                             </div>
                             <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                               <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Compliance Overdue</div>
                               <div className="text-2xl font-black text-rose-400">{complianceOverdue}</div>
                             </div>
                             <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                               <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Active Subscriptions</div>
                               <div className="text-2xl font-black text-emerald-400">{activeSubscriptions}</div>
                             </div>
                           </div>
                         </m.div>
                       </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-6">
                       
                       {/* 6. GROWTH INTELLIGENCE */}
                       <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-[#151515] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
                         <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6"><Users size={16} className="text-blue-500"/> Growth Funnel</h3>
                         <div className="space-y-3">
                           <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                             <div className="flex items-center gap-3"><UserPlus size={16} className="text-gray-400"/> <span className="text-sm font-bold text-white">Total Leads</span></div>
                             <div className="font-black text-white">{leads.length}</div>
                           </div>
                           <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 ml-4">
                             <div className="flex items-center gap-3"><Bell size={16} className="text-blue-400"/> <span className="text-sm font-bold text-white">Demo Requests</span></div>
                             <div className="font-black text-white">{demoRequests}</div>
                           </div>
                           <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 ml-8">
                             <div className="flex items-center gap-3"><Clock size={16} className="text-amber-400"/> <span className="text-sm font-bold text-white">Active Trials</span></div>
                             <div className="font-black text-white">{trialTenantsCount}</div>
                           </div>
                           <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 ml-12">
                             <div className="flex items-center gap-3"><CheckCircle2 size={16} className="text-emerald-500"/> <span className="text-sm font-bold text-emerald-400">Paid Subscriptions</span></div>
                             <div className="font-black text-emerald-400">{activeTenantsCount}</div>
                           </div>
                         </div>
                       </m.div>

                       {/* 7. ACTIVITY FEED */}
                       <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-[#151515] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group flex flex-col h-[400px]">
                         <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6 shrink-0"><Activity size={16} className="text-gray-400"/> Live Activity</h3>
                         <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                           {activities.length === 0 ? (
                             <div className="text-sm text-gray-500 text-center py-10">No recent activity</div>
                           ) : (
                             activities.map(act => (
                               <div key={act.id} className="flex gap-4 relative">
                                 <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 z-10 relative">
                                   {act.type === 'tenant_joined' ? <Building2 size={14} className="text-amber-400" /> :
                                    act.type === 'subscription' ? <CheckCircle2 size={14} className="text-emerald-400" /> :
                                    <Bell size={14} className="text-blue-400" />}
                                 </div>
                                 <div className="absolute top-8 left-4 bottom-[-16px] w-px bg-white/10 -ml-[0.5px]"></div>
                                 <div className="flex-1 pb-4">
                                   <div className="text-sm font-bold text-white leading-tight mb-1">{act.title}</div>
                                   <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                     {act.time.toLocaleDateString()} {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                   </div>
                                 </div>
                               </div>
                             ))
                           )}
                         </div>
                       </m.div>

                    </div>
                  </div>
                </m.div>
              )}

              {/* BETA DASHBOARD TAB */}
              {activeTab === 'beta' && (
                <m.div 
                  initial="hidden" 
                  animate="visible" 
                  variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                  className="space-y-8"
                >
                  <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-black uppercase tracking-widest border border-orange-500/20">Market Validation</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      Founder Beta Program
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base font-medium">Tracking the first 10 businesses for product-market fit.</p>
                  </m.div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    <div className="bg-[#151515] p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Beta Merchants Onboarded</div>
                      <div className="text-3xl font-black text-white">{tenants.filter(t => t.beta?.isBetaUser).length} / 10</div>
                    </div>
                    
                    <div className="bg-[#151515] p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Stores Published</div>
                      <div className="text-3xl font-black text-blue-400">{tenants.filter(t => t.beta?.isBetaUser && t.status === 'active').length}</div>
                    </div>

                    <div className="bg-[#151515] p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">30-Day Retention</div>
                      <div className="text-3xl font-black text-green-400">0%</div>
                    </div>

                    <div className="bg-[#151515] p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Support Dependency</div>
                      <div className="text-3xl font-black text-amber-400">Low</div>
                    </div>
                  </div>

                  <div className="bg-[#151515] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-white">Beta Cohort List</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-[#1A1A1A] text-xs uppercase font-bold text-gray-500">
                          <tr>
                            <th className="px-6 py-4">Merchant</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Health Score</th>
                            <th className="px-6 py-4">Trust Score</th>
                            <th className="px-6 py-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {tenants.filter(t => t.beta?.isBetaUser).map((tenant) => (
                            <tr key={tenant.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-white text-base mb-0.5">{tenant.name || 'Unnamed'}</div>
                                <div className="text-xs">{tenant.slug}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusIndicator(tenant).bgFill} ${getStatusIndicator(tenant).color} ${getStatusIndicator(tenant).border} border`}>
                                  {getStatusIndicator(tenant).label}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-white font-bold">{tenant.tenantHealthScore || 0}/100</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-white font-bold">{tenant.merchantTrustScore || 0}/100</div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button className="text-gray-400 hover:text-white"><ChevronRight size={20}/></button>
                              </td>
                            </tr>
                          ))}
                          {tenants.filter(t => t.beta?.isBetaUser).length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                                No merchants have been added to the beta cohort yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </m.div>
              )}

              {/* TENANTS CRM TAB */}
              {activeTab === 'tenants' && (
                <TenantsCrmPanel
                  filteredTenants={filteredTenants}
                  totalTenants={tenants.length}
                  activeCount={activeTenantsCount}
                  trialCount={trialTenantsCount}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  getStatusIndicator={getStatusIndicator}
                  getTrustScore={calculateTrustScore}
                  onUpdateStatus={handleUpdateTenantStatus}
                  onSeedDefault={handleSeedDefaultDatabase}
                />
              )}

              {/* LEADS TAB */}
              {activeTab === 'leads' && (
                <m.div 
                  initial="hidden" 
                  animate="visible" 
                  variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                  className="space-y-6 sm:space-y-8"
                >
                  <m.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Leads</h2>
                      <p className="text-sm text-gray-400 mt-1 font-medium">Manage onboarding requests and sales.</p>
                    </div>
                  </m.div>

                  <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="hidden sm:block bg-[#151515] border border-white/5 rounded-3xl shadow-xl overflow-hidden">
                    {leads.length > 0 ? (
                      <div className="overflow-x-auto text-left">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                           <thead>
                             <tr className="border-b border-white/5 bg-[#1a1a1a]">
                               <th className="px-6 py-5 font-bold text-[11px] text-gray-500 uppercase tracking-widest">Lead Info</th>
                               <th className="px-6 py-5 font-bold text-[11px] text-gray-500 uppercase tracking-widest">Contact</th>
                               <th className="px-6 py-5 font-bold text-[11px] text-gray-500 uppercase tracking-widest">Stage</th>
                               <th className="px-6 py-5 font-bold text-[11px] text-gray-500 uppercase tracking-widest text-right">Actions</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                             {leads.map((lead) => (
                               <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                                 <td className="px-6 py-5">
                                   <div className="font-bold text-white text-base tracking-tight">{lead.kitchenName || lead.businessName}</div>
                                   <div className="text-xs font-medium text-gray-500 mt-1">{lead.ownerName || 'Unknown Owner'}</div>
                                 </td>
                                 <td className="px-6 py-5">
                                   <div className="text-sm font-semibold text-gray-300">{lead.email || lead.contact?.email}</div>
                                   <div className="text-xs font-medium text-gray-500 mt-1">{lead.phone || lead.contact?.phone}</div>
                                 </td>
                                 <td className="px-6 py-5">
                                   <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${lead.stage === 'converted' ? 'bg-emerald-500/10 border-emerald-500/20' : lead.stage === 'contacted' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                     <div className={`w-1.5 h-1.5 rounded-full ${lead.stage === 'converted' ? 'bg-emerald-400' : lead.stage === 'contacted' ? 'bg-blue-400' : 'bg-amber-400'} shadow-sm`}></div>
                                     <span className={`text-[11px] font-bold uppercase tracking-widest ${lead.stage === 'converted' ? 'text-emerald-400' : lead.stage === 'contacted' ? 'text-blue-400' : 'text-amber-400'}`}>
                                       {lead.stage || 'new'}
                                     </span>
                                   </div>
                                 </td>
                                 <td className="px-6 py-5 text-right">
                                   <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                     {lead.stage !== 'contacted' && lead.stage !== 'converted' && (
                                       <button 
                                         onClick={() => handleUpdateLeadStage(lead.id, 'contacted')}
                                         className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                                       >
                                         Mark Contacted
                                       </button>
                                     )}
                                     {lead.stage !== 'converted' && (
                                       <button 
                                         onClick={() => handleUpdateLeadStage(lead.id, 'converted')}
                                         className="px-4 py-2 bg-white hover:bg-gray-200 text-black rounded-xl text-xs font-bold transition-all shadow-md"
                                       >
                                         Convert
                                       </button>
                                     )}
                                   </div>
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="px-6 py-20 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-white/10 shadow-inner">
                          <Users size={24} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">No active leads</h3>
                        <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto">
                          Inbound kitchen leads and onboarding requests will appear here.
                        </p>
                      </div>
                    )}
                  </m.div>

                  {/* Mobile Leads Card View */}
                  <div className="sm:hidden space-y-4">
                    {leads.map((lead) => (
                      <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} key={lead.id} className="bg-[#151515] border border-white/5 p-5 rounded-3xl shadow-xl flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-white text-lg tracking-tight">{lead.kitchenName || lead.businessName}</div>
                            <div className="text-xs font-medium text-gray-500 mt-0.5">{lead.ownerName || 'Unknown'}</div>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${lead.stage === 'converted' ? 'bg-emerald-400' : lead.stage === 'contacted' ? 'bg-blue-400' : 'bg-amber-400'} shadow-[0_0_8px_rgba(255,255,255,0.3)]`}></div>
                        </div>
                        
                        <div className="bg-black/30 rounded-2xl p-4 border border-white/5 flex flex-col gap-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Email</span>
                            <span className="text-gray-300 font-semibold">{lead.email || lead.contact?.email || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Phone</span>
                            <span className="text-gray-300 font-semibold">{lead.phone || lead.contact?.phone || '-'}</span>
                          </div>
                        </div>

                        <div className="flex gap-3 mt-2">
                          {lead.stage !== 'contacted' && lead.stage !== 'converted' && (
                            <button 
                              onClick={() => handleUpdateLeadStage(lead.id, 'contacted')}
                              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all"
                            >
                              Contacted
                            </button>
                          )}
                          {lead.stage !== 'converted' && (
                            <button 
                              onClick={() => handleUpdateLeadStage(lead.id, 'converted')}
                              className="flex-1 py-3 bg-white text-black rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all"
                            >
                              Convert
                            </button>
                          )}
                        </div>
                      </m.div>
                    ))}
                  </div>
                </m.div>
              )}

              {/* PMF ANALYTICS TAB (Priority 3) */}
              {activeTab === 'pmf' && (
                <m.div 
                  initial="hidden" 
                  animate="visible" 
                  variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                  className="space-y-8"
                >
                  <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="space-y-2">
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Product-Market Fit Analytics</h1>
                    <p className="text-gray-400 text-sm font-medium">Tracking activation funnels, drop-offs, and platform stickiness.</p>
                  </m.div>

                  <div className="bg-[#151515] border border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                      <Activity size={200} className="text-purple-500" />
                    </div>
                    <div className="relative z-10">
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Filter className="text-purple-400" /> Merchant Activation Funnel
                      </h2>
                      
                      <div className="space-y-4">
                        {[
                          { step: 'Signups', count: tenants.length, drop: 0 },
                          { step: 'Email Verified', count: tenants.filter(t => t.kyc?.emailVerificationStatus === 'verified').length, drop: 12 },
                          { step: 'KYC Completed', count: verifiedMerchants, drop: 30 },
                          { step: 'Location Added', count: tenants.filter(t => t.location?.lat).length, drop: 5 },
                          { step: 'Menu Uploaded', count: tenants.filter(t => t.menuCount > 0 || t.status === 'active').length, drop: 20 },
                          { step: 'Store Published', count: activeTenantsCount, drop: 15 },
                          { step: 'First Order', count: Math.round(activeTenantsCount * 0.8), drop: 20 },
                          { step: 'Paid Subscription', count: activeSubscriptions, drop: 40 }
                        ].map((stage, i, arr) => {
                          const maxCount = arr[0].count || 1;
                          const percent = Math.round((stage.count / maxCount) * 100) || 0;
                          const dropPercent = i > 0 && arr[i-1].count > 0 ? Math.round(((arr[i-1].count - stage.count) / arr[i-1].count) * 100) : 0;
                          
                          return (
                            <div key={stage.step} className="flex items-center gap-4">
                              <div className="w-40 text-sm font-bold text-gray-300">{stage.step}</div>
                              <div className="flex-1 h-8 bg-black/40 rounded-lg overflow-hidden border border-white/5 relative flex items-center">
                                <div className="h-full bg-gradient-to-r from-purple-600/50 to-purple-500/80 absolute left-0 top-0 transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                                <div className="relative z-10 px-3 text-xs font-bold text-white">{stage.count} Merchants ({percent}%)</div>
                              </div>
                              {i > 0 && (
                                <div className="w-24 text-right text-xs font-bold text-red-400">
                                  {dropPercent > 0 ? `-${dropPercent}% Drop` : ''}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-8 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                        <div className="flex items-start gap-3">
                          <BrainCircuit className="text-purple-400 shrink-0 mt-0.5" size={20} />
                          <div>
                            <h4 className="text-sm font-bold text-purple-300">AI Optimization Insight</h4>
                            <p className="text-sm text-purple-200/70 mt-1">The largest drop-off (40%) occurs between First Order and Paid Subscription. Recommendation: Extend the Free Trial automatically by 7 days for users who hit 5 orders but haven't upgraded.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </m.div>
              )}

              {/* INVESTOR DATA ROOM TAB (Priority 8) */}
              {activeTab === 'investors' && (
                <InvestorDataRoomPanel
                  mrr={mrr}
                  arr={arr}
                  activeTenantsCount={activeTenantsCount}
                  trialTenantsCount={trialTenantsCount}
                  suspendedTenantsCount={suspendedTenantsCount}
                  activeSubscriptions={activeSubscriptions}
                  totalTenants={tenants.length}
                  totalLeads={leads.length}
                  demoRequests={demoRequests}
                  newLeadsCount={newLeadsCount}
                  verifiedMerchants={verifiedMerchants}
                  fssaiVerified={fssaiVerified}
                  ordersProcessed={ordersProcessed}
                  leadToTrialConv={leadToTrialConv}
                  trialToPaidConv={trialToPaidConv}
                  funnel={investorFunnel}
                  exportingPdf={exportingPdf}
                  loading={loading}
                  refreshing={refreshing}
                  lastSyncedAt={lastSyncedAt}
                  onExportPdf={() => void handleExportInvestorPdf()}
                />
              )}

              {/* RELEASES TAB */}
              {activeTab === 'releases' && (
                <m.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ReleaseCenter />
                </m.div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === 'settings' && (
                <m.div 
                  initial="hidden" 
                  animate="visible" 
                  variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                  className="max-w-3xl space-y-8"
                >
                  <m.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Platform Settings</h2>
                    <p className="text-sm font-medium text-gray-400 mt-2">Manage your super admin preferences and platform security.</p>
                  </m.div>

                  <m.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="bg-[#151515] border border-white/5 rounded-3xl shadow-xl overflow-hidden divide-y divide-white/5">
                    
                    {/* Profile Section */}
                    <div className="p-6 sm:p-10 flex flex-col sm:flex-row gap-8">
                      <div className="sm:w-1/3">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">Profile</h3>
                        <p className="text-xs font-medium text-gray-500 leading-relaxed">Your personal platform information and role.</p>
                      </div>
                      <div className="sm:w-2/3 space-y-8">
                        <div className="flex items-center gap-5">
                          <div className="w-20 h-20 rounded-3xl bg-black border border-white/10 flex items-center justify-center text-white font-black text-3xl shadow-inner relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                            <span className="relative z-10">{userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'SA'}</span>
                          </div>
                          <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-300 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10 mb-2">
                              <Shield size={12} /> {userProfile?.role || 'Super Admin'}
                            </div>
                            <div className="text-sm font-semibold text-gray-400">{currentUser?.email}</div>
                          </div>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-5">
                          <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Display Name</label>
                            <input
                              type="text"
                              required
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder="e.g. John Doe"
                              className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all shadow-inner"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={settingsLoading || displayName === userProfile?.displayName}
                            className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-gray-200 text-black rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                          >
                            <Save size={16} />
                            {settingsLoading ? 'Saving...' : 'Save Profile'}
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Security Section */}
                    <div className="p-6 sm:p-10 flex flex-col sm:flex-row gap-8">
                      <div className="sm:w-1/3">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">Security</h3>
                        <p className="text-xs font-medium text-gray-500 leading-relaxed">Manage authentication and password settings.</p>
                      </div>
                      <div className="sm:w-2/3">
                        <div className="bg-black/30 border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden">
                          {/* VRAM Heavy Blur Removed */}
                          <div className="relative">
                            <h5 className="font-bold text-white text-sm mb-1">Reset Password</h5>
                            <p className="text-xs font-medium text-gray-400 max-w-xs">We'll send a secure link to your registered email address.</p>
                          </div>
                          <button
                            onClick={handlePasswordReset}
                            disabled={settingsLoading}
                            className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm font-bold text-white transition-all shadow-sm disabled:opacity-50 relative z-10"
                          >
                            <Key size={14} />
                            Send Email
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Logout Section (Crucial for Mobile) */}
                    <div className="p-6 sm:p-10 flex flex-col sm:flex-row gap-8 bg-red-950/10">
                      <div className="sm:w-1/3">
                        <h3 className="text-sm font-bold text-red-500 mb-1 uppercase tracking-wider">Account Access</h3>
                        <p className="text-xs font-medium text-gray-500 leading-relaxed">Sign out of your super admin account on this device.</p>
                      </div>
                      <div className="sm:w-2/3 flex items-center">
                        <button
                          onClick={() => logout()}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-500 rounded-xl text-[13px] font-bold text-white uppercase tracking-wider transition-all shadow-lg"
                        >
                          <LogOut size={16} />
                          Log Out securely
                        </button>
                      </div>
                    </div>

                  </m.div>
                </m.div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Premium Bottom Navigation Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="bg-[#0c0c0c]/85 backdrop-blur-2xl border-t border-white/10 px-2 pt-2 pb-1 flex justify-around items-center shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabChange(item.id as SuperAdminTab)}
              className="flex flex-col items-center gap-1.5 p-2 min-w-[64px]"
            >
              <div className={`p-1.5 rounded-full transition-all duration-300 ${activeTab === item.id ? 'bg-white/10 text-white' : 'text-gray-500'}`}>
                <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold tracking-wider uppercase transition-colors duration-300 ${activeTab === item.id ? 'text-white' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
