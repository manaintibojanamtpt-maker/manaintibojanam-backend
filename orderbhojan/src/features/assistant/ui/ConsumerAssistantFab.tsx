import { MessageSquare, X } from 'lucide-react';

interface ConsumerAssistantFabProps {
  readonly open: boolean;
  readonly onToggle: () => void;
}

export function ConsumerAssistantFab({ open, onToggle }: ConsumerAssistantFabProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed z-[85] flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#120D0A]/95 text-[#FF7A00] shadow-[0_10px_30px_-12px_rgba(255,122,0,0.55)] backdrop-blur-md transition hover:scale-[1.03] hover:border-[#FF7A00]/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/55"
      style={{
        right: '16px',
        bottom: 'calc(96px + var(--ob-safe-bottom, 0px))',
      }}
      aria-label={open ? 'Close assistant' : 'Open OrderBhojan assistant'}
      aria-expanded={open}
      data-testid="consumer-assistant-fab"
    >
      {open ? <X size={20} /> : <MessageSquare size={20} />}
    </button>
  );
}
