/** Extract live firebase config from homepage HTML. */
const html = await (await fetch('https://www.bhojanos.com/config.json')).text();
const idx = html.indexOf('FALLBACK');
console.log('idx=', idx);
console.log(idx >= 0 ? html.slice(idx, idx + 800) : html.slice(0, 400));
process.exit(0);