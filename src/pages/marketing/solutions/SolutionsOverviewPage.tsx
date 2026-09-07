import React from 'react';
import { SeoLandingPage } from '../../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../../config/seoPagesData';

const SolutionsOverviewPage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['solutions']} />;
};

export default SolutionsOverviewPage;
