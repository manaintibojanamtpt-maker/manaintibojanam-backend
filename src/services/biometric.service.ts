import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

const STORAGE_KEY_ENABLED = 'biometrics_enabled';
const STORAGE_KEY_USER_ID = 'biometric_user_id';
const STORAGE_KEY_DEVICE_NAME = 'biometric_device_name';
const API_URL = 'https://manaintibojanam-backend.onrender.com';
const SECRET_KEY = 'manaintibojanam.app';

export class BiometricService {
  /**
   * Check if biometrics are available on the device
   */
  static async isAvailable(): Promise<boolean> {
    const isNative = Capacitor.isNativePlatform();
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    console.log(`[BiometricService] Platform check: Native=${isNative}, Standalone=${isStandalone}`);
    
    if (isNative) {
      try {
        const result = await NativeBiometric.isAvailable();
        return result.isAvailable;
      } catch (e) {
        return false;
      }
    } else {
      // Web/PWA Fallback
      // On some mobile browsers, PublicKeyCredential might exist but isUserVerifyingPlatformAuthenticatorAvailable might fail if called too early
      const webSupported = !!window.PublicKeyCredential;
      
      if (webSupported) {
        try {
          // Add a timeout because isUserVerifyingPlatformAuthenticatorAvailable can hang on some mobile browsers
          const isUVPAA = await Promise.race([
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 1500))
          ]);
          console.log(`[BiometricService] UVPAA check: ${isUVPAA}`);
          return isUVPAA;
        } catch (e) {
          console.warn('[BiometricService] UVPAA check failed, defaulting to support if PublicKeyCredential exists', e);
          return true; 
        }
      }
      return false;
    }
  }

  /**
   * Get the type of biometry supported (FaceID, Fingerprint, etc)
   */
  static async getBiometryType(): Promise<BiometryType | string | null> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await NativeBiometric.isAvailable();
        return result.biometryType || null;
      } catch (e) {
        return null;
      }
    }
    
    // For PWA, we can try to guess or use a generic term
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'Face ID / Touch ID';
    }
    return 'Biometric / Passkey';
  }

  /**
   * Check if the user has enabled biometrics in app settings
   */
  static async isEnabled(): Promise<boolean> {
    const { value } = await Preferences.get({ key: STORAGE_KEY_ENABLED });
    return value === 'true';
  }

  /**
   * Set biometric enabled state
   */
  static async setEnabled(enabled: boolean, userId?: string): Promise<void> {
    await Preferences.set({ key: STORAGE_KEY_ENABLED, value: enabled.toString() });
    if (userId) {
      await Preferences.set({ key: STORAGE_KEY_USER_ID, value: userId });
    }
    if (!enabled) {
      await this.clearCredentials();
    }
  }

  /**
   * Enroll a user for biometric authentication
   */
  static async enroll(userId: string, email?: string): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      return this.enrollNative(userId);
    } else {
      return this.enrollWeb(userId, email);
    }
  }

  private static async enrollNative(userId: string): Promise<boolean> {
    try {
      // 1. Generate a random secret
      const deviceSecret = Math.random().toString(36).substring(2, 15) + 
                          Math.random().toString(36).substring(2, 15);

      // 2. Register secret with backend
      const resp = await fetch(`${API_URL}/api/auth/biometric/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, deviceSecret }),
      });

      if (!resp.ok) throw new Error('Backend registration failed');

      // 3. Store secret in hardware-backed storage
      await NativeBiometric.setCredentials({
        username: userId,
        password: deviceSecret,
        server: SECRET_KEY,
      });

      // 4. Mark as enabled locally
      await Preferences.set({ key: STORAGE_KEY_ENABLED, value: 'true' });
      await Haptics.impact({ style: ImpactStyle.Medium });
      
      return true;
    } catch (e) {
      console.error('Native enrollment error:', e);
      return false;
    }
  }

  private static async enrollWeb(userId: string, email?: string): Promise<boolean> {
    console.log(`[BiometricService] Starting Web enrollment for user: ${userId}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      // 1. Get registration options from server
      const resp = await fetch(`${API_URL}/api/auth/generate-registration-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          email: email || userId, // Fallback to userId if email missing
          origin: window.location.origin 
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        let errText = await resp.text();
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error) errText = errJson.error;
        } catch (e) {}
        console.error(`[BiometricService] Server returned error: ${resp.status} ${errText}`);
        throw new Error(`Failed to get registration options: ${resp.status} - ${errText}`);
      }
      
      const options = await resp.json();
      console.log(`[BiometricService] Received options. RP ID: ${options.rp.id}`);

      // 2. Trigger browser biometric prompt (Passkey creation)
      console.log(`[BiometricService] Calling startRegistration...`);
      const attResp = await startRegistration(options);
      console.log(`[BiometricService] Registration response received from browser`);

      // 3. Verify with server
      const vController = new AbortController();
      const vTimeoutId = setTimeout(() => vController.abort(), 30000);

      const verifyResp = await fetch(`${API_URL}/api/auth/verify-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          response: attResp,
          origin: window.location.origin
        }),
        signal: vController.signal
      });
      clearTimeout(vTimeoutId);

      if (!verifyResp.ok) {
        const errText = await verifyResp.text();
        console.error(`[BiometricService] Verification failed: ${verifyResp.status} ${errText}`);
        throw new Error('Verification failed');
      }

      const result = await verifyResp.json();
      console.log(`[BiometricService] Verification result:`, result);
      
      if (result.verified) {
        await Preferences.set({ key: STORAGE_KEY_ENABLED, value: 'true' });
        await Preferences.set({ key: STORAGE_KEY_USER_ID, value: userId });
        return true;
      }
      throw new Error(result.error || 'Server could not verify your biometric data');
    } catch (e: any) {
      console.error('[BiometricService] Web enrollment error:', e);
      if (e.name === 'AbortError') throw new Error('Request timed out. Please try again.');
      
      // Handle already registered authenticators gracefully
      if (e.name === 'InvalidStateError' || (e.message && e.message.toLowerCase().includes('previously registered'))) {
        // If it's already registered, we can just mark it as enabled locally!
        await Preferences.set({ key: STORAGE_KEY_ENABLED, value: 'true' });
        await Preferences.set({ key: STORAGE_KEY_USER_ID, value: userId });
        throw new Error('This device is already registered for passkeys! We have re-enabled it for you.');
      }

      if (e.name === 'NotAllowedError') throw new Error('Biometric permission was denied or cancelled.');
      
      throw e;
    }
  }

  /**
   * Authenticate using biometrics
   */
  static async authenticate(isLocalUnlock: boolean = false): Promise<{ token: string } | { local: true } | null> {
    if (Capacitor.isNativePlatform()) {
      return this.authenticateNative(isLocalUnlock);
    } else {
      return this.authenticateWeb(isLocalUnlock);
    }
  }

  private static async authenticateNative(isLocalUnlock?: boolean): Promise<{ token: string } | { local: true } | null> {
    try {
      if (isLocalUnlock) {
        try {
          await NativeBiometric.verifyIdentity({
            reason: "Verify your identity to unlock",
            title: "App Locked",
            subtitle: "Please verify to continue",
            description: "Verify your identity to unlock BhojanOS"
          });
          await Haptics.impact({ style: ImpactStyle.Light });
          return { local: true };
        } catch (e) {
          console.warn("[BiometricService] NativeBiometric.verifyIdentity failed, falling back to getCredentials", e);
          const credentials = await NativeBiometric.getCredentials({ server: SECRET_KEY });
          if (!credentials) return null;
          await Haptics.impact({ style: ImpactStyle.Light });
          return { local: true };
        }
      }

      // 1. Get secret from hardware storage (triggers biometric prompt)
      const credentials = await NativeBiometric.getCredentials({
        server: SECRET_KEY,
      });

      if (!credentials) return null;

      // 2. Verify secret with backend to get Firebase token
      const resp = await fetch(`${API_URL}/api/auth/biometric/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceSecret: credentials.password }),
      });

      if (!resp.ok) return null;

      const result = await resp.json();
      await Haptics.impact({ style: ImpactStyle.Light });
      return { token: result.token };
    } catch (e) {
      console.error('Native authentication error:', e);
      return null;
    }
  }

  private static async authenticateWeb(isLocalUnlock?: boolean): Promise<{ token: string } | { local: true } | null> {
    try {
      if (isLocalUnlock && !!window.PublicKeyCredential) {
        try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          
          const cred = await navigator.credentials.get({
            publicKey: {
              challenge: challenge,
              userVerification: "required"
            }
          });
          if (cred) return { local: true };
        } catch (e) {
          console.warn("[BiometricService] Local WebAuthn check failed, falling back to server", e);
        }
      }

      // 1. Get auth options
      const resp = await fetch(`${API_URL}/api/auth/generate-authentication-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          origin: window.location.origin 
        }),
      });

      if (!resp.ok) return null;
      const { options, challengeId } = await resp.json();

      // 2. Trigger browser prompt
      const asseResp = await startAuthentication(options);

      // 3. Verify and get token
      const verifyResp = await fetch(`${API_URL}/api/auth/verify-authentication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          challengeId, 
          response: asseResp,
          origin: window.location.origin
        }),
      });

      const result = await verifyResp.json();
      if (result.verified && result.token) {
        return { token: result.token };
      }
      return null;
    } catch (e) {
      console.error('Web authentication error:', e);
      return null;
    }
  }

  /**
   * Clear all biometric data from the device
   */
  static async clearCredentials(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await NativeBiometric.deleteCredentials({
          server: SECRET_KEY,
        }).catch(() => {});
      }
      await Preferences.remove({ key: STORAGE_KEY_USER_ID });
      await Preferences.remove({ key: STORAGE_KEY_DEVICE_NAME });
      await Preferences.set({ key: STORAGE_KEY_ENABLED, value: 'false' });
    } catch (e) {
      console.error("Failed to clear biometric credentials", e);
    }
  }
}
