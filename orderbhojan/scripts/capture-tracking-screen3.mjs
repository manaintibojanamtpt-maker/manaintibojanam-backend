#!/usr/bin/env node
/**
 * Screen 3 preview capture — order tracking @ 375×812 CSS px, deviceScaleFactor 2.
 * Run: npm run build && node scripts/capture-tracking-screen3.mjs
 */
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outArg = process.argv[2];
const out = outArg
  ? path.resolve(process.cwd(), outArg)
  : path.join(root, 'docs/ux-review/screen3-tracking-375x2.png');

const TRACKING_MOCK = {
  ok: true,
  value: {
    orderId: 'demo-order',
    orderNumber: '463577',
    status: 'OUT_FOR_DELIVERY',
    timeline: [
      { status: 'PLACED', at: new Date(Date.now() - 900_000).toISOString() },
      { status: 'ACCEPTED', at: new Date(Date.now() - 700_000).toISOString() },
      { status: 'PREPARING', at: new Date(Date.now() - 500_000).toISOString() },
      {
        status: 'OUT_FOR_DELIVERY',
        at: new Date().toISOString(),
        message: 'Raju is on the way with your meal',
      },
    ],
    etaMinutes: { min: 10, max: 20 },
    restaurant: {
      displayName: 'Amma Kitchen',
      slug: 'amma-kitchen',
      restaurantId: 'rest-amma',
    },
    delivery: {
      partner: 'Rapido',
      trackingUrl: 'https://rapido.bike/track/demo',
      riderName: 'Raju',
      riderPhone: '9876543210',
    },
    feedback: { eligible: false, submitted: false },
    reorder: {
      restaurantSlug: 'amma-kitchen',
      restaurantId: 'rest-amma',
      items: [{ itemId: 'biryani-1', name: 'Chicken biryani', quantity: 1, unitPrice: 249 }],
    },
  },
  meta: { correlationId: 'capture-mock' },
};

async function main() {
  const { chromium } = await import('playwright');

  const server = await createServer({
    configFile: path.join(root, 'vite.config.ts'),
    root,
    server: { port: 4178, strictPort: true },
  });
  await server.listen();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 4a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  });
  const page = await context.newPage();

  await page.route('**/guest-tracking**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TRACKING_MOCK),
    });
  });

  const url = 'http://127.0.0.1:4178/orders/demo-order/track?phone=9876543210';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.ob-tracking-px2__hero-status', { timeout: 15000 });
  await page.waitForSelector('.ob-tracking-v3__journey-title', { timeout: 15000 });
  await page.waitForTimeout(800);

  await page.screenshot({ path: out, fullPage: false });
  console.log(`Saved ${out}`);

  await browser.close();
  await server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
