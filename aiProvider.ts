import winston from "winston";
import { brain } from "./storeBrain";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

export const processAIRequest = async (contents: any[], systemInstruction: string) => {
  // 1. Extract context deterministically provided by frontend
  const isStoreOpen = systemInstruction.includes("Store Status: OPEN");
  const cartMatch = systemInstruction.match(/Current Cart: (\d+) items/);
  const cartItemsCount = cartMatch ? parseInt(cartMatch[1], 10) : 0;
  
  const fallbackMatch = systemInstruction.match(/Fallback Count: (\d+)/);
  const fallbackCount = fallbackMatch ? parseInt(fallbackMatch[1], 10) : 0;

  // Extract latest user message
  const lastMessage = contents[contents.length - 1]?.parts?.[0]?.text?.trim().toLowerCase() || "";
  logger.info({ message: "AI Intent Routing", userMessage: lastMessage, fallbackCount });

  // 2. Strict Priority-Based Intent Classifier (Deterministic Router)
  
  // Priority 1: Store Hours & Status
  if (/(open|close|hours|time|timing|when do you)/i.test(lastMessage) && !/(schedule|tomorrow|later)/i.test(lastMessage)) {
    if (isStoreOpen) {
      return { success: true, text: "Yes, we are currently OPEN and accepting orders! What would you like to have?" };
    } else {
      return { success: true, text: "We are currently CLOSED. You can still browse our menu, but orders are temporarily paused." };
    }
  }

  // Priority 2: Delivery Area / Serviceability
  if (/(deliver|area|location|kharadi|pincode|where|ship)/i.test(lastMessage)) {
    return { success: true, text: "We serve selected areas around Pune. Please enter your address at checkout to confirm exact delivery availability." };
  }

  // Priority 3: Scheduling / Pre-orders
  if (/(schedule|pre-order|tomorrow|later|specific time|can i order for)/i.test(lastMessage)) {
    return { 
      success: true, 
      text: "Yes, you can schedule your order! Just add your items to the cart, proceed to checkout, and select 'Scheduled Delivery' to pick your preferred time slot." 
    };
  }

  // Priority 4: Payment Queries
  if (/(pay|cash|upi|card|cc|gpay|payment)/i.test(lastMessage)) {
    return { success: true, text: "We accept UPI, Credit/Debit cards, Netbanking, and Wallets. Cash on Delivery may be available depending on your location." };
  }

  // Priority 5: Remove from Cart
  if (/(remove|delete|drop|cancel).*(cart)?/i.test(lastMessage)) {
    return { success: true, text: "You can remove items by tapping the trash icon next to the item in your cart.", toolCall: { name: 'getCartStatus', args: {} } };
  }

  // Priority 6: Checkout Guidance
  if (/(checkout|pay now|how to order|proceed)/i.test(lastMessage)) {
    if (cartItemsCount > 0) {
      return { success: true, text: "You have items in your cart. Just tap the Cart icon to proceed to checkout!" };
    } else {
      return { success: true, text: "Your cart is empty. Browse the menu to add some delicious food first." };
    }
  }

  // Priority 7: Add to Cart Exact Match (Quantity Aware)
  const addMatch = lastMessage.match(/(?:add|get|want|order)\s+(\d+)?\s*(.+)/i);
  if (addMatch) {
    const qty = addMatch[1] ? parseInt(addMatch[1], 10) : 1;
    const itemName = addMatch[2].trim();
    const matchedItems = brain.findMenuItems(itemName);
    
    if (matchedItems.length === 1 && matchedItems[0].isAvailable) {
      const item = matchedItems[0];
      let text = `Added ${qty} ${item.name} to your cart.`;
      
      // Phase D: Premium Upsell Logic
      if (item.name.toLowerCase().includes('biryani') || item.category.toLowerCase().includes('main')) {
          text += " Would you like a cold beverage or dessert to complete your meal?";
      }

      // Confident exact match -> Direct to cart
      return { 
        success: true, 
        toolCall: { name: 'addToCart', args: { itemId: item.id, quantity: qty } },
        text
      };
    } else if (matchedItems.length === 1 && !matchedItems[0].isAvailable) {
      return { success: true, text: `Sorry, ${matchedItems[0].name} is currently unavailable. Would you like to try something else?` };
    }
  }

  // Priority 8: Menu Search
  if (/(menu|show|what do you have|food|dishes)/i.test(lastMessage) && !addMatch) {
    return { success: true, toolCall: { name: 'searchMenu', args: {} } };
  }

  // Priority 9: Entity Match Search (If they mentioned specific food like "veg meals" or "biryani")
  const searchItems = brain.findMenuItems(lastMessage);
  if (searchItems.length > 0) {
    return { 
      success: true, 
      toolCall: { name: 'searchMenu', args: { query: lastMessage } } 
    };
  }

  // Priority 10: Cart Action
  if (/(cart|total|basket)/i.test(lastMessage)) {
    if (cartItemsCount > 0) {
      return { success: true, toolCall: { name: 'getCartStatus', args: {} } };
    } else {
      return { success: true, text: "Your cart is currently empty. Would you like me to show you the menu?" };
    }
  }

  // Priority 11: FAQ & Support
  if (/(help|support|contact|call|phone|issue|problem)/i.test(lastMessage)) {
    return { success: true, text: "If you need immediate help with an order, please contact our support team from the menu or call our restaurant directly." };
  }

  // Priority 12: Structured LLM Extraction (Ollama)
  return await callOllama(lastMessage, fallbackCount);
};

// Fallback to local Ollama via HTTP API
async function callOllama(prompt: string, fallbackCount: number) {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.2";

  const schema = {
    type: "object",
    properties: {
      intent: { 
        type: "string", 
        enum: [
          "store_status", "store_timing", "delivery_query", "scheduling_query", 
          "payment_query", "menu_search", "recommendation", "item_details", 
          "cart_status", "add_to_cart", "remove_from_cart", "checkout_guidance", 
          "support_query", "conversational_smalltalk"
        ] 
      },
      entities: {
        type: "object",
        properties: {
          food_type: { type: "string", enum: ["veg", "non-veg", "any"] },
          query: { type: "string" },
          max_price: { type: "number" }
        }
      },
      conversational_reply: { type: "string" }
    },
    required: ["intent", "conversational_reply"]
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Strict 8s timeout

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        prompt: `You are a food ordering concierge for Mana Inti Bojanam. The user said: "${prompt}". Extract the intent into strict JSON. Keep the conversational_reply warm, professional, and under 2 sentences.`,
        format: schema,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama responded with status: ${response.status}`);
    }

    const data = await response.json();
    if (data.response) {
      try {
        const parsed = JSON.parse(data.response);
        logger.info({ message: "Ollama parsed", parsed });
        
        // Map structured intent to tool calls or fallback logic
        switch (parsed.intent) {
          case "recommendation":
          case "menu_search":
            let isVeg;
            if (parsed.entities?.food_type === "veg") isVeg = true;
            else if (parsed.entities?.food_type === "non-veg") isVeg = false;

            return {
              success: true,
              text: parsed.conversational_reply,
              toolCall: { 
                name: 'searchMenu', 
                args: { query: parsed.entities?.query || "", maxPrice: parsed.entities?.max_price, isVeg } 
              }
            };
          
          case "add_to_cart":
            if (parsed.entities?.query) {
              const items = brain.findMenuItems(parsed.entities.query);
              if (items.length === 1 && items[0].isAvailable) {
                return { 
                  success: true, 
                  text: parsed.conversational_reply, 
                  toolCall: { name: 'addToCart', args: { itemId: items[0].id, quantity: 1 } } 
                };
              }
            }
            return { success: true, text: parsed.conversational_reply, toolCall: { name: 'searchMenu', args: { query: parsed.entities?.query || "" } } };

          case "cart_status":
          case "checkout_guidance":
            return { success: true, text: parsed.conversational_reply, toolCall: { name: 'getCartStatus', args: {} } };

          case "support_query":
            return { success: true, text: parsed.conversational_reply, toolCall: { name: 'escalateToSupport', args: {} } };

          default:
            return { success: true, text: parsed.conversational_reply };
        }
      } catch (parseErr) {
        logger.warn({ message: "Ollama response was not valid JSON", raw: data.response });
        return { success: true, text: data.response };
      }
    }

    throw new Error("Invalid Ollama response format");

  } catch (error: any) {
    logger.warn({ message: "Ollama fallback failed or timed out", error: error.message });
    
    // Guided Degraded Fallback with Loop Prevention
    if (fallbackCount >= 2) {
      return { 
        success: true, 
        text: "I'm having a little trouble understanding. Here's our menu so you can see all our dishes directly!",
        toolCall: { name: 'searchMenu', args: {} }
      };
    }

    return { 
      success: true, 
      text: "I couldn't quite catch that. Are you looking for a specific dish, or do you have a question about delivery/store hours?",
      isFallback: true
    };
  }
}
