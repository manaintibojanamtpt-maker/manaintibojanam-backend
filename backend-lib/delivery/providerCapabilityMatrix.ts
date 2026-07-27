/**
 * Provider capability matrix for BhojanOS multi-tenant delivery integrations.
 * Secrets never appear here — only public capabilities + merchant onboarding copy.
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

export type CredentialFieldHelp = {
  readonly key: string;
  readonly label: string;
  readonly placeholder: string;
  readonly helpText: string;
  readonly findItLabel: string;
  readonly findItUrl?: string;
};

export type OnboardingStep = {
  readonly step: number;
  readonly title: string;
  readonly body: string;
};

export interface DeliveryProviderCapabilityRow {
  readonly id: DeliveryProviderId;
  readonly displayName: string;
  readonly connectionType: DeliveryConnectionType;
  readonly maturity: ProviderIntegrationMaturity;
  readonly capabilities: readonly DeliveryCapability[];
  readonly docsUrl?: string;
  readonly merchantSetupUrl?: string;
  readonly externalAccessNote: string;
  readonly merchantSummary: string;
  readonly requiredCredentialFields: readonly string[];
  readonly credentialFieldHelp: readonly CredentialFieldHelp[];
  readonly onboardingSteps: readonly OnboardingStep[];
  readonly statusBadgeHint: string;
}

export const DELIVERY_PROVIDER_CAPABILITY_MATRIX: readonly DeliveryProviderCapabilityRow[] = [
  {
    id: 'uber_direct',
    displayName: 'Uber Direct',
    connectionType: 'api_credentials',
    maturity: 'production_ready_scaffold',
    capabilities: ['quote', 'create_dispatch', 'tracking', 'cancel', 'webhook'],
    docsUrl: 'https://developer.uber.com/docs/deliveries/get-started',
    merchantSetupUrl: 'https://direct.uber.com',
    externalAccessNote:
      'Create an Uber Direct business account, then copy Customer ID, Client ID, and Client Secret from the Developer section.',
    merchantSummary:
      'Connect your own Uber Direct account so BhojanOS can request delivery quotes and bookings for your kitchen.',
    requiredCredentialFields: ['customerId', 'clientId', 'clientSecret'],
    credentialFieldHelp: [
      {
        key: 'customerId',
        label: 'Customer ID',
        placeholder: 'Paste Customer ID from Uber Direct',
        helpText: 'Shown in Uber Direct dashboard → Developer / API credentials.',
        findItLabel: 'Where do I find this?',
        findItUrl: 'https://direct.uber.com',
      },
      {
        key: 'clientId',
        label: 'Client ID',
        placeholder: 'Paste Client ID',
        helpText: 'App Client ID from the same Developer credentials page.',
        findItLabel: 'Where do I find this?',
        findItUrl: 'https://direct.uber.com',
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        placeholder: 'Paste Client Secret (kept server-side only)',
        helpText:
          'Never share this publicly. BhojanOS encrypts it on the server and never stores it in your browser.',
        findItLabel: 'Where do I find this?',
        findItUrl: 'https://direct.uber.com',
      },
    ],
    onboardingSteps: [
      {
        step: 1,
        title: 'Create Uber Direct account',
        body: 'Sign up at direct.uber.com for your kitchen business and complete billing setup.',
      },
      {
        step: 2,
        title: 'Copy API credentials',
        body: 'Open Developer / API credentials and copy Customer ID, Client ID, and Client Secret.',
      },
      {
        step: 3,
        title: 'Connect here & test',
        body: 'Paste the three values below, tap Connect, then Test connection. Raw secrets stay on the server only.',
      },
    ],
    statusBadgeHint: 'After connect: quote, auto-dispatch, tracking, cancel.',
  },
  {
    id: 'porter',
    displayName: 'Porter',
    connectionType: 'api_credentials',
    maturity: 'partner_access_required',
    capabilities: ['quote', 'create_dispatch', 'tracking', 'cancel', 'webhook'],
    externalAccessNote:
      'Porter API access is partner-gated. Ask your Porter account manager for an API key before connecting.',
    merchantSummary:
      'Porter auto-booking needs partner API approval. Until then, keep using manual tracking links on Dispatch.',
    requiredCredentialFields: ['apiKey', 'merchantAccountId'],
    credentialFieldHelp: [
      {
        key: 'apiKey',
        label: 'Porter API key',
        placeholder: 'Paste API key from Porter partner team',
        helpText: 'Issued by Porter for your business — not available in the consumer app.',
        findItLabel: 'Where do I find this? Ask your Porter account manager',
      },
      {
        key: 'merchantAccountId',
        label: 'Merchant account ID',
        placeholder: 'Porter merchant / store account ID',
        helpText: 'Your Porter business account reference used for bookings.',
        findItLabel: 'Where do I find this? Ask Porter support',
      },
    ],
    onboardingSteps: [
      {
        step: 1,
        title: 'Request Porter partner API access',
        body: 'Contact Porter business support and request delivery API credentials for your kitchen.',
      },
      {
        step: 2,
        title: 'Receive API key + merchant ID',
        body: 'Porter will share an API key and merchant account ID if you are approved.',
      },
      {
        step: 3,
        title: 'Connect when approved',
        body: 'Paste them here. Until approved, Dispatch still works with a pasted Porter tracking link.',
      },
    ],
    statusBadgeHint: 'Partner approval required before live auto-booking.',
  },
  {
    id: 'rapido',
    displayName: 'Rapido',
    connectionType: 'manual_only',
    maturity: 'manual_fallback_only',
    capabilities: ['tracking'],
    externalAccessNote:
      'Rapido has no public merchant delivery API onboarding yet. Use manual tracking links on each order.',
    merchantSummary:
      'Enable Rapido as a labeled partner. You still paste the Rapido tracking link when you dispatch each order.',
    requiredCredentialFields: [],
    credentialFieldHelp: [],
    onboardingSteps: [
      {
        step: 1,
        title: 'Book the rider in Rapido',
        body: 'Create the delivery in the Rapido partner/consumer flow as you do today.',
      },
      {
        step: 2,
        title: 'Copy the tracking link',
        body: 'Copy the live tracking URL from Rapido.',
      },
      {
        step: 3,
        title: 'Paste on Dispatch',
        body: 'In Orders → Dispatch Delivery, choose Rapido and paste the tracking link. Customer gets notified with that link.',
      },
    ],
    statusBadgeHint: 'Manual tracking only — no API auto-booking yet.',
  },
  {
    id: 'self_pickup',
    displayName: 'Self Pickup',
    connectionType: 'manual_only',
    maturity: 'native_no_external',
    capabilities: [],
    externalAccessNote: 'No external provider connection required.',
    merchantSummary: 'Customers pick up from your kitchen — no delivery partner needed.',
    requiredCredentialFields: [],
    credentialFieldHelp: [],
    onboardingSteps: [],
    statusBadgeHint: 'Built-in — nothing to connect.',
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

export function merchantLabelForCredentialField(
  provider: DeliveryProviderId,
  fieldKey: string,
): string {
  const help = getProviderCapabilityRow(provider)?.credentialFieldHelp.find((f) => f.key === fieldKey);
  return help?.label || fieldKey;
}
