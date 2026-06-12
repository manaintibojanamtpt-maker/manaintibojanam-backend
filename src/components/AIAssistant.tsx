import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, Bot, User, Utensils, ShoppingCart, Clock } from 'lucide-react';
import { isStoreOpenNow } from '../lib/storeUtils';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { getDb } from '../lib/firebase-db';
import { doc, onSnapshot } from 'firebase/firestore';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Hi! I'm your Mana Inti Bojanam AI assistant. I can help you find the perfect dish, recommend something based on your mood, or answer questions about our menu. What are you craving today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { cart } = useCart();
  
  // AI is now enabled by default, configured via backend
  const isAIEnabled = true;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(getDb(), "adminSettings", "global"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSettings(data);
        
        // Update initial message if store is closed
        const open = isStoreOpenNow(data);
        if (!open) {
          setMessages(prev => {
            if (prev.length === 1 && prev[0].role === 'assistant') {
              return [{ 
                role: 'assistant', 
                content: "Hi! I'm your Mana Inti Bojanam AI assistant. We are currently closed and not taking orders, but I can still help you browse our menu or answer questions for your next meal! What would you like to know?" 
              }];
            }
            return prev;
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const isStoreOpen = isStoreOpenNow(settings);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const systemInstruction = `
        You are a helpful and friendly AI food assistant for "Mana Inti Bojanam", a premium Andhra home-style cloud kitchen.
        Your goal is to help users find dishes they'll love and encourage them to order.
        
        Current Store Status: ${isStoreOpen ? 'OPEN' : 'CLOSED'}
        ${!isStoreOpen ? 'IMPORTANT: The kitchen is currently CLOSED. Inform the user that we are not taking orders right now but they can still browse the menu for later.' : 'The kitchen is OPEN and taking orders.'}

        Context:
        - The app name is "Mana Inti Bojanam".
        - We specialize in authentic Andhra home-style meals (Biryani, Thalis, Curries).
        - Current cart items: ${cart.map(i => `${i.name} (x${i.quantity})`).join(', ') || 'Empty'}.
        
        Guidelines:
        - Be warm, hospitable, and professional.
        - Recommend dishes based on user mood or preferences.
        - If the user is unsure, suggest popular items like Chicken Biryani or Veg Thali.
        - Mention that everything is prepared with fresh, home-style ingredients.
        - Keep responses concise and engaging.
        - Use emojis related to food (🍛, 🍗, 🌶️, 🥘).
      `;

      const res = await fetch('https://manaintibojanam-backend.onrender.com/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, userMessage, systemInstruction })
      });
      
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch response");
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (err: any) {
      console.error("AI Error:", err);
      if (err.message.includes('not configured')) {
        console.warn("AI Assistant: Configuration issue detected on backend.");
        toast.error("AI assistant is not configured.");
      } else {
        toast.error("AI assistant is currently unavailable");
      }
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button - Only show if AI is configured */}
      {isAIEnabled && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-6 z-50 w-16 h-16 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-red-700 transition-colors"
        >
          <Sparkles size={28} />
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
            <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-24 right-6 z-[60] w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-gray-100"
          >
            {/* Header */}
            <div className="bg-red-600 p-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <Bot size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-black tracking-tight">AI Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 ${isStoreOpen ? 'bg-green-400' : 'bg-red-400'} rounded-full animate-pulse`} />
                    <span className="text-red-100 text-[10px] font-bold uppercase tracking-widest">{isStoreOpen ? 'Online' : 'Resting'}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }} 
                className="text-white hover:text-white transition-colors p-2 bg-white/10 hover:bg-white/20 rounded-xl z-[70]"
                aria-label="Close Assistant"
              >
                <X size={24} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                      {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-red-600 text-white rounded-tr-none' 
                        : 'bg-gray-50 text-gray-800 rounded-tl-none'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none flex gap-1">
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 border-t border-gray-100 bg-white">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  className="w-full pl-6 pr-14 py-4 bg-gray-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center hover:bg-red-700 transition-colors disabled:opacity-50 disabled:scale-95"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest mt-4">
                Powered by Gemini AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;
