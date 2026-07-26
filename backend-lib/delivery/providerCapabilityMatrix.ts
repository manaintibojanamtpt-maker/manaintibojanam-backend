/**
 * Provider capability matrix for BhojanOS multi-tenant delivery integrations.
 * Secrets never appear here — only public capabilities + onboarding strategy.
 */

export type DeliveryProviderId = 'porter' | 'uber_direct' | 'rapido' | 'self_pickup';

export type DeliveryConnectionType =
  | 'oauth'
  | 'hosted_onboarding'
  | 'api_credentials'
  | 'manual_only';

export type DeliveryCapability =
  | 'quote'
  | 'create_dispatch'
  | 'tracking'
  | 'cancel'
  | 'webhook';

export type ProviderIntegrationMaturity =
  | 'production_ready_scaffold'
  | 'partner_access_required'
  | 'manual_fallback_only'
  | 'native_no_external';

export interface DeliveryProviderCapabilityRow {
  readonly id: DeliveryProviderId;
  readonly displayName: string;
  readonly connectionType: DeliveryConnectionType;
  readonly maturity: ProviderIntegrationMaturity;
  readonly capabilities: readonly DeliveryCapability[];
  readonly docsUrl?: string;
  readonly externalAccessNote: string;
  readonly requiredCredentialFields: readonly string[];
}

export const DELIVERY_PROVIDER_CAPABILITY_MATRIX: readonly DeliveryProviderCapabilityRow[] = [
  {
    id: 'uber_direct',
    displayName: 'Uber Direct',
    connectionType: 'api_credentials',
    maturity: 'production_ready_scaffold',
    capabilities: ['quote', 'create_dispatch', 'tracking', 'cancel', 'webhook'],
    docsUrl: 'https://developer.uber.com/docs/deliveries/get-started',
    externalAccessNote:
      'Merchant creates Uber Direct account at https://direct.uber.com, then pastes Customer ID + Client ID + Client Secret. Server exchanges client_credentials for eats.deliveries scope.',
    requiredCredentialFields: ['customerId', 'clientId', 'clientSecret'],
  },
  {
    id: 'porter',
    displayName: 'Porter',
    connectionType: 'api_credentials',
    maturity: 'partner_access_required',
    capabilities: ['quote', 'create_dispatch', 'tracking', 'cancel', 'webhook'],
    externalAccessNote:
      'Porter enterprise/API docs are gated. Scaffold accepts API key + merchant account ref; live booking blocked until Porter partner credentials are provisioned.',
    requiredCredentialFields: ['apiKey', 'merchantAccountId'],
  },
  {
    id: 'rapido',
    displayName: 'Rapido',
    connectionType: 'manual_only',
    maturity: 'manual_fallback_only',
    capabilities: ['tracking'],
    externalAccessNote:
      'No public merchant delivery onboarding docs found. Manual tracking-link dispatch only; connection scaffold reserved for future partner onboarding.',
    requiredCredentialFields: [],
  },
  {
    id: 'self_pickup',
    displayName: 'Self Pickup',
    connectionType: 'manual_only',
    maturity: 'native_no_external',
    capabilities: [],
    externalAccessNote: 'No external provider connection required.',
    requiredCredentialFields: [],
  },
] as const;

export function getProviderCapabilityRow(
  provider: DeliveryProviderId,
): DeliveryProviderCapabilityRow | undefined {
  return DELIVERY_PROVIDER_CAPABILITY_MATRIX.find((row) => row.id === provider);
}

export function listConnectableProviders(): readonly DeliveryProviderCapabilityRow[] {
  return DELIVERY_PROVIDER_CAPABILITY_MATRIX.filter((row) => row.id !== 'self_pickup');
}
