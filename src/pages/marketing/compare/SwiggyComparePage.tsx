import React from 'react';
import { SeoLandingPage } from '../../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../../config/seoPagesData';

const SwiggyComparePage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['compare-bhojanos-vs-swiggy']} />;
};

export default SwiggyComparePage;
