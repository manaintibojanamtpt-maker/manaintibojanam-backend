import React from 'react';
import { SeoLandingPage } from '../../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../../config/seoPagesData';

const CloudKitchensSolutionPage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['cloud-kitchen-software']} />;
};

export default CloudKitchensSolutionPage;
