import React from 'react';
import { SeoLandingPage } from '../../../components/marketing/SeoLandingPage';
import { SEO_PAGES } from '../../../config/seoPagesData';

const PetpoojaComparePage: React.FC = () => {
  return <SeoLandingPage data={SEO_PAGES['petpooja-alternative']} />;
};

export default PetpoojaComparePage;
