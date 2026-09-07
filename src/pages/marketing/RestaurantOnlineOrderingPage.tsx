import React from 'react';
import { SeoLandingPage } from '../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../config/seoPagesData';

const RestaurantOnlineOrderingPage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['restaurant-online-ordering']} />;
};

export default RestaurantOnlineOrderingPage;
