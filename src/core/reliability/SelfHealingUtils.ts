import { TelemetryService } from './TelemetryService';

const RELOAD_CIRCUIT_BREAKER_KEY = 'bhojanos_reload_count';
const RELOAD_TIMESTAMP_KEY = 'bhojanos_reload_timestamp';
const MAX_RELOADS_PER_MINUTE = 3;

class SelfHealingImpl {
  public canAttemptRecovery(): boolean {
    const now = Date.now();
    const countStr = sessionStorage.getItem(RELOAD_CIRCUIT_BREAKER_KEY);
    const tsStr = sessionStorage.getItem(RELOAD_TIMESTAMP_KEY);

    let count = countStr ? parseInt(countStr, 10) : 0;
    const ts = tsStr ? parseInt(tsStr, 10) : now;

    // Reset circuit breaker if it's been more than a minute
    if (now - ts > 60000) {
      count = 0;
      sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, now.toString());
    }

    if (count >= MAX_RELOADS_PER_MINUTE) {
      TelemetryService.logCritical('Recovery circuit breaker tripped. Too many reloads.', { context: 'SelfHealing' });
      return false;
    }

    sessionStorage.setItem(RELOAD_CIRCUIT_BREAKER_KEY, (count + 1).toString());
    sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, now.toString());
    return true;
  }

  public async unregisterServiceWorkers() {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        TelemetryService.logInfo('Service workers unregistered', { context: 'SelfHealing' });
      } catch (err) {
        TelemetryService.logError(`Failed to unregister SW: ${err}`, { context: 'SelfHealing' });
      }
    }
  }

  public async purgeCaches() {
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.map(key => caches.delete(key))
        );
        TelemetryService.logInfo('Caches purged', { context: 'SelfHealing' });
      } catch (err) {
        TelemetryService.logError(`Failed to purge caches: ${err}`, { context: 'SelfHealing' });
      }
    }
  }

  public async attemptHardRecovery(reason: string) {
    if (!this.canAttemptRecovery()) {
      return; // Stop if circuit breaker tripped to prevent infinite loop
    }

    TelemetryService.logWarn(`Attempting hard recovery due to: ${reason}`, { context: 'SelfHealing' });
    
    await this.unregisterServiceWorkers();
    await this.purgeCaches();
    
    // Clear local storage EXCEPT firebase auth and persistence.
    try {
      const keysToKeep = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('firebase:') || key.includes('firebaseLocalStorage'))) {
          keysToKeep.push({ key, value: localStorage.getItem(key) });
        }
      }
      
      localStorage.clear();
      
      for (const item of keysToKeep) {
        if (item.value) {
          localStorage.setItem(item.key, item.value);
        }
      }
    } catch (e) {
      TelemetryService.logError(`Storage cleanup failed: ${e}`, { context: 'SelfHealing' });
    }

    // Force reload bypassing browser cache
    window.location.reload();
  }
}

export const SelfHealingUtils = new SelfHealingImpl();
