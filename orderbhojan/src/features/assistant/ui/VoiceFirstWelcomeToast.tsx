import { useState, useEffect } from 'react';
import { markGreetingDismissed } from '../domain/voiceFirstSession';

export interface VoiceFirstWelcomeToastProps {
  greetingText: string;
  onOpenVoice: () => void;
  onPlayAudioGreeting?: () => void;
  audioPlayBlocked?: boolean;
}

export function VoiceFirstWelcomeToast({
  greetingText,
  onOpenVoice,
  onPlayAudioGreeting,
  audioPlayBlocked = false,
}: VoiceFirstWelcomeToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss smoothly after 14 seconds if ignored
    const timer = setTimeout(() => {
      setVisible(false);
      markGreetingDismissed();
    }, 14000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    markGreetingDismissed();
  };

  const handleSpeak = () => {
    setVisible(false);
    markGreetingDismissed();
    onOpenVoice();
  };

  return (
    <aside
      aria-label="OrderBhojan AI Voice Welcome"
      className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 sm:bottom-6 sm:right-24 sm:left-auto"
      data-testid="voice-first-welcome-toast"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[#FF7A00]/40 bg-[#120D0A]/95 p-4 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.85),0_0_20px_rgba(255,122,0,0.25)] backdrop-blur-md">
        {/* Glow */}
        <div
          className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[#FF7A00]/20 blur-2xl"
          aria-hidden
        />

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition focus:outline-none"
          aria-label="Dismiss AI welcome"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="flex items-start gap-3 pr-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#CC5500] text-white shadow-[0_2px_10px_rgba(255,122,0,0.4)]">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#FFA043]">OrderBhojan AI</span>
              <span className="text-[10px] text-zinc-400">· Voice-first assistant</span>
            </div>
            <p className="text-xs font-medium leading-relaxed text-zinc-100">
              {greetingText}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex items-center justify-end gap-2 pt-1 border-t border-white/[0.08]">
          {audioPlayBlocked && onPlayAudioGreeting && (
            <button
              type="button"
              onClick={() => onPlayAudioGreeting()}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/20 transition"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
              <span>Tap to hear</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSpeak}
            className="flex items-center gap-1.5 rounded-lg bg-[#FF7A00] px-3.5 py-1 text-xs font-semibold text-white shadow-[0_2px_12px_rgba(255,122,0,0.4)] hover:bg-[#E05A00] transition active:scale-95"
          >
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            <span>Tap to speak</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
