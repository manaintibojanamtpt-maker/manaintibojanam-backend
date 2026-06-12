import re

def main():
    with open('server.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    new_ai_endpoint = """
// ================= AI ASSISTANT =================
import { GoogleGenAI } from "@google/genai";

const aiTools = [{
  functionDeclarations: [
    { name: 'searchMenu', description: 'Search the menu for items by name or category', parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' }, maxPrice: { type: 'NUMBER' }, isVeg: { type: 'BOOLEAN' } } } },
    { name: 'getItemDetails', description: 'Get details about a menu item including price and addons', parameters: { type: 'OBJECT', properties: { itemId: { type: 'STRING' } }, required: ['itemId'] } },
    { name: 'getCartStatus', description: 'Get current cart items, quantities, and total', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'addToCart', description: 'Add an item to the cart', parameters: { type: 'OBJECT', properties: { itemId: { type: 'STRING' }, quantity: { type: 'NUMBER' }, addonIds: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['itemId', 'quantity'] } },
    { name: 'removeFromCart', description: 'Remove an item from the cart', parameters: { type: 'OBJECT', properties: { cartItemId: { type: 'STRING' } }, required: ['cartItemId'] } },
    { name: 'clearCart', description: 'Ask user to confirm clearing the entire cart', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'applyCoupon', description: 'Ask user to confirm applying a coupon code', parameters: { type: 'OBJECT', properties: { code: { type: 'STRING' } }, required: ['code'] } },
    { name: 'escalateToSupport', description: 'Ask user to confirm creating a support ticket', parameters: { type: 'OBJECT', properties: { topic: { type: 'STRING' }, summary: { type: 'STRING' } }, required: ['topic', 'summary'] } }
  ]
}];

app.post("/api/ai/chat", strictLimiter, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ success: false, error: "AI Assistant is not configured on this server." });
    }
    const ai = new GoogleGenAI({ apiKey });
    
    // We expect the frontend to pass the fully formed 'contents' array in the GenAI format
    const { contents, systemInstruction } = req.body;
    
    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({ success: false, error: "Missing or invalid 'contents' array." });
    }
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash", // Upgraded to stable tool-calling model
      contents,
      config: {
        systemInstruction,
        temperature: 0.2, // Lower temp for more deterministic tool usage
        tools: aiTools,
      }
    });
    
    // Check if the response contains function calls
    const call = response.functionCalls?.[0];
    if (call) {
      return res.json({ 
        success: true, 
        toolCall: { name: call.name, args: call.args } 
      });
    }
    
    res.json({ success: true, text: response.text });
  } catch (err: any) {
    logger.error({ message: "AI Error", error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: "AI processing failed." });
  }
});
"""

    # We need to replace the old AI endpoint block
    start_marker = "// ================= AI ASSISTANT ================="
    end_marker = "// ================= BOOTSTRAP ADMIN CLAIM ================="
    
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    if start_idx != -1 and end_idx != -1:
        content = content[:start_idx] + new_ai_endpoint + "\n\n" + content[end_idx:]
    else:
        print("Could not find markers to replace AI block")
        return

    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Patched server.ts with tool calling endpoint")

if __name__ == "__main__":
    main()
