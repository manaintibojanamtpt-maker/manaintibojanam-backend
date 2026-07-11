import { resolveAiDiningContext } from '../../domain/aiDiningContext';

export function AiDiningGuide() {
  const context = resolveAiDiningContext();

  return (
    <section className="ob-ai-dining-guide" aria-label="Personalized dining guide">
      <div className="ob-ai-dining-guide__glow" aria-hidden />
      <div className="ob-ai-dining-guide__content">
        <p className="bds-text-micro-label ob-ai-dining-guide__eyebrow">
          Curated for you · {context.mood.replace('-', ' ')}
        </p>
        <h2 className="bds-text-heading ob-ai-dining-guide__title">
          {context.headline}
        </h2>
        <p className="bds-text-body ob-ai-dining-guide__subline">
          {context.subline}
        </p>
        <div className="ob-ai-dining-guide__chips">
          {context.chips.map((chip: string) => (
            <span key={chip} className="bds-badge bds-badge--offer">
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
