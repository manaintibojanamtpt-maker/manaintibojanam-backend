import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { GlassCard } from '../primitives/GlassCard';
import { SectionHeader } from '../primitives/SectionHeader';
import { SoftButton } from '../primitives/SoftButton';

export type MarketplaceUxStateRole = 'alert' | 'status';

export interface MarketplaceUxStateViewProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly role?: MarketplaceUxStateRole;
  readonly loading?: boolean;
  readonly loadingMessage?: string;
  readonly primaryLabel?: string;
  readonly onPrimary?: () => void;
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
  readonly compact?: boolean;
}

export function MarketplaceUxStateView({
  title,
  description = '',
  icon,
  role = 'status',
  loading = false,
  loadingMessage = 'Loading…',
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  compact = false,
}: MarketplaceUxStateViewProps) {
  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 text-[#c4b5a5] ${compact ? 'py-8' : 'py-16'}`}
        aria-busy="true"
        aria-live="polite"
        aria-label={loadingMessage}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#e85d04] motion-reduce:animate-none" aria-hidden />
        <p className="text-sm">{loadingMessage}</p>
      </div>
    );
  }

  return (
    <div role={role} aria-live="polite" className={`mx-auto max-w-lg ${compact ? 'py-4' : 'py-8'}`}>
      <GlassCard hoverEffect={false} className="!rounded-[2rem] !border-white/[0.08] !bg-[#120d0c] !p-8 text-center">
        {icon ? (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e85d04]/15 bg-[#e85d04]/10">
            {icon}
          </div>
        ) : null}
        <SectionHeader title={title} description={description} align="center" />
        {primaryLabel && onPrimary ? (
          <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <SoftButton type="button" onClick={onPrimary}>
              {primaryLabel}
            </SoftButton>
            {secondaryLabel && onSecondary ? (
              <SoftButton type="button" tone="ghost" onClick={onSecondary}>
                {secondaryLabel}
              </SoftButton>
            ) : null}
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}
