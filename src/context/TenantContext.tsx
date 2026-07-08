import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { setActiveTenantId } from '../services/api';
import { ensureFirestoreNetwork, getDb, getDoc, getDocs } from '../lib/firebase-db';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import {
  parseStorefrontSlug,
  readValidatedCachedTenant,
  writeCachedTenant,
  fetchValidatedCachedTenant,
} from '../lib/tenantPath';
import { applyTenantPwaManifest } from '../lib/tenantPwaManifest';
import { FOUNDER_TENANT_ID, isFounderOwnerEmail } from '../config/founder';
import { resolvePreferredOwnerTenantId } from '../lib/ownerActiveTenant';

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
    geohash?: string;
    stateCode?: string;
    districtCode?: string;
    districtName?: string;
    cityCode?: string;
    localityCode?: string;
    localityName?: string;
    referenceStateId?: string;
    referenceDistrictId?: string;
    referenceCityId?: string;
    referenceLocalityId?: string;
    landmark?: string;
    formattedAddress?: string;
    addressModel?: 'legacy' | 'india_structured';
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
  tenantError: string | null;
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
  tenantError: null,
  refreshTenant: async () => {},
});

const TenantLoadError: React.FC<{ message: string; onRetry: () => void; retrying: boolean }> = ({
  message,
  onRetry,
  retrying,
}) => (
  <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-brand-bg p-6 text-center dark:bg-dark-bg">
    <div className="max-w-sm rounded-3xl border border-white/10 bg-black/40 p-8">
      <h1 className="mb-3 text-xl font-bold text-white">Could not load store</h1>
      <p className="mb-6 text-sm leading-relaxed text-white/60">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="btn-orange inline-flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  </div>
);

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, loading: authLoading } = useAuth();
  const rawOwnerTenantId = resolvePreferredOwnerTenantId(userProfile?.ownedTenantIds, userProfile?.email);
  const ownerTenantId =
    rawOwnerTenantId &&
    (rawOwnerTenantId !== FOUNDER_TENANT_ID || isFounderOwnerEmail(userProfile?.email))
      ? rawOwnerTenantId
      : resolvePreferredOwnerTenantId(userProfile?.ownedTenantIds, userProfile?.email);

  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const initialStoreSlug = parseStorefrontSlug(initialPath);
  const initialCached = initialStoreSlug ? readValidatedCachedTenant(initialStoreSlug) : null;

  const [tenantId, setTenantId] = useState<string>(() => initialCached?.id || initialStoreSlug || '');
  const [tenantSlug, setTenantSlug] = useState<string>(() => initialCached?.slug || initialStoreSlug || '');
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(() => initialCached);
  const [loading, setLoading] = useState(() => needsTenantResolution(initialPath) && !initialCached);
  const [tenantNotFound, setTenantNotFound] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (tenantInfo?.name && typeof document !== 'undefined') {
      const path = window.location.pathname;
      if (/^\/k\/[^/]+/.test(path)) {
        document.title = `${tenantInfo.name} | Order Online`;
      }
    }
  }, [tenantInfo?.name]);

  useEffect(() => {
    if (typeof window === 'undefined' || !tenantInfo) return;
    const path = window.location.pathname;
    if (!/^\/k\/[^/]+/.test(path)) return;

    const slug = tenantSlug || tenantInfo.slug || tenantInfo.id;
    return applyTenantPwaManifest({
      name: tenantInfo.name || slug,
      slug,
      themeColor: tenantInfo.branding?.primaryColor || '#1A0505',
      iconUrl: tenantInfo.branding?.logoUrl || tenantInfo.logo,
    });
  }, [tenantInfo, tenantSlug]);

  useEffect(() => {
    if (tenantId) setActiveTenantId(tenantId);
  }, [tenantId]);

  const resolveTenant = useCallback(async () => {
    const path = window.location.pathname;
    const storefrontSlug = parseStorefrontSlug(path);
    const isOwnerPanel = path.startsWith('/owner');

    const sessionTenant = sessionStorage.getItem('tenant_preview');
    if (sessionTenant && !isOwnerPanel) {
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
      const cached = readValidatedCachedTenant(storefrontSlug);
      if (cached) {
        applyTenantState(cached, { setTenantId, setTenantSlug, setTenantInfo });
      } else {
        setTenantId(storefrontSlug);
        setTenantSlug(storefrontSlug);
        setActiveTenantId(storefrontSlug);
        setTenantInfo(null);
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
    setTenantError(null);

    try {
      const networkReady = await ensureFirestoreNetwork();
      if (!networkReady) {
        const cacheKey = storefrontSlug || (isOwnerPanel ? ownerTenantId : '');
        const validatedCache = cacheKey ? readValidatedCachedTenant(cacheKey) : null;

        if (validatedCache) {
          applyTenantState(validatedCache, { setTenantId, setTenantSlug, setTenantInfo });
          setTenantError(null);
        } else {
          setTenantError(
            'Unable to connect to the store directory. Check your network and try again.',
          );
          if (!storefrontSlug && isOwnerPanel) {
            setTenantInfo(null);
            setTenantId('');
            setTenantSlug('');
          }
        }
        return;
      }

      const loadTenant = async (): Promise<TenantInfo | null> => {
        const docRef = doc(getDb(), 'tenants', lookupKey);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as TenantInfo;
        }

        const q = query(collection(getDb(), 'tenants'), where('slug', '==', lookupKey), limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docSnapQuery = snapshot.docs[0];
          return { id: docSnapQuery.id, ...docSnapQuery.data() } as TenantInfo;
        }

        return null;
      };

      const data = await fetchValidatedCachedTenant(lookupKey, loadTenant);

      if (data) {
        applyTenantState(data, { setTenantId, setTenantSlug, setTenantInfo }, lookupKey);
      } else if (storefrontSlug) {
        setTenantNotFound(true);
        setTenantInfo(null);
      } else if (isOwnerPanel) {
        setTenantError('Your restaurant profile could not be found. Check your connection and try again.');
        setTenantInfo(null);
      }
    } catch (error) {
      console.error('Failed to resolve tenant slug:', error);
      const cacheKey = storefrontSlug || (isOwnerPanel ? ownerTenantId : '');
      const validatedCache = cacheKey ? readValidatedCachedTenant(cacheKey) : null;

      if (validatedCache) {
        applyTenantState(validatedCache, { setTenantId, setTenantSlug, setTenantInfo });
        setTenantError(null);
      } else {
        setTenantError(
          'Unable to reach the store directory. Check your connection and try again.',
        );
        if (!storefrontSlug && isOwnerPanel) {
          setTenantInfo(null);
          setTenantId('');
          setTenantSlug('');
        } else if (storefrontSlug) {
          setTenantNotFound(false);
        }
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [ownerTenantId, authLoading]);

  const refreshTenant = useCallback(async () => {
    setRetrying(true);
    await resolveTenant();
  }, [resolveTenant]);

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
      tenantError,
      refreshTenant,
    }),
    [tenantId, tenantSlug, tenantInfo, loading, tenantNotFound, tenantError, refreshTenant],
  );

  const showTenantError = tenantError && !tenantInfo && !loading;

  return (
    <TenantContext.Provider value={value}>
      {showTenantError ? (
        <TenantLoadError
          message={tenantError}
          onRetry={() => void refreshTenant()}
          retrying={retrying}
        />
      ) : (
        children
      )}
    </TenantContext.Provider>
  );
};
