import { GlassCard } from '../primitives/GlassCard';
import { ProfileImage } from '../primitives/ProfileImage';
import { SectionHeader } from '../primitives/SectionHeader';
import { SoftButton } from '../primitives/SoftButton';
import { TransactionalPageShell } from '../cart/TransactionalPageShell';
import { MarketplaceUxStateView } from '../marketplace/MarketplaceUxStateView';
import type { ProfileGuestViewModel } from './types';

export function ProfileGuestView({
  title,
  description,
  signInLabel,
  browseLabel,
  benefits,
  onSignIn,
  onBrowse,
}: ProfileGuestViewModel & {
  readonly onSignIn: () => void;
  readonly onBrowse: () => void;
}) {
  return (
    <TransactionalPageShell title="" subtitle="">
      <GlassCard hoverEffect={false} className="!rounded-[2rem] !p-6 text-center">
        <ProfileImage name="Guest" alt="Guest" className="mx-auto mb-4 h-20 w-20" />
        <SectionHeader title={title} description={description} align="center" className="!mb-4 !mt-0" />
        <div className="flex flex-col gap-3">
          <SoftButton type="button" fullWidth onClick={onSignIn}>
            {signInLabel}
          </SoftButton>
          <SoftButton type="button" tone="secondary" fullWidth onClick={onBrowse}>
            {browseLabel}
          </SoftButton>
        </div>
      </GlassCard>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Why sign in</p>
      <div className="space-y-2">
        {benefits.map((item) => (
          <GlassCard key={item} hoverEffect={false} className="!rounded-xl !p-3">
            <p className="text-sm text-white/80">{item}</p>
          </GlassCard>
        ))}
      </div>
    </TransactionalPageShell>
  );
}

export function ProfileErrorBanner({
  onRetry,
}: {
  readonly onRetry: () => void;
}) {
  return (
    <MarketplaceUxStateView
      compact
      title="Could not refresh profile"
      primaryLabel="Retry"
      onPrimary={onRetry}
      role="alert"
    />
  );
}
