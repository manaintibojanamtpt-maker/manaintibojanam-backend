import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Star, ChevronRight } from 'lucide-react';
import type { MarketplaceSearchResultCard } from '../../lib/marketplace/searchTypes';
import { HighlightedText } from './HighlightedText';

interface MarketplaceSearchResultCardProps {
  readonly result: MarketplaceSearchResultCard;
  readonly query: string;
  readonly onResultClick?: (tenantId: string) => void;
}

const badgeStyles: Record<string, string> = {
  matched_restaurant: 'bg-[#FF7A00]/15 text-[#FF7A00] border-[#FF7A00]/30',
  matched_cuisine: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  matched_area: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  matched_tag: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  matched: 'bg-white/10 text-white/70 border-white/15',
};

export const MarketplaceSearchResultCardView: React.FC<MarketplaceSearchResultCardProps> = ({
  result,
  query,
  onResultClick,
}) => {
  return (
    <Link
      to={result.storePath}
      onClick={() => onResultClick?.(result.tenantId)}
      className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[#FF7A00]/40 hover:bg-white/[0.05]"
    >
      <div className="flex gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5">
          {result.thumbnailUrl ? (
            <img
              src={result.thumbnailUrl}
              alt={result.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
              Kitchen
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="truncate text-base font-semibold text-white group-hover:text-[#FF7A00]">
                <HighlightedText text={result.name} query={query} />
              </h3>
              <p className="mt-0.5 text-xs text-white/50">{result.eligibilityLabel}</p>
              {result.cuisineLabel && (
                <p className="mt-0.5 text-xs text-white/40">{result.cuisineLabel}</p>
              )}
            </div>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-white/30 group-hover:text-[#FF7A00]" />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/60">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {result.distanceKm.toFixed(1)} km
            </span>
            {result.etaMins !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {result.etaMins} min
              </span>
            )}
            {result.rating !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {result.rating.toFixed(1)}
              </span>
            )}
            {!result.isOpen && (
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">
                Closed
              </span>
            )}
          </div>

          {result.matchBadges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.matchBadges.map((badge) => (
                <span
                  key={badge.id}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeStyles[badge.id] ?? badgeStyles.matched}`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}

          {result.highlights.length > 0 && (
            <p className="mt-2 line-clamp-2 text-xs text-white/45">
              <HighlightedText text={result.highlights[0]?.snippet ?? ''} query={query} />
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default MarketplaceSearchResultCardView;
