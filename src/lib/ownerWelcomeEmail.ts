import { auth } from '../firebase';
import { EnvironmentConfig } from '../config/environment';

/** Request the backend to send the BhojanOS welcome email (idempotent). */
export async function requestOwnerWelcomeEmail(tenantSlug?: string): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const token = await user.getIdToken();
    const res = await fetch(`${EnvironmentConfig.getApiUrl()}/api/owner/welcome-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(tenantSlug ? { tenantSlug } : {}),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      console.warn('[WelcomeEmail] Request failed:', payload.error || res.statusText);
    }
  } catch (error) {
    console.warn('[WelcomeEmail] Request error:', error);
  }
}
