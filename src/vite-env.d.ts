/// <reference types="vite/client" />
declare module '*.webp';

interface ImportMetaEnv {
  readonly VITE_FF_SDK_ORDERTRACKING_ENABLED?: string;
  readonly VITE_FF_SDK_MYORDERS_ENABLED?: string;
  readonly VITE_FF_SDK_OWNER_ORDERS_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
