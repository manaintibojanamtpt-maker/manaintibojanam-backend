import { processAIRequest } from './aiProvider';
import { brain } from './storeBrain';

const MOCK_SYSTEM_PROMPT = `
You are "Mana Inti Concierge", a premium AI assistant for Mana Inti Bojanam cloud kitchen.
Help users find dishes, manage their cart, and answer questions.
Store Status: OPEN.
Current Cart: 2 items (Total: ₹450).
Fallback Count: 0.
Available Tools: searchMenu, getItemDetails, getCartStatus, addToCart, removeFromCart, clearCart.
`;

const OFFLINE_MOCK_SYSTEM_PROMPT = `
You are "Mana Inti Concierge", a premium AI assistant for Mana Inti Bojanam cloud kitchen.
Help users find dishes, manage their cart, and answer questions.
Store Status: OPEN.
Current Cart: 2 items (Total: ₹450).
Fallback Count: 2.
Available Tools: searchMenu, getItemDetails, getCartStatus, addToCart, removeFromCart, clearCart.
`;

async function runTests() {
  console.log("Seeding dummy storeBrain...");
  brain.menu.set('item1', { id: 'item1', name: 'Chicken Biryani', aliases: ['chicken', 'biryani'], price: 200, category: 'Main', isAvailable: true, type: 'non-veg' });
  brain.menu.set('item2', { id: 'item2', name: 'Paneer Butter Masala', aliases: ['paneer'], price: 180, category: 'Main', isAvailable: true, type: 'veg' });
  brain.menu.set('item3', { id: 'item3', name: 'Unavailable Dish', aliases: [], price: 100, category: 'Side', isAvailable: false, type: 'veg' });
  brain.menu.set('item4', { id: 'item4', name: 'Veg Meal', aliases: ['veg', 'meal', 'meals'], price: 150, category: 'Main', isAvailable: true, type: 'veg' });

  const testCases = [
    { name: "is store open", query: "is store open", prompt: MOCK_SYSTEM_PROMPT },
    { name: "do you deliver to my pincode", query: "do you deliver to 411014", prompt: MOCK_SYSTEM_PROMPT },
    { name: "show veg meals", query: "show veg meals", prompt: MOCK_SYSTEM_PROMPT },
    { name: "add 2 biryani", query: "add 2 biryani", prompt: MOCK_SYSTEM_PROMPT },
    { name: "remove item from cart", query: "remove biryani from cart", prompt: MOCK_SYSTEM_PROMPT },
    { name: "schedule my order", query: "schedule my order", prompt: MOCK_SYSTEM_PROMPT },
    { name: "invalid item", query: "add 1 Unavailable Dish", prompt: MOCK_SYSTEM_PROMPT },
    { name: "Ollama offline fallback", query: "what should I eat?", prompt: OFFLINE_MOCK_SYSTEM_PROMPT }
  ];

  for (const tc of testCases) {
    console.log(`\n=== Test: ${tc.name} ===`);
    console.log(`Query: "${tc.query}"`);
    const contents = [{ parts: [{ text: tc.query }] }];
    
    try {
      const res = await processAIRequest(contents, tc.prompt);
      console.log("Result:", JSON.stringify(res, null, 2));
    } catch (e: any) {
      console.error("Test failed:", e.message);
    }
  }
}

runTests();
