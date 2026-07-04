import { useSkeletonSection } from '../../hooks/useMockExperienceQuery';
import { RestaurantRailSkeleton } from '../shared/ExperienceSkeletons';

const SECTION_TITLES: Record<string, string> = {
  nearby: 'Nearby Restaurants',
  'top-rated': 'Top Rated',
  'cloud-kitchens': 'Cloud Kitchens',
  'recently-ordered': 'Recently Ordered',
};

export function SkeletonRestaurantSection({ sectionId }: { sectionId: keyof typeof SECTION_TITLES }) {
  useSkeletonSection(sectionId);
  return <RestaurantRailSkeleton title={SECTION_TITLES[sectionId]} />;
}
