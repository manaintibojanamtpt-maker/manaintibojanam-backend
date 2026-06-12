import winston from "winston";

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

  // Priority 3: Menu Search (Trigger frontend tool)
  if (/(menu|show|veg|non-veg|food|dishes|chicken|paneer|biryani|roti)/i.test(lastMessage)) {
    let query = "";
    if (lastMessage.includes("veg") && !lastMessage.includes("non-veg")) query = "veg";
    else if (lastMessage.includes("chicken")) query = "chicken";
    else if (lastMessage.includes("paneer")) query = "paneer";
    else if (lastMessage.includes("biryani")) query = "biryani";

    return { 
      success: true, 
      toolCall: { name: 'searchMenu', args: { query, isVeg: query === "veg" } } 
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

// Fallback to local Ollama via HTTP API
async function callOllama(prompt: string) {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.2"; // lightweight model preference

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Strict 8s timeout

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        prompt: `You are a friendly food ordering assistant for Mana Inti Bojanam. Keep answers under 2 short sentences. The user said: "${prompt}"`,
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
      return { success: true, text: data.response };
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
