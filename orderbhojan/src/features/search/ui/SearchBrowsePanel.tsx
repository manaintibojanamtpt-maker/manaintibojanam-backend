import { Button, Chip, EmptyState, Icon, Skeleton, Text } from '@bhojan/design-system';
import type { SearchBrowseSection, SearchTermChip } from '@/types/marketplace-search';
import { useSearchHistoryStore } from '../store/searchStore';
import { trackSearchEvent } from '../analytics/searchAnalytics';

function TermChips({
  title,
  terms,
  onSelect,
  onRemove,
  removable,
}: {
  title: string;
  terms: readonly SearchTermChip[];
  onSelect: (label: string) => void;
  onRemove?: (id: string) => void;
  removable?: boolean;
}) {
  if (terms.length === 0) return null;

  return (
    <section className="ob-section ob-search-browse-section" aria-label={title}>
      <div className="ob-section__header">
        <Text variant="subtitle" as="h2" className="ob-section__title">
          {title}
        </Text>
      </div>
      <div className="ob-search-browse-section__chips">
        {terms.map((term) => (
          <div key={term.id} className="ob-search-chip-wrap">
            <Chip
              className="ob-category-chip"
              aria-label={`${title} ${term.label}`}
              onClick={() => {
                trackSearchEvent('search_suggestion_click', { query: term.label });
                onSelect(term.label);
              }}
            >
              {term.label}
              {term.count != null ? ` · ${term.count}` : ''}
            </Chip>
            {removable && onRemove ? (
              <Button
                variant="ghost"
                size="compact"
                aria-label={`Remove ${term.label} from recent searches`}
                onClick={() => onRemove(term.id)}
              >
                ×
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
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
    <section className="ob-section ob-search-browse-section" aria-label={section.title}>
      <div className="ob-section__header">
        <Text variant="subtitle" as="h2" className="ob-section__title">
          {section.title}
        </Text>
      </div>
      <div className="ob-search-browse-section__chips">
        {section.items.map((item) => (
          <Chip
            key={item.id}
            className="ob-category-chip"
            aria-label={`${section.title} ${item.label}`}
            onClick={() => onSelect(item.query ?? item.label)}
          >
            {item.emoji ? `${item.emoji} ` : ''}
            {item.label}
          </Chip>
        ))}
      </div>
    </section>
  );
}

export interface SearchBrowsePanelProps {
  readonly trending: readonly SearchTermChip[];
  readonly popular: readonly SearchTermChip[];
  readonly apiRecent: readonly SearchTermChip[];
  readonly collections: readonly SearchBrowseSection[];
  readonly isLoading: boolean;
  readonly onSelectTerm: (label: string) => void;
}

export function SearchBrowsePanel({
  trending,
  popular,
  apiRecent,
  collections,
  isLoading,
  onSelectTerm,
}: SearchBrowsePanelProps) {
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
    return (
      <div className="ob-search-browse" aria-busy="true">
        <Skeleton height="2rem" width="40%" />
        <div className="ob-search-browse-section__chips">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} width="6rem" height="2rem" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ob-search-browse">
      <TermChips
        title="Recent Searches"
        terms={recent}
        onSelect={onSelectTerm}
        onRemove={removeTerm}
        removable
      />
      {recent.length > 0 ? (
        <div className="ob-search-browse__actions">
          <Button variant="ghost" size="compact" onClick={clearAll}>
            Clear history
          </Button>
        </div>
      ) : null}
      <TermChips title="Trending Searches" terms={trending} onSelect={onSelectTerm} />
      <TermChips title="Popular Searches" terms={popular} onSelect={onSelectTerm} />
      {collections.map((section) => (
        <BrowseCollectionSection key={section.id} section={section} onSelect={onSelectTerm} />
      ))}
      {recent.length === 0 && trending.length === 0 ? (
        <EmptyState
          title="Start exploring"
          description="Search for biryani, dosa, cloud kitchens, or browse collections below."
          icon={
            <div className="ob-empty-premium__icon">
              <Icon size={36} label="Search">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </Icon>
            </div>
          }
        />
      ) : null}
    </div>
  );
}
