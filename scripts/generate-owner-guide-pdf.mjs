/**
 * Generates BhojanOS Owner Complete Guide PDF
 * Run: node scripts/generate-owner-guide-pdf.mjs
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'docs');
const OUT_FILE = join(OUT_DIR, 'BhojanOS-Owner-Complete-Guide.pdf');

const BRAND = { r: 255, g: 122, b: 0 };
const MUTED = { r: 100, g: 100, b: 100 };
const MARGIN = 18;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

const PRICING_NOTE =
  'BhojanOS charges zero commission on every order — on all plans. You pay for software and intelligence, not per order. Aggregators typically take 20–30% per order forever.';

const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
let y = MARGIN;
let pageNum = 1;

function newPage() {
  doc.addPage();
  pageNum += 1;
  y = MARGIN + 6;
  footer();
}

function footer() {
  const prev = doc.getTextColor();
  doc.setFontSize(8);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text('BhojanOS Owner Guide · bhojanos.com · Confidential', MARGIN, 290);
  doc.text(`Page ${pageNum}`, PAGE_W - MARGIN, 290, { align: 'right' });
  doc.setTextColor(prev.r || 0, prev.g || 0, prev.b || 0);
}

function ensureSpace(needed = 12) {
  if (y + needed > 275) newPage();
}

function sectionTitle(text) {
  ensureSpace(16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(text, MARGIN, y);
  y += 8;
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;
  doc.setTextColor(0, 0, 0);
}

function subTitle(text) {
  ensureSpace(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(text, MARGIN, y);
  y += 6;
}

function body(text, indent = 0) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(text, CONTENT_W - indent);
  for (const line of lines) {
    ensureSpace(5);
    doc.text(line, MARGIN + indent, y);
    y += 4.5;
  }
  y += 2;
}

function bullets(items, indent = 4) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  for (const item of items) {
    const lines = doc.splitTextToSize(item, CONTENT_W - indent - 4);
    ensureSpace(lines.length * 4.5 + 2);
    doc.text('•', MARGIN + indent - 3, y);
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], MARGIN + indent, y);
      y += 4.5;
    }
  }
  y += 2;
}

function numbered(items) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  items.forEach((item, idx) => {
    const prefix = `${idx + 1}. `;
    const lines = doc.splitTextToSize(item, CONTENT_W - 8);
    ensureSpace(lines.length * 4.5 + 2);
    doc.text(prefix + lines[0], MARGIN, y);
    y += 4.5;
    for (let i = 1; i < lines.length; i++) {
      doc.text(lines[i], MARGIN + 6, y);
      y += 4.5;
    }
  });
  y += 2;
}

function table(head, rows) {
  ensureSpace(20);
  autoTable(doc, {
    startY: y,
    head: [head],
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });
  y = doc.lastAutoTable.finalY + 8;
}

// ─── Cover ───────────────────────────────────────────────────────────────
doc.setFillColor(26, 5, 5);
doc.rect(0, 0, PAGE_W, 297, 'F');
doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(28);
doc.text('BhojanOS', MARGIN, 70);
doc.setFontSize(16);
doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
doc.text('Complete Owner & Operations Guide', MARGIN, 82);
doc.setFontSize(11);
doc.setTextColor(220, 220, 220);
const coverSub = doc.splitTextToSize(
  'End-to-end documentation: technology architecture, installation, onboarding, every owner feature, customer ordering journey, and delivery — from signup to fulfilled orders.',
  CONTENT_W,
);
doc.text(coverSub, MARGIN, 98);
doc.setFontSize(10);
doc.text('Version 1.1 · June 2026', MARGIN, 130);
doc.text('Product: Direct Ordering OS for Food Businesses', MARGIN, 138);
doc.text('Website: https://www.bhojanos.com', MARGIN, 146);
doc.text('Support: bhojanos26@gmail.com', MARGIN, 154);
doc.setFontSize(9);
doc.setTextColor(160, 160, 160);
doc.text('For restaurant owners, cloud kitchens, and food entrepreneurs using BhojanOS SaaS.', MARGIN, 270);

doc.addPage();
pageNum = 2;
y = MARGIN;
footer();

sectionTitle('Table of Contents');
const toc = [
  ['1', 'Welcome to BhojanOS', '3'],
  ['2', 'Platform Architecture', '3'],
  ['3', 'Installation (PWA)', '4'],
  ['4', 'Owner Registration & Login', '4'],
  ['5', 'Store Setup (8 Steps)', '5'],
  ['6', 'Owner Portal — All Features', '5'],
  ['7', 'Plans, Trials & Entitlements', '7'],
  ['8', 'Going Live & Daily Operations', '7'],
  ['9', 'Customer Journey (Order to Delivery)', '8'],
  ['10', 'Design & Branding', '8'],
  ['11', 'Troubleshooting & FAQ', '9'],
  ['12', 'Support & Contact', '9'],
  ['A', 'Appendix: Routes, Statuses, Checklist', '9'],
];
toc.forEach(([num, title, pg]) => {
  ensureSpace(6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${num}. ${title}`, MARGIN, y);
  doc.text(pg, PAGE_W - MARGIN, y, { align: 'right' });
  y += 5.5;
});
newPage();

sectionTitle('End-to-End Journey Maps');
subTitle('Owner journey: Signup → Live orders');
body(
  'Marketing (bhojanos.com/onboard) → Register (/owner/register) → Security check + Firebase Auth → API provisions tenant → Dashboard with Setup Guide → Complete 8 setup steps → Publish (14-day Growth trial) → Share store URL → Receive orders in Orders tab → Accept → Prepare → Dispatch → Delivered → Repeat daily with Store Live Control.',
);
subTitle('Customer journey: Browse → Delivery');
body(
  'Open store link (/k/{slug}) → Browse Home & Menu → Add to cart → Checkout (address + slot + payment) → Place order → Payment success (Razorpay) or COD confirmed → Track order live (/k/{slug}/order/{id}) → Receive delivery → Optional: create account for faster reorder.',
);
subTitle('Technology data flow');
body(
  'Customer browser ↔ Vercel SPA (React) ↔ Firebase Auth + Firestore (real-time orders/menu) ↔ Render API (payments, provisioning, KYC uploads) ↔ Razorpay (online payments) ↔ FCM (push notifications to owner phone).',
);
newPage();

sectionTitle('1. Welcome to BhojanOS');
body(
  'BhojanOS is a multi-tenant restaurant operating system that gives you a branded online storefront, owner dashboard, order management, delivery tools, and growth intelligence — with zero commission on every order. You pay a flat monthly software fee only when you accept live customer orders (Growth plan and above). Building and customizing your storefront is always free.',
);
subTitle('What this guide covers');
bullets([
  'Platform technology and how your store runs in the cloud',
  'Installing BhojanOS as a mobile app (PWA) on your phone',
  'Creating your owner account and step-by-step store setup',
  'Every screen in the owner portal — Dashboard, Orders, Menu, Settings, and more',
  'Plans, trials, and which features unlock on each plan',
  'The complete customer journey from browsing your menu to order delivery',
  'Day-to-day operations: accepting orders, dispatching riders, going live/offline',
  'Compliance (KYC), referrals, marketing campaigns, and troubleshooting',
]);

sectionTitle('2. Platform Architecture (How It Works)');
subTitle('2.1 Technology stack');
table(
  ['Layer', 'Technology', 'Purpose'],
  [
    ['Frontend', 'React 19 + TypeScript + Vite', 'Storefront, owner portal, marketing site'],
    ['Styling', 'Tailwind CSS 4', 'Responsive mobile-first UI'],
    ['Backend API', 'Node.js 20 + Express on Render', 'Orders, payments, owner provisioning, KYC uploads'],
    ['Database', 'Firebase Firestore (bhojanos-prod)', 'Tenants, menus, orders, users, notifications'],
    ['Authentication', 'Firebase Auth', 'Email/password and Google sign-in'],
    ['File storage', 'Firebase Storage', 'Menu images, KYC documents, logos'],
    ['Payments', 'Razorpay + Cash on Delivery', 'Customer checkout'],
    ['Push alerts', 'Firebase Cloud Messaging (FCM)', 'Order alerts on owner devices'],
    ['Hosting', 'Vercel (frontend) + Render (API)', 'Production at bhojanos.com'],
    ['PWA', 'Service Worker + Web App Manifest', 'Install to home screen like a native app'],
    ['Optional native', 'Capacitor 8', 'Android/iOS wrapper if needed'],
  ],
);

subTitle('2.2 Multi-tenant design');
body(
  'Each restaurant is a "tenant" identified by a unique slug (e.g. mana-inti). Your storefront lives at https://www.bhojanos.com/k/{your-slug}. Your owner portal is at https://www.bhojanos.com/owner/dashboard. All data is isolated per tenant — your menu, orders, and customers belong only to your kitchen.',
);

subTitle('2.3 Key URLs');
table(
  ['Purpose', 'URL pattern'],
  [
    ['Marketing / signup', 'https://www.bhojanos.com/onboard'],
    ['Owner register', 'https://www.bhojanos.com/owner/register'],
    ['Owner login', 'https://www.bhojanos.com/owner/login'],
    ['Owner dashboard', 'https://www.bhojanos.com/owner/dashboard'],
    ['Your storefront', 'https://www.bhojanos.com/k/{slug}'],
    ['Customer menu', 'https://www.bhojanos.com/k/{slug}/menu'],
    ['Order tracking', 'https://www.bhojanos.com/k/{slug}/order/{orderId}'],
    ['API (backend)', 'https://manaintibojanam-backend.onrender.com'],
  ],
);

sectionTitle('3. Installation — Add BhojanOS to Your Phone');
body(
  'BhojanOS works in any modern browser and can be installed as a Progressive Web App (PWA) so you get fast access, full-screen mode, and order notifications — without downloading from an app store.',
);
subTitle('3.1 Automatic install prompt');
bullets([
  'When you visit bhojanos.com on mobile, an Install banner may appear after ~30 seconds or when you add items to cart.',
  'Tap Install to add BhojanOS to your home screen.',
]);
subTitle('3.2 Manual installation');
bullets([
  'Android (Chrome): Menu (⋮) → Install app / Add to Home screen',
  'iPhone (Safari): Share button → Add to Home Screen',
  'Desktop (Chrome/Edge): Address bar install icon or browser menu → Install',
]);
subTitle('3.3 App updates');
body(
  'When a new version is deployed, you will see an update prompt. Tap Refresh to load the latest features. If the app behaves oddly after an update, close it completely and reopen from the home screen icon.',
);

sectionTitle('4. Owner Account — Registration & Login');
subTitle('4.1 Create your account (/owner/register)');
numbered([
  'Visit bhojanos.com/onboard or tap Start Free Storefront → Register.',
  'Enter your full name, restaurant name (this becomes your store slug), email, and password. Google sign-in is also supported.',
  'Complete reCAPTCHA security check (when enabled).',
  'System validates your email and creates your Firebase account.',
  'Backend provisions your tenant: creates your kitchen record and links it to your owner profile.',
  'Welcome email is sent with your store link.',
  'You land on /owner/dashboard — setup guide appears if store is not yet complete.',
]);
body(
  'Important: Storefront setup is always free. Live customer orders require the Growth plan. When you publish your store, a 14-day Growth trial starts automatically — no credit card required.',
);

subTitle('4.2 Returning owner login (/owner/login)');
bullets([
  'Sign in with email/password or Google using the same method you registered with.',
  'If you have an existing store, you are taken directly to the Dashboard.',
  'If no store is found, you are guided to register.',
  'Login uses a lightweight fast-loading page optimized for mobile.',
]);

sectionTitle('5. Store Setup — Guided Onboarding (8 Steps)');
body(
  'After registration, complete these steps to publish your store. Total estimated time for required steps: ~25 minutes. Progress is shown on your Dashboard via the Store Setup Guide.',
);
table(
  ['Step', 'Task', 'Where', 'Required', 'Time'],
  [
    ['1', 'Confirm your account', '/owner/setup?step=1', 'Yes', '~1 min'],
    ['2', 'Name your kitchen', '/owner/setup?step=2', 'Yes', '~2 min'],
    ['3', 'Add kitchen address', '/owner/setup?step=3', 'Yes', '~3 min'],
    ['4', 'Set delivery zones (km)', '/owner/setup?step=4', 'Yes', '~2 min'],
    ['5', 'Choose payment methods (COD/Razorpay)', '/owner/setup?step=5', 'Yes', '~2 min'],
    ['6', 'Add menu (minimum 3 items)', '/owner/menu', 'Yes', '~10 min'],
    ['7', 'Verify mobile number', '/owner/kyc', 'Optional*', '~3 min'],
    ['8', 'Publish your store', '/owner/setup?step=7', 'Yes', '~2 min'],
  ],
);
body('* Mobile verification is optional during sandbox testing but recommended before full launch.');
subTitle('5.1 Setup wizard details');
bullets([
  'Step 2 — Kitchen name: This is what customers see on your storefront and receipts.',
  'Step 3 — Address: Used for delivery distance calculation. Pin exact location later in Storefront → Location.',
  'Step 4 — Delivery: Set free-delivery radius and maximum delivery distance in kilometres.',
  'Step 5 — Payments: Enable Cash on Delivery to start immediately. Add Razorpay online payments after KYC.',
  'Step 6 — Menu: Import the Cloud Kitchen starter template OR add dishes manually in Menu Builder. Items need prices to be orderable.',
  'Step 8 — Publish: Sets onboarding complete, activates 14-day Growth trial, makes storefront public.',
]);
body('You can save progress and exit to Dashboard at any time. Click any step in the Store Setup Guide to jump directly to it.');

sectionTitle('6. Owner Portal — Complete Feature Reference');
body('The owner portal is organized into four groups: Run your kitchen, Your store, Grow sales, and Account.');

subTitle('6.1 Dashboard (/owner/dashboard)');
bullets([
  'Store Setup Guide — progress bar and next-step links until go-live',
  'Store Live Control — toggle accepting orders ON/OFF for today',
  'Status bar — orders today, payouts, delivery status, urgent alerts',
  'Share store — copy link and WhatsApp share templates',
  'Kitchen health score and customer segment summary',
  'AI growth recommendations and inventory alerts',
  'Priority actions and release notes',
]);

subTitle('6.2 Orders (/owner/orders)');
bullets([
  'Real-time order queue — new orders appear instantly with sound alert',
  'Status pipeline: Pending → Accepted → Preparing → Out for delivery → Delivered',
  'Reject or cancel orders when needed',
  'Dispatch modal — assign delivery partner (Rapido, etc.), rider name, tracking URL',
  'Notify customer on status change',
  'Quick stock edit — mark menu items out of stock from order screen',
]);

subTitle('6.3 Menu Builder (/owner/menu)');
bullets([
  'Add, edit, delete menu items',
  'Upload photos with automatic WebP compression',
  'Fields: name, description, price, category, veg/non-veg, availability toggle',
  'Minimum 3 items required before customers can order',
]);

subTitle('6.4 Storefront Settings (/owner/settings)');
body('Tabs: General | Hours | Location | Payments | Promotions | Notifications');
bullets([
  'General — kitchen name, WhatsApp number, logo upload, delivery notes',
  'Hours — business hours; integrates with Store Live Control',
  'Location — address, map pin (lat/lng), delivery radii, base fee, per-km fee, GST, packing charges',
  'Payments — toggle COD and Razorpay',
  'Promotions — create coupon codes and offers',
  'Notifications — configure alert preferences',
]);

subTitle('6.5 Compliance / KYC (/owner/kyc)');
bullets([
  'Step 1: Merchant legal declaration',
  'Step 2: Business identity — owner name, mobile, PAN, business details',
  'Step 3: Document upload — identity proof, FSSAI licence number',
  'Status: Not Started → Draft → Pending Review → Verified',
  'Required for full compliance; overdue KYC can restrict publishing and marketing features',
]);

subTitle('6.6 Delivery Intelligence (/owner/delivery) — Pro plan');
bullets([
  'Average delivery distance and success rate',
  'Top delivery areas from order history',
  'Out-of-bounds delivery attempts',
  'Helps optimize zones and staffing',
]);

subTitle('6.7 Customers (/owner/customers) — Growth plan');
bullets([
  'Customer memory built from order history',
  'Search by name, phone, or favourite dish',
  'One-tap WhatsApp and phone call actions',
]);

subTitle('6.8 Growth / Marketing (/owner/marketing) — Growth plan');
bullets([
  'Customer segments: inactive, lost, repeat, VIP, birthday, festival, referral',
  'AI-generated campaign copy for WhatsApp, SMS, Instagram',
  'Coupon code generation and copy-to-clipboard',
]);

subTitle('6.9 Inventory / Recipes (/owner/recipes) — Pro plan');
bullets([
  'Link menu items to ingredient lists with quantities',
  'Powers predictive supply and inventory alerts on dashboard',
]);

subTitle('6.10 Notifications (/owner/notifications)');
bullets([
  'In-app notification center with filters: Sales, Inventory, Kitchen, AI, Payments',
  'Status tabs: All, Unread, Read, Critical',
  'Push notifications via FCM when enabled on your device',
]);

subTitle('6.11 Payments & Plans (/owner/subscription)');
bullets([
  'View current plan and trial status',
  'Compare Starter, Growth, Pro, Enterprise plans',
  'Upgrade when ready — Growth required for live orders',
  'Zero commission on all plans',
]);

subTitle('6.12 Refer & Earn (/owner/referrals)');
bullets([
  'Your unique referral code (format: BHOJ-{code})',
  'Share via WhatsApp — earn plan rewards when other owners sign up',
  'Milestones: 1 referral → 1 month Growth; 3 referrals → 1 month Pro',
]);

subTitle('6.13 Help & Feedback (/owner/feedback)');
bullets([
  'Submit feature requests, bug reports, suggestions, or ratings',
  'Direct line to BhojanOS support team',
]);

subTitle('6.14 Reports (/owner/operations)');
bullets([
  'AI morning brief with daily insights',
  'Forecast accuracy and scenario simulation (discounts, ad spend, VIP campaigns)',
]);

sectionTitle('7. Plans, Trials & Feature Access');
body(PRICING_NOTE);
table(
  ['Plan', 'Price', 'Live orders', 'Key features'],
  [
    ['Starter (Free)', '₹0/month', 'No — build only', 'Storefront setup, 1 user, preview mode'],
    ['Growth', '₹999/month', 'Yes — 500 orders/mo', 'Marketing, customer insights, AI coach, 3 users'],
    ['Pro', '₹2,999/month', 'Yes — unlimited', '+ Revenue insights, delivery intel, inventory/recipes'],
    ['Enterprise', '₹4,999/month', 'Yes — unlimited', '+ Multi-outlet, API access, priority support'],
  ],
);
subTitle('Trials');
bullets([
  '14-day Growth trial — starts automatically when you publish your store (first go-live)',
  '3-day trial — when upgrading to Pro or Growth later from the free storefront',
  'After trial expires, live orders pause until you upgrade to Growth',
]);
subTitle('Feature gates by plan');
table(
  ['Feature', 'Starter', 'Growth', 'Pro', 'Enterprise'],
  [
    ['Accept live orders', 'No', 'Yes', 'Yes', 'Yes'],
    ['Marketing campaigns', 'No', 'Yes', 'Yes', 'Yes'],
    ['Customer insights', 'No', 'Yes', 'Yes', 'Yes'],
    ['Delivery intelligence', 'No', 'No', 'Yes', 'Yes'],
    ['Inventory / recipes', 'No', 'No', 'Yes', 'Yes'],
    ['API access', 'No', 'No', 'No', 'Yes'],
  ],
);

sectionTitle('8. Going Live & Daily Operations');
subTitle('8.1 Two controls for store availability');
bullets([
  'Publish (one-time setup) — wizard step 8; makes storefront public and starts Growth trial',
  'Store Live Control (daily) — toggle on Dashboard to accept or pause orders today',
]);
subTitle('8.2 Share your store');
body('Your public store URL: https://www.bhojanos.com/k/{your-slug}');
bullets([
  'Copy link from Dashboard and share on WhatsApp, Instagram, Google Maps, or print QR codes',
  'Customers can install your storefront as a PWA on their phones too',
  'Preview mode: add ?preview=customer to test as a guest without placing real orders',
]);
subTitle('8.3 Order handling workflow');
numbered([
  'Customer places order on your storefront → appears in Orders tab with sound alert',
  'Accept the order → status moves to Accepted',
  'Start preparing food → mark Preparing',
  'Assign delivery partner and rider → Out for delivery (add tracking link)',
  'Confirm delivery → Delivered',
  'For COD: collect payment on delivery. For Razorpay: payment is already captured online.',
]);

sectionTitle('9. Customer Journey — Browse to Delivery');
body('This section explains what your customers experience on your branded storefront.');

subTitle('9.1 Discover & browse');
table(
  ['Step', 'Customer action', 'URL'],
  [
    ['Land on store', 'See trending dishes, categories, offers', '/k/{slug}/'],
    ['Browse menu', 'Search, filter veg/non-veg, view prices', '/k/{slug}/menu'],
    ['Add to cart', 'Select items, adjust quantities', 'Floating cart icon'],
    ['View policies', 'Terms, privacy, refund policy', '/k/{slug}/terms etc.'],
  ],
);

subTitle('9.2 Checkout & payment');
numbered([
  'Customer opens cart and proceeds to Checkout (/k/{slug}/checkout)',
  'Selects or adds delivery address (with map pin for distance calculation)',
  'Chooses delivery time slot (scheduled or ASAP)',
  'Applies promo code if available',
  'Selects payment: Cash on Delivery or Razorpay (UPI, cards, wallets)',
  'Places order — receives confirmation page and order ID',
]);

subTitle('9.3 Order tracking & account');
bullets([
  'Live tracking page: /k/{slug}/order/{orderId} — status updates in real time',
  'My Orders: /k/{slug}/orders — order history (login required)',
  'Account & saved addresses for repeat customers',
  'Meal subscription page if you enable subscriptions',
]);

subTitle('9.4 Delivery (customer side)');
bullets([
  'Delivery fee calculated from your zone settings (free radius, max radius, per-km fee)',
  'ETA shown: prep time + ~4 minutes per kilometre',
  'Customer receives status updates: created → preparing → dispatched → delivered',
  'Push notifications if customer has installed the PWA and allowed alerts',
]);

sectionTitle('10. Design & Branding');
bullets([
  'Upload your logo in Storefront → General settings',
  'Kitchen name and description appear on storefront header',
  'Menu photos — high-quality images increase conversion; use Menu Builder upload',
  'Theme uses your brand colors with BhojanOS platform chrome',
  'WhatsApp share templates on Dashboard use your store name automatically',
  'FSSAI number displayed on storefront when configured in KYC',
]);

sectionTitle('11. Troubleshooting & FAQ');
table(
  ['Problem', 'Solution'],
  [
    ['Stuck on login / redirect', 'Hard refresh (Ctrl+Shift+R). Ensure same sign-in method as registration.'],
    ['Dashboard shows loading forever', 'Check internet. Sign out and sign in. Contact support if persists.'],
    ['Orders not appearing', 'Confirm Store Live Control is ON. Check Growth trial has not expired.'],
    ['Cannot publish store', 'Complete all required setup steps. Add at least 3 menu items with prices.'],
    ['Customer cannot order', 'Store must be published + live. Check delivery address is in your zone.'],
    ['Payment failed (Razorpay)', 'Verify Razorpay is enabled in Settings. Customer retries or uses COD.'],
    ['Old app version / bugs', 'Accept PWA update prompt or reinstall from browser.'],
    ['Wrong store name showing', 'Update in Storefront → General. Clear browser cache.'],
    ['Tenant not linked to account', 'Sign out/in. Backend auto-repairs ownedTenantIds on login.'],
  ],
);

sectionTitle('12. Support & Contact');
bullets([
  'Email: bhojanos26@gmail.com',
  'In-app: Owner portal → Help & Feedback (/owner/feedback)',
  'Website: https://www.bhojanos.com/contact',
  'Security page: https://www.bhojanos.com/security',
]);

sectionTitle('Appendix A — Full Owner Route Index');
table(
  ['Path', 'Name', 'Plan gate'],
  [
    ['/owner/dashboard', 'Dashboard', '—'],
    ['/owner/orders', 'Orders', '—'],
    ['/owner/menu', 'Menu Builder', '—'],
    ['/owner/settings', 'Storefront Settings', '—'],
    ['/owner/kyc', 'Compliance (KYC)', '—'],
    ['/owner/setup', 'Store Setup Wizard', '—'],
    ['/owner/delivery', 'Delivery Intelligence', 'Pro'],
    ['/owner/customers', 'Customers', 'Growth'],
    ['/owner/marketing', 'Growth Campaigns', 'Growth'],
    ['/owner/recipes', 'Inventory / Recipes', 'Pro'],
    ['/owner/notifications', 'Notifications', '—'],
    ['/owner/subscription', 'Payments & Plans', '—'],
    ['/owner/referrals', 'Refer & Earn', '—'],
    ['/owner/feedback', 'Help & Feedback', '—'],
    ['/owner/operations', 'Reports / Forecasts', '—'],
  ],
);

sectionTitle('Appendix B — Order Status Reference');
table(
  ['Status', 'Owner action', 'Customer sees'],
  [
    ['Pending / Created', 'Review and Accept or Reject', 'Order placed — waiting confirmation'],
    ['Accepted', 'Begin preparation', 'Restaurant confirmed your order'],
    ['Preparing', 'Food being made', 'Your food is being prepared'],
    ['Out for delivery', 'Assign rider, add tracking', 'On the way to you'],
    ['Delivered', 'Mark complete', 'Order delivered — enjoy!'],
    ['Rejected / Cancelled', 'Reason optional', 'Order cancelled'],
  ],
);

sectionTitle('Appendix C — Quick Start Checklist');
numbered([
  'Register at bhojanos.com/owner/register',
  'Install PWA on your phone for order alerts',
  'Complete all 8 setup steps (publish on step 8)',
  'Add at least 3 menu items with photos and prices',
  'Enable Cash on Delivery in payments step',
  'Turn ON Store Live Control on Dashboard',
  'Share your store link: bhojanos.com/k/your-slug',
  'Accept your first test order from a friend',
  'Complete KYC for full compliance and Razorpay',
  'Explore Growth features: marketing, customer insights',
]);

// Write PDF
mkdirSync(OUT_DIR, { recursive: true });
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
writeFileSync(OUT_FILE, pdfBuffer);
console.log(`Generated: ${OUT_FILE}`);
console.log(`Pages: ${doc.getNumberOfPages()}`);
console.log(`Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
