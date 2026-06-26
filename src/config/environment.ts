/**
 * EnvironmentConfig
 * The absolute SINGLE source of truth for all URLs, domain logic, and environment states.
 * No component may generate URLs manually. No window.location parsing.
 */
export const EnvironmentConfig = {
  // --- Environment State ---
  
  isProduction(): boolean {
    return import.meta.env.PROD || import.meta.env.VITE_APP_ENV === 'production';
  },

  isPreview(): boolean {
    return import.meta.env.VITE_APP_ENV === 'preview';
  },

  isDevelopment(): boolean {
    return import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development' || (!import.meta.env.PROD && !import.meta.env.VITE_APP_ENV);
  },

  isBhojanOSRoot(): boolean {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname.toLowerCase();
    return hostname === 'bhojanos.com' || 
           hostname === 'www.bhojanos.com' || 
           hostname.includes('bhojanos.vercel.app') || 
           hostname.includes('bhojanos.web.app') ||
           hostname.includes('bhojanos2.web.app') ||
           hostname.includes('firebaseapp.com') ||
           hostname === 'localhost' || 
           hostname === '127.0.0.1';
  },

  isTenantStorefrontPath(pathname?: string): boolean {
    const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
    return /^\/k\/[^/]+(?:\/|$)/.test(path);
  },

  // --- URL Builders ---

  /**
   * Returns the canonical base URL of the application.
   */
  getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }

    if (this.isProduction()) {
      return 'https://bhojanos.com';
    }
    
    if (this.isPreview()) {
      return 'https://bhojanos.vercel.app';
    }
    
    return 'http://localhost:8080';
  },

  /**
   * Returns the backend API URL.
   */
  getApiUrl(): string {
    if (this.isProduction()) {
      return import.meta.env.VITE_API_URL || 'https://api.bhojanos.com';
    }
    
    if (this.isPreview()) {
      return import.meta.env.VITE_API_URL || 'https://preview-api.bhojanos.com';
    }
    
    return import.meta.env.VITE_API_URL || 'https://manaintibojanam-backend.onrender.com';
  },

  getStorefrontUrl(slug: string): string {
    return `${this.getBaseUrl()}/k/${slug}`;
  },

  getOwnerUrl(): string {
    return `${this.getBaseUrl()}/owner`;
  },

  getCustomerUrl(): string {
    // Usually the root or specific customer portal
    return this.getBaseUrl();
  },

  getAdminUrl(): string {
    return `${this.getBaseUrl()}/super-admin`;
  },

  getAssetsUrl(): string {
    return `${this.getBaseUrl()}/assets`;
  },

  getSupportEmail(): string {
    return 'bhojanos26@gmail.com';
  },

  // --- Legacy / Existing Builders ---
  getOrderUrl(orderId: string): string {
    return `${this.getBaseUrl()}/order/${orderId}`;
  },

  getInvoiceUrl(orderId: string): string {
    return `${this.getBaseUrl()}/order/${orderId}`; 
  },

  getReferralUrl(code: string): string {
    return `${this.getBaseUrl()}?ref=${code}`;
  },

  getCheckoutUrl(slug: string): string {
    return `${this.getBaseUrl()}/k/${slug}/checkout`;
  },

  getPrivacyPolicyUrl(): string {
    return `${this.getBaseUrl()}/privacy-policy`;
  },

  getTermsUrl(): string {
    return `${this.getBaseUrl()}/terms`;
  },

  getWhatsAppShareUrl(slug: string): string {
    return `${this.getBaseUrl()}/k/${slug}`;
  },

  getQRCodeUrl(slug: string): string {
    return `${this.getBaseUrl()}/k/${slug}`;
  }
};
