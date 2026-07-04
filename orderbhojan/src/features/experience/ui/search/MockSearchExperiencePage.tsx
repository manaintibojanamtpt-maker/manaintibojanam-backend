import { Link, useNavigate } from 'react-router-dom';
import {
  Chip,
  EmptyState,
  Icon,
  SearchBar,
  Skeleton,
  Text,
} from '@bhojan/design-system';
import {
  POPULAR_SEARCHES,
  RECENT_SEARCHES,
  TRENDING_FOODS,
} from '../../data/mockCatalog';
import { MenuSkeleton } from '../shared/ExperienceSkeletons';

export function MockSearchExperiencePage() {
  const navigate = useNavigate();

  return (
    <div className="ob-page-enter ob-search-page ob-search-premium" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-6)' }}>
      <Text variant="heading" as="h1" style={{ letterSpacing: '-0.03em' }}>Search</Text>
      <SearchBar
        placeholder="Search food, restaurants..."
        aria-label="Search food and restaurants"
        readOnly
      />

      <section className="ob-section" aria-label="Recent searches">
        <div className="ob-section__header">
          <Text variant="subtitle" as="h2" className="ob-section__title">Recent Searches</Text>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--bds-space-2)' }}>
          {RECENT_SEARCHES.map((term) => (
            <Chip key={term.id} className="ob-category-chip" aria-label={`Recent search ${term.label}`}>{term.label}</Chip>
          ))}
        </div>
      </section>

      <section className="ob-section" aria-label="Popular searches">
        <div className="ob-section__header">
          <Text variant="subtitle" as="h2" className="ob-section__title">Popular Searches</Text>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--bds-space-2)' }}>
          {POPULAR_SEARCHES.map((term) => (
            <Chip key={term.id} className="ob-category-chip" aria-label={`Popular search ${term.label}`}>{term.label}</Chip>
          ))}
        </div>
      </section>

      <section className="ob-section" aria-label="Trending foods">
        <div className="ob-section__header">
          <Text variant="subtitle" as="h2" className="ob-section__title">Trending Foods</Text>
        </div>
        <MenuSkeleton />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-3)', marginTop: 'var(--bds-space-4)' }}>
          {TRENDING_FOODS.map((food) => (
            <div key={food.id} className="ob-search-trend-item">
              <Skeleton width="3.25rem" height="3.25rem" />
              <div>
                <Text variant="bodySm" style={{ fontWeight: 700 }}>{food.name}</Text>
                <Text variant="caption" style={{ color: 'var(--bds-color-text-secondary)' }}>{food.description}</Text>
              </div>
              <Text variant="price">₹{food.price}</Text>
            </div>
          ))}
        </div>
      </section>

      <EmptyState
        title="Search coming soon"
        description="Full search will arrive in a later milestone. Browse categories on Home for now."
        actionLabel="Continue Browsing"
        onAction={() => navigate('/')}
        icon={
          <div className="ob-empty-premium__icon">
            <Icon size={40} label="Search">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </Icon>
          </div>
        }
      />
      <Link to="/" className="bds-sr-only">Back to home</Link>
    </div>
  );
}
