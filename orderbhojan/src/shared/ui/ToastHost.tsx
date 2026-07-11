import { Loader2, X } from 'lucide-react';

const VARIANT_STYLES = {
  default: 'border-white/15 bg-[#1a1410] text-white',
  success: 'border-emerald-500/30 bg-emerald-950/90 text-emerald-50',
  warning: 'border-amber-500/30 bg-amber-950/90 text-amber-50',
  danger: 'border-red-500/30 bg-red-950/90 text-red-50',
} as const;

export function ToastHost({
  message,
  variant = 'default',
  onDismiss,
}: {
  readonly message: string;
  readonly variant?: keyof typeof VARIANT_STYLES;
  readonly onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[200] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-xl md:left-auto md:right-6 ${VARIANT_STYLES[variant]}`}
    >
      <p className="text-sm font-medium">{message}</p>
      <button
        type="button"
        className="rounded-full p-1 text-white/70 transition hover:text-white"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function LoadingSpinner({ label }: { readonly label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-white/70" role="status" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-[#FF7A00] motion-reduce:animate-none" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}
