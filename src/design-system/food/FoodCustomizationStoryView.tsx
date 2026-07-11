import type { FoodCustomizationStoryViewModel } from './types';

export interface FoodCustomizationStoryViewProps {
  readonly story: FoodCustomizationStoryViewModel;
}

export function FoodCustomizationStoryView({ story }: FoodCustomizationStoryViewProps) {
  const hasStory =
    story.chefNote ||
    (story.ingredients && story.ingredients.length > 0) ||
    story.cookingStyle ||
    story.servingSize ||
    story.popularPairing ||
    (story.dietaryLabels && story.dietaryLabels.length > 0);

  if (!hasStory) return null;

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4" aria-label="About this dish">
      {story.chefNote ? (
        <blockquote className="mb-4 border-l-2 border-[#FF7A00]/50 pl-3 text-sm leading-relaxed text-white/80">
          {story.chefNote}
        </blockquote>
      ) : null}
      <dl className="grid gap-2 text-sm">
        {story.cookingStyle ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold text-white/50">Cooking style</dt>
            <dd className="text-white/90">{story.cookingStyle}</dd>
          </div>
        ) : null}
        {story.servingSize ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold text-white/50">Serving</dt>
            <dd className="text-white/90">{story.servingSize}</dd>
          </div>
        ) : null}
        {story.popularPairing ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold text-white/50">Pairs well with</dt>
            <dd className="text-white/90">{story.popularPairing}</dd>
          </div>
        ) : null}
        {story.ingredients && story.ingredients.length > 0 ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold text-white/50">Key ingredients</dt>
            <dd className="text-white/90">{story.ingredients.join(', ')}</dd>
          </div>
        ) : null}
        {story.dietaryLabels && story.dietaryLabels.length > 0 ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold text-white/50">Labels</dt>
            <dd className="text-white/90">{story.dietaryLabels.join(' · ')}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
