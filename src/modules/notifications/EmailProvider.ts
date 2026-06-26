export interface EmailSendResult {
  success: boolean;
  provider: string;
  error?: string;
}

export interface IEmailProvider {
  readonly name: string;
  sendEmail(to: string, subject: string, htmlBody: string): Promise<EmailSendResult>;
  sendDailyReport(to: string, subject: string, htmlBody: string): Promise<EmailSendResult>;
}

export class SmtpEmailProvider implements IEmailProvider {
  readonly name = 'smtp';

  constructor(
    private apiBaseUrl: string
  ) {}

  async sendEmail(to: string, subject: string, htmlBody: string): Promise<EmailSendResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/notifications/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, htmlBody }),
      });
      if (!response.ok) {
        const err = await response.text();
        return { success: false, provider: this.name, error: err };
      }
      return { success: true, provider: this.name };
    } catch (err: unknown) {
      return { success: false, provider: this.name, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async sendDailyReport(to: string, subject: string, htmlBody: string): Promise<EmailSendResult> {
    return this.sendEmail(to, subject, htmlBody);
  }
}

export class ResendEmailProvider implements IEmailProvider {
  readonly name = 'resend';

  async sendEmail(to: string, subject: string, htmlBody: string): Promise<EmailSendResult> {
    console.log(`[RESEND STUB] To: ${to} | ${subject}`);
    return { success: true, provider: `${this.name}_stub` };
  }

  async sendDailyReport(to: string, subject: string, htmlBody: string): Promise<EmailSendResult> {
    return this.sendEmail(to, `[Daily Report] ${subject}`, htmlBody);
  }
}

export const createEmailProvider = (apiBaseUrl: string, type: 'smtp' | 'resend' = 'smtp'): IEmailProvider => {
  if (type === 'resend') return new ResendEmailProvider();
  return new SmtpEmailProvider(apiBaseUrl);
};
