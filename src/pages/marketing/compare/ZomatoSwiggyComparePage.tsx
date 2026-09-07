import React from 'react';
import { SeoLandingPage } from '../../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../../config/seoPagesData';

const ZomatoSwiggyComparePage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['bhojanos-vs-zomato-swiggy']} />;
};

export default ZomatoSwiggyComparePage;
