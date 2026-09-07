import React from 'react';
import { SeoLandingPage } from '../../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../../config/seoPagesData';

const RestaurantsSolutionPage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['solutions-restaurants']} />;
};

export default RestaurantsSolutionPage;
