import React, { useState } from 'react';
import { Mic, Sparkles } from 'lucide-react';
import { OwnerVoiceAssistantModal } from './OwnerVoiceAssistantModal';
import { useOwnerTenantId } from '../../../hooks/useOwnerTenantId';

export const OwnerVoiceAssistantLauncher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const tenantId = useOwnerTenantId();

  if (!tenantId) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-3 text-slate-950 font-semibold shadow-xl transition-all duration-200 hover:scale-105 hover:from-amber-500 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label="Open BhojanOS Voice Assistant"
        >
          <div className="relative flex items-center justify-center">
            <Mic className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-950 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-950"></span>
            </span>
          </div>
          <span className="text-sm font-bold tracking-tight">Voice AI</span>
          <Sparkles className="h-4 w-4 text-slate-950/70 transition-transform group-hover:rotate-12" />
        </button>
      </div>

      <OwnerVoiceAssistantModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
