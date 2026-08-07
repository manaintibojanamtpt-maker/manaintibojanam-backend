import { useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useCartStore } from '@/features/cart/store/cartStore';
import { resolveCartAppetiteContext } from '@/features/cart/domain/cartAppetiteContext';
import { scoreCartAppetiteItems } from '@/features/cart/domain/scoreCartAppetiteItems';
import { useFoodMenu } from '@/features/food/hooks/useFoodMenu';
import { resolveFoodItemPhoto } from '@/features/food/data/food-item-photo-manifest';
import type { FoodPublic } from '@/types/marketplace-food';
import { notifyToast } from '@/shared/providers/BdsToastProvider';

interface ContextualRecommendationsProps {
  readonly restaurantSlug: string;
}

function resolveUpsellImage(food: FoodPublic): string {
  if (food.image?.trim()) return food.image.trim();
  const byId = resolveFoodItemPhoto(food.foodId, 360, '9rem', 78);
  const name = food.name.toLowerCase();
  // Name-based fallbacks so cart never shows "No Image" for common dishes.
  if (/biryani/.test(name)) return resolveFoodItemPhoto('food_biryani_chicken', 360, '9rem', 78).src;
  if (/raita|curd|yogurt/.test(name)) return resolveFoodItemPhoto('food_raita', 360, '9rem', 78).src;
  if (/dosa/.test(name)) return resolveFoodItemPhoto('food_masala_dosa', 360, '9rem', 78).src;
  if (/idli/.test(name)) return resolveFoodItemPhoto('food_idli', 360, '9rem', 78).src;
  if (/coffee|tea|chai/.test(name)) return resolveFoodItemPhoto('food_filter_coffee', 360, '9rem', 78).src;
  if (/sweet|dessert|halwa|payasam|gulab/.test(name)) {
    return resolveFoodItemPhoto('food_dessert', 360, '9rem', 78).src;
  }
  if (/kebab|tikka/.test(name)) return resolveFoodItemPhoto('food_kebab', 360, '9rem', 78).src;
  if (/paneer/.test(name)) return resolveFoodItemPhoto('food_biryani_paneer', 360, '9rem', 78).src;
  return byId.src;
}

export function ContextualRecommendations({ restaurantSlug }: ContextualRecommendationsProps) {
  const addItem = useCartStore((s) => s.addItem);
  const cartLines = useCartStore((s) => s.lines);
  const menuQuery = useFoodMenu(restaurantSlug);

  const cartFoodIds = useMemo(() => {
    const ids = new Set<string>();
    for (const line of cartLines) {
      if (line.foodId) ids.add(line.foodId);
    }
    return ids;
  }, [cartLines]);

  const cartNames = useMemo(() => cartLines.map((line) => line.name), [cartLines]);

  const context = useMemo(() => resolveCartAppetiteContext(cartNames), [cartNames]);

  const picks = useMemo(() => {
    const items = menuQuery.data?.items;
    if (!items?.length) return [];
    return scoreCartAppetiteItems({
      menuItems: items,
      cartFoodIds,
      cartNames,
      context,
      limit: 6,
    });
  }, [menuQuery.data?.items, cartFoodIds, cartNames, context]);

  const onAdd = useCallback(
    (food: FoodPublic) => {
      const price = food.offerPrice ?? food.price;
      addItem(
        {
          foodId: food.foodId,
          name: food.name,
          price,
        },
        1,
      );
      notifyToast(`Added ${food.name}`, 'success');
    },
    [addItem],
  );

  // Instant when menu is cached; hide empty/error — never block checkout.
  if (!picks.length) {
    if (menuQuery.isPending && !menuQuery.data) {
      return (
        <section
          className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#1a120e] via-[#120d0c] to-[#0a0807] p-3.5"
          aria-busy="true"
          aria-label="Loading suggestions"
        >
          <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
          <div className="mt-2 h-5 w-3/4 max-w-xs animate-pulse rounded bg-white/10" />
          <div className="mt-4 flex gap-3 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 w-36 shrink-0 animate-pulse rounded-xl bg-white/[0.06]" />
            ))}
          </div>
        </section>
      );
    }
    return null;
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-[#e85d04]/20 bg-gradient-to-br from-[#2a160c] via-[#120d0c] to-[#0a0807] p-3.5 shadow-[0_12px_40px_-16px_rgba(232,93,4,0.45)]"
      aria-label={context.headline}
      data-testid="cart-appetite-upsell"
    >
      <header className="mb-3 px-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#f4a261]/90">
          {context.eyebrow}
        </p>
        <h3 className="mt-1 text-base font-extrabold leading-snug tracking-tight text-[#fff8f0]">
          {context.headline}
        </h3>
        <p className="mt-1 text-[12px] leading-snug text-[#c4b5a5]">{context.subline}</p>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory no-scrollbar">
        {picks.map((pick) => {
          const food = pick.food;
          const price = food.offerPrice ?? food.price;
          const imageUrl = resolveUpsellImage(food);
          return (
            <article
              key={food.foodId}
              className="relative flex w-[9.25rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#1a1412]/95 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#2a2422]">
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#120d0c]/90 via-transparent to-transparent" />
                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#ffe0c2] backdrop-blur-sm">
                  {pick.badge}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-2.5 pt-2">
                <h4 className="line-clamp-2 min-h-[2.25rem] text-[12px] font-bold leading-snug text-[#fff8f0]">
                  {food.name}
                </h4>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <p className="text-[12px] font-extrabold tabular-nums text-[#f4a261]">₹{price}</p>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-0.5 rounded-full bg-[#e85d04] px-2.5 text-[11px] font-bold text-[#fff8f0] shadow-[0_4px_12px_-2px_rgba(232,93,4,0.55)] active:scale-95 touch-manipulation"
                    onClick={() => onAdd(food)}
                    aria-label={`Add ${food.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                    ADD
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
