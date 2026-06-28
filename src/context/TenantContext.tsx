import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { setActiveTenantId } from '../services/api';
import { getDb } from '../lib/firebase-db';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import {
  parseStorefrontSlug,
  readCachedTenant,
  writeCachedTenant,
} from '../lib/tenantPath';

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

function needsTenantResolution(pathname: string): boolean {
  return pathname.startsWith('/owner') || /^\/k\/[^/]+/.test(pathname);
}

function applyTenantState(
  data: TenantInfo,
  setters: {
    setTenantId: (id: string) => void;
    setTenantSlug: (slug: string) => void;
    setTenantInfo: (info: TenantInfo | null) => void;
  },
  cacheKey?: string,
) {
  setters.setTenantId(data.id);
  setActiveTenantId(data.id);
  setters.setTenantSlug(data.slug || data.id);
  setters.setTenantInfo(data);
  if (cacheKey) writeCachedTenant(cacheKey, data);
}

const TenantContext = createContext<TenantContextType>({
  tenantId: '',
  tenantSlug: '',
  tenantInfo: null,
  loading: false,
  tenantNotFound: false,
  refreshTenant: async () => {},
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, loading: authLoading } = useAuth();
  const ownerTenantId = userProfile?.ownedTenantIds?.[0];

  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const initialStoreSlug = parseStorefrontSlug(initialPath);
  const initialCached = initialStoreSlug ? readCachedTenant(initialStoreSlug) : null;

  const [tenantId, setTenantId] = useState<string>(() => initialCached?.id || initialStoreSlug || '');
  const [tenantSlug, setTenantSlug] = useState<string>(() => initialCached?.slug || initialStoreSlug || '');
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(() => initialCached);
  const [loading, setLoading] = useState(() => needsTenantResolution(initialPath) && !initialCached);
  const [tenantNotFound, setTenantNotFound] = useState(false);

  useEffect(() => {
    if (tenantInfo?.name && typeof document !== 'undefined') {
      const path = window.location.pathname;
      if (/^\/k\/[^/]+/.test(path)) {
        document.title = `${tenantInfo.name} | Order Online`;
      }
    }
  }, [tenantInfo?.name]);

  useEffect(() => {
    if (tenantId) setActiveTenantId(tenantId);
  }, [tenantId]);

  const resolveTenant = useCallback(async () => {
    const path = window.location.pathname;
    const storefrontSlug = parseStorefrontSlug(path);
    const isOwnerPanel = path.startsWith('/owner');

    const sessionTenant = sessionStorage.getItem('tenant_preview');
    if (sessionTenant) {
      try {
        const data = JSON.parse(sessionTenant) as TenantInfo;
        applyTenantState(data, { setTenantId, setTenantSlug, setTenantInfo });
        setTenantNotFound(false);
        setLoading(false);
        return;
      } catch {
        sessionStorage.removeItem('tenant_preview');
      }
    }

    if (storefrontSlug) {
      const cached = readCachedTenant(storefrontSlug);
      if (cached) {
        applyTenantState(cached, { setTenantId, setTenantSlug, setTenantInfo });
      } else {
        setTenantId(storefrontSlug);
        setTenantSlug(storefrontSlug);
        setActiveTenantId(storefrontSlug);
      }
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
    } else {
      setLoading(false);
      return;
    }

    const lookupKey = storefrontSlug || (isOwnerPanel ? ownerTenantId : '');
    if (!lookupKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setTenantNotFound(false);

    try {
      const docRef = doc(getDb(), 'tenants', lookupKey);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as TenantInfo;
        applyTenantState(data, { setTenantId, setTenantSlug, setTenantInfo }, lookupKey);
      } else {
        const q = query(collection(getDb(), 'tenants'), where('slug', '==', lookupKey), limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docSnapQuery = snapshot.docs[0];
          const data = { id: docSnapQuery.id, ...docSnapQuery.data() } as TenantInfo;
          applyTenantState(data, { setTenantId, setTenantSlug, setTenantInfo }, lookupKey);
        } else if (storefrontSlug) {
          setTenantNotFound(true);
        }
      }
    } catch (error) {
      console.error('Failed to resolve tenant slug:', error);
      if (storefrontSlug && !readCachedTenant(storefrontSlug)) {
        setTenantNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [ownerTenantId, authLoading]);

  useEffect(() => {
    void resolveTenant();
  }, [resolveTenant]);

  const value = useMemo(
    () => ({
      tenantId,
      tenantSlug,
      tenantInfo,
      loading,
      tenantNotFound,
      refreshTenant: resolveTenant,
    }),
    [tenantId, tenantSlug, tenantInfo, loading, tenantNotFound, resolveTenant],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};
