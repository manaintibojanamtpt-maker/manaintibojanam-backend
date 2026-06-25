export const EnvironmentConfig = {
  /**
   * Returns the canonical base URL of the application.
   * Uses VITE_APP_ENV to determine the environment.
   */
  getBaseUrl(): string {
    const env = import.meta.env.VITE_APP_ENV;
    
    if (env === 'production') {
      return 'https://bhojanos.com';
    }
    
    if (env === 'preview') {
      return 'https://bhojanos.vercel.app';
    }
    
    // Development fallback
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  },

  /**
   * Returns the backend API URL.
   */
  getApiUrl(): string {
    const env = import.meta.env.VITE_APP_ENV;
    
    if (env === 'production') {
      return import.meta.env.VITE_API_URL || 'https://api.bhojanos.com'; // Future-proof API domain
    }
    
    if (env === 'preview') {
      return import.meta.env.VITE_API_URL || 'https://preview-api.bhojanos.com';
    }
    
    return import.meta.env.VITE_API_URL || 'https://manaintibojanam-backend.onrender.com';
  },

  // --- URL Builders ---

  getStorefrontUrl(slug: string): string {
    // Future-ready for subdomains: `https://${slug}.bhojanos.com`
    return `${this.getBaseUrl()}/k/${slug}`;
  },

  getOrderUrl(orderId: string): string {
    return `${this.getBaseUrl()}/order/${orderId}`;
  },

  getInvoiceUrl(orderId: string): string {
    return `${this.getBaseUrl()}/order/${orderId}`; // Currently same as order URL
  },

  getReferralUrl(code: string): string {
    return `${this.getBaseUrl()}?ref=${code}`;
  },

  getCheckoutUrl(slug: string): string {
    return `${this.getBaseUrl()}/k/${slug}/checkout`;
  },

  getMerchantDashboardUrl(): string {
    return `${this.getBaseUrl()}/owner`;
  },

  getAdminDashboardUrl(): string {
    return `${this.getBaseUrl()}/super-admin`;
  },

  getSupportEmail(): string {
    return 'bhojanos26@gmail.com'; // Standardized in previous sprint
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
