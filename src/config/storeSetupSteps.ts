import {
  Store,
  MapPin,
  Truck,
  CreditCard,
  Menu as MenuIcon,
  Phone,
  Rocket,
  UserCheck,
  LucideIcon,
} from 'lucide-react';

export type StoreSetupStepId =
  | 'account'
  | 'kitchen'
  | 'location'
  | 'delivery'
  | 'payments'
  | 'menu'
  | 'mobile'
  | 'go-live';

export interface StoreSetupStepDefinition {
  id: StoreSetupStepId;
  wizardStep?: number;
  title: string;
  shortTitle: string;
  description: string;
  instruction: string;
  tip?: string;
  estimatedMinutes: number;
  path: string;
  icon: LucideIcon;
  required: boolean;
}

/** Single source of truth — order matters for the guided flow. */
export const STORE_SETUP_STEPS: StoreSetupStepDefinition[] = [
  {
    id: 'account',
    wizardStep: 1,
    title: 'Confirm your account',
    shortTitle: 'Account',
    description: 'Your owner login and email are linked to this store.',
    instruction: 'Verify the email shown is correct. You can change profile details later in Settings.',
    estimatedMinutes: 1,
    path: '/owner/setup',
    icon: UserCheck,
    required: true,
  },
  {
    id: 'kitchen',
    wizardStep: 2,
    title: 'Name your kitchen',
    shortTitle: 'Kitchen name',
    description: 'This is the name customers see on your storefront and order receipts.',
    instruction: 'Use your restaurant or cloud-kitchen brand name — keep it short and memorable.',
    tip: 'You can add a logo and description later under Storefront settings.',
    estimatedMinutes: 2,
    path: '/owner/setup',
    icon: Store,
    required: true,
  },
  {
    id: 'location',
    wizardStep: 3,
    title: 'Add kitchen address',
    shortTitle: 'Address',
    description: 'Pickup orders and delivery distance are calculated from this location.',
    instruction: 'Enter your full street address, city, state, and pincode.',
    tip: 'Pin the exact location on the map in Storefront settings for accurate delivery zones.',
    estimatedMinutes: 3,
    path: '/owner/setup',
    icon: MapPin,
    required: true,
  },
  {
    id: 'delivery',
    wizardStep: 4,
    title: 'Set delivery zones',
    shortTitle: 'Delivery',
    description: 'Define how far you deliver from your kitchen.',
    instruction: 'Set free-delivery radius and maximum delivery distance in kilometres.',
    tip: 'Delivery fees can be fine-tuned later in Storefront → Delivery.',
    estimatedMinutes: 2,
    path: '/owner/setup',
    icon: Truck,
    required: true,
  },
  {
    id: 'payments',
    wizardStep: 5,
    title: 'Choose payment methods',
    shortTitle: 'Payments',
    description: 'Decide how customers pay when they order.',
    instruction: 'Enable Cash on Delivery to start immediately. Add online payments after KYC.',
    estimatedMinutes: 2,
    path: '/owner/setup',
    icon: CreditCard,
    required: true,
  },
  {
    id: 'menu',
    wizardStep: 6,
    title: 'Add your menu',
    shortTitle: 'Menu',
    description: 'Customers need at least 3 items before they can place an order.',
    instruction: 'Import the starter template or add dishes manually in Menu Builder.',
    tip: 'Add photos and prices — items without prices cannot be ordered.',
    estimatedMinutes: 10,
    path: '/owner/menu',
    icon: MenuIcon,
    required: true,
  },
  {
    id: 'mobile',
    title: 'Verify mobile number',
    shortTitle: 'Mobile',
    description: 'Order alerts and customer callbacks use this number.',
    instruction: 'Add and verify your kitchen phone number under Compliance (KYC).',
    tip: 'Optional for sandbox testing, required before full live launch.',
    estimatedMinutes: 3,
    path: '/owner/kyc',
    icon: Phone,
    required: false,
  },
  {
    id: 'go-live',
    wizardStep: 7,
    title: 'Publish your store',
    shortTitle: 'Go live',
    description: 'Make your storefront public and start accepting orders.',
    instruction: 'Review everything, then publish. Your 14-day Growth trial starts automatically.',
    estimatedMinutes: 2,
    path: '/owner/setup',
    icon: Rocket,
    required: true,
  },
];

export const STORE_SETUP_TOTAL_REQUIRED = STORE_SETUP_STEPS.filter((s) => s.required).length;

export const getSetupStepByWizardStep = (wizardStep: number) =>
  STORE_SETUP_STEPS.find((s) => s.wizardStep === wizardStep);

export const getSetupStepById = (id: StoreSetupStepId) =>
  STORE_SETUP_STEPS.find((s) => s.id === id);
