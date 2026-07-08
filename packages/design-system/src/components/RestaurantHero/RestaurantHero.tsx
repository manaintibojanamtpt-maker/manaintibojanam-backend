import React from 'react';

import { cn } from '../../utils/cn';

import { AppetiteImage, type AppetitePictureSource } from '../AppetiteImage';

import { Avatar } from '../Avatar';



export interface RestaurantHeroProps {

  coverUrl: string;

  coverAlt?: string;

  coverSrcSet?: string;

  coverSizes?: string;

  coverBlurDataURL?: string;

  coverSources?: readonly AppetitePictureSource[];

  coverPriority?: boolean;

  logoUrl?: string;

  logoBlurDataURL?: string;

  name: string;

  meta?: React.ReactNode;

  actionsSlot?: React.ReactNode;

  offerSlot?: React.ReactNode;

  statusSlot?: React.ReactNode;

  /** Immersive: 42–50vh cover with identity overlaid on photography */

  variant?: 'default' | 'immersive';

  collapsed?: boolean;

  enterFromPoster?: boolean;

  className?: string;

}



export function RestaurantHero({

  coverUrl,

  coverAlt = '',

  coverSrcSet,

  coverSizes = '100vw',

  coverBlurDataURL,

  coverSources,

  coverPriority = false,

  logoUrl,

  logoBlurDataURL,

  name,

  meta,

  actionsSlot,

  offerSlot,

  statusSlot,

  variant = 'default',

  collapsed = false,

  enterFromPoster = false,

  className,

}: RestaurantHeroProps) {

  const immersive = variant === 'immersive';



  return (

    <header

      className={cn(

        'bds-restaurant-hero',

        immersive && 'bds-restaurant-hero--immersive',

        collapsed && 'bds-restaurant-hero--collapsed',

        enterFromPoster && 'bds-restaurant-hero--enter-from-poster',

        className,

      )}

      aria-label={name}

    >

      <div className="bds-restaurant-hero__cover">

        <AppetiteImage

          src={coverUrl}

          alt={coverAlt || name}

          priority={coverPriority}

          srcSet={coverSrcSet}

          sizes={coverSizes}

          blurDataURL={coverBlurDataURL}

          sources={coverSources}

        />

      </div>

      <div className="bds-restaurant-hero__scrim" aria-hidden />

      {immersive ? (

        <>

          {actionsSlot ? (

            <div className="bds-restaurant-hero__chrome">{actionsSlot}</div>

          ) : null}

          <div className="bds-restaurant-hero__overlay">

            {offerSlot ? <div className="bds-restaurant-hero__offer">{offerSlot}</div> : null}

            <div className="bds-restaurant-hero__identity-row">

              {logoUrl ? (

                <Avatar

                  src={logoUrl}

                  alt=""

                  size="lg"

                  className="bds-restaurant-hero__logo"

                />

              ) : null}

              <div className="bds-restaurant-hero__identity-copy">

                {statusSlot ? <div className="bds-restaurant-hero__status">{statusSlot}</div> : null}

                <h1 className="bds-restaurant-hero__name">{name}</h1>

                {meta}

              </div>

            </div>

          </div>

        </>

      ) : (

        <div className="bds-restaurant-hero__identity">

          {logoUrl ? (

            <AppetiteImage

              src={logoUrl}

              alt=""

              className="bds-restaurant-hero__logo-fallback"

              blurDataURL={logoBlurDataURL}

            />

          ) : null}

          <h1 className="bds-text-display">{name}</h1>

          {meta}

        </div>

      )}

    </header>

  );

}


