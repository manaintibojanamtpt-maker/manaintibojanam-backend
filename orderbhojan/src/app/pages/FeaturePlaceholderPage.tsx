import { EmptyState } from '@bhojan/design-system';

export function FeaturePlaceholderPage({
  feature,
  milestone,
}: {
  feature: string;
  milestone: string;
}) {
  return (
    <EmptyState
      title={feature}
      description={`Reserved for ${milestone}. Route exists for architecture validation only — no business logic in BDS-2.`}
    />
  );
}
