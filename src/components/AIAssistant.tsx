import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, Bot, User, Utensils, ShoppingCart, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { isStoreOpenNow } from '../lib/storeUtils';
import { useCart } from '../context/CartContext';
import { fetchMenu } from '../services/api';
import toast from 'react-hot-toast';
import { getDb } from '../lib/firebase-db';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAIAnalytics } from '../hooks/useAIAnalytics';
import { MenuItem } from '../types';

type Message = { role: 'user' | 'assistant' | 'system', content: string };
type ToolCall = { name: string, args: any };

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [fallbackCount, setFallbackCount] = useState(0);
  
  // Tool Execution State
  const [pendingToolCall, setPendingToolCall] = useState<ToolCall | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { cart, addToCart, removeFromCart, clearCart, total, setAiAssisted } = useCart();
  const { logEvent } = useAIAnalytics();

  // Load Menu and Settings
  useEffect(() => {
    fetchMenu().then(items => setMenuItems(items));

    const unsubscribe = onSnapshot(doc(getDb(), "adminSettings", "global"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSettings(data);
        const open = isStoreOpenNow(data);
        setMessages([
          { 
            role: 'assistant', 
            content: open 
              ? "Hi! I'm your Mana Inti Concierge. What are you craving today?" 
              : "Hi! I'm your Mana Inti Concierge. We're currently closed, but I can help you explore our menu for later!" 
          }
        ]);
      }
    });
    return () => unsubscribe();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [messages, pendingToolCall, isTyping]);

  const handleOpen = () => {
    setIsOpen(true);
    logEvent('ai_session_started');
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const executeTool = async (call: ToolCall) => {
    logEvent('ai_tool_invoked', { tool: call.name, args: call.args });
    let toolResult: any = { success: true };
    let replyText = "";

    try {
      if (call.name === 'searchMenu') {
        const { query, maxPrice, isVeg } = call.args;
        let results = menuItems.filter(item => item.isAvailable !== false);
        if (query && typeof query === 'string') {
          const q = query.toLowerCase();
          results = results.filter(i => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
        }
        if (maxPrice) results = results.filter(i => i.price <= maxPrice);
        if (isVeg !== undefined) results = results.filter(i => i.isVegetarian === isVeg);
        
        toolResult = { items: results.slice(0, 5).map(i => ({ id: i.id, name: i.name, price: i.price })) };
        if (results.length === 0) {
          replyText = "I couldn't find any dishes matching that. Could you try another name or browse the full menu?";
        } else {
          replyText = `I found ${results.length} items.`;
        }
      } 
      else if (call.name === 'getItemDetails') {
        const item = menuItems.find(i => i.id === call.args.itemId);
        if (!item) throw new Error("Item not found");
        toolResult = { item };
        replyText = `Here are the details for ${item.name}.`;
      }
      else if (call.name === 'getCartStatus') {
        toolResult = { cart, total };
        replyText = `You have ${cart.length} items totaling ₹${total}.`;
      }
      else if (call.name === 'addToCart') {
        const item = menuItems.find(i => i.id === call.args.itemId);
        if (!item) throw new Error("Item not found or unavailable");
        if (item.isAvailable === false) throw new Error("Item is currently out of stock");
        const qty = Math.min(call.args.quantity || 1, 10);
        
        // Add to cart multiple times if qty > 1
        for (let i = 0; i < qty; i++) {
          addToCart(item); 
        }
        setAiAssisted(true);
        replyText = `Added ${qty}x ${item.name} to your cart!`;
      }
      else if (call.name === 'removeFromCart') {
        removeFromCart(call.args.cartItemId);
        replyText = `Removed item from your cart.`;
      }
      else if (['clearCart', 'applyCoupon', 'escalateToSupport'].includes(call.name)) {
        // High Risk: Requires Confirmation
        setPendingToolCall(call);
        return; // Pause execution
      }
      else {
        throw new Error("Unknown tool");
      }

      // If we reach here, a silent/low-risk tool executed successfully
      setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
      
      // Send result back to model silently for context?
      // For V1, simply returning text to user is enough for low-risk actions.
      
    } catch (err: any) {
      logEvent('ai_tool_failed', { tool: call.name, reason: err.message });
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I couldn't do that: ${err.message}` }]);
    }
  };

  const confirmTool = (confirm: boolean) => {
    if (!pendingToolCall) return;
    const call = pendingToolCall;
    setPendingToolCall(null);

    if (confirm) {
      logEvent('ai_action_confirmed', { tool: call.name });
      if (call.name === 'clearCart') {
        clearCart();
        setMessages(prev => [...prev, { role: 'assistant', content: "I have cleared your cart." }]);
      } else if (call.name === 'applyCoupon') {
        setMessages(prev => [...prev, { role: 'assistant', content: "Coupon applied! (Feature coming soon)" }]);
      } else if (call.name === 'escalateToSupport') {
        setMessages(prev => [...prev, { role: 'assistant', content: "A support agent will contact you shortly." }]);
      }
    } else {
      logEvent('ai_action_cancelled', { tool: call.name });
      setMessages(prev => [...prev, { role: 'assistant', content: "Okay, I've cancelled that action." }]);
    }
  };

  const handleSendMessage = async (msgText: string = input) => {
    if (!msgText.trim()) return;

    const userMessage = msgText.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
    logEvent('ai_message_sent', { length: userMessage.length });

    try {
      const isStoreOpen = isStoreOpenNow(settings);
      const systemInstruction = `
You are "Mana Inti Concierge", the AI food-ordering assistant for the cloud kitchen "Mana Inti Bojanam", which serves authentic home-style Andhra/Telugu meals in Pune. Your only job is to help users browse the menu, decide what to eat, and place or manage their orders.

# CORE RULES
1. When a user request involves the menu, cart, or orders, you MUST call the appropriate tool. Never just describe the manual steps if a tool can perform the action.
2. Always resolve dish names to real menu items via the menu/search tool before adding to cart. Never invent an item_id.
3. Track cart and conversation state. If the user says "make it 3" after "add 2 masala dosa", update the masala dosa quantity.
4. Never show raw errors or stack traces. If a tool fails or returns nothing, ask a clarifying question or suggest alternatives instead of saying "0 items found".

# BEHAVIOR BY INTENT
- Greeting ("hi", "hello"): One friendly greeting + a quick next step, e.g. "Hi! Welcome to Mana Inti Bojanam. Craving veg, non-veg, or today's specials?"
- "show menu" / "what do you have": Call the menu tool, then present items grouped by category (Meals, Tiffins, Curries, Extras). Show a few options and invite refinement. Never reply with only an item count.
- "add 2 masala dosa to cart": Resolve "Masala Dosa" via search, pick a sensible default variant (and say which), call add_to_cart(item_id, quantity), then confirm: "Added 2 Masala Dosa. Cart total: ₹X. Anything else?"
- "best / trending / popular non-veg item": Call the trending/recommendation tool with the right filter. Recommend 1-3 dishes with a one-line pitch each and offer to add them. Do NOT route this into plain text search.
- "schedule order for tomorrow 10:00 AM": Clarify date/time if ambiguous, then call the schedule/checkout tool and confirm the scheduled time. Do not tell the user to click buttons manually.

# OUT OF SCOPE
If asked anything unrelated to food, menu, timings, delivery, or offers, gently decline and steer back to ordering.

# TONE
Warm, concise, and action-oriented. One short paragraph or a brief list per reply. Speak as a helpful restaurant assistant, never as a chatbot reciting instructions.

# TOOL DISCIPLINE
Follow the tool schema strictly. Always obtain item_id from a menu/search tool before any cart action. If unsure which tool to use, pick the one that moves the user closest to successfully ordering food.

---
# STATE DATA
Store Status: ${isStoreOpen ? 'OPEN' : 'CLOSED'}.
Current Cart: ${cart.length} items (Total: ₹${total}).
Fallback Count: ${fallbackCount}.
Available Tools: searchMenu, getItemDetails, getCartStatus, addToCart, removeFromCart, clearCart.
      `;

      // Build simplified message history for API
      const history = messages.filter(m => m.role !== 'system').slice(-6);

      const res = await fetch('https://manaintibojanam-backend.onrender.com/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), { role: 'user', parts: [{ text: userMessage }] }], systemInstruction })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch response");

      if (data.isFallback) {
        setFallbackCount(prev => prev + 1);
      } else {
        setFallbackCount(0);
      }

      if (data.toolCall) {
        await executeTool(data.toolCall);
      } else if (data.text) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
      }

    } catch (err: any) {
      console.error("AI Error:", err);
      toast.error("AI assistant is currently unavailable");
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpen}
        className={`fixed ${cart.length > 0 ? 'bottom-48 sm:bottom-28' : 'bottom-24'} right-6 z-40 w-14 h-14 bg-gray-900 dark:bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-black transition-all duration-300`}
      >
        <Sparkles size={24} />
      </motion.button>

      {/* Bottom Sheet Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y > 100) handleClose(); }}
              className="fixed bottom-0 left-0 right-0 z-[200] h-[85vh] bg-white dark:bg-[#070504] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex-none p-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600">
                    <Bot size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Mana Inti Concierge</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">AI Ordering Assistant</p>
                  </div>
                </div>
                <button onClick={handleClose} aria-label="Close assistant" className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full bg-gray-100 dark:bg-white/5">
                  <X size={20} />
                </button>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-transparent">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-4 ${
                      msg.role === 'user' 
                        ? 'bg-red-600 text-white rounded-br-none' 
                        : 'bg-white dark:bg-[#151515] text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-white/5 rounded-bl-none'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}

                {/* Interactive Confirmation Card */}
                {pendingToolCall && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-[85%] bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-500 font-bold mb-2">
                      <AlertTriangle size={18} />
                      Action Required
                    </div>
                    <p className="text-sm text-yellow-900 dark:text-yellow-400 mb-4">
                      {pendingToolCall.name === 'clearCart' && "Are you sure you want to clear your entire cart?"}
                      {pendingToolCall.name === 'escalateToSupport' && "Would you like me to open a support ticket?"}
                      {pendingToolCall.name === 'applyCoupon' && `Apply coupon ${pendingToolCall.args.code}?`}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => confirmTool(true)} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-2 rounded-lg transition-colors">Yes, do it</button>
                      <button onClick={() => confirmTool(false)} className="flex-1 bg-white dark:bg-black border border-yellow-200 dark:border-yellow-900/50 text-gray-700 dark:text-gray-300 text-sm font-bold py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
                    </div>
                  </motion.div>
                )}

                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-white dark:bg-[#151515] shadow-sm border border-gray-100 dark:border-white/5 rounded-2xl rounded-bl-none p-4 flex gap-1.5">
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions / Suggestions */}
              {!isTyping && !pendingToolCall && messages.length < 3 && (
                <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-transparent">
                  {["Recommend a Biryani", "Is the store open?", "Clear my cart"].map(chip => (
                    <button key={chip} onClick={() => handleSendMessage(chip)} className="flex-none whitespace-nowrap bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold px-4 py-2 rounded-full hover:border-red-500 dark:hover:border-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 bg-white dark:bg-[#070504] border-t border-gray-100 dark:border-white/5">
                <div className="flex items-end gap-2 bg-gray-50 dark:bg-[#151515] p-2 rounded-2xl border border-gray-200 dark:border-white/5 focus-within:border-red-500/50 dark:focus-within:border-red-500/50 transition-colors">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!isTyping && !pendingToolCall) handleSendMessage();
                      }
                    }}
                    placeholder={pendingToolCall ? "Please confirm action above..." : "Message Concierge..."}
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 px-3 text-sm text-gray-900 dark:text-white disabled:opacity-50"
                    rows={1}
                    disabled={isTyping || !!pendingToolCall}
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || isTyping || !!pendingToolCall}
                    className="flex-none w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:bg-gray-300 dark:disabled:bg-white/10 transition-colors mb-1 mr-1"
                  >
                    <Send size={18} />
                  </button>
                </div>
                <div className="text-center mt-2">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Powered by Local AI</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;
