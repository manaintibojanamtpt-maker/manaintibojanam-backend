import { Bell, Package, Truck, Tag } from 'lucide-react';
import { MarketplaceUxStateView } from '../marketplace/MarketplaceUxStateView';
import { SoftButton } from '../primitives/SoftButton';
import { TransactionalPageShell } from '../cart/TransactionalPageShell';

const DEFAULT_BENEFITS = [
  { icon: Package, text: 'Know when your order is confirmed and cooking' },
  { icon: Truck, text: 'Get alerts when your delivery is on the way' },
  { icon: Tag, text: 'Hear about offers from kitchens you follow' },
] as const;

export function NotificationsGuestView({
  onSignIn,
}: {
  readonly onSignIn: () => void;
}) {
  return (
    <TransactionalPageShell title="" subtitle="" embedded>
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
  viewOrdersLabel = 'View orders',
  onViewOrders,
  deniedHint,
  deviceReady = false,
}: {
  readonly title: string;
  readonly description: string;
  readonly enableLabel: string;
  readonly busyLabel: string;
  readonly busy: boolean;
  readonly status: string | null;
  readonly onEnable: () => void;
  readonly viewOrdersLabel?: string;
  readonly onViewOrders?: () => void;
  readonly deniedHint?: string;
  /** True after OS permission + FCM token registration succeeded on this device. */
  readonly deviceReady?: boolean;
}) {
  const permissionDenied =
    status != null &&
    (status.toLowerCase().includes('not granted') ||
      status.toLowerCase().includes('blocked') ||
      status.toLowerCase().includes('denied'));

  return (
    <TransactionalPageShell title={title} subtitle={description} embedded>
      <ul className="grid list-none gap-3 p-0" aria-label="Notification benefits">
        {DEFAULT_BENEFITS.map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#FF7A00]" aria-hidden />
            <p className="text-sm text-white/75">{text}</p>
          </li>
        ))}
      </ul>

      {deviceReady ? (
        <div
          className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-emerald-200">Notifications enabled on this device</p>
          <p className="mt-1 text-xs text-white/65">
            You will get order updates on this phone. Use re-register only if alerts stop arriving.
          </p>
        </div>
      ) : null}

      <SoftButton type="button" fullWidth disabled={busy} tone={deviceReady ? 'ghost' : 'primary'} onClick={onEnable}>
        {busy ? busyLabel : enableLabel}
      </SoftButton>

      {status && !deviceReady ? (
        <p className="text-sm text-white/70" role="status" aria-live="polite">
          {status}
        </p>
      ) : null}

      {permissionDenied && deniedHint ? (
        <p className="text-sm text-white/55">{deniedHint}</p>
      ) : null}

      {onViewOrders ? (
        <SoftButton type="button" tone="ghost" fullWidth onClick={onViewOrders}>
          {viewOrdersLabel}
        </SoftButton>
      ) : null}
    </TransactionalPageShell>
  );
}
