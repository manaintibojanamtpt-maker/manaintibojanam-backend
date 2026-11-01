import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { EnterpriseSchema } from '../../components/EnterpriseSchema';
import { ContactSalesSupportSection } from '../../components/marketing/ContactSalesSupportSection';

const ContactPage: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#09090B] font-sans text-[#FAFAFA] neone-dark">
      <EnterpriseSchema />
      <EnterpriseHeader />
      <main className="flex-grow marketing-main-offset">
        <ContactSalesSupportSection />
      </main>
      <EnterpriseFooter />
    </div>
  );
};

export default ContactPage;
