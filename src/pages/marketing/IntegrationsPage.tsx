import React from 'react';
import { SeoLandingPage } from '../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../config/seoPagesData';

const IntegrationsPage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['integrations']} />;
};

export default IntegrationsPage;
