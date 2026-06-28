export type PaidPlanId = 'growth' | 'pro' | 'enterprise';
export type PlanId = 'starter' | PaidPlanId;

/** Trial lengths — single source of truth for onboarding & upgrade copy */
export const PLAN_TRIALS = {
  /** Growth trial when a kitchen first goes live and accepts orders */
  growthOnboardingDays: 14,
  /** Pro or Growth trial when upgrading from the free storefront later */
  paidUpgradeDays: 3,
} as const;

export const onboardingPlanMessaging = {
  registerTitle: 'Create your Store',
  registerSubtitle:
    'Build your storefront for free — no credit card. When you publish, start a 14-day Growth trial to accept live customer orders.',
  registerButton: 'Start Free Storefront',
  registerFootnote:
    'Storefront setup is always free. Live orders need Growth (14-day trial included when you go live). Pro & Growth upgrades later: 3-day trial.',
  wizardIntro:
    'You are setting up your free storefront. Customer orders go live after you publish — that starts your 14-day Growth trial.',
  publishTitle: 'Ready to accept orders?',
  publishBody:
    'Publishing turns on live ordering for customers. Your 14-day Growth trial starts now — free, no card required. After the trial, Growth is ₹999/month to keep accepting orders.',
  publishReminder:
    'Want Pro analytics instead? You can try Pro or Growth anytime from Payments & plans (3-day trial).',
  heroPlanNote:
    'Free storefront setup · 14-day Growth trial to accept orders · 3-day trial on Pro & Growth upgrades',
};

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
  /** Short trial / plan note shown on cards */
  trialNote?: string;
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
      'Your storefront is free to build. Growth is required for live orders (14-day trial at publish). Pro and Growth upgrades include a 3-day trial — zero commission on orders, always.',
    currentPlanLabel: 'Your current plan',
    compareTitle: 'Choose the right plan for your kitchen',
    compareHelper: 'Free storefront to build · Growth to accept orders · Pro for advanced intelligence.',
    trialTitle: 'Try before you upgrade',
    trialHelper: `New kitchens: ${PLAN_TRIALS.growthOnboardingDays}-day Growth trial when you publish (to accept orders). Already on the free storefront? Try Pro or Growth for ${PLAN_TRIALS.paidUpgradeDays} days from here.`,
    upgradeSuccess: 'Plan updated successfully. New features are now active on your account.',
    upgradeConfirm: (planName: string) =>
      `Upgrade to ${planName}? You will unlock advanced tools immediately. Zero commission on orders stays the same.`,
    contactSales: 'Talk to us about Enterprise',
  },
  landing: {
    eyebrow: 'Simple monthly pricing',
    title: 'Free storefront. Growth plan for live orders.',
    subtitle:
      'Create and customize your branded storefront at no cost. When you are ready for customers to order, Growth includes a 14-day free trial — zero commission on every order, always.',
    whyPayTitle: 'Why is there a monthly fee?',
    whyPayBody:
      'Aggregators take 20–30% per order forever. BhojanOS charges a flat monthly fee only when you accept live orders (Growth and above). Your storefront itself stays free to build.',
    faqTitle: 'Pricing questions',
    trialBanner:
      '14-day Growth trial when you publish · 3-day trial when upgrading to Pro or Growth later · No credit card to start',
  },
};

export const PRICING_FAQ = [
  {
    question: 'Is the storefront really free?',
    answer:
      'Yes. Creating your branded storefront, menu, and store settings is free with no credit card. You only need a paid plan when you want customers to place live orders.',
  },
  {
    question: 'When do I need the Growth plan?',
    answer:
      'Growth is required to accept live customer orders. When you finish setup and publish, your 14-day Growth trial starts automatically — free, no card required.',
  },
  {
    question: 'What about the 3-day trial?',
    answer:
      'If you are already on the free storefront and want to explore Pro or Growth features later, you can start a 3-day trial from Payments & plans in your owner portal.',
  },
  {
    question: 'Do you charge commission on orders?',
    answer:
      'No. BhojanOS never takes a cut of your order value. You keep 100% of direct orders on every plan — Growth, Pro, and Enterprise.',
  },
  {
    question: 'Is there an onboarding fee?',
    answer:
      'No. Launch your branded storefront for free. Growth (for live orders) includes a 14-day trial when you publish.',
  },
  {
    question: 'Can I switch plans later?',
    answer:
      'Yes. Upgrade or downgrade anytime from Payments & plans in your owner portal. Changes apply to your next billing cycle.',
  },
  {
    question: 'Does every plan include a branded storefront?',
    answer:
      'Yes. Every owner gets a free Direct Storefront to build and preview. Live ordering unlocks with Growth (14-day trial at publish).',
  },
];

export const FREE_PLAN: PricingPlan = {
  id: 'starter',
  name: 'Direct Storefront',
  price: 0,
  priceLabel: '₹0',
  period: 'forever · build & preview',
  tagline: 'Create your branded storefront at no cost.',
  badge: 'Free to start',
  trialNote: 'Setup only — live orders need Growth',
  positioning: 'Build your store for free',
  features: [
    'Branded storefront & menu editor',
    'Store preview & configuration',
    'Zero commission on direct orders',
    'No onboarding fee or credit card',
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
    tagline: 'Required to accept live customer orders.',
    badge: 'Required for live orders',
    trialNote: `${PLAN_TRIALS.growthOnboardingDays}-day free trial when you publish`,
    positioning: 'For kitchens going live',
    features: [
      'Everything in Direct Storefront',
      'Accept live customer orders',
      'Order & kitchen management',
      'Cash & online payments',
      'Customer & order insights',
      'Basic growth campaigns (WhatsApp)',
      'Delivery zone controls',
    ],
    cta: 'Start 14-day free trial',
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
    trialNote: `${PLAN_TRIALS.paidUpgradeDays}-day trial when upgrading from free`,
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
  { label: 'Branded storefront (free to build)', starter: true, growth: true, pro: true, enterprise: true },
  { label: 'Accept live customer orders', starter: false, growth: true, pro: true, enterprise: true },
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

/** ISO date string for Growth onboarding trial end */
export const growthOnboardingTrialExpiresAt = (): string => {
  const expires = new Date();
  expires.setDate(expires.getDate() + PLAN_TRIALS.growthOnboardingDays);
  return expires.toISOString();
};
