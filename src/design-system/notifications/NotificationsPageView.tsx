import { Bell } from 'lucide-react';
import { MarketplaceUxStateView } from '../marketplace/MarketplaceUxStateView';
import { SoftButton } from '../primitives/SoftButton';
import { TransactionalPageShell } from '../cart/TransactionalPageShell';

export function NotificationsGuestView({
  onSignIn,
}: {
  readonly onSignIn: () => void;
}) {
  return (
    <TransactionalPageShell title="" subtitle="">
      <MarketplaceUxStateView
        title="Sign in for notifications"
        description="Get order updates and offers on this device."
        icon={<Bell className="h-7 w-7 text-[#FF7A00]" aria-hidden />}
        primaryLabel="Sign in"
        onPrimary={onSignIn}
      />
    </TransactionalPageShell>
  );
}

export function NotificationsPageView({
  title,
  description,
  enableLabel,
  busyLabel,
  busy,
  status,
  onEnable,
}: {
  readonly title: string;
  readonly description: string;
  readonly enableLabel: string;
  readonly busyLabel: string;
  readonly busy: boolean;
  readonly status: string | null;
  readonly onEnable: () => void;
}) {
  return (
    <TransactionalPageShell title={title} subtitle={description}>
      <SoftButton type="button" fullWidth disabled={busy} onClick={onEnable}>
        {busy ? busyLabel : enableLabel}
      </SoftButton>
      {status ? (
        <p className="text-sm text-white/70" role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
    </TransactionalPageShell>
  );
}
