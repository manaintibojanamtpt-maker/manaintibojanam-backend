import React from 'react';
import { SeoLandingPage } from '../../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../../config/seoPagesData';

const DotpeComparePage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['dotpe-alternative']} />;
};

export default DotpeComparePage;
