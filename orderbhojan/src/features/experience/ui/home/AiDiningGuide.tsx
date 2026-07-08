import { Badge, Text } from '@bhojan/design-system';
import { resolveAiDiningContext } from '../../domain/aiDiningContext';

export function AiDiningGuide() {
  const context = resolveAiDiningContext();

  return (
    <section className="ob-ai-dining-guide" aria-label="Personalized dining guide">
      <div className="ob-ai-dining-guide__glow" aria-hidden />
      <div className="ob-ai-dining-guide__content">
        <Text variant="microLabel" className="ob-ai-dining-guide__eyebrow">
          Curated for you · {context.mood.replace('-', ' ')}
        </Text>
        <Text variant="heading" as="h2" className="ob-ai-dining-guide__title">
          {context.headline}
        </Text>
        <Text variant="body" className="ob-ai-dining-guide__subline">
          {context.subline}
        </Text>
        <div className="ob-ai-dining-guide__chips">
          {context.chips.map((chip: string) => (
            <Badge key={chip} variant="offer">
              {chip}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );
}
