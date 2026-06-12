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

  // Extract latest user message
  const lastMessage = contents[contents.length - 1]?.parts?.[0]?.text?.trim().toLowerCase() || "";
  logger.info({ message: "AI Intent Routing", userMessage: lastMessage });

  // 2. Strict Priority-Based Intent Classifier (Deterministic Router)
  
  // Priority 1: Store Hours
  if (/(open|close|hours|time|timing|when do you)/i.test(lastMessage)) {
    if (isStoreOpen) {
      return { success: true, text: "Yes, we are currently OPEN and accepting orders! What would you like to have?" };
    } else {
      return { success: true, text: "We are currently CLOSED. You can still browse our menu, but orders are temporarily paused." };
    }
  }

  // Priority 2: Delivery Area
  if (/(deliver|area|location|kharadi|pincode|where|ship)/i.test(lastMessage)) {
    return { success: true, text: "We serve selected areas around Pune. Please enter your address at checkout to confirm exact delivery availability." };
  }

  // Priority 2.5: Add to Cart Exact Match (Quantity Aware)
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
    }
  }

  // Priority 3: Menu Search (Trigger frontend tool deterministically)
  if (/(menu|show|what do you have|food|dishes)/i.test(lastMessage)) {
    return { success: true, toolCall: { name: 'searchMenu', args: {} } };
  }

  // Priority 3.5: Entity Match Search (If they mentioned specific food)
  const searchItems = brain.findMenuItems(lastMessage);
  if (searchItems.length > 0) {
    return { 
      success: true, 
      toolCall: { name: 'searchMenu', args: { query: lastMessage } } 
    };
  }

  // Priority 4: Cart Action
  if (/(cart|total|checkout|basket|pay)/i.test(lastMessage)) {
    if (cartItemsCount > 0) {
      return { success: true, toolCall: { name: 'getCartStatus', args: {} } };
    } else {
      return { success: true, text: "Your cart is currently empty. Would you like me to show you the menu?" };
    }
  }

  // Priority 5: FAQ & Support
  if (/(help|support|contact|call|phone|issue|problem)/i.test(lastMessage)) {
    return { success: true, text: "If you need immediate help with an order, please contact our support team from the menu or call our restaurant directly." };
  }

  // Priority 6: Conversational Fallback (Local Ollama)
  return await callOllama(lastMessage);
};

// Fallback to local Ollama via HTTP API (Phase C: Schema-based extraction)
async function callOllama(prompt: string) {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.2"; // lightweight model preference

  const schema = {
    type: "object",
    properties: {
      intent: { type: "string", enum: ["recommendation", "store_query", "conversational", "support", "cart_action"] },
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
        prompt: `You are a food ordering concierge for Mana Inti Bojanam. The user said: "${prompt}". Extract the intent. Keep the conversational_reply warm and under 2 sentences.`,
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
        
        // Map structured intent to tool calls
        if (parsed.intent === "recommendation") {
          let isVeg;
          if (parsed.entities?.food_type === "veg") isVeg = true;
          else if (parsed.entities?.food_type === "non-veg") isVeg = false;

          return {
            success: true,
            text: parsed.conversational_reply,
            toolCall: { 
              name: 'searchMenu', 
              args: { 
                query: parsed.entities?.query || "", 
                maxPrice: parsed.entities?.max_price, 
                isVeg 
              } 
            }
          };
        } else if (parsed.intent === "cart_action") {
          return { success: true, text: parsed.conversational_reply, toolCall: { name: 'getCartStatus', args: {} } };
        } else if (parsed.intent === "support") {
          return { success: true, text: parsed.conversational_reply, toolCall: { name: 'escalateToSupport', args: {} } };
        }

        return { success: true, text: parsed.conversational_reply };
      } catch (parseErr) {
        logger.warn({ message: "Ollama response was not valid JSON", raw: data.response });
        return { success: true, text: data.response };
      }
    }

    throw new Error("Invalid Ollama response format");

  } catch (error: any) {
    logger.warn({ message: "Ollama fallback failed or timed out", error: error.message });
    
    // Graceful Degradation
    return { 
      success: true, 
      text: "I'm having trouble connecting to my brain right now, but you can still use the app! Try browsing the Menu or viewing your Cart." 
    };
  }
}
