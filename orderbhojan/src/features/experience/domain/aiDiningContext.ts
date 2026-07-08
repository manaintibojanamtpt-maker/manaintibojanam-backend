export type DiningMood = 'breakfast' | 'lunch' | 'snacks' | 'dinner' | 'late-night';

export interface AiDiningContext {
  readonly mood: DiningMood;
  readonly headline: string;
  readonly subline: string;
  readonly collectionId: string;
  readonly chips: readonly string[];
}

function hourInIndia(): number {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false,
  });
  return Number(formatter.format(new Date()));
}

function dayInIndia(): number {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
  });
  const day = formatter.format(new Date());
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[day] ?? new Date().getDay();
}

export function resolveAiDiningContext(_now = new Date()): AiDiningContext {
  const hour = hourInIndia();
  const day = dayInIndia();
  const isWeekend = day === 0 || day === 6;

  if (hour >= 6 && hour < 11) {
    return {
      mood: 'breakfast',
      headline: isWeekend ? 'Slow weekend morning?' : 'Good morning — fuel up right',
      subline: 'Idli, dosa, filter coffee and fresh tiffins from kitchens open now.',
      collectionId: 'breakfast',
      chips: ['South Indian', 'Healthy', 'Quick bites'],
    };
  }

  if (hour >= 11 && hour < 16) {
    return {
      mood: 'lunch',
      headline: 'Lunch picks for you',
      subline: 'Chef specials, thalis and office-friendly combos near your location.',
      collectionId: 'lunch',
      chips: ['Biryani', 'Thali', 'Under 30 min'],
    };
  }

  if (hour >= 16 && hour < 18) {
    return {
      mood: 'snacks',
      headline: 'Evening cravings?',
      subline: 'Tea-time snacks, chaat and light bites before dinner rush.',
      collectionId: 'recommended',
      chips: ['Snacks', 'Chaat', 'Beverages'],
    };
  }

  if (hour >= 18 && hour < 23) {
    return {
      mood: 'dinner',
      headline: isWeekend ? 'Weekend dinner — go premium' : 'Dinner sorted',
      subline: 'Top-rated kitchens, family meals and trending dishes tonight.',
      collectionId: 'dinner',
      chips: ['Top rated', 'Family meals', 'Offers'],
    };
  }

  return {
    mood: 'late-night',
    headline: 'Late-night hunger?',
    subline: 'Kitchens still open — biryani, rolls and comfort food delivered fast.',
    collectionId: 'late-night',
    chips: ['Late night', 'Biryani', 'Fast delivery'],
  };
}
