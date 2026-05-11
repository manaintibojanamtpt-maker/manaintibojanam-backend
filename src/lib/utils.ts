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

