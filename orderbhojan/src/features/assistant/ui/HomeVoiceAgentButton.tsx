/**
 * Premium AI control placed next to home search — opens live Voice Agent.
 */
export function HomeVoiceAgentButton() {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent('ob-voice-agent-open'));
      }}
      className="group relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-[#FF7A00]/45 bg-[#120D0A] shadow-[0_8px_24px_-10px_rgba(255,122,0,0.7)] transition hover:scale-[1.03] hover:border-[#FF7A00]/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/60"
      aria-label="OrderBhojan Voice Agent — speak to order"
      title="Voice Agent"
      data-testid="home-voice-agent-button"
    >
      <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#FF7A00]/15 to-transparent opacity-80" aria-hidden />
      <span className="relative flex flex-col items-center gap-0.5">
        <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
          <span className="h-1.5 w-[2.5px] rounded-full bg-[#FF7A00]" />
          <span className="h-3.5 w-[2.5px] rounded-full bg-[#FF7A00]" />
          <span className="h-2.5 w-[2.5px] rounded-full bg-[#FF7A00]" />
          <span className="h-3 w-[2.5px] rounded-full bg-[#FF7A00]" />
        </span>
        <span className="text-[7px] font-bold tracking-[0.12em] text-[#FF7A00]">AI</span>
      </span>
    </button>
  );
}
