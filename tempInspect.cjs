const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://mana-inti-bojanam-pune-492610.web.app', { timeout: 60000 });
  const compute = async (selector) => {
    const el = await page.$(selector);
    if (!el) return null;
    return page.evaluate((node) => {
      const s = getComputedStyle(node);
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
  };
  const data = {
    url: page.url(),
    html: await compute('html'),
    body: await compute('body'),
    root: await compute('#root'),
    header: await compute('header'),
  };
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
