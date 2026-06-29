/** Installed home-screen PWA (Android/iOS standalone). */
export function isInstalledPwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Phone/tablet browsers and installed PWAs — auto-apply updates (no "Later" tap). */
export function shouldAutoApplyPwaUpdate(): boolean {
  if (typeof window === 'undefined') return false;
  if (isInstalledPwa()) return true;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent);
}

export async function checkServiceWorkerForUpdate(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  } catch (error) {
    console.warn('[PWA] Manual update check failed:', error);
  }
}
