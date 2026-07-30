export type VoiceProduct = 'orderbhojan' | 'bhojanos';

export type VoiceChannel = 'web' | 'android' | 'phone' | 'owner_web';

export type VoiceSession = {
  readonly sessionId: string;
  readonly conversationId: string;
  readonly product: VoiceProduct;
  readonly channel: VoiceChannel;
  readonly startedAt: string;
  readonly tenantId?: string;
  readonly customerId?: string;
};

export function createVoiceSession(input: {
  readonly product: VoiceProduct;
  readonly channel: VoiceChannel;
  readonly conversationId?: string;
  readonly tenantId?: string;
  readonly customerId?: string;
}): VoiceSession {
  const now = new Date().toISOString();
  const sessionId = `vs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    sessionId,
    conversationId: input.conversationId?.trim() || sessionId,
    product: input.product,
    channel: input.channel,
    startedAt: now,
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    ...(input.customerId ? { customerId: input.customerId } : {}),
  };
}
