import { useEffect, useState } from 'react';
import { useCartStore } from '@/features/cart/store/cartStore';
import { loadFoodMenu } from '@/features/food/engine/foodExperienceLayer';
import type { FoodPublic } from '@/types/marketplace-food';
import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ContextualRecommendationsProps {
  readonly restaurantSlug: string;
}

export function ContextualRecommendations({ restaurantSlug }: ContextualRecommendationsProps) {
  const [items, setItems] = useState<FoodPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);
  const cartLines = useCartStore((s) => s.lines);

  useEffect(() => {
    async function load() {
      try {
        const res = await loadFoodMenu({ slug: restaurantSlug });
        if (!res || !res.items) return;
        const allItems = res.items.filter((item) => item.availability !== false);

        // Basic contextual heuristic (time of day)
        const hour = new Date().getHours();
        let keyword = '';
        if (hour >= 5 && hour < 11) {
          keyword = 'breakfast';
        } else if (hour >= 11 && hour < 16) {
          keyword = 'lunch';
        } else if (hour >= 16 && hour < 19) {
          keyword = 'snack';
        } else {
          keyword = 'dinner';
        }

        // Filter out items already in cart (matching on foodId)
        // Note: The redux cart uses lineId which is often foodId + variant, so we do a substring match just in case.
        const availableItems = allItems.filter(item => {
          return !cartLines.some(line => line.lineId.includes(item.foodId));
        });

        // Sort: try to match keyword, else top recommended
        const scoredItems = availableItems.map(item => {
          let score = 0;
          if (item.recommended) score += 10;
          if (item.bestSeller) score += 5;
          if (item.name.toLowerCase().includes(keyword) || item.description?.toLowerCase().includes(keyword)) {
            score += 20;
          }
          return { item, score };
        });

        scoredItems.sort((a, b) => b.score - a.score);
        setItems(scoredItems.slice(0, 5).map(s => s.item));
      } catch (err) {
        console.error('Failed to load recommendations', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [restaurantSlug, cartLines]);

  if (loading || items.length === 0) return null;

  return (
    <div className="mt-4 pb-2">
      <h3 className="mb-3 px-1 text-sm font-bold text-white/90">Contextual Recommendations</h3>
      <div className="flex gap-3 overflow-x-auto pb-4 px-1 snap-x no-scrollbar">
        {items.map((item) => (
          <div key={item.foodId} className="relative flex-none w-36 snap-start overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1412]">
            <div className="aspect-square w-full relative bg-[#2a2422]">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-white/30">No Image</div>
              )}
            </div>
            <div className="p-2.5">
              <h4 className="text-xs font-bold text-white/90 line-clamp-1">{item.name}</h4>
              <p className="mt-1 text-[11px] font-medium text-white/60">₹{item.price}</p>
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-center rounded-lg bg-[#FF7A00]/10 py-1.5 text-[11px] font-bold text-[#FF7A00] transition-colors hover:bg-[#FF7A00]/20"
                onClick={() => {
                  addItem({
                    foodId: item.foodId,
                    name: item.name,
                    price: item.price,
                  });
                  toast.success(`Added ${item.name}`);
                }}
              >
                <Plus className="mr-1 h-3 w-3" /> Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
