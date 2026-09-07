import React from 'react';
import { SeoLandingPage } from '../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../config/seoPagesData';

const RestaurantManagementPage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['restaurant-management-system']} />;
};

export default RestaurantManagementPage;
