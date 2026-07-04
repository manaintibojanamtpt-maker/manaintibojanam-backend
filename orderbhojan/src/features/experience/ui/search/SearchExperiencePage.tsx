import { useSearchFeatureEnabled, SearchExperience } from '@/features/search';
import { MockSearchExperiencePage } from './MockSearchExperiencePage';

export function SearchExperiencePage() {
  const searchEnabled = useSearchFeatureEnabled();
  return searchEnabled ? <SearchExperience /> : <MockSearchExperiencePage />;
}
