/**
 * BhojanOS SDK — shared constants (versioning and module identifiers).
 */

export const SDK_VERSION = '0.1.0-scaffold' as const;

export const SDK_MODULE = {
  ORDERS: 'orders',
  MENU: 'menu',
  CUSTOMERS: 'customers',
  BRANCH: 'branch',
  INVENTORY: 'inventory',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
  LOCATION: 'location',
  REFERENCE: 'reference',
  DISCOVERY: 'discovery',
  AI: 'ai',
  WORKFLOW: 'workflow',
} as const;

export type SdkModuleId = (typeof SDK_MODULE)[keyof typeof SDK_MODULE];
