/**
 * Porter partner-approval readiness — honest about what is blocked.
 */

export type PorterApprovalState =
  | 'approval_required'
  | 'credentials_stored_pending_live'
  | 'live_enabled'
  | 'error'
  | 'disconnected';

export type PorterApprovalReport = {
  readonly provider: 'porter';
  readonly approvalState: PorterApprovalState;
  readonly partnerAccessRequired: true;
  readonly liveFlagEnabled: boolean;
  readonly canLiveDispatch: boolean;
  readonly manualFallbackAvailable: true;
  readonly blockedReasons: readonly string[];
  readonly merchantMessage: string;
  readonly adminMessage: string;
};

function isTruthyEnv(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

export function isPorterLiveEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return isTruthyEnv(env.PORTER_LIVE);
}

export function evaluatePorterApprovalReadiness(input: {
  readonly env?: NodeJS.ProcessEnv;
  readonly connectionStatus?: string | null;
  readonly hasSecretRef?: boolean;
  readonly errorMessage?: string | null;
  readonly metadata?: Readonly<Record<string, unknown>> | null;
}): PorterApprovalReport {
  const env = input.env ?? process.env;
  const liveFlagEnabled = isPorterLiveEnabled(env);
  const blockedReasons: string[] = [];

  const partnerApprovedMeta = input.metadata?.partnerApproved === true;
  const docsConfirmedMeta = input.metadata?.apiDocsConfirmed === true;

  if (!partnerApprovedMeta) {
    blockedReasons.push('Porter partner API approval not confirmed for this kitchen.');
  }
  if (!docsConfirmedMeta) {
    blockedReasons.push('Official Porter API docs/endpoints not confirmed (placeholder paths in use).');
  }
  if (!liveFlagEnabled) {
    blockedReasons.push('PORTER_LIVE server flag is off.');
  }
  if (input.errorMessage) {
    blockedReasons.push(input.errorMessage);
  }

  let approvalState: PorterApprovalState = 'approval_required';
  if (input.errorMessage || input.connectionStatus === 'error') {
    approvalState = 'error';
  } else if (!input.hasSecretRef || input.connectionStatus === 'disconnected' || !input.connectionStatus) {
    approvalState = 'disconnected';
  } else if (liveFlagEnabled && partnerApprovedMeta && docsConfirmedMeta) {
    approvalState = 'live_enabled';
  } else if (input.hasSecretRef) {
    approvalState = 'credentials_stored_pending_live';
  }

  const canLiveDispatch = approvalState === 'live_enabled';

  const merchantMessage =
    approvalState === 'live_enabled'
      ? 'Porter live booking is enabled for this kitchen.'
      : approvalState === 'credentials_stored_pending_live'
        ? 'Credentials saved, but live Porter booking stays blocked until Porter approves API access and the platform enables it. Use a pasted Porter tracking link on Dispatch for now.'
        : approvalState === 'error'
          ? input.errorMessage ||
            'Porter connection needs attention. You can still dispatch with a manual tracking link.'
          : 'Porter auto-booking needs partner approval. You can still choose Porter on Dispatch and paste a tracking link.';

  const adminMessage =
    'Porter remains partner-gated. Do not set PORTER_LIVE=1 until official API docs and a partner-provisioned key are available. Manual tracking fallback must stay available.';

  return {
    provider: 'porter',
    approvalState,
    partnerAccessRequired: true,
    liveFlagEnabled,
    canLiveDispatch,
    manualFallbackAvailable: true,
    blockedReasons,
    merchantMessage,
    adminMessage,
  };
}
