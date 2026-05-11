const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://mana-inti-bojanam-pune-492610.web.app', { timeout: 60000 });
  const header = await page.$('header');
  const html = await page.$('html');
  const body = await page.$('body');
  const root = await page.$('#root');
  const compute = async (el) => page.evaluate(el => {
    const s = getComputedStyle(el);
    return {
      display: s.display,
      position: s.position,
      top: s.top,
      marginTop: s.marginTop,
      marginBottom: s.marginBottom,
      paddingTop: s.paddingTop,
      paddingBottom: s.paddingBottom,
      height: s.height,
      transform: s.transform,
      zIndex: s.zIndex,
      overflowY: s.overflowY,
      backgroundColor: s.backgroundColor,
    };
  }, el);
  const data = {
    url: page.url(),
    header: await compute(header),
    body: await compute(body),
    html: await compute(html),
    root: await compute(root),
  };
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
