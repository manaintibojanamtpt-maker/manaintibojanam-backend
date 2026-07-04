import { Text } from '@bhojan/design-system';
import type { SearchResultSection } from '@/types/marketplace-search';
import { SearchResultRow } from './SearchResultRow';

export interface SearchResultsSectionProps {
  readonly section: SearchResultSection;
  readonly query: string;
  readonly onSelectTerm: (label: string) => void;
}

export function SearchResultsSection({
  section,
  query,
  onSelectTerm,
}: SearchResultsSectionProps) {
  if (section.items.length === 0) return null;

  return (
    <section className="ob-section ob-search-results-section" aria-label={section.title}>
      <div className="ob-section__header">
        <Text variant="subtitle" as="h2" className="ob-section__title">
          {section.title}
        </Text>
        {section.total != null ? (
          <Text variant="caption" className="ob-section__hint">
            {section.total} results
          </Text>
        ) : null}
      </div>
      <div className="ob-search-results-section__list">
        {section.items.map((item) => (
          <SearchResultRow
            key={`${section.id}-${item.id}`}
            item={item}
            query={query}
            onSelect={onSelectTerm}
          />
        ))}
      </div>
    </section>
  );
}
