export interface PushSendResult {
  success: boolean;
  provider: string;
  error?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  actionUrl?: string;
}

export interface IPushProvider {
  readonly name: string;
  sendToUser(userId: string, payload: PushPayload): Promise<PushSendResult>;
  sendToTenantOwners(tenantId: string, payload: PushPayload): Promise<PushSendResult>;
}

export class FcmPushProvider implements IPushProvider {
  readonly name = 'fcm';

  constructor(private apiBaseUrl: string) {}

  async sendToUser(userId: string, payload: PushPayload): Promise<PushSendResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/notifications/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...payload }),
      });
      if (!response.ok) {
        return { success: false, provider: this.name, error: await response.text() };
      }
      return { success: true, provider: this.name };
    } catch (err: unknown) {
      return { success: false, provider: this.name, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async sendToTenantOwners(tenantId: string, payload: PushPayload): Promise<PushSendResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/notifications/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ...payload }),
      });
      if (!response.ok) {
        return { success: false, provider: this.name, error: await response.text() };
      }
      return { success: true, provider: this.name };
    } catch (err: unknown) {
      return { success: false, provider: this.name, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

export const createPushProvider = (apiBaseUrl: string): IPushProvider => new FcmPushProvider(apiBaseUrl);
