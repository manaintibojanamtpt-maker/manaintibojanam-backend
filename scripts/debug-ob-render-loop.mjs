import puppeteer from 'puppeteer';

const URL = process.env.OB_URL ?? 'http://localhost:5180/';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();

const consoleMessages = [];
const pageErrors = [];
const failedRequests = [];

page.on('console', (msg) => {
  consoleMessages.push({ type: msg.type(), text: msg.text() });
});

page.on('pageerror', (err) => {
  pageErrors.push(String(err?.stack ?? err));
});

page.on('requestfailed', (req) => {
  failedRequests.push({ url: req.url(), error: req.failure()?.errorText });
});

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60_000 });
  await new Promise((r) => setTimeout(r, 3000));

  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 2000) ?? '');
  const hasErrorBoundary = bodyText.includes('Something went wrong') || bodyText.includes('Maximum update depth');

  console.log('=== PAGE TEXT (first 2000 chars) ===');
  console.log(bodyText);
  console.log('\n=== ERROR BOUNDARY VISIBLE ===', hasErrorBoundary);

  console.log('\n=== PAGE ERRORS ===');
  for (const err of pageErrors) console.log(err);

  console.log('\n=== CONSOLE (error/warn) ===');
  for (const msg of consoleMessages.filter((m) => m.type === 'error' || m.type === 'warning')) {
    console.log(`[${msg.type}] ${msg.text}`);
  }

  console.log('\n=== FAILED REQUESTS ===');
  for (const req of failedRequests.slice(0, 20)) {
    console.log(req.url, req.error);
  }

  process.exitCode = hasErrorBoundary || pageErrors.length > 0 ? 1 : 0;
} catch (error) {
  console.error('Navigation failed:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
