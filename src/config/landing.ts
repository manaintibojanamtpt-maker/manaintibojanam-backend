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
  category: 'A kitchen operating system',
  badges: ['0% Commission', 'No Onboarding Fee', 'AI Powered', 'Own Your Customers'],
  headlineLines: ['Your Restaurant.', 'Your Customers.', 'Your Brand.', '0% Commission.'],
  subhead:
    'Run your entire restaurant from one AI-powered operating system.',
  description:
    'Build your branded storefront for free. When you publish, start a 14-day Growth trial to accept live orders — 0% commission, always.',
  primaryCta: 'Start Free Storefront',
  secondaryCta: 'Watch 2 Minute Demo',
  demoTargetId: 'dashboard-preview',
  trustStars: 5,
  trustLabel: 'Launching Early Access',
  trustSub: 'Already onboarding restaurants across India',
};

export const platformFeatures: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Store,
    title: 'Storefront',
    description: 'Your branded online store with menu, checkout, and customer data you own.',
  },
  {
    icon: ChefHat,
    title: 'Kitchen Operations',
    description: 'Live order queue, prep tracking, and kitchen health in one command center.',
  },
  {
    icon: Package,
    title: 'Inventory',
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
    description: 'Online and cash payments with your gateway — 0% commission on direct orders.',
  },
  {
    icon: Users,
    title: 'Customer CRM',
    description: 'Repeat buyers, order history, and retention campaigns from your own database.',
  },
  {
    icon: Megaphone,
    title: 'Marketing Automation',
    description: 'WhatsApp campaigns, win-back flows, and share tools that drive direct orders.',
  },
  {
    icon: Sparkles,
    title: 'AI Copilot',
    description: 'Demand forecasts, prep suggestions, and actionable insights — explained clearly.',
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
  { type: 'success', title: 'Morning Briefing', body: 'Revenue increased 18% vs last week.' },
  { type: 'warning', title: 'Paneer stock low', body: 'Reorder before Friday lunch rush.' },
  { type: 'neutral', title: 'Chicken sufficient', body: '8.4 kg remaining — no action needed.' },
  { type: 'info', title: 'Recommended menu today', body: 'Highlight Biryani combo — high conversion.' },
  { type: 'success', title: 'Customers likely to reorder', body: '14 high-value customers due this week.' },
  { type: 'info', title: 'WhatsApp campaign ready', body: 'Win-back message drafted for 23 customers.' },
  { type: 'success', title: 'Weekly profit', body: '₹1,24,800 net after costs — up 12%.' },
  { type: 'warning', title: 'Delivery delay warning', body: 'Zone B averaging +8 min — add rider.' },
  { type: 'info', title: 'Sales forecast', body: '420–460 orders projected this weekend.' },
];

export const howItWorksSteps = [
  { step: 1, title: 'Create Store', description: 'Sign up and get your branded storefront URL in minutes.' },
  { step: 2, title: 'Upload Menu', description: 'Add items, photos, and pricing — or use our cloud kitchen template.' },
  { step: 3, title: 'Accept Orders', description: 'Direct orders flow to your kitchen queue in real time.' },
  { step: 4, title: 'Receive Payments', description: 'Cash or online — settled to your account, 0% commission.' },
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
    question: 'Can I migrate from Zomato?',
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
      'Every kitchen gets a bhojanos.com/your-kitchen URL at launch. Custom domain support is available on Growth and above.',
  },
];
