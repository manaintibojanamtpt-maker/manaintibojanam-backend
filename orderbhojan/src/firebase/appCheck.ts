import { getAppConfig } from '@/config';

export interface AppCheckPort {
  getToken(): Promise<string | null>;
}

export function createAppCheckPort(): AppCheckPort {
  return {
    async getToken() {
      const config = getAppConfig();
      if (!config.features.appCheckEnabled) {
        return null;
      }
      // M13: wire Firebase App Check
      return null;
    },
  };
}
