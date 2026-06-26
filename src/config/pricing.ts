export type PaidPlanId = 'growth' | 'pro' | 'enterprise';
export type PlanId = 'starter' | PaidPlanId;

export interface PricingPlan {
  id: PlanId;
  name: string;
  price: number;
  priceLabel: string;
  period: string;
  tagline: string;
  badge?: string;
  features: string[];
  cta: string;
  ownerCta: string;
  highlighted?: boolean;
  positioning: string;
}

export interface PaidPricingPlan extends Omit<PricingPlan, 'id'> {
  id: PaidPlanId;
}

export const PRICING_ZERO_COMMISSION_NOTE =
  'Zero commission on every order — on all plans. You pay for software and intelligence, not per order.';

export const pricingPageCopy = {
  owner: {
    title: 'Payments & plans',
    subtitle:
      'Your storefront stays free to start. Upgrade when you want deeper analytics, automation, and growth tools — never pay commission on orders.',
    currentPlanLabel: 'Your current plan',
    compareTitle: 'Choose the right plan for your kitchen',
    compareHelper: 'All plans include your branded storefront and zero-commission direct ordering.',
    trialTitle: 'Try before you upgrade',
    trialHelper: 'Start a 3-day trial on any paid plan. No charge if you stay on the free storefront.',
    upgradeSuccess: 'Plan updated successfully. New features are now active on your account.',
    upgradeConfirm: (planName: string) =>
      `Upgrade to ${planName}? You will unlock advanced tools immediately. Zero commission on orders stays the same.`,
    contactSales: 'Talk to us about Enterprise',
  },
  landing: {
    eyebrow: 'Simple monthly pricing',
    title: 'Software that pays for itself — not commission on your orders',
    subtitle:
      'Start with a free branded storefront. Upgrade when you want smarter operations, growth tools, and full intelligence. Every plan: zero commission, no onboarding fee.',
    whyPayTitle: 'Why is there a monthly fee?',
    whyPayBody:
      'Aggregators take 20–30% per order forever. BhojanOS charges a flat monthly fee for the software — orders, delivery tools, reports, and optional AI — so you keep 100% of every direct sale.',
    faqTitle: 'Pricing questions',
  },
};

export const PRICING_FAQ = [
  {
    question: 'Do you charge commission on orders?',
    answer:
      'No. BhojanOS never takes a cut of your order value. You keep 100% of direct orders on every plan — Growth, Pro, and Enterprise.',
  },
  {
    question: 'Is there an onboarding fee?',
    answer:
      'No. You can launch your branded storefront for free. Paid plans are optional upgrades for advanced tools.',
  },
  {
    question: 'Can I switch plans later?',
    answer:
      'Yes. Upgrade or downgrade anytime from Payments & plans in your owner portal. Changes apply to your next billing cycle.',
  },
  {
    question: 'Does every plan include a branded storefront?',
    answer:
      'Yes. Every owner gets their own store URL, menu, and order flow — free on the Direct Storefront plan and included on all paid plans.',
  },
];

export const FREE_PLAN: PricingPlan = {
  id: 'starter',
  name: 'Direct Storefront',
  price: 0,
  priceLabel: '₹0',
  period: 'to start · zero commission forever',
  tagline: 'Launch your kitchen online with no upfront cost.',
  badge: 'Free to start',
  positioning: 'Everything you need to take direct orders',
  features: [
    'Branded storefront & menu',
    'Zero commission on all orders',
    'Order & kitchen management',
    'Cash & online payments',
    'WhatsApp store sharing',
    'Basic store hours & settings',
  ],
  cta: 'Start free storefront',
  ownerCta: 'Current plan',
};

export const PAID_PLANS: PaidPricingPlan[] = [
  {
    id: 'growth',
    name: 'Growth',
    price: 999,
    priceLabel: '₹999',
    period: '/ month',
    tagline: 'For growing kitchens ready to scale direct sales.',
    positioning: 'For growing kitchens',
    features: [
      'Everything in Direct Storefront',
      'Customer & order insights',
      'Basic growth campaigns (WhatsApp)',
      'Delivery zone controls',
      'Daily performance reports',
      'Email & chat support',
    ],
    cta: 'Start with Growth',
    ownerCta: 'Upgrade to Growth',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 2999,
    priceLabel: '₹2,999',
    period: '/ month',
    tagline: 'For serious operators who want data-driven decisions.',
    badge: 'Most Popular',
    highlighted: true,
    positioning: 'For serious restaurant operators',
    features: [
      'Everything in Growth',
      'Advanced analytics & revenue reports',
      'AI recommendations with clear actions',
      'Delivery intelligence & zone optimization',
      'Customer retention & win-back tools',
      'Inventory alerts & prep automation',
    ],
    cta: 'Upgrade to Pro',
    ownerCta: 'Upgrade to Pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 4999,
    priceLabel: '₹4,999',
    period: '/ month',
    tagline: 'For advanced operations, multi-outlet readiness, and full AI power.',
    positioning: 'For advanced operations & multi-outlet',
    features: [
      'Everything in Pro',
      'Full AI intelligence suite',
      'Multi-outlet readiness',
      'Advanced operational dashboards',
      'Priority support & onboarding help',
      'API access & deeper automation',
    ],
    cta: 'Start Enterprise',
    ownerCta: 'Upgrade to Enterprise',
  },
];

export const ALL_PLANS: PricingPlan[] = [FREE_PLAN, ...PAID_PLANS];

export const COMPARISON_ROWS: Array<{
  label: string;
  starter: boolean | string;
  growth: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}> = [
  { label: 'Zero commission on orders', starter: true, growth: true, pro: true, enterprise: true },
  { label: 'Branded storefront', starter: true, growth: true, pro: true, enterprise: true },
  { label: 'No onboarding fee', starter: true, growth: true, pro: true, enterprise: true },
  { label: 'Growth campaigns', starter: false, growth: true, pro: true, enterprise: true },
  { label: 'Advanced analytics', starter: false, growth: 'Basic', pro: true, enterprise: true },
  { label: 'AI recommendations', starter: false, growth: false, pro: true, enterprise: true },
  { label: 'Delivery intelligence', starter: false, growth: false, pro: true, enterprise: true },
  { label: 'Inventory intelligence', starter: false, growth: false, pro: true, enterprise: true },
  { label: 'Multi-outlet ready', starter: false, growth: false, pro: false, enterprise: true },
  { label: 'API access', starter: false, growth: false, pro: false, enterprise: true },
  { label: 'Priority support', starter: false, growth: false, pro: 'Standard', enterprise: 'Priority' },
];

export const getPlanById = (id: string): PricingPlan | undefined =>
  ALL_PLANS.find((p) => p.id === id);

export const formatPlanDisplayName = (planId: string): string => {
  if (planId === 'starter') return 'Direct Storefront (Free)';
  return getPlanById(planId)?.name || planId;
};
