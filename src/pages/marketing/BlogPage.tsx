import React from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { BookOpen } from 'lucide-react';

/**
 * Blog placeholder page. No JS animation — content must render without
 * motion (progressive enhancement only). Noindex: no real content yet.
 */
const BlogPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#030303] text-white font-sans selection:bg-[#FF7A00]/30 relative">
      <meta name="robots" content="noindex, follow" />
      <EnterpriseHeader />

      <main className="flex-grow marketing-main-offset pb-24 px-4 sm:px-6 lg:px-12 max-w-[1400px] mx-auto w-full flex flex-col justify-center items-center text-center relative z-10">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(255,122,0,0.08)]">
            <BookOpen size={32} className="text-[#FF7A00]" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-6">
            Enterprise <span className="text-[#FF7A00]">Insights</span>
          </h1>

          <p className="text-xl text-gray-400 font-medium leading-relaxed max-w-2xl mb-12">
            Guides and operational strategies for food businesses running on BhojanOS.
          </p>

          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-sm font-bold uppercase tracking-widest text-white">
            Coming Soon
          </div>
        </div>
      </main>

      <EnterpriseFooter />
    </div>
  );
};

export default BlogPage;
