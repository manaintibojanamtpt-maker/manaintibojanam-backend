import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { EnterpriseHeader } from './EnterpriseHeader';
import { EnterpriseFooter } from '../EnterpriseFooter';
import { ChevronDown, ArrowRight, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import type { SeoPageData } from '../../config/seoPagesData';

interface SeoLandingPageProps {
  data: SeoPageData;
}

export const SeoLandingPage: React.FC<SeoLandingPageProps> = ({ data }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    // Dynamic document title
    document.title = data.title;

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', data.metaDescription);

    // Canonical link tag
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    const cleanCanonical = data.canonical.replace('https://bhojanos.com', 'https://www.bhojanos.com');
    linkCanonical.setAttribute('href', cleanCanonical);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [data]);

  const canonicalUrl = data.canonical.replace('https://bhojanos.com', 'https://www.bhojanos.com');

  const schemaJson = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: data.title,
        description: data.metaDescription,
        isPartOf: {
          '@type': 'WebSite',
          '@id': 'https://www.bhojanos.com/#website',
          name: 'BhojanOS',
          url: 'https://www.bhojanos.com',
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://www.bhojanos.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: data.category,
            item: 'https://www.bhojanos.com/features',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: data.h1,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        name: 'BhojanOS',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web Browser, Progressive Web App (PWA)',
        url: 'https://www.bhojanos.com',
        description: 'Direct online ordering system and restaurant operating platform for restaurants, cloud kitchens, and food businesses.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
          description: '0% commission on direct online orders. Transparent software subscription for advanced operations.',
          url: 'https://www.bhojanos.com/pricing',
        },
        provider: {
          '@type': 'Organization',
          name: 'BhojanOS',
          url: 'https://www.bhojanos.com',
          logo: 'https://www.bhojanos.com/bhojan-os-icon.png',
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: data.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#09090B] text-[#FAFAFA] font-sans selection:bg-[#D97706]/30 selection:text-white relative overflow-x-hidden neone-dark">
      {/* JSON-LD Schema for Search Engines and AI Crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJson) }}
      />

      <EnterpriseHeader />

      <main className="flex-grow marketing-main-offset pt-10 sm:pt-14 pb-20">
        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 mb-6 shadow-inner">
            <Sparkles size={13} className="text-[#D97706]" aria-hidden />
            {data.badge}
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-[#FAFAFA] mb-6">
            {data.h1}
          </h1>

          <p className="text-lg sm:text-xl text-[#D97706] font-semibold max-w-2xl mx-auto mb-4 drop-shadow-sm">
            {data.subhead}
          </p>

          <p className="text-base sm:text-lg text-[#A1A1AA] max-w-3xl mx-auto leading-relaxed mb-8">
            {data.description}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="/owner/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#D97706] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#F59E0B] shadow-lg shadow-[#D97706]/25 transition-all active:scale-95"
            >
              Start Free Today
              <ArrowRight size={16} aria-hidden />
            </a>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-white/10 transition-all active:scale-95"
            >
              View Pricing
            </Link>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto mb-20 sm:mb-28">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FAFAFA] mb-3">
              Core Capabilities &amp; Features
            </h2>
            <p className="text-sm sm:text-base text-[#A1A1AA] max-w-xl mx-auto">
              Everything engineered to give you operational peace of mind and direct sales growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.features.map((feat, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[#27272A] bg-[#111114] p-6 transition-all hover:border-[#D97706]/50 hover:bg-[#18181B] shadow-md"
              >
                {feat.tag && (
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#D97706] bg-[#18181B] border border-[#27272A] px-2.5 py-0.5 rounded-full mb-3">
                    {feat.tag}
                  </span>
                )}
                <h3 className="text-base sm:text-lg font-bold text-[#FAFAFA] mb-2">{feat.title}</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Table if defined */}
        {data.comparison && (
          <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-20 sm:mb-28">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FAFAFA] mb-3">
                BhojanOS vs {data.comparison.competitorName}: Side-by-Side Comparison
              </h2>
              <p className="text-sm sm:text-base text-[#A1A1AA] max-w-xl mx-auto">
                Compare direct ordering economics with aggregator commissions.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#27272A] bg-[#111114] shadow-lg">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#27272A] bg-[#18181B]">
                    <th className="p-4 sm:p-5 font-bold text-[#FAFAFA]">Evaluation Factor</th>
                    <th className="p-4 sm:p-5 font-bold text-[#A1A1AA]">{data.comparison.competitorName}</th>
                    <th className="p-4 sm:p-5 font-extrabold text-[#D97706]">BhojanOS Platform</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {data.comparison.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 sm:p-5 font-semibold text-[#FAFAFA]">{row.metric}</td>
                      <td className="p-4 sm:p-5 text-[#A1A1AA]">{row.competitor}</td>
                      <td className="p-4 sm:p-5 font-bold text-[#D97706]">{row.bhojanos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Problem vs Solution Comparison */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-20 sm:mb-28">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-red-950/60 bg-red-950/20 p-6 sm:p-8 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                <XCircle size={20} className="shrink-0 text-red-400" />
                {data.problemSolution.problemTitle}
              </h3>
              <ul className="space-y-3">
                {data.problemSolution.problemPoints.map((pt, i) => (
                  <li key={i} className="text-sm text-zinc-300 flex items-start gap-2.5">
                    <span className="text-red-400 font-bold mt-0.5">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-950/60 bg-emerald-950/20 p-6 sm:p-8 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
                {data.problemSolution.solutionTitle}
              </h3>
              <ul className="space-y-3">
                {data.problemSolution.solutionPoints.map((pt, i) => (
                  <li key={i} className="text-sm text-zinc-300 flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        {data.faq.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto mb-20 sm:mb-28" id="faq">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FAFAFA] mb-2">
                Frequently Asked Questions
              </h2>
              <p className="text-sm text-[#A1A1AA]">
                Clear, factual answers to help you evaluate BhojanOS.
              </p>
            </div>

            <div className="space-y-3">
              {data.faq.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-[#27272A] bg-[#111114] overflow-hidden transition-colors hover:border-white/20"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-semibold text-[#FAFAFA] text-sm sm:text-base hover:bg-white/[0.03] transition-colors"
                      aria-expanded={isOpen}
                    >
                      <span>{item.question}</span>
                      <ChevronDown
                        size={18}
                        className={`text-[#A1A1AA] shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#D97706]' : ''
                        }`}
                        aria-hidden
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-5 sm:px-5 text-sm text-[#A1A1AA] leading-relaxed border-t border-[#27272A] pt-3 bg-[#0D0D10]">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Internal Linking: Related Resources */}
        {data.relatedPages.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-20">
            <h2 className="text-lg font-bold text-[#FAFAFA] mb-4">Explore Related Solutions</h2>
            <div className="flex flex-wrap gap-3">
              {data.relatedPages.map((rel, idx) => (
                <Link
                  key={idx}
                  to={rel.path}
                  className="rounded-full border border-[#27272A] bg-[#111114] px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:border-[#D97706]/50 hover:bg-[#18181B] transition-colors"
                >
                  {rel.label} →
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA Banner */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
          <div className="rounded-3xl border border-[#27272A] bg-gradient-to-b from-[#18181B] to-[#111114] p-8 sm:p-12 shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#FAFAFA] mb-3">
              Ready to Launch Your Direct Restaurant Ordering System?
            </h2>
            <p className="text-sm sm:text-base text-[#A1A1AA] max-w-xl mx-auto mb-8">
              Join Indian food entrepreneurs taking control of their customers and profit margins. 0% commission on direct orders.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/owner/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#D97706] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#F59E0B] shadow-lg shadow-[#D97706]/25 transition-all active:scale-95"
              >
                Start Free with BhojanOS
                <ArrowRight size={16} aria-hidden />
              </a>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-white/10 transition-all active:scale-95"
              >
                Contact Our Team
              </Link>
            </div>
          </div>
        </section>
      </main>

      <EnterpriseFooter />
    </div>
  );
};
