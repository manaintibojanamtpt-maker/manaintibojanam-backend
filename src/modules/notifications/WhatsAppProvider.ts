export interface WhatsAppSendResult {
  success: boolean;
  provider: string;
  error?: string;
}

export interface WhatsAppTemplatePayload {
  templateName: string;
  languageCode?: string;
  components?: Record<string, unknown>[];
}

export interface IWhatsAppProvider {
  readonly name: string;
  sendMessage(to: string, message: string): Promise<WhatsAppSendResult>;
  sendTemplate(to: string, template: WhatsAppTemplatePayload): Promise<WhatsAppSendResult>;
  sendDailyBrief(to: string, message: string): Promise<WhatsAppSendResult>;
  sendCriticalAlert(to: string, title: string, message: string, actionUrl: string): Promise<WhatsAppSendResult>;
}

const normalizeIndianPhone = (phone: string): string => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return digits;
  return digits;
};

export class MetaCloudWhatsAppProvider implements IWhatsAppProvider {
  readonly name = 'meta_cloud_api';

  constructor(
    private accessToken?: string,
    private phoneNumberId?: string,
    private apiVersion = 'v20.0'
  ) {}

  private async dispatch(to: string, body: Record<string, unknown>): Promise<WhatsAppSendResult> {
    const normalizedPhone = normalizeIndianPhone(to);
    if (!normalizedPhone) {
      return { success: false, provider: this.name, error: 'Invalid phone number' };
    }

    if (!this.accessToken || !this.phoneNumberId) {
      console.log(`[WHATSAPP MOCK:${this.name}] To: ${normalizedPhone}`, body);
      return { success: true, provider: `${this.name}_mock` };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: normalizedPhone,
            ...body,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, provider: this.name, error: errorText };
      }

      return { success: true, provider: this.name };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, provider: this.name, error: message };
    }
  }

  async sendMessage(to: string, message: string): Promise<WhatsAppSendResult> {
    return this.dispatch(to, { type: 'text', text: { preview_url: true, body: message } });
  }

  async sendTemplate(to: string, template: WhatsAppTemplatePayload): Promise<WhatsAppSendResult> {
    return this.dispatch(to, {
      type: 'template',
      template: {
        name: template.templateName,
        language: { code: template.languageCode || 'en' },
        components: template.components || [],
      },
    });
  }

  async sendDailyBrief(to: string, message: string): Promise<WhatsAppSendResult> {
    return this.sendMessage(to, message);
  }

  async sendCriticalAlert(
    to: string,
    title: string,
    message: string,
    actionUrl: string
  ): Promise<WhatsAppSendResult> {
    const body = [`🚨 ${title}`, '', message, '', actionUrl].join('\n');
    return this.sendMessage(to, body);
  }
}

export class TwilioWhatsAppProvider implements IWhatsAppProvider {
  readonly name = 'twilio';

  async sendMessage(to: string, message: string): Promise<WhatsAppSendResult> {
    console.log(`[TWILIO WHATSAPP STUB] To: ${normalizeIndianPhone(to)} | ${message.slice(0, 80)}...`);
    return { success: true, provider: `${this.name}_stub` };
  }

  async sendTemplate(to: string, template: WhatsAppTemplatePayload): Promise<WhatsAppSendResult> {
    return this.sendMessage(to, `Template: ${template.templateName}`);
  }

  async sendDailyBrief(to: string, message: string): Promise<WhatsAppSendResult> {
    return this.sendMessage(to, message);
  }

  async sendCriticalAlert(to: string, title: string, message: string, actionUrl: string): Promise<WhatsAppSendResult> {
    return this.sendMessage(to, `🚨 ${title}\n${message}\n${actionUrl}`);
  }
}

export type WhatsAppProviderType = 'meta' | 'twilio' | 'gupshup' | 'interakt';

export const createWhatsAppProvider = (type: WhatsAppProviderType = 'meta'): IWhatsAppProvider => {
  switch (type) {
    case 'twilio':
      return new TwilioWhatsAppProvider();
    case 'meta':
    default:
      return new MetaCloudWhatsAppProvider(
        typeof process !== 'undefined' ? process.env?.WHATSAPP_ACCESS_TOKEN : undefined,
        typeof process !== 'undefined' ? process.env?.WHATSAPP_PHONE_NUMBER_ID : undefined,
        typeof process !== 'undefined' ? process.env?.WHATSAPP_API_VERSION : undefined
      );
  }
};
