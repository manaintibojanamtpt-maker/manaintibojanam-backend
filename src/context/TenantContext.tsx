import React, { createContext, useContext, useEffect, useState } from 'react';
import { setActiveTenantId } from '../services/api';
import { getDb } from '../lib/firebase-db';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';

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
}

interface TenantContextType {
  tenantId: string;
  tenantSlug: string;
  tenantInfo: TenantInfo | null;
  loading: boolean;
  tenantNotFound: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: 'mana-inti',
  tenantSlug: '',
  tenantInfo: null,
  loading: true,
  tenantNotFound: false,
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantId, setTenantId] = useState<string>('mana-inti');
  const [tenantSlug, setTenantSlug] = useState<string>('');
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantNotFound, setTenantNotFound] = useState(false);

  useEffect(() => {
    const resolveTenant = async () => {
      const path = window.location.pathname;
      const match = path.match(/^\/k\/([^/]+)/);
      const slug = match ? match[1] : null;

      if (!slug) {
        // Default to mana-inti
        try {
          const cached = sessionStorage.getItem('tenant_mana-inti');
          if (cached) {
            const data = JSON.parse(cached);
            setTenantId(data.id);
            setActiveTenantId(data.id);
            setTenantSlug('');
            setTenantInfo(data);
            setLoading(false);
            return;
          }
          const tDoc = await getDoc(doc(getDb(), 'tenants', 'mana-inti'));
          if (tDoc.exists()) {
            const data = { id: tDoc.id, ...tDoc.data() } as TenantInfo;
            setTenantId(data.id);
            setActiveTenantId(data.id);
            setTenantSlug('');
            setTenantInfo(data);
            sessionStorage.setItem('tenant_mana-inti', JSON.stringify(data));
          }
        } catch(e) {
          console.error("Error fetching default tenant", e);
        }
        setLoading(false);
        return;
      }

      // Resolve by slug
      const cached = sessionStorage.getItem(`tenant_${slug}`);
      if (cached) {
        const data = JSON.parse(cached);
        setTenantId(data.id);
        setActiveTenantId(data.id);
        setTenantSlug(slug);
        setTenantInfo(data);
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
            // Not found, trigger 404
            setTenantNotFound(true);
          }
        }
      } catch (error) {
        console.error("Failed to resolve tenant slug:", error);
        setTenantNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    resolveTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenantId, tenantSlug, tenantInfo, loading, tenantNotFound }}>
      {children}
    </TenantContext.Provider>
  );
};
