import React from 'react';
import { MessageCircle, X } from 'lucide-react';

interface MarketingAssistantLauncherProps {
  readonly open: boolean;
  readonly onToggle: () => void;
}

export function MarketingAssistantLauncher({ open, onToggle }: MarketingAssistantLauncherProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.1] bg-[#0A0A0A] text-[#FF7A00] shadow-[0_12px_40px_-12px_rgba(255,122,0,0.55)] transition hover:scale-[1.03] hover:border-[#FF7A00]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/60 sm:bottom-6 sm:right-6"
      aria-label={open ? 'Close BhojanOS assistant' : 'Open BhojanOS assistant'}
      aria-expanded={open}
      data-testid="marketing-assistant-launcher"
    >
      {open ? <X size={22} /> : <MessageCircle size={22} />}
    </button>
  );
}
