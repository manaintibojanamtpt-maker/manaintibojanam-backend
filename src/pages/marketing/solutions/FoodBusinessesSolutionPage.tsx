import React from 'react';
import { SeoLandingPage } from '../../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../../config/seoPagesData';

const FoodBusinessesSolutionPage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['solutions-food-businesses']} />;
};

export default FoodBusinessesSolutionPage;
