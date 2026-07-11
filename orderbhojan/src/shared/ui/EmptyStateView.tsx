import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';

export function EmptyStateView({
  title,
  description,
  actionLabel,
  onAction,
}: {
  readonly title: string;
  readonly description?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}) {
  return (
    <GlassCard hoverEffect={false} className="!rounded-[2rem] !p-8 text-center">
      <SectionHeader title={title} description={description} align="center" />
      {actionLabel && onAction ? (
        <div className="mt-4">
          <SoftButton type="button" onClick={onAction}>
            {actionLabel}
          </SoftButton>
        </div>
      ) : null}
    </GlassCard>
  );
}
