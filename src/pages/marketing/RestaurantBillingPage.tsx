import React from 'react';
import { SeoLandingPage } from '../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../config/seoPagesData';

const RestaurantBillingPage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['restaurant-billing-software']} />;
};

export default RestaurantBillingPage;
