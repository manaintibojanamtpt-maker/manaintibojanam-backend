/**
 * scripts/seo-check-prod.mjs
 * Exhaustive Live Production Verification Suite for BhojanOS (https://www.bhojanos.com).
 * Validates all 25 public routes, headers, canonicals, titles, descriptions,
 * robots.txt, sitemap.xml, 404 responses, redirects, and schema integrity.
 */

import https from 'https';

const BASE_URL = 'https://www.bhojanos.com';
const APEX_URL = 'https://bhojanos.com';

export const CANONICAL_ROUTES = [
  '/',
  '/restaurant-online-ordering',
  '/direct-ordering-platform',
  '/restaurant-management-system',
  '/restaurant-pos',
  '/restaurant-billing-software',
  '/qr-code-ordering-system',
  '/whatsapp-food-ordering-system',
  '/restaurant-website-builder',
  '/digital-menu-for-restaurants',
  '/delivery-management-software',
  '/features',
  '/integrations',
  '/cloud-kitchen-software',
  '/qsr-pos-software',
  '/cafe-pos-billing-software',
  '/solutions',
  '/bhojanos-vs-zomato-swiggy',
  '/petpooja-alternative',
  '/dotpe-alternative',
  '/pricing',
  '/blog',
  '/about',
  '/contact',
  '/privacy',
];

export function fetchUrl(url, options = {}) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'BhojanOS-Production-SEO-Auditor/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        ...options,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            url,
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      }
    );
    req.on('error', (err) => {
      resolve({ url, status: 0, headers: {}, body: '', error: err.message });
    });
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ url, status: 0, headers: {}, body: '', error: 'Timeout after 15s' });
    });
  });
}

export async function runProductionAudit() {
  console.log('\n============================================================');
  console.log('       BhojanOS Exhaustive Live Production SEO Audit');
  console.log('       Target: ' + BASE_URL);
  console.log('============================================================\n');

  let passCount = 0;
  const failures = [];

  function assert(condition, message) {
    if (!condition) {
      failures.push(message);
      console.error(`  FAIL: ${message}`);
    } else {
      passCount++;
    }
  }

  // 1. Audit All 25 Production Routes
  console.log(`Auditing all ${CANONICAL_ROUTES.length} canonical production routes...`);
  const routeAuditResults = [];

  for (const route of CANONICAL_ROUTES) {
    const targetUrl = route === '/' ? `${BASE_URL}/` : `${BASE_URL}${route}`;
    const res = await fetchUrl(targetUrl);

    assert(res.status === 200, `Route ${route} returned HTTP ${res.status} (expected 200)`);
    assert(
      res.headers['content-type'] && res.headers['content-type'].includes('text/html'),
      `Route ${route} content-type must be text/html (got: ${res.headers['content-type']})`
    );

    const html = res.body || '';
    assert(html.length > 2500, `Route ${route} has raw HTML > 2500 chars (got: ${html.length})`);
    assert(!html.includes('Loading BhojanOS…'), `Route ${route} must not contain empty "Loading BhojanOS…" shell`);

    // Headers & Indexability
    const xRobots = res.headers['x-robots-tag'] || '';
    assert(!xRobots.includes('noindex'), `Route ${route} must not have X-Robots-Tag: noindex`);
    assert(!xRobots.includes('nofollow'), `Route ${route} must not have X-Robots-Tag: nofollow`);

    // Head tags
    const h1Matches = html.match(/<h1[\s>][\s\S]*?<\/h1>/gi) || [];
    assert(h1Matches.length === 1, `Route ${route} must have exactly 1 H1 (found: ${h1Matches.length})`);

    const h2Matches = html.match(/<h2[\s>][\s\S]*?<\/h2>/gi) || [];
    assert(h2Matches.length >= 1, `Route ${route} must have at least 1 H2 (found: ${h2Matches.length})`);

    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    assert(title.length >= 15, `Route ${route} has descriptive title (length: ${title.length})`);

    const descMatch =
      html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+content=["'](.*?)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';
    assert(description.length >= 50, `Route ${route} has meta description > 50 chars (length: ${description.length})`);

    const canonicalMatch =
      html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["'](.*?)["']/i) ||
      html.match(/<link[^>]+href=["'](.*?)["'][^>]+rel=["']canonical["']/i);
    const canonical = canonicalMatch ? canonicalMatch[1].trim() : '';
    assert(
      canonical === targetUrl,
      `Route ${route} canonical must match ${targetUrl} (got: ${canonical})`
    );

    // JSON-LD Structured Data
    const hasJsonLd = html.includes('application/ld+json');
    assert(hasJsonLd, `Route ${route} must have application/ld+json`);
    if (hasJsonLd) {
      const scriptMatches = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi) || [];
      for (const tag of scriptMatches) {
        const jsonContent = tag.replace(/<script\s+type=["']application\/ld\+json["']>/i, '').replace(/<\/script>/i, '').trim();
        try {
          const parsed = JSON.parse(jsonContent);
          assert(parsed['@context'] === 'https://schema.org', `Route ${route} schema context is https://schema.org`);
        } catch (err) {
          assert(false, `Route ${route} contains invalid JSON-LD: ${err.message}`);
        }
      }
    }

    // Forbidden Claims
    assert(!html.includes('aggregateRating'), `Route ${route} must NOT contain aggregateRating`);
    assert(!html.includes('reviewCount'), `Route ${route} must NOT contain reviewCount`);
    assert(!html.includes('ratingValue'), `Route ${route} must NOT contain ratingValue`);
    assert(!html.includes('"operatingSystem": "Web, iOS, Android"'), `Route ${route} must NOT claim unverified iOS/Android native apps`);

    // Internal links count
    const linkMatches = html.match(/href=["'](\/[^"']*)["']/g) || [];
    assert(linkMatches.length >= 5, `Route ${route} must have at least 5 internal links (found: ${linkMatches.length})`);

    routeAuditResults.push({
      route,
      targetUrl,
      status: res.status,
      h1Count: h1Matches.length,
      h2Count: h2Matches.length,
      title,
      description,
      canonical,
      size: html.length,
      hasJsonLd,
      internalLinksCount: linkMatches.length,
      isIndexable: res.status === 200 && !xRobots.includes('noindex'),
    });
  }

  // 2. Title Uniqueness Validation
  console.log('Validating Title Uniqueness across all 25 routes...');
  const titles = routeAuditResults.map((r) => r.title);
  const dupTitles = titles.filter((item, index) => titles.indexOf(item) !== index);
  assert(dupTitles.length === 0, `All 25 page titles must be unique (duplicate: ${dupTitles.join(', ')})`);

  // 3. Meta Description Uniqueness Validation
  console.log('Validating Meta Description Uniqueness across all 25 routes...');
  const descs = routeAuditResults.map((r) => r.description);
  const dupDescs = descs.filter((item, index) => descs.indexOf(item) !== index);
  assert(dupDescs.length === 0, `All 25 descriptions must be unique (duplicate: ${dupDescs.join(', ')})`);

  // 4. Robots.txt Validation
  console.log('Validating live robots.txt...');
  const robotsRes = await fetchUrl(`${BASE_URL}/robots.txt`);
  assert(robotsRes.status === 200, `robots.txt returned HTTP ${robotsRes.status}`);
  assert(robotsRes.headers['content-type'].includes('text/plain'), `robots.txt content-type must be text/plain`);
  assert(robotsRes.body.includes('User-agent: *'), `robots.txt contains User-agent: *`);
  assert(robotsRes.body.includes(`Sitemap: ${BASE_URL}/sitemap.xml`), `robots.txt contains canonical sitemap reference`);
  assert(robotsRes.body.includes('Disallow: /owner/'), `robots.txt disallows /owner/`);
  assert(robotsRes.body.includes('Disallow: /admin/'), `robots.txt disallows /admin/`);
  assert(robotsRes.body.includes('Disallow: /checkout'), `robots.txt disallows /checkout`);

  // 5. Sitemap.xml Validation
  console.log('Validating live sitemap.xml...');
  const sitemapRes = await fetchUrl(`${BASE_URL}/sitemap.xml`);
  assert(sitemapRes.status === 200, `sitemap.xml returned HTTP ${sitemapRes.status}`);
  assert(sitemapRes.headers['content-type'].includes('xml'), `sitemap.xml content-type must be xml`);
  assert(sitemapRes.body.startsWith('<?xml'), `sitemap.xml starts with <?xml`);
  const locMatches = sitemapRes.body.match(/<loc>(.*?)<\/loc>/g) || [];
  const sitemapUrls = locMatches.map((l) => l.replace(/<\/?loc>/g, '').trim());
  assert(sitemapUrls.length === 25, `sitemap.xml must contain exactly 25 canonical URLs (found: ${sitemapUrls.length})`);
  for (const r of CANONICAL_ROUTES) {
    const expected = r === '/' ? `${BASE_URL}/` : `${BASE_URL}${r}`;
    assert(sitemapUrls.includes(expected), `sitemap.xml must include ${expected}`);
  }

  // 6. 404 Response Validation
  console.log('Validating real HTTP 404 responses on unknown paths...');
  const unknownUrls = [
    `${BASE_URL}/random-404-test-1`,
    `${BASE_URL}/random-404-test-2`,
    `${BASE_URL}/something-that-does-not-exist`,
  ];
  for (const url of unknownUrls) {
    const res404 = await fetchUrl(url);
    assert(res404.status === 404, `Unknown URL ${url} must return HTTP 404 (got: ${res404.status})`);
    assert(res404.body.includes('404') || res404.body.includes('Not Found') || res404.body.includes('Page Not Found'), `404 page content must indicate page not found`);
  }

  // 7. Redirect Validation
  console.log('Validating 308 redirects from non-www apex domain...');
  const apexRes = await fetchUrl(`${APEX_URL}/`);
  assert(apexRes.status === 308, `Apex non-www ${APEX_URL}/ must return 308 (got: ${apexRes.status})`);
  assert(
    apexRes.headers['location'] === `${BASE_URL}/`,
    `Apex redirect location must be ${BASE_URL}/ (got: ${apexRes.headers['location']})`
  );

  const apexRouteRes = await fetchUrl(`${APEX_URL}/restaurant-pos`);
  assert(apexRouteRes.status === 308, `Apex non-www /restaurant-pos must return 308 (got: ${apexRouteRes.status})`);
  assert(
    apexRouteRes.headers['location'] === `${BASE_URL}/restaurant-pos`,
    `Apex route redirect must point to www (got: ${apexRouteRes.headers['location']})`
  );

  // 8. Critical Image Asset Validation
  console.log('Validating critical brand and schema assets...');
  const logoRes = await fetchUrl(`${BASE_URL}/bhojan-os-icon.png`);
  assert(logoRes.status === 200, `Brand icon /bhojan-os-icon.png must return HTTP 200 (got: ${logoRes.status})`);
  assert(
    logoRes.headers['content-type'] && logoRes.headers['content-type'].includes('image'),
    `Brand icon must have image content-type`
  );

  // 9. Summary & Table Display
  console.log('\n============================================================');
  console.log('         All 25 Verified Production Routes');
  console.log('============================================================');
  console.table(
    routeAuditResults.map((r) => ({
      Route: r.route,
      HTTP: r.status,
      H1: r.h1Count,
      H2: r.h2Count,
      Canonical: r.canonical === r.targetUrl ? 'OK' : 'FAIL',
      Indexable: r.isIndexable ? 'YES' : 'NO',
      Schema: r.hasJsonLd ? 'Valid' : 'FAIL',
      Bytes: r.size,
    }))
  );

  console.log('\n------------------------------------------------------------');
  if (failures.length === 0) {
    console.log(` ALL PRODUCTION CHECKS PASSED (${passCount} assertions verified).`);
    console.log(' Status: PRODUCTION SEO READY — VERIFIED');
    console.log('------------------------------------------------------------\n');
    return { ok: true, passCount, routeAuditResults };
  } else {
    console.error(` VALIDATION FAILED with ${failures.length} errors:`);
    failures.forEach((f) => console.error(`  - ${f}`));
    console.log('------------------------------------------------------------\n');
    return { ok: false, failures, passCount, routeAuditResults };
  }
}

if (process.argv[1] && process.argv[1].endsWith('seo-check-prod.mjs')) {
  runProductionAudit().then((res) => {
    if (!res.ok) process.exit(1);
  });
}

