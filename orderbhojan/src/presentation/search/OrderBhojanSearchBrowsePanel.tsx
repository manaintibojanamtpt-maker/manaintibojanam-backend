import type { SearchBrowseSection, SearchTermChip } from '@/types/marketplace-search';
import { Section } from '@bhojan/storefront-design-system/primitives/Section';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { Search } from 'lucide-react';
import { useSearchHistoryStore } from '@/features/search/store/searchStore';
import { trackSearchEvent } from '@/features/search/analytics/searchAnalytics';
import { OrderBhojanSearchBrowseSkeleton } from './OrderBhojanSearchResultsSkeleton';

const chipClass =
  'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-[#FF7A00]/40 hover:text-white';

function TermChipSection({
  title,
  terms,
  onSelect,
  onRemove,
  removable = false,
}: {
  title: string;
  terms: readonly SearchTermChip[];
  onSelect: (label: string) => void;
  onRemove?: (id: string) => void;
  removable?: boolean;
}) {
  if (terms.length === 0) return null;

  return (
    <Section density="comfortable" background="default" className="!py-6">
      <SectionHeader title={title} align="left" className="!mb-4 !text-left" />
      <div className="flex flex-wrap gap-2">
        {terms.map((term) => (
          <div key={term.id} className="flex items-center gap-1">
            <button
              type="button"
              className={chipClass}
              aria-label={`${title} ${term.label}`}
              onClick={() => {
                trackSearchEvent('search_suggestion_click', { query: term.label });
                onSelect(term.label);
              }}
            >
              {term.label}
              {term.count != null ? ` · ${term.count}` : ''}
            </button>
            {removable && onRemove ? (
              <SoftButton
                type="button"
                tone="ghost"
                size="compact"
                aria-label={`Remove ${term.label} from recent searches`}
                onClick={() => onRemove(term.id)}
              >
                ×
              </SoftButton>
            ) : null}
          </div>
        ))}
      </div>
    </Section>
  );
}

function BrowseCollectionSection({
  section,
  onSelect,
}: {
  section: SearchBrowseSection;
  onSelect: (label: string) => void;
}) {
  return (
    <Section density="comfortable" background="subtle" className="!py-6">
      <SectionHeader title={section.title} align="left" className="!mb-4 !text-left" />
      <div className="flex flex-wrap gap-2">
        {section.items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={chipClass}
            aria-label={`${section.title} ${item.label}`}
            onClick={() => onSelect(item.query ?? item.label)}
          >
            {item.emoji ? `${item.emoji} ` : ''}
            {item.label}
          </button>
        ))}
      </div>
    </Section>
  );
}

export interface OrderBhojanSearchBrowsePanelProps {
  readonly trending: readonly SearchTermChip[];
  readonly popular: readonly SearchTermChip[];
  readonly apiRecent: readonly SearchTermChip[];
  readonly collections: readonly SearchBrowseSection[];
  readonly isLoading: boolean;
  readonly onSelectTerm: (label: string) => void;
}

export function OrderBhojanSearchBrowsePanel({
  trending,
  popular,
  apiRecent,
  collections,
  isLoading,
  onSelectTerm,
}: OrderBhojanSearchBrowsePanelProps) {
  const localRecent = useSearchHistoryStore((s) => s.terms);
  const removeTerm = useSearchHistoryStore((s) => s.removeTerm);
  const clearAll = useSearchHistoryStore((s) => s.clearAll);

  const recent: SearchTermChip[] = [
    ...localRecent.map((t) => ({ id: t.id, label: t.label })),
    ...apiRecent.filter(
      (item) => !localRecent.some((l) => l.label.toLowerCase() === item.label.toLowerCase()),
    ),
  ].slice(0, 8);

  if (isLoading) {
    return <OrderBhojanSearchBrowseSkeleton />;
  }

  return (
    <div className="space-y-2">
      <TermChipSection
        title="Recent searches"
        terms={recent}
        onSelect={onSelectTerm}
        onRemove={removeTerm}
        removable
      />
      {recent.length > 0 ? (
        <div className="flex justify-end px-4">
          <SoftButton type="button" tone="ghost" size="compact" onClick={clearAll}>
            Clear history
          </SoftButton>
        </div>
      ) : null}
      <TermChipSection title="Trending searches" terms={trending} onSelect={onSelectTerm} />
      <TermChipSection title="Popular searches" terms={popular} onSelect={onSelectTerm} />
      {collections.map((section) => (
        <BrowseCollectionSection key={section.id} section={section} onSelect={onSelectTerm} />
      ))}
      {recent.length === 0 && trending.length === 0 ? (
        <Section density="comfortable" background="default" className="!py-8">
          <GlassCard hoverEffect={false} className="!rounded-[2rem] !p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF7A00]/15">
              <Search className="h-7 w-7 text-[#FF7A00]" aria-hidden />
            </div>
            <SectionHeader
              title="Start exploring"
              description="Search for biryani, dosa, cloud kitchens, or browse collections below."
              align="center"
            />
          </GlassCard>
        </Section>
      ) : null}
    </div>
  );
}
