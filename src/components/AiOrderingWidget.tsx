import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Loader2, Sparkles, Plus, Minus, Check, X, Volume2, Search } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/utils';
import toast from 'react-hot-toast';

interface Props {
  menuItems: MenuItem[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  compact?: boolean;
}

interface ParsedIntent {
  item: MenuItem;
  quantity: number;
  score: number;
}

// Convert word numbers to digits
const wordsToNumbers: Record<string, number> = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'a': 1, 'an': 1, 'couple': 2, 'few': 3, 'dozen': 12
};

const levenshtein = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
};

export default function AiOrderingWidget({ menuItems, searchQuery = '', onSearchChange, compact = false }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState(searchQuery);
  const [isProcessing, setIsProcessing] = useState(false);
  const [intents, setIntents] = useState<ParsedIntent[]>([]);
  const [moderateIntents, setModerateIntents] = useState<ParsedIntent[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  const { cart, addToCart, updateQuantity, triggerFlyToCart } = useCart();
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef(transcript);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Note: Using a ref to access the latest cart state for the undo function
  // since toast callbacks might capture stale closures.
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    if (searchQuery !== transcript) {
      setTranscript(searchQuery);
    }
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search results
  const liveResults = React.useMemo(() => {
    if (!transcript.trim() || transcript.trim().length < 2) return [];
    const q = transcript.toLowerCase().trim();
    return menuItems
      .filter(item => {
        const name = (item.name || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        return name.includes(q) || cat.includes(q) || desc.includes(q);
      })
      .slice(0, 6);
  }, [transcript, menuItems]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setTranscript(text);
    if (onSearchChange) onSearchChange(text);
    if (text.trim().length >= 2) setIsFocused(true);
  };

  const scrollToItem = (itemId: string) => {
    setIsFocused(false);
    // Clear search and let user see the full menu scrolled to the item
    setTranscript('');
    if (onSearchChange) onSearchChange('');
    // Small delay to let DOM re-render with cleared filters
    setTimeout(() => {
      const el = document.getElementById(`menu-item-${itemId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Flash highlight
        el.classList.add('ring-2', 'ring-orange-500/60');
        setTimeout(() => el.classList.remove('ring-2', 'ring-orange-500/60'), 2000);
      }
    }, 150);
  };

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        if (onSearchChange) onSearchChange(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast.error('Voice recognition failed. Please try typing instead.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalTranscript = transcriptRef.current;
        if (finalTranscript && finalTranscript.trim()) {
          processText(finalTranscript);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []); // Only initialize once

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice ordering is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      if (onSearchChange) onSearchChange('');
      setError('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const parseNaturalLanguage = (text: string): ParsedIntent[] => {
    const results: ParsedIntent[] = [];
    const normalizedText = text.toLowerCase().replace(/[.,!]/g, '');
    
    // Split by common separators (and, with, plus, comma)
    const phrases = normalizedText.split(/\s+(?:and|with|plus|&|,)\s+/);

    phrases.forEach(phrase => {
      phrase = phrase.trim();
      if (!phrase) return;

      // Extract quantity
      let quantity = 1;
      let itemQuery = phrase;
      
      const quantityMatch = phrase.match(/^(?:add\s+|get\s+|want\s+|order\s+)?(?:(\d+)|([a-z]+))\s+(.+)/i);

      if (quantityMatch) {
        if (quantityMatch[1]) {
          quantity = parseInt(quantityMatch[1], 10);
          itemQuery = quantityMatch[3];
        } else if (quantityMatch[2] && wordsToNumbers[quantityMatch[2]]) {
          quantity = wordsToNumbers[quantityMatch[2]];
          itemQuery = quantityMatch[3];
        } else {
          const prefixMatch = phrase.match(/^(?:add\s+|get\s+|want\s+|order\s+)(.+)/i);
          if (prefixMatch) {
            itemQuery = prefixMatch[1];
          }
        }
      } else {
        const prefixMatch = phrase.match(/^(?:add\s+|get\s+|want\s+|order\s+)(.+)/i);
        if (prefixMatch) {
          itemQuery = prefixMatch[1];
        }
      }

      // Clean up common fluff words
      itemQuery = itemQuery.trim().replace(/^(a|an|the|of|plates of|plate|portions of|portion)\s+/i, '').trim();

      // Fuzzy matching: find best match
      let bestMatch: MenuItem | null = null;
      let highestScore = 0;

      menuItems.forEach(item => {
        if (item.isAvailable === false) return;
        const itemName = item.name.toLowerCase();
        
        if (itemName === itemQuery) {
          bestMatch = item;
          highestScore = 100;
          return;
        }

        let score = 0;
        if (itemName.includes(itemQuery) || itemQuery.includes(itemName)) {
          score = 80;
        } else {
          const qWords = itemQuery.split(' ');
          const nWords = itemName.split(' ');
          let totalScore = 0;
          qWords.forEach(qw => {
            let bestWordScore = 0;
            nWords.forEach(nw => {
              const dist = levenshtein(qw, nw);
              const maxLen = Math.max(qw.length, nw.length);
              const similarity = ((maxLen - dist) / maxLen) * 100;
              if (similarity > bestWordScore) bestWordScore = similarity;
            });
            totalScore += bestWordScore;
          });
          score = totalScore / qWords.length;
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatch = item;
        }
      });

      if (bestMatch && highestScore >= 60) {
        // Boost high confidence matches
        if (highestScore > 80) highestScore = 100;
        results.push({ item: bestMatch, quantity: Math.min(Math.max(1, quantity), 20), score: highestScore });
      }
    });

    // Merge duplicates
    const merged: Record<string, ParsedIntent> = {};
    results.forEach(res => {
      if (merged[res.item.id]) {
        merged[res.item.id].quantity += res.quantity;
        merged[res.item.id].score = Math.max(merged[res.item.id].score, res.score);
      } else {
        merged[res.item.id] = res;
      }
    });

    return Object.values(merged);
  };

  const processText = async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    setError('');
    
    // Simulate AI processing delay for better UX feel
    await new Promise(resolve => setTimeout(resolve, 600));

    const parsedIntents = parseNaturalLanguage(text);

    if (parsedIntents.length > 0) {
      const highConfidence = parsedIntents.filter(i => i.score >= 80);
      const moderateConfidence = parsedIntents.filter(i => i.score < 80 && i.score >= 60);

      if (highConfidence.length > 0) {
        // Capture current cart state to know previous quantities for Undo
        const previousQuantities = new Map<string, number>();
        cartRef.current.forEach(item => {
          previousQuantities.set(item.id, item.quantity);
        });

        // Add to cart
        let totalAdded = 0;
        highConfidence.forEach(intent => {
          for (let i = 0; i < intent.quantity; i++) {
            addToCart(intent.item);
          }
          totalAdded += intent.quantity;
        });

        // Haptic feedback
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(50);
        }
        
        // Show non-blocking Undo toast
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-2xl pointer-events-auto flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700`}>
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 w-10 h-10 rounded-xl flex items-center justify-center">
                <Check size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Added to Cart</p>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{totalAdded} items added via Mana AI</p>
              </div>
            </div>
            <button 
              onClick={() => {
                // Undo action
                highConfidence.forEach(intent => {
                  const prevQty = previousQuantities.get(intent.item.id) || 0;
                  updateQuantity(intent.item.id, prevQty);
                });
                toast.remove(t.id);
                toast.success('Action undone', { icon: '⏪' });
                
                if (window.navigator && window.navigator.vibrate) {
                  window.navigator.vibrate(50);
                }
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-xs font-bold rounded-xl transition-colors active:scale-95"
            >
              Undo
            </button>
          </div>
        ), { duration: 4000 });
      }

      if (moderateConfidence.length > 0) {
        setModerateIntents(moderateConfidence);
      } else {
        setTranscript('');
        if (onSearchChange) onSearchChange('');
      }

    } else {
      setError("I couldn't quite catch which items you meant. Try saying 'Add 2 Masala Dosa'.");
    }
    
    setIsProcessing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processText(transcript);
  };

  const suggestionPrompts = [
    "Add 2 Biryani",
    "I want a Masala Dosa and filter coffee",
    "Get me 3 meals"
  ];

  return (
    <div className={`w-full relative group ${compact ? 'mb-0' : 'mb-6'}`}>
      <div className="relative z-10">

        <form onSubmit={handleSubmit} className="relative">
          <div className={`relative flex items-center bg-white/[0.06] border transition-all duration-300 rounded-2xl ${isListening ? 'border-orange-500/50 bg-orange-500/5 ring-1 ring-orange-500/20' : 'border-white/[0.08] focus-within:border-orange-500/30 focus-within:bg-white/[0.08]'}`}>
            <div className="pl-3.5 pr-0.5 text-white/35 flex items-center">
              <Search size={18} strokeWidth={2.2} />
            </div>
            <input
              ref={inputRef}
              type="search"
              value={transcript}
              onChange={handleTextChange}
              onFocus={() => { if (transcript.trim().length >= 2) setIsFocused(true); }}
              placeholder={isListening ? "Listening..." : "Search dishes..."}
              className="flex-1 bg-transparent py-3 px-2 text-[15px] font-medium text-white placeholder:text-white/30 outline-none"
              disabled={isProcessing || showConfirmation}
            />
            
            <div className="flex items-center gap-1 pr-2">
              {/* Clear button */}
              <AnimatePresence>
                {transcript.trim() && (
                  <m.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    type="button"
                    onClick={() => {
                      setTranscript('');
                      if (onSearchChange) onSearchChange('');
                      setIsFocused(false);
                      inputRef.current?.focus();
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
                  >
                    <X size={15} strokeWidth={2.5} />
                  </m.button>
                )}
              </AnimatePresence>

              {!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition ? (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${isListening ? 'text-red-400 animate-pulse' : 'text-white/30 hover:text-orange-400 hover:bg-white/5'}`}
                  disabled={isProcessing || showConfirmation}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} strokeWidth={2.2} />}
                </button>
              ) : null}
              
              <AnimatePresence>
                {transcript.trim() && (
                  <m.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    type="submit"
                    disabled={isProcessing || showConfirmation}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-orange-500 text-white transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className="ml-0.5" strokeWidth={2.5} />}
                  </m.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </form>

        {/* Live Search Results Dropdown */}
        <AnimatePresence>
          {isFocused && liveResults.length > 0 && (
            <m.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full mt-1.5 bg-[#1C1612] border border-white/[0.08] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] overflow-hidden z-50 max-h-[320px] overflow-y-auto no-scrollbar"
            >
              <div className="px-3 py-2 border-b border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">{liveResults.length} result{liveResults.length !== 1 ? 's' : ''} found</p>
              </div>
              {liveResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToItem(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] active:bg-white/[0.08] transition-colors text-left"
                >
                  {item.image && (
                    <img src={item.image} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" loading="lazy" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{item.name}</p>
                    <p className="text-[11px] font-medium text-white/40 truncate">{item.category}</p>
                  </div>
                  <span className="text-sm font-bold text-orange-400 flex-shrink-0">₹{item.price}</span>
                </button>
              ))}
            </m.div>
          )}
        </AnimatePresence>

        {error && (
          <m.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1"
          >
            <X size={14} /> {error}
          </m.p>
        )}

        {/* Moderate Confidence Prompts */}
        <AnimatePresence>
          {moderateIntents.length > 0 && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-2 mt-2"
            >
              {moderateIntents.map((intent, idx) => (
                <div key={idx} className="bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-500/30 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <img src={intent.item.image} alt={intent.item.name} className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Did you mean {intent.quantity}x {intent.item.name}?</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModerateIntents(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 text-gray-500 hover:text-red-500 transition-colors shadow-sm active:scale-95"
                    >
                      <X size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        for (let i = 0; i < intent.quantity; i++) addToCart(intent.item);
                        setModerateIntents(prev => prev.filter((_, i) => i !== idx));
                        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
                        if (e && triggerFlyToCart) {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          triggerFlyToCart(intent.item.image, rect.left, rect.top);
                        }
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm active:scale-95"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
