const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-js';
const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let loadPromise: Promise<boolean> | null = null;

export const loadRazorpay = (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if ((window as any).Razorpay) {
    return Promise.resolve(true);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve) => {
    const finish = (success: boolean) => {
      if (!success) {
        loadPromise = null;
      }
      resolve(success);
    };

    const existing = document.getElementById(RAZORPAY_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => finish(Boolean((window as any).Razorpay)), { once: true });
      existing.addEventListener('error', () => finish(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = RAZORPAY_SCRIPT_ID;
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;

    const timeout = window.setTimeout(() => finish(false), 15000);

    script.onload = () => {
      window.clearTimeout(timeout);
      finish(Boolean((window as any).Razorpay));
    };

    script.onerror = () => {
      window.clearTimeout(timeout);
      script.remove();
      finish(false);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

export const ensureRazorpayLoaded = async (): Promise<void> => {
  const loaded = await loadRazorpay();
  if (!loaded) {
    throw new Error('Razorpay SDK failed to load. Please disable your adblocker or try Cash on Delivery.');
  }
};
