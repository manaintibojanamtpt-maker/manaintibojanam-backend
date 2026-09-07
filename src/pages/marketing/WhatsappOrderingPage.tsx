import React from 'react';
import { SeoLandingPage } from '../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../config/seoPagesData';

const WhatsappOrderingPage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['whatsapp-food-ordering-system']} />;
};

export default WhatsappOrderingPage;
