import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { setActiveTenantId } from '../services/api';
import { getDb } from '../lib/firebase-db';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  status: 'trialing' | 'active' | 'suspended';
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };
  features?: {
    subscriptionEnabled?: boolean;
  };
  location?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    lat: number;
    lng: number;
  };
  deliveryConfig?: {
    enabled?: boolean;
    freeRadius: number;
    paidRadius: number;
    maxRadius: number;
    perKmCharge: number;
    baseFee: number;
    prepTime: number;
    feesConfigured?: boolean;
    freeDeliveryMinOrder?: number;
  };
  pricingConfig?: {
    gstPercent?: number;
    packingFee?: number;
  };
  onboardingStatus?: {
    isComplete: boolean;
    currentStep: number;
    migrated?: boolean;
    completedAt?: any;
  };
  paymentConfig?: {
    defaultProvider: string;
    providers: Record<string, any>;
  };
  kyc?: any;
  fssai?: any;
  subscription?: any;
  businessType?: string;
  contactPhone?: string;
  contactEmail?: string;
  description?: string;
  logo?: string;
  storeStatus?: string;
  storeOperations?: {
    isStoreOpen?: boolean;
    businessHoursEnabled?: boolean;
    openTime?: string;
    closeTime?: string;
    offlineMessage?: string;
    updatedAt?: any;
  };
  sandboxMode?: boolean;
  legal?: any;
  settings?: any;
  socialLinks?: any;
}

interface TenantContextType {
  tenantId: string;
  tenantSlug: string;
  tenantInfo: TenantInfo | null;
  loading: boolean;
  tenantNotFound: boolean;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: 'mana-inti',
  tenantSlug: '',
  tenantInfo: null,
  loading: true,
  tenantNotFound: false,
  refreshTenant: async () => {},
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, loading: authLoading } = useAuth();
  const ownerTenantId = userProfile?.ownedTenantIds?.[0];

  const [tenantId, setTenantId] = useState<string>('mana-inti');
  const [tenantSlug, setTenantSlug] = useState<string>('');
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    const path = window.location.pathname;
    const isOwnerPanel = path.startsWith('/owner');
    const isStorefront = /^\/k\/[^/]+/.test(path);
    return isOwnerPanel || isStorefront;
  });
  const [tenantNotFound, setTenantNotFound] = useState(false);

  const resolveTenant = useCallback(async () => {
    const path = window.location.pathname;
    const match = path.match(/^\/k\/([^/]+)/);
    const isOwnerPanel = path.startsWith('/owner');
    
    const sessionTenant = sessionStorage.getItem('tenant_preview');
    if (sessionTenant) {
      const data = JSON.parse(sessionTenant) as TenantInfo;
      setTenantId(data.id);
      setActiveTenantId(data.id);
      setTenantSlug(data.slug);
      setTenantInfo(data);
      setLoading(false);
      return;
    }

    let slug = '';
    if (match) {
      slug = match[1];
    } else if (isOwnerPanel) {
      if (authLoading) {
        setLoading(true);
        return;
      }
      if (!ownerTenantId) {
        setTenantId('');
        setTenantSlug('');
        setTenantInfo(null);
        setLoading(false);
        return;
      }
      slug = ownerTenantId;
    }

    if (!slug) {
      setLoading(false);
      return;
    }

    try {
      const docRef = doc(getDb(), 'tenants', slug);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as TenantInfo;
        setTenantId(data.id);
        setActiveTenantId(data.id);
        setTenantSlug(data.slug || data.id);
        setTenantInfo(data);
        sessionStorage.setItem(`tenant_${slug}`, JSON.stringify(data));
      } else {
        const q = query(collection(getDb(), 'tenants'), where('slug', '==', slug), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const docSnapQuery = snapshot.docs[0];
          const data = { id: docSnapQuery.id, ...docSnapQuery.data() } as TenantInfo;
          setTenantId(data.id);
          setActiveTenantId(data.id);
          setTenantSlug(data.slug || data.id);
          setTenantInfo(data);
          sessionStorage.setItem(`tenant_${slug}`, JSON.stringify(data));
        } else {
          setTenantNotFound(true);
        }
      }
    } catch (error) {
      console.error("Failed to resolve tenant slug:", error);
      setTenantNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [ownerTenantId, authLoading]);

  useEffect(() => {
    resolveTenant();
  }, [resolveTenant]);

  return (
    <TenantContext.Provider value={{ tenantId, tenantSlug, tenantInfo, loading, tenantNotFound, refreshTenant: resolveTenant }}>
      {children}
    </TenantContext.Provider>
  );
};
