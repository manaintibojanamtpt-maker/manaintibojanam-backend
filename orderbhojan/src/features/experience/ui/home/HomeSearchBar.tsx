import { Link } from 'react-router-dom';
import { Chip, SearchBar, Icon, Button } from '@bhojan/design-system';
import { useScrollChrome } from '../../hooks/useScrollChrome';
import { POPULAR_SEARCHES } from '../../data/mockCatalog';

export function HomeSearchBar() {
  const pinned = useScrollChrome(120);

  return (
    <div
      className={`ob-home-search ob-section ob-section--full${pinned ? ' ob-home-search--pinned' : ''}`}
      role="search"
    >
      <div className="ob-home-search__shell">
        <SearchBar
          placeholder="Search food, restaurants..."
          readOnly
          aria-label="Search food and restaurants"
          onFocus={(event) => event.currentTarget.blur()}
        />
        <div className="ob-home-search__actions">
          <Button variant="ghost" size="compact" aria-label="Voice search placeholder" disabled>
            <Icon size={18} label="Voice search">
              <path d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <path d="M12 18v4" />
            </Icon>
          </Button>
          <Link to="/search" aria-label="Open search page" className="ob-icon-btn">
            <Icon size={20} label="Search">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </Icon>
          </Link>
        </div>
      </div>
      <div className="ob-home-search__trending" aria-label="Trending searches">
        {POPULAR_SEARCHES.slice(0, 3).map((term) => (
          <Chip key={term.id} className="ob-home-search__trending-chip" aria-label={`Trending ${term.label}`}>
            {term.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
