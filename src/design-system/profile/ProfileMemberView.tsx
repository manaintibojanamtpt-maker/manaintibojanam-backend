import { ChevronRight } from 'lucide-react';
import { GlassCard } from '../primitives/GlassCard';
import { ProfileImage } from '../primitives/ProfileImage';
import { SectionHeader } from '../primitives/SectionHeader';
import { SoftButton } from '../primitives/SoftButton';
import { TransactionalPageShell } from '../cart/TransactionalPageShell';
import type { ProfileMemberViewModel } from './types';
import { ProfileErrorBanner } from './ProfileGuestView';

export function ProfileMemberView({
  profile,
  onQuickTile,
  onSupport,
  onAbout,
  onSignOut,
  onRetryProfile,
}: {
  readonly profile: ProfileMemberViewModel;
  readonly onQuickTile: (id: string) => void;
  readonly onSupport: () => void;
  readonly onAbout: () => void;
  readonly onSignOut: () => void;
  readonly onRetryProfile: () => void;
}) {
  return (
    <TransactionalPageShell title="" subtitle="">
      <GlassCard hoverEffect={false} className="!rounded-[2rem] !p-6 text-center">
        <ProfileImage
          name={profile.displayName}
          imageUrl={profile.photoUrl}
          alt={profile.displayName}
          className="mx-auto mb-4 h-20 w-20"
        />
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{profile.displayName}</h1>
        <p className="mt-1 text-sm text-white/60">{profile.contactLine}</p>
        <SoftButton type="button" tone="ghost" size="compact" className="mt-3" disabled>
          Edit profile
        </SoftButton>
      </GlassCard>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Your table at home</p>
      <div className="grid grid-cols-3 gap-3">
        {profile.quickTiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 text-sm font-bold text-white transition hover:border-[#FF7A00]/40"
            onClick={() => onQuickTile(tile.id)}
          >
            {tile.label}
          </button>
        ))}
      </div>

      <GlassCard hoverEffect={false} className="!rounded-2xl !p-4" aria-label="Preferences">
        <SectionHeader title="Preferences" align="left" className="!mb-3 !mt-0" />
        <div className="divide-y divide-white/10">
          {profile.preferences.map((row) => (
            <button
              key={row.label}
              type="button"
              className="flex w-full items-center justify-between py-3 text-left first:pt-0 last:pb-0"
              aria-label={`${row.label}: ${row.value}`}
            >
              <span className="flex items-center gap-3 text-white/80">
                <span aria-hidden>{row.icon}</span>
                {row.label}
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-white/60">
                {row.value}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="flex flex-col gap-2">
        <SoftButton type="button" tone="ghost" fullWidth onClick={onSupport}>
          Help &amp; support
        </SoftButton>
        <SoftButton type="button" tone="ghost" fullWidth onClick={onAbout}>
          About OrderBhojan
        </SoftButton>
        <SoftButton type="button" tone="danger" fullWidth onClick={onSignOut}>
          Sign out
        </SoftButton>
      </div>

      {profile.showProfileError ? <ProfileErrorBanner onRetry={onRetryProfile} /> : null}
    </TransactionalPageShell>
  );
}
