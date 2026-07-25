interface ConsumerAssistantFabProps {
  readonly open: boolean;
  readonly listening?: boolean;
  readonly voiceAgentActive?: boolean;
  readonly onToggle: () => void;
}

/**
 * Premium OrderBhojan AI voice orb — not a generic chat bubble.
 */
export function ConsumerAssistantFab({
  open,
  listening = false,
  voiceAgentActive = false,
  onToggle,
}: ConsumerAssistantFabProps) {
  const live = listening || voiceAgentActive;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="group fixed z-[85] flex h-14 w-14 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/70"
      style={{
        right: '14px',
        bottom: 'calc(96px + var(--ob-safe-bottom, 0px))',
      }}
      aria-label={
        open
          ? 'Close OrderBhojan Voice Agent'
          : 'Open OrderBhojan Voice Agent — live voice ordering'
      }
      aria-expanded={open}
      data-testid="consumer-assistant-fab"
    >
      {/* Soft glow ring */}
      <span
        className={
          live
            ? 'absolute inset-0 animate-ping rounded-full bg-[#FF7A00]/35'
            : 'absolute inset-[-3px] rounded-full bg-gradient-to-br from-[#FF7A00]/50 via-[#ff9f1c]/20 to-transparent opacity-80 blur-[2px] transition group-hover:opacity-100'
        }
        aria-hidden
      />
      <span
        className={
          live
            ? 'relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b35] via-[#FF7A00] to-[#ffb347] shadow-[0_12px_36px_-8px_rgba(255,122,0,0.85)]'
            : 'relative flex h-14 w-14 items-center justify-center rounded-full border border-[#FF7A00]/45 bg-[#120D0A] shadow-[0_12px_36px_-10px_rgba(255,122,0,0.65)] transition group-hover:scale-[1.04] group-hover:border-[#FF7A00]/70'
        }
      >
        {open && !live ? (
          <span className="text-lg font-semibold text-[#FF7A00]">×</span>
        ) : (
          <span className="flex flex-col items-center justify-center gap-0.5">
            {/* Waveform mark — reads as voice AI, not support chat */}
            <span className="flex h-4 items-end gap-[3px]" aria-hidden>
              <span
                className={
                  live
                    ? 'h-2 w-[3px] animate-pulse rounded-full bg-black/80'
                    : 'h-2 w-[3px] rounded-full bg-[#FF7A00]'
                }
              />
              <span
                className={
                  live
                    ? 'h-4 w-[3px] animate-pulse rounded-full bg-black/90 [animation-delay:75ms]'
                    : 'h-4 w-[3px] rounded-full bg-[#FF7A00]'
                }
              />
              <span
                className={
                  live
                    ? 'h-3 w-[3px] animate-pulse rounded-full bg-black/80 [animation-delay:150ms]'
                    : 'h-3 w-[3px] rounded-full bg-[#FF7A00]'
                }
              />
              <span
                className={
                  live
                    ? 'h-[14px] w-[3px] animate-pulse rounded-full bg-black/90 [animation-delay:225ms]'
                    : 'h-[14px] w-[3px] rounded-full bg-[#FF7A00]'
                }
              />
            </span>
            <span
              className={
                live
                  ? 'text-[8px] font-bold tracking-[0.14em] text-black/90'
                  : 'text-[8px] font-bold tracking-[0.14em] text-[#FF7A00]'
              }
            >
              AI
            </span>
          </span>
        )}
      </span>
    </button>
  );
}
