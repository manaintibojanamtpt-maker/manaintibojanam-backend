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
    lat: number;
    lng: number;
  };
  deliveryConfig?: {
    freeRadius: number;
    paidRadius: number;
    maxRadius: number;
    perKmCharge: number;
    baseFee: number;
    prepTime: number;
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
  legal?: any;
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
  const { userProfile } = useAuth();
  const ownerTenantId = userProfile?.ownedTenantIds?.[0];

  const [tenantId, setTenantId] = useState<string>('mana-inti');
  const [tenantSlug, setTenantSlug] = useState<string>('');
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
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
      slug = ownerTenantId || 'mana-inti';
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
        setTenantSlug(slug);
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
          setTenantSlug(slug);
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
  }, [ownerTenantId]);

  useEffect(() => {
    resolveTenant();
  }, [resolveTenant]);

  return (
    <TenantContext.Provider value={{ tenantId, tenantSlug, tenantInfo, loading, tenantNotFound, refreshTenant: resolveTenant }}>
      {children}
    </TenantContext.Provider>
  );
};
