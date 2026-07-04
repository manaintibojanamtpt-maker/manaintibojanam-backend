import type { AppConfig } from './environment';

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export function validateAppConfig(config: AppConfig): void {
  const errors: string[] = [];

  if (!config.marketplaceApiBaseUrl.startsWith('http')) {
    errors.push('marketplaceApiBaseUrl must be an absolute URL');
  }

  if (!config.marketplaceApiVersion) {
    errors.push('marketplaceApiVersion is required');
  }

  if (config.api.timeoutMs < 1000 || config.api.timeoutMs > 120_000) {
    errors.push('api.timeoutMs must be between 1000 and 120000');
  }

  if (config.environment === 'production') {
    const requiredFirebase = [
      'apiKey',
      'authDomain',
      'projectId',
      'appId',
    ] as const;

    for (const key of requiredFirebase) {
      if (!config.firebase[key]) {
        errors.push(`firebase.${key} is required in production`);
      }
    }
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors.join('; '));
  }
}
