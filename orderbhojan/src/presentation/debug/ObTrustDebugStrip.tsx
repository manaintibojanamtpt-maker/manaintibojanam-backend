import { useEffect, useState } from 'react';
import {
  isObDebugEnabled,
  readObTrustDebugSnapshot,
  type ObTrustDebugSnapshot,
} from '@/lib/obDebug';

function formatCoord(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(5);
}

function DebugRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex justify-between gap-2 text-[10px] leading-tight">
      <span className="text-white/50">{label}</span>
      <span className="truncate text-right font-mono text-white/90">{value}</span>
    </div>
  );
}

function snapshotLines(snapshot: ObTrustDebugSnapshot): Array<{ label: string; value: string }> {
  return [
    { label: 'mode', value: snapshot.locationMode ?? '—' },
    {
      label: 'coords',
      value: `${formatCoord(snapshot.lat)}, ${formatCoord(snapshot.lng)}`,
    },
    { label: 'confirmed', value: snapshot.isConfirmed == null ? '—' : String(snapshot.isConfirmed) },
    {
      label: 'kitchens',
      value:
        snapshot.shownKitchens == null
          ? '—'
          : snapshot.excludedKitchens == null
            ? String(snapshot.shownKitchens)
            : `${snapshot.shownKitchens} shown / ${snapshot.excludedKitchens} excluded`,
    },
    {
      label: 'checkout',
      value:
        snapshot.checkoutGrandTotal == null ? '—' : `₹${snapshot.checkoutGrandTotal.toFixed(2)}`,
    },
    {
      label: 'razorpay',
      value: snapshot.razorpayAmountPaise == null ? '—' : `${snapshot.razorpayAmountPaise} paise`,
    },
    { label: 'returnTo', value: snapshot.authReturnTo ?? '—' },
  ];
}

/** Collapsible trust-path debug strip — only when explicit debug flag is enabled. */
export function ObTrustDebugStrip() {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<ObTrustDebugSnapshot>(() => readObTrustDebugSnapshot());

  useEffect(() => {
    if (!isObDebugEnabled()) return;
    const tick = () => setSnapshot(readObTrustDebugSnapshot());
    tick();
    const id = window.setInterval(tick, 750);
    return () => window.clearInterval(id);
  }, []);

  if (!isObDebugEnabled()) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[9999] border-t border-amber-500/30 bg-[#120a04]/95 text-amber-100 backdrop-blur-sm"
      data-testid="ob-trust-debug-strip"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-amber-300"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>OB trust debug</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <div className="space-y-1 border-t border-amber-500/20 px-3 py-2 pb-[max(0.5rem,var(--ob-safe-bottom,0px))]">
          {snapshotLines(snapshot).map((row) => (
            <DebugRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
