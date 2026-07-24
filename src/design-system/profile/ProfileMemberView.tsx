import { GlassCard } from '../primitives/GlassCard';
import { ProfileImage } from '../primitives/ProfileImage';
import { SoftButton } from '../primitives/SoftButton';
import { TransactionalPageShell } from '../cart/TransactionalPageShell';
import { SettingsPreferencesView } from '../settings/SettingsPreferencesView';
import type { ProfileMemberViewModel } from './types';
import { ProfileErrorBanner } from './ProfileGuestView';

export function ProfileMemberView({
  profile,
  onQuickTile,
  onPreferenceClick,
  onSupport,
  onAbout,
  onPrivacy,
  onSignOut,
  onRetryProfile,
}: {
  readonly profile: ProfileMemberViewModel;
  readonly onQuickTile: (id: string) => void;
  readonly onPreferenceClick?: (id: string) => void;
  readonly onSupport: () => void;
  readonly onAbout: () => void;
  /** Optional Privacy / Legal link (Play Internal Testing readiness). */
  readonly onPrivacy?: () => void;
  readonly onSignOut: () => void;
  readonly onRetryProfile: () => void;
}) {
  return (
    <TransactionalPageShell title="Profile" subtitle="Your table at home" embedded className="md:!max-w-2xl">
      <GlassCard hoverEffect={false} className="!rounded-[2rem] !p-6 text-center">
        <ProfileImage
          name={profile.displayName}
          imageUrl={profile.photoUrl}
          alt={profile.displayName}
          className="mx-auto mb-4 h-20 w-20"
        />
        <h2 className="text-2xl font-extrabold tracking-tight text-white">{profile.displayName}</h2>
        <p className="mt-1 truncate text-sm text-white/60">{profile.contactLine}</p>
        <p className="mt-3 text-xs text-white/45">Details sync from your sign-in method</p>
      </GlassCard>

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

      <SettingsPreferencesView rows={profile.preferences} onRowClick={onPreferenceClick} />

      <div className="flex flex-col gap-2">
        <SoftButton type="button" tone="ghost" fullWidth onClick={onSupport}>
          Help &amp; support
        </SoftButton>
        <SoftButton type="button" tone="ghost" fullWidth onClick={onAbout}>
          About OrderBhojan
        </SoftButton>
        {onPrivacy ? (
          <SoftButton type="button" tone="ghost" fullWidth onClick={onPrivacy}>
            Privacy policy
          </SoftButton>
        ) : null}
        <SoftButton type="button" tone="danger" fullWidth onClick={onSignOut}>
          Sign out
        </SoftButton>
      </div>

      {profile.showProfileError ? <ProfileErrorBanner onRetry={onRetryProfile} /> : null}
    </TransactionalPageShell>
  );
}
