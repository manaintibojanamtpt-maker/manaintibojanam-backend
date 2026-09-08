/**
 * generate-seo-static-pages.mjs
 * Post-build script that pre-renders full semantic static HTML for all BhojanOS
 * SEO landing pages, solutions, comparisons, and resource pages directly into `dist/`.
 * Ensures 100% crawlability, sub-second TTFB, and zero "Loading BhojanOS…" states.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const marketingHtmlPath = path.join(distDir, 'marketing.html');

if (!fs.existsSync(marketingHtmlPath)) {
  console.log('[seo-generator] dist/marketing.html not found, skipping static generation.');
  process.exit(0);
}

const baseHtml = fs.readFileSync(marketingHtmlPath, 'utf8');

// Extract stylesheet links and script tags from built marketing.html
const assetTagsMatch = baseHtml.match(/<link rel="stylesheet"[^>]*>|<script type="module"[^>]*><\/script>/gi) || [];
const assetTags = assetTagsMatch.join('\n    ');

const BASE_URL = 'https://www.bhojanos.com';

import('tsx/esm').then(async () => {
  try {
    const { SEO_PAGES } = await import('../src/config/seoPagesData.ts');

    const canonicalPages = Object.entries(SEO_PAGES).filter(([key, page]) => key === page.slug);
    let pageCount = 0;

    for (const [, data] of canonicalPages) {
      const pageDir = path.join(distDir, data.slug);
      fs.mkdirSync(pageDir, { recursive: true });

      const canonicalUrl = `${BASE_URL}/${data.slug}`;

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
              '@id': `${BASE_URL}/#website`,
              name: 'BhojanOS',
              url: BASE_URL,
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
                item: `${BASE_URL}/`,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: data.category,
                item: `${BASE_URL}/features`,
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
            url: BASE_URL,
            description: 'Direct online ordering system and restaurant operating platform for restaurants, cloud kitchens, and food businesses.',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'INR',
              description: '0% commission on direct online orders. Transparent software subscription for advanced operations.',
              url: `${BASE_URL}/pricing`,
            },
            provider: {
              '@type': 'Organization',
              name: 'BhojanOS',
              url: BASE_URL,
              logo: `${BASE_URL}/bhojan-os-icon.png`,
            },
          },
          ...(data.faq && data.faq.length > 0
            ? [
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
              ]
            : []),
        ],
      };

      const featuresHtml = data.features
        .map(
          (f) => `
          <div class="seo-card">
            ${f.tag ? `<span style="display:inline-block;font-size:10px;font-weight:800;text-transform:uppercase;color:#FF7A00;background:rgba(255,122,0,0.1);padding:2px 8px;border-radius:9999px;margin-bottom:8px;">${f.tag}</span>` : ''}
            <h3>${f.title}</h3>
            <p>${f.description}</p>
          </div>`
        )
        .join('\n');

      const comparisonHtml = data.comparison
        ? `
        <section class="seo-section">
          <h2 class="seo-h2">BhojanOS vs ${data.comparison.competitorName}: Side-by-Side Comparison</h2>
          <p class="seo-sub">Compare direct ordering economics with aggregator commissions.</p>
          <div class="seo-table-wrap">
            <table class="seo-table">
              <thead>
                <tr>
                  <th>Evaluation Metric</th>
                  <th>${data.comparison.competitorName}</th>
                  <th style="color:#FF7A00;">BhojanOS Platform</th>
                </tr>
              </thead>
              <tbody>
                ${data.comparison.rows
                  .map(
                    (r) => `
                  <tr>
                    <td style="font-weight:600;color:#fff;">${r.metric}</td>
                    <td style="color:#a3a3a3;">${r.competitor}</td>
                    <td style="font-weight:700;color:#FF7A00;">${r.bhojanos}</td>
                  </tr>`
                  )
                  .join('\n')}
              </tbody>
            </table>
          </div>
        </section>`
        : '';

      const problemPointsHtml = data.problemSolution.problemPoints
        .map((p) => `<li style="margin-bottom:8px;color:#d1d5db;">• ${p}</li>`)
        .join('\n');

      const solutionPointsHtml = data.problemSolution.solutionPoints
        .map((s) => `<li style="margin-bottom:8px;color:#d1d5db;">✓ ${s}</li>`)
        .join('\n');

      const faqHtml = data.faq && data.faq.length > 0
        ? `
        <section class="seo-section" id="faq">
          <h2 class="seo-h2">Frequently Asked Questions</h2>
          <p class="seo-sub">Clear, factual answers to help you evaluate BhojanOS.</p>
          <div style="max-width:850px;margin:0 auto;">
            ${data.faq
              .map(
                (q) => `
              <article class="seo-faq-item">
                <h3 class="seo-faq-q">${q.question}</h3>
                <p class="seo-faq-a">${q.answer}</p>
              </article>`
              )
              .join('\n')}
          </div>
        </section>`
        : '';

      const relatedHtml = data.relatedPages && data.relatedPages.length > 0
        ? `
        <section class="seo-section" style="padding-top:2rem;">
          <h2 style="font-size:1.25rem;font-weight:700;color:#fff;margin-bottom:1rem;">Explore Related Solutions</h2>
          <div style="display:flex;flex-wrap:wrap;gap:0.75rem;">
            ${data.relatedPages
              .map(
                (rp) => `
              <a href="${rp.path}" style="background:#0d0a08;border:1px solid rgba(255,255,255,0.08);padding:0.5rem 1rem;border-radius:0.75rem;font-size:0.8rem;color:#d1d5db;text-decoration:none;">${rp.label} →</a>`
              )
              .join('\n')}
          </div>
        </section>`
        : '';

      const pageHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${data.title}</title>
    <meta name="description" content="${data.metaDescription}" />
    <meta name="keywords" content="${data.keywords.join(', ')}" />
    <meta name="theme-color" content="#030303" />

    <!-- Canonical URL -->
    <link rel="canonical" href="${canonicalUrl}" />

    <!-- Open Graph / Social Media -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="BhojanOS" />
    <meta property="og:title" content="${data.title}" />
    <meta property="og:description" content="${data.metaDescription}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${BASE_URL}/bhojan-os-icon.png" />
    <meta property="og:image:alt" content="${data.h1}" />

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${data.title}" />
    <meta name="twitter:description" content="${data.metaDescription}" />
    <meta name="twitter:image" content="${BASE_URL}/bhojan-os-icon.png" />

    <!-- Mobile & PWA -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="BhojanOS" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="icon" href="/bhojan-os-icon.png?v=4" />
    <link rel="apple-touch-icon" href="/bhojan-os-icon.png" />

    <!-- Preconnects -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify(schemaJson, null, 2)}
    </script>

    <style>
      html, body {
        margin: 0; padding: 0;
        background-color: #070504; color: #fff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      a { color: inherit; text-decoration: none; }
      .seo-nav-link { color: rgba(255,255,255,0.7); text-decoration: none; font-size: 0.875rem; font-weight: 500; transition: color 0.15s; }
      .seo-nav-link:hover { color: #fff; }
      .seo-badge {
        display: inline-flex; align-items: center; gap: 0.5rem;
        background: rgba(255,122,0,0.1); border: 1px solid rgba(255,122,0,0.3);
        color: #FF7A00; padding: 0.375rem 1rem; border-radius: 9999px;
        font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
        margin-bottom: 1.5rem;
      }
      .seo-hero {
        padding: 5rem 1.5rem 4rem; max-width: 1000px; margin: 0 auto; text-align: center;
      }
      .seo-h1 {
        font-size: clamp(2.2rem, 5vw, 3.8rem); font-weight: 900; line-height: 1.1;
        letter-spacing: -0.03em; margin: 0 0 1.25rem; color: #fff;
      }
      .seo-subhead {
        font-size: clamp(1.1rem, 2.5vw, 1.35rem); font-weight: 600; color: #FF7A00;
        margin: 0 auto 1rem; max-width: 750px; line-height: 1.4;
      }
      .seo-desc {
        font-size: 1.05rem; line-height: 1.6; color: rgba(255,255,255,0.75);
        max-width: 800px; margin: 0 auto 2.5rem;
      }
      .seo-btn-cta {
        display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
        background: #FF7A00; color: #000; font-weight: 800; font-size: 0.95rem;
        text-transform: uppercase; letter-spacing: 0.05em; padding: 1rem 2.25rem;
        border-radius: 9999px; transition: all 0.2s; box-shadow: 0 0 25px rgba(255,122,0,0.35);
      }
      .seo-btn-cta:hover { background: #e56d00; transform: translateY(-1px); }
      .seo-btn-outline {
        display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.2);
        color: #fff; font-weight: 700; font-size: 0.95rem; text-transform: uppercase;
        letter-spacing: 0.05em; padding: 1rem 2.25rem; border-radius: 9999px;
      }
      .seo-btn-outline:hover { background: rgba(255,255,255,0.12); }
      .seo-section { padding: 4rem 1.5rem; max-width: 1140px; margin: 0 auto; }
      .seo-h2 {
        font-size: clamp(1.6rem, 3.5vw, 2.4rem); font-weight: 800; text-align: center;
        margin: 0 0 0.75rem; letter-spacing: -0.02em;
      }
      .seo-sub {
        text-align: center; color: rgba(255,255,255,0.6); max-width: 600px;
        margin: 0 auto 3rem; font-size: 0.95rem;
      }
      .seo-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;
      }
      .seo-card {
        background: #0d0a08; border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1.25rem; padding: 1.75rem; transition: border-color 0.2s;
      }
      .seo-card:hover { border-color: rgba(255,122,0,0.4); }
      .seo-card h3 { font-size: 1.15rem; font-weight: 700; margin: 0 0 0.5rem; color: #fff; }
      .seo-card p { font-size: 0.9rem; line-height: 1.55; color: rgba(255,255,255,0.65); margin: 0; }
      .seo-prob-sol {
        display: grid; grid-template-columns: 1fr; gap: 1.5rem;
      }
      @media (min-width: 768px) {
        .seo-prob-sol { grid-template-columns: 1fr 1fr; }
      }
      .seo-prob-box {
        background: rgba(127,29,29,0.1); border: 1px solid rgba(239,68,68,0.2);
        border-radius: 1.25rem; padding: 2rem;
      }
      .seo-sol-box {
        background: rgba(6,78,59,0.1); border: 1px solid rgba(16,185,129,0.2);
        border-radius: 1.25rem; padding: 2rem;
      }
      .seo-table-wrap {
        overflow-x: auto; background: #0d0a08; border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1.25rem; margin-top: 1.5rem;
      }
      .seo-table {
        width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;
      }
      .seo-table th, .seo-table td {
        padding: 1.1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .seo-table th { background: rgba(255,255,255,0.02); font-weight: 700; color: rgba(255,255,255,0.8); }
      .seo-faq-item {
        background: #0d0a08; border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1rem; padding: 1.5rem; margin-bottom: 1rem;
      }
      .seo-faq-q { font-size: 1.05rem; font-weight: 700; color: #fff; margin: 0 0 0.5rem; }
      .seo-faq-a { font-size: 0.9rem; line-height: 1.6; color: rgba(255,255,255,0.7); margin: 0; }
      .seo-header {
        position: sticky; top: 0; z-index: 50; background: rgba(7,5,4,0.92);
        backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.08);
        padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between;
      }
      .seo-logo { font-size: 1.25rem; font-weight: 900; color: #fff; text-decoration: none; }
      .seo-accent { color: #FF7A00; }
      .seo-footer {
        background: #030303; border-top: 1px solid rgba(255,255,255,0.06);
        padding: 4rem 1.5rem 3rem; margin-top: 5rem;
      }
      .seo-footer-inner {
        max-width: 1200px; margin: 0 auto; display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2.5rem;
      }
      .seo-col-title { font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: #fff; margin-bottom: 1rem; }
      .seo-links { list-style: none; padding: 0; margin: 0; }
      .seo-links li { margin-bottom: 0.6rem; }
      .seo-links a { color: rgba(255,255,255,0.55); font-size: 0.82rem; text-decoration: none; transition: color 0.15s; }
      .seo-links a:hover { color: #FF7A00; }
    </style>

    ${assetTags}
  </head>
  <body>
    <div id="root">
      <!-- Full crawlable pre-rendered static content -->
      <div class="seo-page-shell">
        <header class="seo-header">
          <a href="/" class="seo-logo">Bhojan<span class="seo-accent">OS</span></a>
          <nav style="display:flex;gap:1.5rem;align-items:center;">
            <a href="/restaurant-online-ordering" class="seo-nav-link">Ordering</a>
            <a href="/restaurant-pos" class="seo-nav-link">POS</a>
            <a href="/pricing" class="seo-nav-link">Pricing</a>
            <a href="/solutions" class="seo-nav-link">Solutions</a>
            <a href="/owner/register" class="seo-btn-cta" style="padding:0.5rem 1.25rem;font-size:0.8rem;">Get Started</a>
          </nav>
        </header>

        <main>
          <!-- Hero -->
          <section class="seo-hero">
            <div class="seo-badge">${data.badge}</div>
            <h1 class="seo-h1">${data.h1}</h1>
            <p class="seo-subhead">${data.subhead}</p>
            <p class="seo-desc">${data.description}</p>
            <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
              <a href="/owner/register" class="seo-btn-cta">Start Free with BhojanOS →</a>
              <a href="/pricing" class="seo-btn-outline">View Transparent Pricing</a>
            </div>
          </section>

          <!-- Core Capabilities -->
          <section class="seo-section">
            <h2 class="seo-h2">Core Capabilities &amp; Built-In Features</h2>
            <p class="seo-sub">Engineered to give your restaurant operational independence and direct sales growth.</p>
            <div class="seo-grid">
              ${featuresHtml}
            </div>
          </section>

          ${comparisonHtml}

          <!-- Problem vs Solution -->
          <section class="seo-section">
            <div class="seo-prob-sol">
              <div class="seo-prob-box">
                <h3 style="font-size:1.15rem;font-weight:800;color:#f87171;margin:0 0 1rem;">
                  ✗ ${data.problemSolution.problemTitle}
                </h3>
                <ul style="list-style:none;padding:0;margin:0;font-size:0.9rem;line-height:1.6;">
                  ${problemPointsHtml}
                </ul>
              </div>
              <div class="seo-sol-box">
                <h3 style="font-size:1.15rem;font-weight:800;color:#34d399;margin:0 0 1rem;">
                  ✓ ${data.problemSolution.solutionTitle}
                </h3>
                <ul style="list-style:none;padding:0;margin:0;font-size:0.9rem;line-height:1.6;">
                  ${solutionPointsHtml}
                </ul>
              </div>
            </div>
          </section>

          ${faqHtml}

          ${relatedHtml}

          <!-- Bottom CTA -->
          <section class="seo-section" style="text-align:center;padding:4rem 0;">
            <div style="background:#0d0a08;border:1px solid rgba(255,122,0,0.3);border-radius:2rem;padding:3.5rem 2rem;max-width:800px;margin:0 auto;box-shadow:0 0 50px rgba(255,122,0,0.15);">
              <h2 style="font-size:2rem;font-weight:800;margin-bottom:1rem;">Take Control of Your Restaurant Orders</h2>
              <p style="color:rgba(255,255,255,0.7);max-width:550px;margin:0 auto 2rem;line-height:1.6;">
                0% marketplace commission. Direct online ordering. 100% customer data ownership.
              </p>
              <div style="display:flex;flex-wrap:wrap;gap:1rem;justify-content:center;">
                <a href="/owner/register" class="seo-btn-cta">Start Free Today</a>
                <a href="/pricing" class="seo-btn-outline">Explore Pricing Plans</a>
              </div>
            </div>
          </section>
        </main>

        <footer class="seo-footer">
          <div class="seo-footer-inner">
            <div>
              <div class="seo-logo" style="margin-bottom:1rem;">Bhojan<span class="seo-accent">OS</span></div>
              <p style="font-size:0.85rem;color:rgba(255,255,255,0.5);line-height:1.6;margin-bottom:1.5rem;">
                The direct online ordering system and restaurant operating platform. Take direct orders, manage kitchen ops, and eliminate marketplace commissions.
              </p>
              <p style="font-size:0.8rem;color:rgba(255,255,255,0.4);">
                Contact: <a href="mailto:support@bhojanos.com" style="color:#FF7A00;">support@bhojanos.com</a>
              </p>
            </div>
            <div>
              <div class="seo-col-title">Products</div>
              <ul class="seo-links">
                <li><a href="/restaurant-online-ordering">Online Ordering System</a></li>
                <li><a href="/direct-ordering-platform">Direct Ordering Platform</a></li>
                <li><a href="/restaurant-management-system">Restaurant Management</a></li>
                <li><a href="/restaurant-pos">Restaurant POS &amp; Operations</a></li>
                <li><a href="/restaurant-billing-software">Fast Billing Software</a></li>
                <li><a href="/qr-code-ordering-system">QR Code Ordering</a></li>
                <li><a href="/whatsapp-food-ordering-system">WhatsApp Ordering</a></li>
                <li><a href="/restaurant-website-builder">Restaurant Website Builder</a></li>
                <li><a href="/digital-menu-for-restaurants">Digital Menu</a></li>
                <li><a href="/delivery-management-software">Delivery Management</a></li>
              </ul>
            </div>
            <div>
              <div class="seo-col-title">Solutions</div>
              <ul class="seo-links">
                <li><a href="/cloud-kitchen-software">For Cloud Kitchens</a></li>
                <li><a href="/qsr-pos-software">For Quick Service (QSR)</a></li>
                <li><a href="/cafe-pos-billing-software">For Cafes &amp; Bakeries</a></li>
                <li><a href="/solutions">All Industry Solutions</a></li>
                <li><a href="/pricing">Pricing Plans</a></li>
              </ul>
            </div>
            <div>
              <div class="seo-col-title">Compare</div>
              <ul class="seo-links">
                <li><a href="/bhojanos-vs-zomato-swiggy">BhojanOS vs Zomato &amp; Swiggy</a></li>
                <li><a href="/petpooja-alternative">BhojanOS vs Petpooja</a></li>
                <li><a href="/dotpe-alternative">BhojanOS vs DotPe</a></li>
                <li><a href="https://orderbhojan.web.app" target="_blank" rel="noopener noreferrer">OrderBhojan Marketplace ↗</a></li>
              </ul>
            </div>
            <div>
              <div class="seo-col-title">Company &amp; Legal</div>
              <ul class="seo-links">
                <li><a href="/about">About Us</a></li>
                <li><a href="/blog">Restaurant Blog</a></li>
                <li><a href="/security">Security</a></li>
                <li><a href="/contact">Contact Sales</a></li>
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms of Service</a></li>
                <li><a href="/refund-policy">Refund Policy</a></li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    </div>
  </body>
</html>
`;

      // 1. Write dist/<slug>/index.html
      fs.writeFileSync(path.join(pageDir, 'index.html'), pageHtml, 'utf8');
      // 2. Write dist/<slug>.html for direct server route matching
      fs.writeFileSync(path.join(distDir, `${data.slug}.html`), pageHtml, 'utf8');
      pageCount++;
    }

    // Write redirect HTML files for legacy aliases so static file hosts redirect immediately
    const legacyRedirects = [
      { from: 'restaurant-online-ordering-system', to: '/restaurant-online-ordering' },
      { from: 'restaurant-management-software', to: '/restaurant-management-system' },
      { from: 'qr-ordering', to: '/qr-code-ordering-system' },
      { from: 'whatsapp-ordering', to: '/whatsapp-food-ordering-system' },
      { from: 'restaurant-website', to: '/restaurant-website-builder' },
      { from: 'digital-menu', to: '/digital-menu-for-restaurants' },
      { from: 'restaurant-delivery-management', to: '/delivery-management-software' },
      { from: 'solutions/cloud-kitchens', to: '/cloud-kitchen-software' },
      { from: 'solutions/qsr', to: '/qsr-pos-software' },
      { from: 'solutions/cafes', to: '/cafe-pos-billing-software' },
      { from: 'solutions/restaurants', to: '/solutions' },
      { from: 'solutions/food-businesses', to: '/solutions' },
      { from: 'compare/bhojanos-vs-zomato', to: '/bhojanos-vs-zomato-swiggy' },
      { from: 'compare/bhojanos-vs-swiggy', to: '/bhojanos-vs-zomato-swiggy' },
      { from: 'compare/bhojanos-vs-petpooja', to: '/petpooja-alternative' },
      { from: 'compare/bhojanos-vs-dotpe', to: '/dotpe-alternative' },
      { from: 'privacy-policy', to: '/privacy' },
      { from: 'cancellation-policy', to: '/refund-policy' }
    ];

    for (const redir of legacyRedirects) {
      const redirDir = path.join(distDir, redir.from);
      fs.mkdirSync(redirDir, { recursive: true });
      const redirHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Redirecting to ${redir.to}...</title>
    <meta http-equiv="refresh" content="0;url=${redir.to}">
    <link rel="canonical" href="${BASE_URL}${redir.to}">
  </head>
  <body>
    <p>Redirecting to <a href="${redir.to}">${redir.to}</a>...</p>
  </body>
</html>`;
      fs.writeFileSync(path.join(redirDir, 'index.html'), redirHtml, 'utf8');
      if (!redir.from.includes('/')) {
        fs.writeFileSync(path.join(distDir, `${redir.from}.html`), redirHtml, 'utf8');
      }
    }

    console.log(`[seo-generator] Successfully generated ${pageCount} canonical SEO pages and legacy redirects in dist/!`);
  } catch (err) {
    console.error('[seo-generator] Error during SEO page generation:', err);
    process.exit(1);
  }
});
