import { useCallback } from 'react';

const SAMPLE_PROMPTS = [
  { label: '2 Masala Dosa add cheyi', lang: 'te' },
  { label: 'Mutton Biryani from Mana Inti', lang: 'en' },
  { label: '2 Veg Meals cart mein dalo', lang: 'hi' },
  { label: 'Gulab Jamun rendu kavali', lang: 'te' },
];

export function HomeVoiceHeroCard() {
  const handleOpenVoice = useCallback((initialPrompt?: string) => {
    window.dispatchEvent(
      new CustomEvent('ob-voice-agent-open', {
        detail: { initialPrompt },
      }),
    );
  }, []);

  return (
    <section
      aria-label="Voice-first food ordering"
      className="relative overflow-hidden rounded-2xl border border-[#FF7A00]/30 bg-gradient-to-br from-[#1A110B] via-[#120D0A] to-[#0A0705] p-4 sm:p-5 shadow-[0_12px_32px_-12px_rgba(255,122,0,0.35)]"
      data-testid="home-voice-hero-card"
    >
      {/* Decorative ambient glows */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#FF7A00]/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-12 -bottom-12 h-32 w-32 rounded-full bg-[#FFA043]/10 blur-2xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-3.5">
        {/* Header row: badge + title */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF7A00]/40 bg-[#FF7A00]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#FF9E40] tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF7A00] animate-pulse" />
              AI Voice Ordering
            </span>
            <span className="text-[11px] text-zinc-400">
              తెలుగు · हिंदी · English
            </span>
          </div>
          <span className="text-[11px] font-medium text-amber-300/80">
            Auto-detecting language
          </span>
        </div>

        {/* Main CTA block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              What would you like to eat today?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300">
              Just speak naturally in your language — tell me your favorite dish or kitchen.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenVoice()}
            className="group relative flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#E05A00] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,122,0,0.4)] transition hover:scale-[1.02] hover:shadow-[0_6px_24px_rgba(255,122,0,0.55)] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
            aria-label="Tap to speak and order food with AI voice"
          >
            {/* Pulsing Mic Icon */}
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/20 group-hover:bg-black/30 transition">
              <svg
                className="h-3.5 w-3.5 text-white animate-pulse"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </span>
            <span>Tap to speak & order</span>
          </button>
        </div>

        {/* Quick voice prompts */}
        <div className="pt-1">
          <p className="mb-1.5 text-[11px] font-medium text-zinc-400">
            Try saying:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                onClick={() => handleOpenVoice(prompt.label)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-left text-xs text-zinc-300 transition hover:border-[#FF7A00]/50 hover:bg-[#FF7A00]/10 hover:text-white"
                title={`Try saying: ${prompt.label}`}
              >
                &ldquo;{prompt.label}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
