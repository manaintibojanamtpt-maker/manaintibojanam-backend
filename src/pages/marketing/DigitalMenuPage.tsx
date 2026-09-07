import React from 'react';
import { SeoLandingPage } from '../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../config/seoPagesData';

const DigitalMenuPage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['digital-menu-for-restaurants']} />;
};

export default DigitalMenuPage;
