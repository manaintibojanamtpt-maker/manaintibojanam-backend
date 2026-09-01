import {
  Store,
  ChefHat,
  Package,
  Truck,
  CreditCard,
  Users,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const landingHero = {
  category: 'The Food Business Platform',
  badges: ['0% Commission', 'Own Your Customers', 'Direct Ordering', 'AI Powered'],
  headlineLines: ['One food platform.', 'From kitchen to customer.', ''],
  subhead:
    'BhojanOS powers independent food businesses. OrderBhojan connects them directly with customers.',
  description:
    'Run your restaurant with BhojanOS. Let your customers order directly through OrderBhojan. Zero commission, full ownership, complete control.',
  primaryCta: 'Get Started',
  secondaryCta: 'Order Food',
  demoTargetId: 'ecosystem',
  trustStars: 5,
  trustLabel: 'Built for independent food businesses',
  trustSub: 'Direct ordering. Zero commission. Full ownership.',
};

export const platformFeatures: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Store,
    title: 'Branded Storefront',
    description: 'Your own ordering page under your name. Menu, checkout, and customer data you own.',
  },
  {
    icon: ChefHat,
    title: 'Kitchen Operations',
    description: 'Live order queue, prep tracking, and kitchen health in one command center.',
  },
  {
    icon: Package,
    title: 'Inventory Management',
    description: 'Recipe-linked stock, low-stock alerts, and automatic deduction on every order.',
  },
  {
    icon: Truck,
    title: 'Delivery Management',
    description: 'Zones, fees, live tracking, and delivery partner controls under your brand.',
  },
  {
    icon: CreditCard,
    title: 'Payments',
    description: 'Online (Razorpay) and cash payments — settled to your account, 0% commission.',
  },
  {
    icon: Users,
    title: 'Customer CRM',
    description: 'Repeat buyers, order history, and retention campaigns from your own database.',
  },
  {
    icon: Megaphone,
    title: 'Marketing Tools',
    description: 'WhatsApp campaigns, win-back flows, and share tools that drive direct orders.',
  },
  {
    icon: Sparkles,
    title: 'AI Insights',
    description: 'Order trends, prep suggestions, and actionable insights — explained clearly.',
  },
];

export const commissionComparison = {
  title: 'Why Pay 30% Commission?',
  subtitle: 'Aggregators rent you customers. BhojanOS gives you the full stack to own them.',
  columns: ['Swiggy', 'Zomato', 'BhojanOS'] as const,
  rows: [
    { label: 'Commission', swiggy: '18–28%', zomato: '18–28%', bhojanos: '0%' },
    { label: 'Customer Ownership', swiggy: 'Platform', zomato: 'Platform', bhojanos: 'You' },
    { label: 'Own Website', swiggy: false, zomato: false, bhojanos: true },
    { label: 'Own Payment Gateway', swiggy: false, zomato: false, bhojanos: true },
    { label: 'Own Branding', swiggy: 'Limited', zomato: 'Limited', bhojanos: 'Full' },
    { label: 'AI Insights', swiggy: false, zomato: false, bhojanos: true },
    { label: 'Inventory', swiggy: false, zomato: false, bhojanos: true },
    { label: 'Kitchen Ops', swiggy: false, zomato: false, bhojanos: true },
    { label: 'Analytics', swiggy: 'Basic', zomato: 'Basic', bhojanos: 'Advanced' },
    { label: 'Delivery Control', swiggy: 'Limited', zomato: 'Limited', bhojanos: 'Full' },
  ],
};

export const aiManagerInsights = [
  { type: 'info', title: 'AI Insights', body: 'Order trends, prep suggestions, and actionable insights — explained clearly.' },
  { type: 'neutral', title: 'Kitchen Health', body: 'Monitor prep latency, packaging bottlenecks, and kitchen performance.' },
  { type: 'success', title: 'Customer Retention', body: 'Track repeat buyers, order history, and retention campaigns.' },
  { type: 'warning', title: 'Inventory Alerts', body: 'Low-stock warnings and automatic deduction on every order.' },
];

export const howItWorksSteps = [
  { step: 1, title: 'Create Store', description: 'Sign up and get your branded storefront URL in minutes.' },
  { step: 2, title: 'Upload Menu', description: 'Add items, photos, and pricing — organize by categories.' },
  { step: 3, title: 'Accept Orders', description: 'Customers discover you on OrderBhojan and order directly — orders land in your BhojanOS dashboard instantly.' },
  { step: 4, title: 'Receive Payments', description: 'Online (Razorpay) or cash — settled to your account, 0% commission.' },
  { step: 5, title: 'Grow Customers', description: 'CRM, WhatsApp, and AI tools to drive repeat direct sales.' },
];

export const builtForSegments = [
  { title: 'Cloud Kitchens', description: 'Multi-brand ops from one command center.' },
  { title: 'Restaurants', description: 'Dine-in and delivery under your own brand.' },
  { title: 'Cafes', description: 'Fast menus, quick checkout, loyal regulars.' },
  { title: 'Sweet Shops', description: 'Seasonal menus and festival campaigns.' },
  { title: 'Bakeries', description: 'Pre-orders, inventory, and delivery slots.' },
  { title: 'Quick Service', description: 'High-volume kitchens with live queue control.' },
];

export const landingFaq = [
  {
    question: 'What is OrderBhojan?',
    answer:
      'OrderBhojan is the customer-facing food ordering platform powered by BhojanOS. Customers discover local food businesses, view menus, and place orders directly.',
  },
  {
    question: 'How does OrderBhojan connect to BhojanOS?',
    answer:
      'Every restaurant on OrderBhojan is managed through BhojanOS. Orders placed on OrderBhojan flow directly to the restaurant\'s BhojanOS dashboard.',
  },
  {
    question: 'Where do my customers place orders?',
    answer:
      'On OrderBhojan — the customer ordering experience at orderbhojan.web.app. Every OrderBhojan order flows directly into your BhojanOS dashboard. Customers can also order from your own branded storefront.',
  },
  {
    question: 'Why 0% commission?',
    answer:
      'BhojanOS is software — not a marketplace. You own the customer relationship and keep 100% of every direct order. We charge a flat monthly fee only if you choose advanced tools.',
  },
  {
    question: 'Can I use my own delivery?',
    answer:
      'Yes. Configure delivery zones, fees, and partner handoffs from your owner dashboard. You control riders, third-party couriers, or in-house delivery.',
  },
  {
    question: 'Can I use my own payment gateway?',
    answer:
      'Yes. Connect Razorpay or accept cash on delivery. Payments go to your account — BhojanOS never takes a cut of order value.',
  },
  {
    question: 'Can I migrate from Zomato or Swiggy?',
    answer:
      'Many kitchens run BhojanOS alongside aggregators first, then shift repeat customers to their direct storefront. We help you import menu and launch quickly.',
  },
  {
    question: 'Can I manage multiple outlets?',
    answer:
      'Enterprise plans support multi-outlet readiness with centralized reporting and per-location controls.',
  },
  {
    question: 'Can I use my own domain?',
    answer:
      'Every kitchen gets a branded URL at launch. Custom domain support is available on Growth and above.',
  },
];
