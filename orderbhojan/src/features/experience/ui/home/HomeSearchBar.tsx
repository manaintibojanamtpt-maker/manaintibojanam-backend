import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useScrollChrome } from '../../hooks/useScrollChrome';
import { POPULAR_SEARCHES } from '../../data/mockCatalog';
import { HomeVoiceAgentButton } from '@/features/assistant/ui/HomeVoiceAgentButton';

export function HomeSearchBar() {
  const pinned = useScrollChrome(120);

  return (
    <div
      className={`ob-home-search ob-section ob-section--full${pinned ? ' ob-home-search--pinned' : ''}`}
      role="search"
    >
      <div className="ob-home-search__shell">
        <input
          className="bds-search"
          placeholder="Search food, restaurants..."
          readOnly
          aria-label="Search food and restaurants"
          onFocus={(event) => event.currentTarget.blur()}
        />
        <div className="ob-home-search__actions">
          <HomeVoiceAgentButton />
          <Link to="/search" aria-label="Open search page" className="ob-icon-btn">
            <Search className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </div>
      <div className="ob-home-search__trending" aria-label="Trending searches">
        {POPULAR_SEARCHES.slice(0, 3).map((term) => (
          <span key={term.id} className="bds-chip ob-home-search__trending-chip" aria-label={`Trending ${term.label}`}>
            {term.label}
          </span>
        ))}
      </div>
    </div>
  );
}
