/**
 * Uber Direct live-readiness checks (server-side).
 * Does not enable live dispatch — UBER_DIRECT_LIVE remains the hard gate.
 */

export type UberDirectReadinessLevel =
  | 'not_configured'
  | 'scaffold_ready'
  | 'live_ready'
  | 'blocked';

export type UberDirectReadinessReport = {
  readonly provider: 'uber_direct';
  readonly level: UberDirectReadinessLevel;
  readonly liveFlagEnabled: boolean;
  readonly secretKeyConfigured: boolean;
  readonly merchantConnectionOk: boolean;
  readonly requiredCredentialFields: readonly string[];
  readonly missing: readonly string[];
  readonly warnings: readonly string[];
  readonly merchantMessage: string;
  readonly canLiveDispatch: boolean;
};

function isTruthyEnv(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

export function isUberDirectLiveEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isTruthyEnv(env.UBER_DIRECT_LIVE);
}

export function isDeliverySecretKeyConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const key =
    env.DELIVERY_INTEGRATION_SECRET_KEY?.trim() ||
    env.INTEGRATION_SECRET_KEY?.trim();
  return Boolean(key && key.length >= 16);
}

export function evaluateUberDirectReadiness(input: {
  readonly env?: NodeJS.ProcessEnv;
  readonly connectionStatus?: string | null;
  readonly hasSecretRef?: boolean;
  readonly merchantAccountId?: string | null;
  readonly errorMessage?: string | null;
}): UberDirectReadinessReport {
  const env = input.env ?? process.env;
  const liveFlagEnabled = isUberDirectLiveEnabled(env);
  const secretKeyConfigured = isDeliverySecretKeyConfigured(env);
  const requiredCredentialFields = ['customerId', 'clientId', 'clientSecret'] as const;
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!secretKeyConfigured) {
    missing.push('DELIVERY_INTEGRATION_SECRET_KEY');
  }
  if (!liveFlagEnabled) {
    warnings.push(
      'UBER_DIRECT_LIVE is off — credentials can be stored/tested for shape, but live quote/dispatch stay blocked.',
    );
  }

  const connected =
    input.connectionStatus === 'connected' || input.connectionStatus === 'pending';
  const merchantConnectionOk =
    connected && input.hasSecretRef === true && !input.errorMessage;

  if (!input.hasSecretRef) {
    missing.push('merchant_uber_credentials');
  }
  if (input.errorMessage) {
    warnings.push(input.errorMessage);
  }
  if (connected && !input.merchantAccountId) {
    warnings.push('Customer ID (merchant account) missing from connection metadata.');
  }

  let level: UberDirectReadinessLevel = 'not_configured';
  if (merchantConnectionOk && secretKeyConfigured && liveFlagEnabled) {
    level = 'live_ready';
  } else if (merchantConnectionOk && secretKeyConfigured) {
    level = 'scaffold_ready';
  } else if (input.errorMessage) {
    level = 'blocked';
  }

  const canLiveDispatch = level === 'live_ready';

  let merchantMessage: string;
  if (level === 'live_ready') {
    merchantMessage =
      'Uber Direct looks ready for live dispatch on this kitchen (server live flag + connected account).';
  } else if (level === 'scaffold_ready') {
    merchantMessage =
      'Uber account connected. Live auto-booking stays off until the platform enables UBER_DIRECT_LIVE. You can still paste a tracking link on Dispatch.';
  } else if (!input.hasSecretRef) {
    merchantMessage =
      'Connect your Uber Direct Customer ID, Client ID, and Client Secret to prepare this kitchen. Secrets stay encrypted on the server.';
  } else {
    merchantMessage =
      input.errorMessage ||
      'Uber Direct is not ready yet. Fix the connection errors above, or use manual tracking for now.';
  }

  return {
    provider: 'uber_direct',
    level,
    liveFlagEnabled,
    secretKeyConfigured,
    merchantConnectionOk,
    requiredCredentialFields,
    missing,
    warnings,
    merchantMessage,
    canLiveDispatch,
  };
}

/** Map Uber/network errors into merchant-actionable copy (never includes secrets). */
export function mapUberDirectErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'Unknown Uber error');
  if (/OAuth failed \(401\)/i.test(raw) || /invalid_client/i.test(raw)) {
    return 'Uber rejected these credentials. Re-check Client ID and Client Secret in your Uber Direct dashboard.';
  }
  if (/OAuth failed \(403\)/i.test(raw)) {
    return 'Uber denied access. Confirm the Direct account is approved for deliveries and uses scope eats.deliveries.';
  }
  if (/quote failed \(404\)/i.test(raw) || /customers\//i.test(raw) && /404/.test(raw)) {
    return 'Uber Customer ID looks wrong or the Direct account is not provisioned for this region.';
  }
  if (/quote failed|create delivery failed/i.test(raw)) {
    return `Uber API error: ${raw}. Try Test connection again, or dispatch with a manual tracking link.`;
  }
  if (/missing access_token/i.test(raw)) {
    return 'Uber OAuth succeeded without an access token — contact Uber Direct support or reconnect credentials.';
  }
  return raw.length > 180 ? `${raw.slice(0, 177)}…` : raw;
}
