/**
 * Smoke: marketplace search → real slug → menu contains Malasa Dosa.
 * Run: npx tsx scripts/smoke-menu-grounding.ts
 */
async function main() {
  const base = process.env.MARKETPLACE_API_BASE || 'http://localhost:8080';
  const searchUrl = `${base}/api/marketplace/search?q=inti%20bhojanam&type=restaurant&lat=18.5204&lng=73.8567&limit=3&legacy=true`;
  const search = await (await fetch(searchUrl)).json();
  const value = search.value ?? search;
  const hit = value.hits?.[0];
  if (!hit?.restaurant?.restaurantSlug) {
    console.error('FAIL: no kitchen hit', JSON.stringify(value).slice(0, 400));
    process.exit(1);
  }
  const { restaurantId, restaurantSlug, displayName } = hit.restaurant;
  console.log('OK kitchen', { restaurantId, restaurantSlug, displayName });

  const wrong = await fetch(
    `${base}/api/marketplace/restaurants/inti-bhojanam/menu?lat=18.5204&lng=73.8567`,
  );
  console.log('wrong slug status', wrong.status, '(expect 404)');

  const menuRes = await fetch(
    `${base}/api/marketplace/restaurants/${encodeURIComponent(restaurantSlug)}/menu?lat=18.5204&lng=73.8567`,
  );
  const menuJson = await menuRes.json();
  const menu = menuJson.value ?? menuJson;
  const names = (menu.items ?? []).map((i: { name: string }) => i.name);
  console.log('OK menu', names);
  const hasDosa = names.some((n: string) => /dosa|malasa|masala/i.test(n));
  if (!hasDosa || menuRes.status !== 200) {
    console.error('FAIL: dosa not on menu or menu not 200');
    process.exit(1);
  }
  console.log('PASS menu grounding smoke');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
