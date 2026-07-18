declare global {
  interface Window {
    __OB_DEBUG__?: boolean;
  }
}

export function isObDebugEnabled(): boolean {
  if (typeof window === 'undefined') return import.meta.env.DEV;
  if (window.__OB_DEBUG__ === true) return true;
  if (import.meta.env.DEV) return true;
  try {
    return window.localStorage.getItem('ob:debug') === '1';
  } catch {
    return false;
  }
}

export function obDebugLog(scope: string, message: string, detail?: unknown): void {
  if (!isObDebugEnabled()) return;
  if (detail === undefined) {
    console.debug(`[OB debug:${scope}] ${message}`);
    return;
  }
  console.debug(`[OB debug:${scope}] ${message}`, detail);
}
