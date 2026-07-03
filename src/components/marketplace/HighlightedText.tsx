import React from 'react';
import { buildHighlightSegments } from '../../lib/marketplace/searchHighlight';

interface HighlightedTextProps {
  readonly text: string;
  readonly query: string;
  readonly className?: string;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, query, className }) => {
  const segments = buildHighlightSegments(text, query);

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark
            key={`${segment.text}-${index}`}
            className="rounded bg-[#FF7A00]/25 px-0.5 text-[#FF7A00]"
          >
            {segment.text}
          </mark>
        ) : (
          <React.Fragment key={`${segment.text}-${index}`}>{segment.text}</React.Fragment>
        )
      )}
    </span>
  );
};

export default HighlightedText;
