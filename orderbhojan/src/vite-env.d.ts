/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string;
  readonly VITE_MARKETPLACE_API_URL?: string;
  readonly VITE_MARKETPLACE_API_VERSION?: string;
  readonly VITE_MSW_ENABLED?: string;
  readonly VITE_ANALYTICS_ENABLED?: string;
  readonly VITE_APP_CHECK_ENABLED?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  readonly VITE_API_RETRY_ATTEMPTS?: string;
  readonly VITE_API_RETRY_DELAY_MS?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_FF_OB_DISCOVERY?: string;
  readonly VITE_FF_OB_SEARCH?: string;
  readonly VITE_FF_OB_RESTAURANT?: string;
  readonly VITE_FF_OB_MENU?: string;
  readonly VITE_FF_OB_CONTRACT_V1?: string;
  readonly VITE_FF_OB_FIRESTORE?: string;
  readonly VITE_MARKETPLACE_API_PROXY?: string;
  readonly VITE_FF_OB_TRACKING?: string;
  readonly VITE_FF_OB_NOTIFICATIONS?: string;
  readonly VITE_FF_OB_PAYMENTS?: string;
  readonly VITE_FF_OB_PROMOTIONS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
