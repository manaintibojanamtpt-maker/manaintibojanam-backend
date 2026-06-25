/**
 * EnvironmentConfig
 * The absolute SINGLE source of truth for all URLs, domain logic, and environment states.
 * No component may generate URLs manually. No window.location parsing.
 */
export const EnvironmentConfig = {
  // --- Environment State ---
  
  isProduction(): boolean {
    return import.meta.env.VITE_APP_ENV === 'production';
  },

  isPreview(): boolean {
    return import.meta.env.VITE_APP_ENV === 'preview';
  },

  isDevelopment(): boolean {
    return import.meta.env.VITE_APP_ENV === 'development' || !import.meta.env.VITE_APP_ENV;
  },

  isBhojanOSRoot(): boolean {
    if (this.isProduction()) return true; // Assuming production always runs on root domain for the main app
    if (this.isPreview()) return true; // Preview is also root
    // In development, we might be testing locally
    return typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  },

  // --- URL Builders ---

  /**
   * Returns the canonical base URL of the application.
   */
  getBaseUrl(): string {
    if (this.isProduction()) {
      return 'https://bhojanos.com';
    }
    
    if (this.isPreview()) {
      return 'https://bhojanos.vercel.app';
    }
    
    // Development fallback
    return 'http://localhost:5173';
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
