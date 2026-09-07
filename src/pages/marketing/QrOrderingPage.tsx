import React from 'react';
import { SeoLandingPage } from '../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../config/seoPagesData';

const QrOrderingPage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['qr-code-ordering-system']} />;
};

export default QrOrderingPage;
