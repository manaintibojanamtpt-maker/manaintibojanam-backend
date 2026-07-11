import { EmptyStateView } from '@/shared/ui/EmptyStateView';

export function FeaturePlaceholderPage({
  title,
  description,
  feature,
  milestone,
}: {
  readonly title?: string;
  readonly description?: string;
  readonly feature?: string;
  readonly milestone?: string;
}) {
  const resolvedTitle = title ?? feature ?? 'Coming soon';
  const resolvedDescription =
    description ??
    (milestone ? `${milestone} feature is disabled for this build.` : 'This feature is disabled for this build.');

  return (
    <div className="p-6">
      <EmptyStateView title={resolvedTitle} description={resolvedDescription} />
    </div>
  );
}
