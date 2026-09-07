import React from 'react';
import { SeoLandingPage } from '../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../config/seoPagesData';

const RestaurantWebsitePage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['restaurant-website-builder']} />;
};

export default RestaurantWebsitePage;
