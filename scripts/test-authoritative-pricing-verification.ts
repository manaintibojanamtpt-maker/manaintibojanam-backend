import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8185';
process.env.GCLOUD_PROJECT = 'demo-bhojanos-dev';

const LIVE_BASE = 'http://localhost:8080';
const RESTAURANT_ID = 'demo-biryani-house';
const BIRYANI_ID = 'xCKfCZzWu2XG9rqtwWtr';
const RAITA_ID = 'AOEuSQeXMZsYJP7Nnuzz';

async function run() {
  console.log('--- 1. Testing prepare with authoritative variant pricing (₹547) ---');
  const prepRes = await fetch(`${LIVE_BASE}/api/marketplace/checkout/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: RESTAURANT_ID,
      orderType: 'delivery',
      lines: [
        { itemId: BIRYANI_ID, variantId: 'v-full', quantity: 2 },
        { itemId: RAITA_ID, quantity: 1 },
      ],
      deliveryAddress: {
        lat: 17.4420,
        lng: 78.3510,
        addressLine1: 'Flat 204, Gachibowli, Hyderabad',
        distanceKm: 0.5,
      },
    }),
  });

  assert.equal(prepRes.status, 200, `prepare failed with status ${prepRes.status}`);
  const prepData = await prepRes.json() as any;
  assert.equal(prepData.ok, true);
  const quote = prepData.value.quote;
  assert.equal(quote.subtotal, 547);
  assert.equal(quote.grandTotal, 547);
  assert.equal(quote.deliveryFee, 0);
  assert.equal(quote.gstAmount, 0);
  assert.equal(quote.packagingFee, 0);

  console.log('Resolved prepare quote items:', JSON.stringify(quote.items, null, 2));
  assert.ok(Array.isArray(quote.items));
  assert.equal(quote.items.length, 2);
  assert.equal(quote.items[0].itemId, BIRYANI_ID);
  assert.equal(quote.items[0].variantId, 'v-full');
  assert.equal(quote.items[0].unitPrice, 249);
  assert.equal(quote.items[0].quantity, 2);
  assert.equal(quote.items[0].name, 'Hyderabadi Chicken Biryani (Full)');
  assert.equal(quote.items[1].itemId, RAITA_ID);
  assert.equal(quote.items[1].unitPrice, 49);
  assert.equal(quote.items[1].quantity, 1);
  assert.equal(quote.items[1].name, 'Special Raita');

  console.log('--- 2. Testing client override defense (client unitPrice: 1, hacked name) ---');
  const hackRes = await fetch(`${LIVE_BASE}/api/marketplace/checkout/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: RESTAURANT_ID,
      orderType: 'pickup',
      lines: [
        { itemId: BIRYANI_ID, variantId: 'v-full', quantity: 2, unitPrice: 1, name: 'Free Hacked Biryani' },
      ],
    }),
  });
  const hackData = await hackRes.json() as any;
  assert.equal(hackData.ok, true);
  assert.equal(hackData.value.quote.subtotal, 498); // 2 x 249, NOT 2 x 1!
  assert.equal(hackData.value.quote.items[0].name, 'Hyderabadi Chicken Biryani (Full)');
  assert.equal(hackData.value.quote.items[0].unitPrice, 249);
  console.log('Client unitPrice and name override successfully rejected by server.');

  console.log('--- 3. Testing unknown variantId rejection ---');
  const badVarRes = await fetch(`${LIVE_BASE}/api/marketplace/checkout/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: RESTAURANT_ID,
      orderType: 'pickup',
      lines: [{ itemId: BIRYANI_ID, variantId: 'v-nonexistent', quantity: 1 }],
    }),
  });
  assert.equal(badVarRes.status, 400);
  const badVarData = await badVarRes.json() as any;
  assert.match(badVarData.error?.message || badVarData.message, /Variant 'v-nonexistent' is not valid/);
  console.log('Unknown variantId rejected with 400.');

  console.log('--- 4. Testing missing variant choice rejection ---');
  const noVarRes = await fetch(`${LIVE_BASE}/api/marketplace/checkout/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: RESTAURANT_ID,
      orderType: 'pickup',
      lines: [{ itemId: BIRYANI_ID, quantity: 1 }],
    }),
  });
  assert.equal(noVarRes.status, 400);
  const noVarData = await noVarRes.json() as any;
  assert.match(noVarData.error?.message || noVarData.message, /Variant selection is required/);
  console.log('Missing variant choice rejected with 400.');

  console.log('--- 5. Testing checkout place and inspecting persisted Firestore order ---');
  const placeRes = await fetch(`${LIVE_BASE}/api/marketplace/checkout/place`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: RESTAURANT_ID,
      orderType: 'delivery',
      lines: [
        { itemId: BIRYANI_ID, variantId: 'v-full', quantity: 2 },
        { itemId: RAITA_ID, quantity: 1 },
      ],
      paymentMethod: 'cod',
      customerName: 'Verified Customer',
      phone: '+919876543210',
      deliveryAddress: {
        lat: 17.4420,
        lng: 78.3510,
        addressLine1: 'Flat 204, Gachibowli, Hyderabad',
        distanceKm: 0.5,
      },
    }),
  });

  if (placeRes.status !== 200) {
    const errText = await placeRes.text();
    console.error('place failed with body:', errText);
  }
  assert.equal(placeRes.status, 200, `place failed with status ${placeRes.status}`);
  const placeData = await placeRes.json() as any;
  assert.equal(placeData.ok, true);
  const orderId = placeData.value.orderId;
  const orderNumber = placeData.value.orderNumber;
  console.log(`Order placed successfully: orderId=${orderId}, orderNumber=${orderNumber}`);

  const app = initializeApp({ projectId: 'demo-bhojanos-dev' });
  const db = getFirestore(app);
  const orderSnap = await db.collection('orders').doc(orderId).get();
  assert.ok(orderSnap.exists, 'Order document must exist in Firestore emulator');
  const orderDoc = orderSnap.data() as any;

  console.log('\n================ PERSISTED FIRESTORE ORDER DOCUMENT ================');
  console.log('Order ID:', orderId);
  console.log('Order Number:', orderDoc.orderNumber);
  console.log('Status:', orderDoc.status);
  console.log('Payment Method:', orderDoc.paymentMethod);
  console.log('Total Amount:', orderDoc.totalAmount);
  console.log('Pricing Summary:', JSON.stringify(orderDoc.pricing, null, 2));
  console.log('Persisted Item Breakdown:');
  console.log(JSON.stringify(orderDoc.items, null, 2));
  console.log('===================================================================\n');

  assert.equal(orderDoc.totalAmount, 547);
  assert.equal(orderDoc.subtotal, 547);
  assert.equal(orderDoc.deliveryFee, 0);
  assert.equal(orderDoc.gstAmount, 0);
  assert.equal(orderDoc.packingFee, 0);
  assert.equal(orderDoc.items.length, 2);

  // Line 1: Chicken Dum Biryani (Full)
  assert.equal(orderDoc.items[0].itemId, BIRYANI_ID);
  assert.equal(orderDoc.items[0].variantId, 'v-full');
  assert.equal(orderDoc.items[0].name, 'Hyderabadi Chicken Biryani (Full)');
  assert.equal(orderDoc.items[0].quantity, 2);
  assert.equal(orderDoc.items[0].unitPrice, 249);
  assert.equal(orderDoc.items[0].lineSubtotal, 498);
  assert.equal(orderDoc.items[0].lineTotal, 498);

  // Line 2: Special Raita
  assert.equal(orderDoc.items[1].itemId, RAITA_ID);
  assert.equal(orderDoc.items[1].variantId, undefined);
  assert.equal(orderDoc.items[1].name, 'Special Raita');
  assert.equal(orderDoc.items[1].quantity, 1);
  assert.equal(orderDoc.items[1].unitPrice, 49);
  assert.equal(orderDoc.items[1].lineSubtotal, 49);
  assert.equal(orderDoc.items[1].lineTotal, 49);

  console.log('--- 6. Testing price change / expectedAmountPaise mismatch defense (HTTP 409) ---');
  const auth = (await import('firebase-admin/auth')).getAuth(app);
  const customTok = await auth.createCustomToken('usr_test_customer_price_chk');
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  const tokenRes = await fetch(`http://${authEmulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customTok, returnSecureToken: true }),
  });
  const tokenData = await tokenRes.json() as any;
  const idToken = tokenData.idToken as string;

  const mismatchRes = await fetch(`${LIVE_BASE}/api/marketplace/checkout/place`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      clientAttemptId: 'attempt_price_change_test_123',
      expectedAmountPaise: 104700, // Client expected old ₹1,047 quote
      quoteExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      restaurantId: RESTAURANT_ID,
      orderType: 'delivery',
      lines: [
        { itemId: BIRYANI_ID, variantId: 'v-full', quantity: 2 },
        { itemId: RAITA_ID, quantity: 1 },
      ],
      deliveryAddress: {
        lat: 17.4420,
        lng: 78.3510,
        addressLine1: 'Flat 204, Gachibowli, Hyderabad',
        distanceKm: 0.5,
      },
      paymentMethod: 'cod',
      customerName: 'Verified Customer',
      phone: '+919876543210',
    }),
  });
  assert.equal(mismatchRes.status, 409, `Expected 409 but got ${mismatchRes.status}`);
  const mismatchData = await mismatchRes.json() as any;
  assert.match(mismatchData.error?.message || mismatchData.message, /Checkout total changed; review a fresh quote/);
  console.log('Price change / expectedAmountPaise mismatch successfully rejected with HTTP 409.');

  console.log('--- 7. Testing matching authenticated place (expectedAmountPaise: 54700) ---');
  const matchRes = await fetch(`${LIVE_BASE}/api/marketplace/checkout/place`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      clientAttemptId: 'attempt_price_match_test_456',
      expectedAmountPaise: 54700, // Exactly ₹547.00
      quoteExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      restaurantId: RESTAURANT_ID,
      orderType: 'delivery',
      lines: [
        { itemId: BIRYANI_ID, variantId: 'v-full', quantity: 2 },
        { itemId: RAITA_ID, quantity: 1 },
      ],
      deliveryAddress: {
        lat: 17.4420,
        lng: 78.3510,
        addressLine1: 'Flat 204, Gachibowli, Hyderabad',
        distanceKm: 0.5,
      },
      paymentMethod: 'cod',
      customerName: 'Verified Customer',
      phone: '+919876543210',
    }),
  });
  assert.equal(matchRes.status, 200, `Expected 200 but got ${matchRes.status}`);
  const matchData = await matchRes.json() as any;
  assert.equal(matchData.ok, true);
  console.log('Matching authenticated place with expectedAmountPaise=54700 succeeded with HTTP 200.');

  console.log('\nAll authoritative pricing and checkout consistency checks PASSED!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
