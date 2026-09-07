import React from 'react';
import { SeoLandingPage } from '../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../config/seoPagesData';

const DeliveryManagementPage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['delivery-management-software']} />;
};

export default DeliveryManagementPage;
