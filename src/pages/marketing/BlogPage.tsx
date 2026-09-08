import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { BookOpen, ArrowRight, TrendingUp, DollarSign, Shield, Smartphone, QrCode, Store, Utensils } from 'lucide-react';

interface ArticleItem {
  id: string;
  title: string;
  category: string;
  readTime: string;
  excerpt: string;
  icon: React.ReactNode;
  primaryLink: string;
  primaryAnchor: string;
}

const ARTICLES: ArticleItem[] = [
  {
    id: 'create-online-ordering-system',
    title: 'How to Create Your Own Online Ordering System for a Restaurant in India',
    category: 'Restaurant Technology',
    readTime: '6 min read',
    excerpt: 'Step-by-step guide to setting up a direct online ordering website, integrating Razorpay UPI payments, configuring delivery zones, and launching without writing a single line of code.',
    icon: <Store className="text-[#FF7A00]" size={20} />,
    primaryLink: '/restaurant-online-ordering',
    primaryAnchor: 'Explore BhojanOS Online Ordering System',
  },
  {
    id: 'direct-ordering-vs-swiggy',
    title: 'Restaurant Direct Ordering vs Swiggy: The Real Commission Impact',
    category: 'Commission Economics',
    readTime: '8 min read',
    excerpt: 'A financial breakdown of how 25% marketplace commissions erode restaurant profit margins, and how shifting 30% of repeat diners to a direct storefront saves over ₹60,000 monthly.',
    icon: <DollarSign className="text-[#FF7A00]" size={20} />,
    primaryLink: '/bhojanos-vs-zomato-swiggy',
    primaryAnchor: 'Compare BhojanOS vs Aggregators',
  },
  {
    id: 'direct-ordering-vs-zomato',
    title: 'Restaurant Direct Ordering vs Zomato: How to Take Back Your Customer Data',
    category: 'Commission Economics',
    readTime: '7 min read',
    excerpt: 'Understand why customer data masking prevents sustainable restaurant valuations, and how forward-thinking food businesses use packaging inserts to convert Zomato diners into direct buyers.',
    icon: <Shield className="text-[#FF7A00]" size={20} />,
    primaryLink: '/bhojanos-vs-zomato-swiggy',
    primaryAnchor: 'Compare BhojanOS vs Zomato & Swiggy',
  },
  {
    id: 'get-more-direct-orders',
    title: '7 Proven Tactics for Indian Restaurants to Get More Direct Orders',
    category: 'Restaurant Marketing',
    readTime: '9 min read',
    excerpt: 'Actionable marketing strategies: Google Business Profile optimization, delivery bag flyers with QR coupons, Instagram ordering links, and automated WhatsApp reorder triggers.',
    icon: <TrendingUp className="text-[#FF7A00]" size={20} />,
    primaryLink: '/direct-ordering-platform',
    primaryAnchor: 'Explore Direct Ordering Platform',
  },
  {
    id: 'reduce-commission-costs',
    title: 'How to Reduce Food Delivery Commission Costs in 2026',
    category: 'Operations & Margins',
    readTime: '5 min read',
    excerpt: 'Why top cloud kitchens and restaurant chains adopt a hybrid distribution model: leveraging aggregators for top-of-funnel discovery while fulfilling repeat orders through direct software.',
    icon: <DollarSign className="text-[#FF7A00]" size={20} />,
    primaryLink: '/pricing',
    primaryAnchor: 'See Transparent BhojanOS Pricing',
  },
  {
    id: 'own-customer-relationships',
    title: 'Why Independent Food Businesses Must Own Their Customer Relationships',
    category: 'Strategy & Brand',
    readTime: '6 min read',
    excerpt: 'The long-term danger of being a nameless kitchen inside an aggregator app. How customer phone numbers, past order preferences, and direct loyalty unlock predictable revenue.',
    icon: <Utensils className="text-[#FF7A00]" size={20} />,
    primaryLink: '/cloud-kitchen-software',
    primaryAnchor: 'Cloud Kitchen Growth Solutions',
  },
  {
    id: 'qr-ordering-guide',
    title: 'QR Ordering for Restaurants: The Complete 2026 Implementation Guide',
    category: 'Restaurant Technology',
    readTime: '7 min read',
    excerpt: 'How dine-in restaurants accelerate table turnover, eliminate physical menu printing costs, and increase average order values by 18% using contactless table QR codes.',
    icon: <QrCode className="text-[#FF7A00]" size={20} />,
    primaryLink: '/qr-code-ordering-system',
    primaryAnchor: 'Explore QR Code Ordering System',
  },
  {
    id: 'whatsapp-ordering-restaurants',
    title: 'WhatsApp Ordering for Restaurants: How to Turn Chats into High-Margin Orders',
    category: 'Conversational Commerce',
    readTime: '6 min read',
    excerpt: 'How Indian food businesses leverage WhatsApp Business APIs to share digital catalogs, automate order confirmations, and trigger one-tap reorders without manual typing.',
    icon: <Smartphone className="text-[#FF7A00]" size={20} />,
    primaryLink: '/whatsapp-food-ordering-system',
    primaryAnchor: 'Learn About WhatsApp Ordering',
  },
  {
    id: 'best-online-ordering-systems',
    title: 'Best Online Ordering Systems for Restaurants in India: 2026 Evaluation',
    category: 'Software Comparison',
    readTime: '10 min read',
    excerpt: 'Comprehensive comparison of restaurant ordering platforms in India based on commission rates, UPI payment speed, kitchen operations, hardware independence, and total cost of ownership.',
    icon: <Store className="text-[#FF7A00]" size={20} />,
    primaryLink: '/features',
    primaryAnchor: 'View Complete Feature Matrix',
  },
  {
    id: 'build-restaurant-website',
    title: 'How to Build a High-Converting Restaurant Website with Online Ordering',
    category: 'Web & Growth',
    readTime: '8 min read',
    excerpt: 'Essential web design principles for food businesses: sub-second mobile load times, mouthwatering food photography, seamless cart checkout, and local SEO ranking factors.',
    icon: <Store className="text-[#FF7A00]" size={20} />,
    primaryLink: '/restaurant-website-builder',
    primaryAnchor: 'Explore Restaurant Website Builder',
  },
];

const BlogPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Restaurant Growth & Direct Ordering Guides | BhojanOS Blog';
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'Actionable guides and operational strategies for restaurant owners, cloud kitchens, and food businesses in India. Reduce commissions, launch direct online ordering, and own customer data.'
    );

    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', 'https://bhojanos.com/blog');

    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#070504] text-white font-sans selection:bg-[#FF7A00]/20 relative">
      <EnterpriseHeader />

      <main className="flex-grow marketing-main-offset pt-10 sm:pt-14 pb-24 px-4 sm:px-6 lg:px-12 max-w-[1400px] mx-auto w-full">
        <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/30 text-xs font-bold uppercase tracking-wider text-[#FF7A00] mb-6">
            <BookOpen size={14} aria-hidden />
            Restaurant Growth &amp; Technology Guides
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
            Master Direct Ordering &amp; Restaurant Operations
          </h1>

          <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">
            Practical, math-backed playbooks for Indian restaurants, cloud kitchens, and cafes to eliminate marketplace commissions, accelerate operations, and build enduring food brands.
          </p>
        </div>

        {/* Article Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ARTICLES.map((article) => (
            <article
              key={article.id}
              className="rounded-2xl border border-white/[0.08] bg-[#0c0907] p-7 flex flex-col justify-between hover:border-[#FF7A00]/40 transition-all hover:shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF7A00] bg-[#FF7A00]/10 px-2.5 py-1 rounded-full">
                    {article.category}
                  </span>
                  <span className="text-xs text-white/40 font-medium">{article.readTime}</span>
                </div>

                <h2 className="text-xl font-bold text-white mb-3 leading-snug">
                  {article.title}
                </h2>

                <p className="text-sm text-white/65 leading-relaxed mb-6">
                  {article.excerpt}
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06]">
                <Link
                  to={article.primaryLink}
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#FF7A00] hover:text-[#FFA040] transition-colors"
                >
                  {article.primaryAnchor}
                  <ArrowRight size={14} aria-hidden />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="mt-20 rounded-3xl border border-[#FF7A00]/30 bg-gradient-to-r from-[#120d0a] via-[#1a120b] to-[#0c0806] p-8 sm:p-12 text-center max-w-4xl mx-auto shadow-[0_0_50px_rgba(255,122,0,0.1)]">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Ready to Take Control of Your Restaurant Margins?
          </h2>
          <p className="text-sm sm:text-base text-white/70 max-w-xl mx-auto mb-6">
            Stop losing 30% of every order to third-party marketplaces. Launch your direct ordering storefront with BhojanOS today.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {/* Cross-shell navigation: /owner/register lives in the app shell (full page load required — MarketingApp has no owner routes). */}
            <a
              href="/owner/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#FF7A00] px-8 py-3.5 text-sm font-extrabold uppercase tracking-wide text-black hover:bg-[#E56D00] transition-colors"
            >
              Start Free Today
              <ArrowRight size={15} aria-hidden />
            </a>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-white/10 transition-colors"
            >
              Explore Pricing
            </Link>
          </div>
        </div>
      </main>

      <EnterpriseFooter />
    </div>
  );
};

export default BlogPage;
