import type { DeliveryProviderConnectionPublic } from './deliveryProviderConnectionModel.js';
import type { DeliveryProviderId } from './providerCapabilityMatrix.js';
import {
  evaluatePorterApprovalReadiness,
  type PorterApprovalReport,
} from './porterApprovalReadiness.js';
import {
  evaluateUberDirectReadiness,
  type UberDirectReadinessReport,
} from './uberDirectReadiness.js';

export type ProviderReadinessReport =
  | UberDirectReadinessReport
  | PorterApprovalReport
  | {
      readonly provider: DeliveryProviderId;
      readonly merchantMessage: string;
      readonly canLiveDispatch: boolean;
    };

export function evaluateProviderReadiness(
  provider: DeliveryProviderId,
  connection: DeliveryProviderConnectionPublic | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): ProviderReadinessReport {
  if (provider === 'uber_direct') {
    return evaluateUberDirectReadiness({
      env,
      connectionStatus: connection?.status,
      hasSecretRef: connection?.hasSecretRef,
      merchantAccountId: connection?.merchantAccountId,
      errorMessage: connection?.errorMessage,
    });
  }
  if (provider === 'porter') {
    return evaluatePorterApprovalReadiness({
      env,
      connectionStatus: connection?.status,
      hasSecretRef: connection?.hasSecretRef,
      errorMessage: connection?.errorMessage,
      metadata: connection?.metadata,
    });
  }
  if (provider === 'rapido') {
    return {
      provider,
      canLiveDispatch: false,
      merchantMessage:
        'Rapido is manual tracking only. Paste the Rapido tracking link when you dispatch.',
    };
  }
  return {
    provider,
    canLiveDispatch: false,
    merchantMessage: 'Self pickup — no external delivery partner required.',
  };
}
