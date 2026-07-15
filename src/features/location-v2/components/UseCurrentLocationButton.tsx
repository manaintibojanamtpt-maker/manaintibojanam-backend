import { Navigation, Loader2 } from 'lucide-react';

type UseCurrentLocationButtonProps = {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function UseCurrentLocationButton({
  onClick,
  loading = false,
  disabled = false,
  label = 'Use current location',
  className = '',
}: UseCurrentLocationButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/10 disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </button>
  );
}

export default UseCurrentLocationButton;
