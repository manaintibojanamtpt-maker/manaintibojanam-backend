import { hydrateFirebaseConfig } from './clientConfig';
import { loadAppConfig, type AppConfig } from './environment';
import { validateAppConfig } from './validation';

let cached: AppConfig | null = null;

export async function ensureAppConfig(): Promise<AppConfig> {
  if (!cached) {
    cached = await hydrateFirebaseConfig(loadAppConfig());
    validateAppConfig(cached);
  }
  return cached;
}

export function getAppConfig(): AppConfig {
  if (!cached) {
    cached = loadAppConfig();
    validateAppConfig(cached);
  }
  return cached;
}

export function resetAppConfigForTests(): void {
  cached = null;
}
