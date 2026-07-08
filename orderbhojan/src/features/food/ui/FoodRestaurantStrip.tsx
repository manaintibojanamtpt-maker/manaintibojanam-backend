import {
  AppetiteImage,
  Button,
  Icon,
  Text,
} from '@bhojan/design-system';
import {
  pictureSources,
  resolveRestaurantLogo,
  restaurantSlugFromString,
} from '@/features/restaurant/data/restaurant-photo-manifest';

interface FoodRestaurantStripProps {
  readonly slug: string;
  readonly name: string;
  readonly onBack: () => void;
  readonly onHome?: () => void;
}

export function FoodRestaurantStrip({ slug, name, onBack, onHome }: FoodRestaurantStripProps) {
  const logo = resolveRestaurantLogo(restaurantSlugFromString(slug), 82);

  return (
    <header className="ob-food-px6__identity">
      <Button
        variant="secondary"
        size="compact"
        className="ob-food-px6__back"
        aria-label="Back to restaurant"
        onClick={onBack}
      >
        <Icon size={18} label="Back">
          <path d="M15 18l-6-6 6-6" />
        </Icon>
      </Button>
      {onHome ? (
        <Button
          variant="secondary"
          size="compact"
          className="ob-food-px6__home"
          aria-label="Back to home"
          onClick={onHome}
        >
          <Icon size={18} label="Home">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V20h14V9.5" />
          </Icon>
        </Button>
      ) : null}
      <div className="ob-food-px6__identity-meta">
        <AppetiteImage
          src={logo.src}
          alt=""
          className="ob-food-px6__logo"
          srcSet={logo.webpSrcSet}
          sizes="2.5rem"
          blurDataURL={logo.blurDataURL}
          sources={pictureSources(logo, '2.5rem')}
          priority
        />
        <div className="ob-food-px6__identity-text">
          <Text variant="caption" className="ob-food-px6__identity-label">
            From
          </Text>
          <Text variant="subtitle" as="p" className="ob-food-px6__identity-name">
            {name}
          </Text>
        </div>
      </div>
    </header>
  );
}
