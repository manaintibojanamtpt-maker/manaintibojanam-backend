import { Capacitor, registerPlugin } from '@capacitor/core';
import { isNativePlatform } from '@/lib/nativePlatform';

const RAZORPAY_OPEN_CLASS = 'ob-razorpay-open';
/** Gesture / 3-button nav clearance when edge-to-edge cannot be fully disabled. */
const RAZORPAY_BOTTOM_PAD_PX = 72;

type NativeChromePlugin = {
  setFitsSystemWindows(options: { fits: boolean }): Promise<{ fits: boolean }>;
};

const NativeChrome = registerPlugin<NativeChromePlugin>('OrderBhojanNativeChrome');

let previousOverlay: boolean | null = null;
let padObserver: MutationObserver | null = null;

function resolveRazorpayBottomPadPx(): number {
  if (typeof document === 'undefined') return RAZORPAY_BOTTOM_PAD_PX;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--ob-safe-bottom').trim();
  const safe = Number.parseFloat(raw);
  const safePx = Number.isFinite(safe) ? safe : 0;
  return Math.max(RAZORPAY_BOTTOM_PAD_PX, Math.ceil(safePx + 24));
}

function applyPadToRazorpayNodes(root: ParentNode = document): void {
  const padPx = resolveRazorpayBottomPadPx();
  const pad = `${padPx}px`;
  const nodes = root.querySelectorAll<HTMLElement>(
    '.razorpay-container, .razorpay-checkout-frame, iframe.razorpay-checkout-frame, div[class*="razorpay"]',
  );
  nodes.forEach((node) => {
    node.dataset.obRzpPad = '1';
    const style = node.style;
    if (node.tagName === 'IFRAME' || node.classList.contains('razorpay-checkout-frame')) {
      style.setProperty('margin-bottom', pad, 'important');
      style.setProperty('height', `calc(100% - ${pad})`, 'important');
      return;
    }
    style.setProperty('bottom', pad, 'important');
    style.setProperty('padding-bottom', pad, 'important');
    style.setProperty('max-height', `calc(100% - ${pad})`, 'important');
  });
}

function startRazorpayPadObserver(): void {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  padObserver?.disconnect();
  applyPadToRazorpayNodes();
  padObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) applyPadToRazorpayNodes(node);
      });
    }
  });
  padObserver.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(() => applyPadToRazorpayNodes(), 120);
  window.setTimeout(() => applyPadToRazorpayNodes(), 400);
}

function stopRazorpayPadObserver(): void {
  padObserver?.disconnect();
  padObserver = null;
}

/**
 * Capacitor Android draws Razorpay Checkout under the system nav / gesture bar.
 * Pad the WebView + briefly disable StatusBar overlay while the modal is open.
 */
export async function enterRazorpayNativeChrome(): Promise<void> {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.add(RAZORPAY_OPEN_CLASS);
  document.body.classList.add(RAZORPAY_OPEN_CLASS);
  document.documentElement.style.setProperty(
    '--ob-razorpay-nav-pad',
    `${resolveRazorpayBottomPadPx()}px`,
  );
  startRazorpayPadObserver();

  if (!isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

  try {
    await NativeChrome.setFitsSystemWindows({ fits: true });
  } catch {
    // Older APK without plugin — CSS pad still applies.
  }

  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    previousOverlay = true;
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    previousOverlay = null;
  }
}

export async function exitRazorpayNativeChrome(): Promise<void> {
  if (typeof document === 'undefined') return;
  stopRazorpayPadObserver();
  document.documentElement.classList.remove(RAZORPAY_OPEN_CLASS);
  document.body.classList.remove(RAZORPAY_OPEN_CLASS);
  document.documentElement.style.removeProperty('--ob-razorpay-nav-pad');

  if (!isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

  try {
    await NativeChrome.setFitsSystemWindows({ fits: false });
  } catch {
    // ignore
  }

  if (previousOverlay == null) return;

  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: previousOverlay });
  } catch {
    // ignore
  } finally {
    previousOverlay = null;
  }
}
