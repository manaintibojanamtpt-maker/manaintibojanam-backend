import { processVoiceAssistantTurn } from '../backend-lib/voice/voiceTurnProcessor.js';

const menu = [
  {
    id: 'item_cb_001',
    name: 'Hyderabadi Chicken Biryani',
    price: 299,
    offerPrice: 249,
    isAvailable: true,
    variants: [
      { id: 'v_half', name: 'Half', price: 179, offerPrice: 149, isAvailable: true },
      { id: 'v_full', name: 'Full', price: 299, offerPrice: 249, isAvailable: true },
      { id: 'v_jumbo', name: 'Jumbo', price: 399, isAvailable: false },
    ],
  },
  {
    id: 'item_raita_001',
    name: 'Special Raita',
    price: 49,
    isAvailable: true,
  },
];

async function run() {
  console.log('=== MULTI-TURN CART PRICING BREAKDOWN TEST ===\n');

  // Turn 1
  const t1 = await processVoiceAssistantTurn({
    sessionId: 'cart_test_1',
    transcript: 'రెండు చికెన్ బిర్యానీలు కావాలి',
    language: 'te-IN',
    restaurantId: 'demo-biryani-house',
    context: { menuItems: menu, restaurantId: 'demo-biryani-house' }
  });
  console.log('T1 Reply:', t1.reply);
  console.log('T1 Options offered in prompt:', t1.pendingClarification?.pendingItems[0]?.variantOptions?.map(o => o.name));

  // Turn 2: User requests unavailable 'Jumbo'
  const t2 = await processVoiceAssistantTurn({
    sessionId: 'cart_test_1',
    transcript: 'జంబో',
    language: 'te-IN',
    restaurantId: 'demo-biryani-house',
    context: { menuItems: menu, restaurantId: 'demo-biryani-house', pendingClarification: t1.pendingClarification }
  });
  console.log('\nT2 Input: "జంబో" (Jumbo - unavailable)');
  console.log('T2 Intent:', t2.intent);
  console.log('T2 Reply:', t2.reply);
  console.log('T2 PendingClarification preserved:', Boolean(t2.pendingClarification));

  // Turn 3: User selects available 'Full'
  const t3 = await processVoiceAssistantTurn({
    sessionId: 'cart_test_1',
    transcript: 'ఫుల్',
    language: 'te-IN',
    restaurantId: 'demo-biryani-house',
    context: { menuItems: menu, restaurantId: 'demo-biryani-house', pendingClarification: t2.pendingClarification }
  });
  console.log('\nT3 Input: "ఫుల్" (Full)');
  console.log('T3 Intent:', t3.intent);
  console.log('T3 Reply:', t3.reply);

  // Turn 4: User adds Special Raita
  const currentProposal = t3.proposedActions?.map(a => a.payload) || [];
  const t4 = await processVoiceAssistantTurn({
    sessionId: 'cart_test_1',
    transcript: 'ఒక స్పెషల్ రైతా కూడా కావాలి',
    language: 'te-IN',
    restaurantId: 'demo-biryani-house',
    context: { menuItems: menu, restaurantId: 'demo-biryani-house', currentProposal }
  });
  console.log('\nT4 Input: "ఒక స్పెషల్ రైతా కూడా కావాలి"');
  console.log('T4 Intent:', t4.intent);
  console.log('T4 Reply:', t4.reply);

  const cartLines = (t4.proposedActions || []).map(a => a.payload);
  console.log('\n--- CONFIRMED CART BREAKDOWN ---');
  let subtotal = 0;
  let totalUnits = 0;
  for (let idx = 0; idx < cartLines.length; idx++) {
    const line = cartLines[idx];
    const lineSubtotal = line.price * line.quantity;
    subtotal += lineSubtotal;
    totalUnits += line.quantity;
    console.log(`Line ${idx + 1}: ${line.name}`);
    console.log(`  - Food ID: ${line.foodId}`);
    console.log(`  - Variant ID: ${line.variantId || 'none'}`);
    console.log(`  - Quantity: ${line.quantity}`);
    console.log(`  - Unit Price: ₹${line.price}`);
    console.log(`  - Line Total: ₹${lineSubtotal}`);
  }
  console.log('--------------------------------');
  console.log(`Total Lines: ${cartLines.length} (Expected: 2)`);
  console.log(`Total Units: ${totalUnits} (Expected: 3)`);
  console.log(`Subtotal: ₹${subtotal} (Expected: ₹547)`);
  console.log(`Matches Expected: ${subtotal === 547 && cartLines.length === 2 && totalUnits === 3}`);
}

run().catch(console.error);
