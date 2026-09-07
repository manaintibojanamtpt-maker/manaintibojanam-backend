import React from 'react';
import { SeoLandingPage } from '../../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../../config/seoPagesData';

const CafesSolutionPage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['cafe-pos-billing-software']} />;
};

export default CafesSolutionPage;
