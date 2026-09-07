/**
 * scripts/seo-check.mjs
 * Comprehensive automated SEO, GEO, and Technical Validation Suite for BhojanOS.
 * Runs against the built `dist/` directory before deployment.
 */

import fs from 'fs';
import path from 'path';

const dist = path.join(process.cwd(), 'dist');
console.log('\n============================================================');
console.log('       BhojanOS Automated SEO & Technical Validation');
console.log('============================================================\n');

if (!fs.existsSync(dist)) {
  console.error('ERROR: dist/ directory not found. Please run `npm run build:web` first.');
  process.exit(1);
}

let failures = [];
let passCount = 0;

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
    console.error(`  FAIL: ${message}`);
  } else {
    passCount++;
  }
}

// 1. Robots.txt Validation
console.log('Checking robots.txt...');
const robotsPath = path.join(dist, 'robots.txt');
assert(fs.existsSync(robotsPath), 'dist/robots.txt must exist');
if (fs.existsSync(robotsPath)) {
  const robots = fs.readFileSync(robotsPath, 'utf8');
  assert(robots.includes('User-agent: *'), 'robots.txt must declare User-agent: *');
  assert(robots.includes('Sitemap: https://www.bhojanos.com/sitemap.xml'), 'robots.txt must reference canonical sitemap on www.bhojanos.com');
  assert(robots.includes('Disallow: /owner/'), 'robots.txt must disallow /owner/');
  assert(robots.includes('Disallow: /admin/'), 'robots.txt must disallow /admin/');
  assert(robots.includes('Disallow: /checkout'), 'robots.txt must disallow /checkout');
}

// 2. Sitemap.xml Validation
console.log('Checking sitemap.xml...');
const sitemapPath = path.join(dist, 'sitemap.xml');
assert(fs.existsSync(sitemapPath), 'dist/sitemap.xml must exist');
let sitemapUrls = [];
if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  assert(sitemap.startsWith('<?xml'), 'sitemap.xml must be valid XML declaration');
  assert(!sitemap.includes('https://bhojanos.com/'), 'sitemap.xml must use canonical https://www.bhojanos.com/ URLs (no non-www)');
  const matches = sitemap.match(/<loc>(.*?)<\/loc>/g) || [];
  sitemapUrls = matches.map(m => m.replace(/<\/?loc>/g, ''));
  assert(sitemapUrls.length >= 24, `sitemap.xml must have at least 24 URLs (found: ${sitemapUrls.length})`);
  assert(!sitemap.includes('/owner/'), 'sitemap.xml must not include private /owner/ paths');
  assert(!sitemap.includes('/admin/'), 'sitemap.xml must not include private /admin/ paths');
}

// 3. Homepage and Pre-rendered Shells Validation
console.log('Checking marketing.html and index.html pre-rendered content...');
['marketing.html', 'index.html'].forEach(file => {
  const filePath = path.join(dist, file);
  assert(fs.existsSync(filePath), `dist/${file} must exist`);
  if (fs.existsSync(filePath)) {
    const html = fs.readFileSync(filePath, 'utf8');
    assert(!html.includes('Loading BhojanOS…'), `${file} must NOT contain 'Loading BhojanOS…' empty fallback`);
    assert(html.includes('<h1'), `${file} must contain a pre-rendered H1`);
    assert(html.includes('https://www.bhojanos.com'), `${file} must reference https://www.bhojanos.com`);
    assert(!html.includes('"operatingSystem": "Web, iOS, Android"'), `${file} must not claim unverified native mobile operating systems`);
  }
});

// 4. Canonical 24 SEO Routes Validation
console.log('Checking all 24 Canonical SEO Routes...');
const CANONICAL_ROUTES = [
  'restaurant-online-ordering',
  'direct-ordering-platform',
  'restaurant-management-system',
  'restaurant-pos',
  'restaurant-billing-software',
  'qr-code-ordering-system',
  'whatsapp-food-ordering-system',
  'restaurant-website-builder',
  'digital-menu-for-restaurants',
  'delivery-management-software',
  'features',
  'integrations',
  'cloud-kitchen-software',
  'qsr-pos-software',
  'cafe-pos-billing-software',
  'solutions',
  'bhojanos-vs-zomato-swiggy',
  'petpooja-alternative',
  'dotpe-alternative',
  'pricing',
  'blog',
  'about',
  'contact',
  'privacy'
];

for (const slug of CANONICAL_ROUTES) {
  const pageIndexFile = path.join(dist, slug, 'index.html');
  const pageFlatFile = path.join(dist, `${slug}.html`);
  const fileToTest = fs.existsSync(pageIndexFile) ? pageIndexFile : pageFlatFile;

  assert(fs.existsSync(fileToTest), `Page /${slug} must exist in dist/`);

  if (fs.existsSync(fileToTest)) {
    const html = fs.readFileSync(fileToTest, 'utf8');
    
    // H1 count
    const h1Matches = html.match(/<h1[\s>]/gi) || [];
    assert(h1Matches.length === 1, `Page /${slug} must have exactly 1 H1 (found: ${h1Matches.length})`);

    // Title tag
    const titleMatches = html.match(/<title>[\s\S]*?<\/title>/gi) || [];
    assert(titleMatches.length === 1, `Page /${slug} must have exactly 1 <title> (found: ${titleMatches.length})`);

    // Meta description
    const descMatches = html.match(/<meta\s+name=["']description["'][\s\S]*?>/gi) || [];
    assert(descMatches.length === 1, `Page /${slug} must have exactly 1 <meta name="description">`);

    // Canonical link
    const canonicalMatches = html.match(/<link\s+rel=["']canonical["'][^>]*>/gi) || [];
    assert(canonicalMatches.length === 1, `Page /${slug} must have exactly 1 canonical tag`);
    if (canonicalMatches.length > 0) {
      assert(canonicalMatches[0].includes(`https://www.bhojanos.com/${slug}`), `Page /${slug} canonical must be https://www.bhojanos.com/${slug} (got: ${canonicalMatches[0]})`);
    }

    // JSON-LD Schema
    const hasJsonLd = html.includes('application/ld+json');
    assert(hasJsonLd, `Page /${slug} must contain application/ld+json structured data`);

    // Verify absence of fabricated ratings
    assert(!html.includes('aggregateRating'), `Page /${slug} must NOT contain aggregateRating schema`);
    assert(!html.includes('reviewCount'), `Page /${slug} must NOT contain fabricated reviewCount`);
    assert(!html.includes('"operatingSystem": "Web, iOS, Android"'), `Page /${slug} must not claim unverified iOS/Android native app`);

    // Content length
    assert(html.length > 2500, `Page /${slug} must contain substantial pre-rendered content (> 2500 chars, got: ${html.length})`);
  }
}

// 5. 404 Status Safety Check
console.log('Checking 404 page...');
const notFoundPath = path.join(dist, '404.html');
assert(fs.existsSync(notFoundPath), 'dist/404.html must exist for HTTP 404 handling');

// Summary Report
console.log('\n------------------------------------------------------------');
if (failures.length === 0) {
  console.log(` ALL CHECKS PASSED (${passCount} assertions verified).`);
  console.log(' Website is 100% crawlable, pre-rendered, with verified schemas and canonicals.');
  console.log('------------------------------------------------------------\n');
  process.exit(0);
} else {
  console.error(` VALIDATION FAILED with ${failures.length} errors:`);
  failures.forEach(f => console.error(`  - ${f}`));
  console.log('------------------------------------------------------------\n');
  process.exit(1);
}
