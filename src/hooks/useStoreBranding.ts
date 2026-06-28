import { useMemo } from 'react';
import { useTenant } from '../context/TenantContext';
import { formatTenantPickupAddress } from '../lib/tenantCheckoutConfig';

export interface StoreBranding {
  brandName: string;
  assistantName: string;
  logoUrl: string;
  cuisineLabel: string;
  heroDescription: string;
  promiseLabel: string;
  subscriptionLabel: string;
  supportEmail: string | null;
  supportPhone: string | null;
  supportLocation: string | null;
  fssaiNumber: string | null;
  isDefaultStorefront: boolean;
}

export function useStoreBranding(): StoreBranding {
  const { tenantId, tenantSlug, tenantInfo } = useTenant();

  return useMemo(() => {
    const isDefaultStorefront = !tenantSlug && (!tenantId || tenantId === 'mana-inti');
    const brandName = tenantInfo?.name || 'BhojanOS';

    if (isDefaultStorefront) {
      return {
        brandName,
        assistantName: 'Mana Inti Concierge',
        logoUrl: tenantInfo?.branding?.logoUrl || '/logo-v20-final.png',
        cuisineLabel: 'Authentic Andhra Home Kitchen',
        heroDescription: 'Experience the soul of Telugu cuisine, prepared with love and zero preservatives.',
        promiseLabel: 'Mana Inti Promise',
        subscriptionLabel: 'Monthly Meal Subscription',
        supportEmail: 'manaintibojanamtpt@gmail.com',
        supportPhone: '+91 76662 58454',
        supportLocation: 'Pari Residency, Manjari Bk, Pune, Maharashtra 412307',
        fssaiNumber: '20125260000219',
        isDefaultStorefront,
      };
    }

    return {
      brandName,
      assistantName: `${brandName} Concierge`,
      logoUrl: tenantInfo?.branding?.logoUrl || '/logo-v20-final.png',
      cuisineLabel: 'Direct Ordering Storefront',
      heroDescription: `Order directly from ${brandName}. Freshly prepared food, repeat-friendly ordering, and a smoother local experience.`,
      promiseLabel: `${brandName} Promise`,
      subscriptionLabel: `${brandName} Meal Subscription`,
      supportEmail: tenantInfo?.contactEmail || tenantInfo?.kyc?.email || null,
      supportPhone: tenantInfo?.contactPhone || tenantInfo?.kyc?.mobileNumber || null,
      supportLocation: formatTenantPickupAddress(tenantInfo?.location),
      fssaiNumber: tenantInfo?.fssai?.licenseNumber || tenantInfo?.fssai?.number || null,
      isDefaultStorefront,
    };
  }, [tenantId, tenantSlug, tenantInfo]);
}
