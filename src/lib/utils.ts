import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { OrderStatus } from '../types';

export function formatPrice(price: number | undefined | null) {
  if (price === undefined || price === null || isNaN(price)) {
    return '₹0';
  }
  const rounded = Math.round(price);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(rounded);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDeliveryFee(distanceKm?: number) {
  const baseFee = 20;
  const perKmRate = 16;
  const fallbackFee = 40;

  if (distanceKm === undefined || distanceKm === null) {
    return fallbackFee;
  }

  return baseFee + (distanceKm * perKmRate);
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    case 'verification_pending':
    case 'pending_verification':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
    case 'paid': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    case 'expired': return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
    case OrderStatus.PLACED: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    case OrderStatus.PENDING: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    case OrderStatus.PAYMENT_PENDING: return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300';
    case OrderStatus.PAYMENT_VERIFICATION: return 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300';
    case OrderStatus.PREPARING: return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    case OrderStatus.READY: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    case OrderStatus.OUT_FOR_DELIVERY: return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
    case OrderStatus.DELIVERED: return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    case OrderStatus.CANCELLED: return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    case OrderStatus.EXPIRED: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
    default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
  }
}

export function safeParseDate(date: any): Date {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  if (typeof date === 'number') return new Date(date);
  if (typeof date === 'string') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (date.seconds) return new Date(date.seconds * 1000);
  if (date.toDate && typeof date.toDate === 'function') return date.toDate();
  return new Date();
}



export interface GlassCardItem {
  id: number;
  title: string;
  description: string;
  color: string;
  stats?: { label: string; value: string }[];
  pills?: string[];
}

export const cardData: GlassCardItem[] = [
  {
    id: 1,
    title: "Direct Online Ordering Engine",
    description: "Launch your own zero-commission branded storefront in minutes. Keep 100% of your guest data, repeat orders, and restaurant profits.",
    color: "rgba(217, 119, 6, 0.8)",
    stats: [
      { label: "Commission Fee", value: "0% Forever" },
      { label: "Guest Data", value: "100% Yours" },
      { label: "Payout Time", value: "Instant T+0" }
    ],
    pills: ["Zero Aggregator Fees", "Custom Domain", "UPI 2.0 Direct"]
  },
  {
    id: 2,
    title: "Kitchen Station Routing & Real-Time KDS",
    description: "Eliminate paper ticket clutter and kitchen chaos. Automatically route incoming dishes to Grill, Fryer, Assembly, and Packing stations.",
    color: "rgba(16, 185, 129, 0.8)",
    stats: [
      { label: "Prep Accuracy", value: "99.8%" },
      { label: "Ticket Lag", value: "<150ms" },
      { label: "Stations", value: "Unlimited" }
    ],
    pills: ["Station Routing", "Auto Sound Alerts", "Rider Coordination"]
  },
  {
    id: 3,
    title: "Instant 3PL Courier Auto-Dispatch",
    description: "Integrated directly with Shadowfax, Dunzo, and Porter. Broadcast delivery orders to nearby riders with secure pickup OTPs.",
    color: "rgba(59, 130, 246, 0.8)",
    stats: [
      { label: "Rider Pickup", value: "12 mins avg" },
      { label: "Delivery Radius", value: "15 km" },
      { label: "Dispatch Cost", value: "Direct at-cost" }
    ],
    pills: ["Shadowfax API", "Dunzo Direct", "Porter Bulk Dispatch"]
  },
  {
    id: 4,
    title: "Real-Time Gross Profit Intelligence",
    description: "Live gross margins, ingredient COGS deduction, recipe-level profitability, and daily automated GST & financial reconciliation.",
    color: "rgba(168, 85, 247, 0.8)",
    stats: [
      { label: "COGS Visibility", value: "Live" },
      { label: "Menu Margin", value: "+28% avg" },
      { label: "GST Reports", value: "Automated" }
    ],
    pills: ["Recipe Costing", "Batch Tracking", "P&L Analytics"]
  }
];
