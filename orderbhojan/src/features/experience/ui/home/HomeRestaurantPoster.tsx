import { useNavigate } from 'react-router-dom';

import { MotionPress, RestaurantPoster } from '@bhojan/design-system';

import type { MockRestaurant } from '../../domain/experience.types';

import { resolveAppetitePhoto } from '../../utils/resolveAppetitePhoto';



export interface HomeRestaurantPosterProps {

  readonly restaurant: MockRestaurant;

}



function shortCuisine(cuisine: string): string {

  return cuisine.split('·')[0]?.trim() ?? cuisine;

}



export function HomeRestaurantPoster({ restaurant }: HomeRestaurantPosterProps) {

  const navigate = useNavigate();

  const photo = resolveAppetitePhoto(restaurant.imageUrl, 480, '8.75rem', 82);



  return (

    <MotionPress>

      <RestaurantPoster

        name={restaurant.name}

        imageUrl={photo.src}

        imageSrcSet={photo.srcSet}

        imageSizes={photo.sizes}

        imageBlurDataURL={photo.blurDataURL}

        imageSources={photo.sources}

        imageAlt={`${restaurant.name} — ${restaurant.cuisine}`}

        rating={restaurant.rating}

        eta={restaurant.eta}

        cuisine={shortCuisine(restaurant.cuisine)}

        closed={!restaurant.isOpen}

        onClick={() => navigate(`/restaurant/${restaurant.slug}`, { state: { fromPoster: true } })}

      />

    </MotionPress>

  );

}

