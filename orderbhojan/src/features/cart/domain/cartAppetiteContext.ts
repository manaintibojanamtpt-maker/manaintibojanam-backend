/**
 * Cart appetite context — time-of-day + Indian climate season (no network).
 * Used to pull complementary add-ons while the customer is still in cart.
 */

import { resolveAiDiningContext, type DiningMood } from '@/features/experience/domain/aiDiningContext';

export type ClimateSeason = 'summer' | 'monsoon' | 'festive' | 'winter';

export type CartAppetiteContext = {
  readonly mood: DiningMood;
  readonly season: ClimateSeason;
  readonly eyebrow: string;
  readonly headline: string;
  readonly subline: string;
  /** Soft keywords for menu matching (name/description/category). */
  readonly appetiteKeywords: readonly string[];
  /** Prefer these complementary add-on patterns when cart already has mains. */
  readonly pairingKeywords: readonly string[];
};

function monthInIndia(now = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'numeric',
  });
  return Number(formatter.format(now));
}

export function resolveClimateSeason(now = new Date()): ClimateSeason {
  const month = monthInIndia(now);
  if (month >= 3 && month <= 6) return 'summer';
  if (month >= 7 && month <= 9) return 'monsoon';
  if (month >= 10 && month <= 11) return 'festive';
  return 'winter';
}

const SEASON_COPY: Record<
  ClimateSeason,
  { readonly label: string; readonly keywords: readonly string[] }
> = {
  summer: {
    label: 'Hot day',
    keywords: [
      'buttermilk',
      'lassi',
      'juice',
      'raita',
      'curd',
      'salad',
      'cooler',
      'lemonade',
      'chaas',
      'ice',
      'fruit',
      'light',
    ],
  },
  monsoon: {
    label: 'Monsoon',
    keywords: [
      'pakora',
      'bajji',
      'samosa',
      'chai',
      'tea',
      'coffee',
      'soup',
      'hot',
      'fried',
      'crispy',
      'bondas',
      'vada',
    ],
  },
  festive: {
    label: 'Festive season',
    keywords: ['sweet', 'dessert', 'payasam', 'halwa', 'gulab', 'special', 'feast', 'premium'],
  },
  winter: {
    label: 'Cool evening',
    keywords: [
      'soup',
      'ghee',
      'hot',
      'biryani',
      'curry',
      'gravy',
      'comfort',
      'rich',
      'halwa',
      'coffee',
    ],
  },
};

const MOOD_KEYWORDS: Record<DiningMood, readonly string[]> = {
  breakfast: ['idli', 'dosa', 'vada', 'upma', 'pongal', 'coffee', 'tea', 'tiffin', 'breakfast'],
  lunch: ['thali', 'biryani', 'meal', 'curry', 'rice', 'sambar', 'lunch'],
  snacks: ['snack', 'chaat', 'samosa', 'pakora', 'tea', 'coffee', 'juice', 'cutlet', 'bajji'],
  dinner: ['biryani', 'thali', 'curry', 'gravy', 'roti', 'naan', 'dinner', 'feast'],
  'late-night': ['biryani', 'fried rice', 'roll', 'noodle', 'gravy', 'comfort', 'late'],
};

/** Classic Zomato/Swiggy-style pairings for Indian home kitchens. */
const CART_PAIRING_HINTS: readonly {
  readonly ifCartHas: RegExp;
  readonly suggest: readonly string[];
}[] = [
  {
    ifCartHas: /biryani|pulao|fried\s*rice/i,
    suggest: ['raita', 'curd', 'salan', 'mirchi', 'salad', 'dessert', 'sweet', 'drink', 'lassi', 'juice'],
  },
  {
    ifCartHas: /thali|meal/i,
    suggest: ['sweet', 'payasam', 'dessert', 'papad', 'pickle', 'drink', 'buttermilk', 'lassi'],
  },
  {
    ifCartHas: /dosa|idli|vada|upma|pongal/i,
    suggest: ['coffee', 'tea', 'chutney', 'sambar', 'filter'],
  },
  {
    ifCartHas: /chicken|mutton|non.?veg|kebab/i,
    suggest: ['raita', 'curd', 'salad', 'drink', 'dessert'],
  },
  {
    ifCartHas: /rice|curry|gravy/i,
    suggest: ['papad', 'raita', 'pickle', 'sweet', 'drink'],
  },
];

function uniqueKeywords(parts: readonly (readonly string[])[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of parts) {
    for (const word of group) {
      const key = word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(word);
    }
  }
  return out;
}

export function resolveCartAppetiteContext(
  cartItemNames: readonly string[],
  now = new Date(),
): CartAppetiteContext {
  const dining = resolveAiDiningContext(now);
  const season = resolveClimateSeason(now);
  const seasonMeta = SEASON_COPY[season];

  const pairingFromCart: string[] = [];
  for (const name of cartItemNames) {
    for (const rule of CART_PAIRING_HINTS) {
      if (rule.ifCartHas.test(name)) {
        pairingFromCart.push(...rule.suggest);
      }
    }
  }

  const pairingKeywords = uniqueKeywords([
    pairingFromCart.length > 0
      ? pairingFromCart
      : ['raita', 'dessert', 'drink', 'sweet', 'salad'],
    seasonMeta.keywords.slice(0, 4),
  ]);

  const appetiteKeywords = uniqueKeywords([
    MOOD_KEYWORDS[dining.mood],
    seasonMeta.keywords,
    pairingKeywords,
  ]);

  const hasBiryani = cartItemNames.some((n) => /biryani/i.test(n));
  const eyebrow = `${seasonMeta.label} · ${dining.mood.replace('-', ' ')}`;

  let headline = 'Make this meal unforgettable';
  let subline =
    'Hand-picked for this hour — guests love these with what is already in your cart.';

  if (hasBiryani) {
    headline = 'Cool it down — complete the plate';
    subline = 'Raita, drinks or a sweet finish — the add-ons people pair with biryani most.';
  } else if (season === 'summer' && (dining.mood === 'lunch' || dining.mood === 'snacks')) {
    headline = 'Beat the heat before checkout';
    subline = 'Buttermilk, lassi and light sides — perfect with your order right now.';
  } else if (season === 'monsoon') {
    headline = 'Monsoon cravings calling';
    subline = 'Crispy snacks and hot sips that pair while you checkout.';
  } else if (dining.mood === 'breakfast') {
    headline = 'One more bite for the morning?';
    subline = 'Coffee and tiffin favourites people add most at this hour.';
  } else if (dining.mood === 'late-night') {
    headline = 'Night hunger upgrade';
    subline = 'Comfort sides and drinks that make late orders feel complete.';
  } else if (dining.mood === 'dinner') {
    headline = dining.headline;
    subline = 'Sides and sweets that turn dinner into a full experience.';
  }

  return {
    mood: dining.mood,
    season,
    eyebrow,
    headline,
    subline,
    appetiteKeywords,
    pairingKeywords,
  };
}
