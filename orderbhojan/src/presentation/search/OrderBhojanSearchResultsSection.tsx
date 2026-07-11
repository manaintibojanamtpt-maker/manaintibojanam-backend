import type { SearchResultSection } from '@/types/marketplace-search';
import { Section } from '@bhojan/storefront-design-system/primitives/Section';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';
import { OrderBhojanSearchResultRow } from './OrderBhojanSearchResultRow';

export interface OrderBhojanSearchResultsSectionProps {
  readonly section: SearchResultSection;
  readonly query: string;
  readonly onSelectTerm: (label: string) => void;
}

export function OrderBhojanSearchResultsSection({
  section,
  query,
  onSelectTerm,
}: OrderBhojanSearchResultsSectionProps) {
  if (section.items.length === 0) return null;

  return (
    <Section density="comfortable" background="default" className="!py-6">
      <SectionHeader
        title={section.title}
        description={section.total != null ? `${section.total} results` : undefined}
        align="left"
        className="!mb-4 !text-left"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {section.items.map((item) => (
          <OrderBhojanSearchResultRow
            key={`${section.id}-${item.id}`}
            item={item}
            query={query}
            onSelect={onSelectTerm}
          />
        ))}
      </div>
    </Section>
  );
}
