import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Utensils, Flame, Leaf, X, ChevronRight, Check } from 'lucide-react';
import { MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/utils';
import toast from 'react-hot-toast';
import BottomSheet from './BottomSheet';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
}

export default function HelpMeChooseModal({ isOpen, onClose, menuItems }: Props) {
  const [step, setStep] = useState(1);
  const { addToCart } = useCart();
  
  const [preferences, setPreferences] = useState({
    hunger: '',
    spice: '',
    diet: ''
  });

  const [matches, setMatches] = useState<MenuItem[]>([]);

  const handleSelect = (key: string, value: string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    if (step < 3) {
      setStep(step + 1);
    } else {
      findMatches({ ...preferences, [key]: value });
      setStep(4);
    }
  };

  const findMatches = (prefs: any) => {
    // Scoring system based on preferences
    const scoredItems = menuItems.filter(item => item.isAvailable).map(item => {
      let score = 0;
      let reasons: string[] = [];

      const name = item.name.toLowerCase();
      const cat = item.category.toLowerCase();
      const desc = item.description.toLowerCase();

      // Diet
      const isVeg = item.type === 'veg' || (item as any).isVegetarian || !name.includes('chicken') && !name.includes('mutton') && !name.includes('egg') && !name.includes('fish');
      
      if (prefs.diet === 'veg' && isVeg) {
        score += 50;
        reasons.push("Pure Veg");
      } else if (prefs.diet === 'non-veg' && !isVeg) {
        score += 50;
        reasons.push("Premium Non-Veg");
      } else if (prefs.diet === 'veg' && !isVeg) {
        score -= 100; // Must be veg!
      }

      // Hunger
      if (prefs.hunger === 'snack') {
        if (cat.includes('snack') || name.includes('samosa') || name.includes('vada') || item.price < 100) {
          score += 30;
          reasons.push("Perfect light snack");
        }
      } else if (prefs.hunger === 'meal') {
        if (cat.includes('biryani') || cat.includes('meal') || name.includes('thali') || name.includes('rice')) {
          score += 30;
          reasons.push("Filling & satisfying");
        }
      } else if (prefs.hunger === 'feast') {
        if ((cat.includes('biryani') || cat.includes('meal')) && item.price > 250) {
          score += 30;
          reasons.push("Ultimate feast portion");
        }
      }

      // Spice
      if (prefs.spice === 'high') {
        if (name.includes('spicy') || name.includes('karam') || desc.includes('spicy') || name.includes('chilli')) {
          score += 20;
          reasons.push("Extra spicy kick");
        }
      } else if (prefs.spice === 'mild') {
        if (name.includes('sweet') || name.includes('curd') || name.includes('butter') || cat.includes('dessert')) {
          score += 20;
          reasons.push("Mild & soothing");
        }
      }

      return { item, score, reasons: reasons.slice(0, 2) };
    });

    // Sort by score
    scoredItems.sort((a, b) => b.score - a.score);
    
    // Pick top 2
    const topMatches = scoredItems.filter(si => si.score > 0).slice(0, 2).map(si => {
      // Inject the reason into a temporary property just for display
      (si.item as any)._aiReason = si.reasons.join(" • ");
      return si.item;
    });

    // Fallback if scoring was too strict
    if (topMatches.length === 0) {
      setMatches(menuItems.slice(0, 2)); // Just show top 2 popular
    } else {
      setMatches(topMatches);
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    addToCart(item);
    toast.success(`Added ${item.name} to cart!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <BottomSheet 
      isOpen={isOpen} 
      onClose={onClose}
      title="Mana AI Guide"
    >
      <div className="w-full max-w-md mx-auto flex flex-col">
        <div className="flex items-center gap-3 mb-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 rounded-2xl">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-orange-600 dark:text-orange-400">Let's find your perfect meal</p>
          </div>
        </div>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-6">How hungry are you?</h3>
                <div className="grid gap-3">
                  {[
                    { id: 'snack', icon: Utensils, label: 'Just a Snack', desc: 'Light bites & quick eats' },
                    { id: 'meal', icon: Utensils, label: 'Regular Meal', desc: 'Standard satisfying portion' },
                    { id: 'feast', icon: Utensils, label: 'Absolute Feast', desc: 'Heavy, premium portions' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handleSelect('hunger', opt.id)}
                      className="flex items-center p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-orange-500 dark:hover:border-orange-500 transition-all group text-left w-full"
                    >
                      <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                        <opt.icon size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 dark:text-white text-lg">{opt.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-orange-500" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-6">Spice Preference?</h3>
                <div className="grid gap-3">
                  {[
                    { id: 'mild', icon: Flame, label: 'Mild & Soothing', desc: 'Comforting, non-spicy flavors', color: 'text-green-500' },
                    { id: 'medium', icon: Flame, label: 'Medium Spice', desc: 'Perfectly balanced Andhra flavor', color: 'text-amber-500' },
                    { id: 'high', icon: Flame, label: 'Extra Spicy', desc: 'Fire! Pure authentic heat', color: 'text-red-500' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handleSelect('spice', opt.id)}
                      className="flex items-center p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-orange-500 dark:hover:border-orange-500 transition-all group text-left w-full"
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 ${opt.color} flex items-center justify-center mr-4 group-hover:scale-110 transition-transform`}>
                        <opt.icon size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 dark:text-white text-lg">{opt.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-orange-500" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-6">Dietary Choice?</h3>
                <div className="grid gap-3">
                  {[
                    { id: 'veg', icon: Leaf, label: 'Pure Veg', desc: '100% vegetarian dishes', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                    { id: 'non-veg', icon: Utensils, label: 'Non-Veg', desc: 'Chicken, Mutton, Seafood', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handleSelect('diet', opt.id)}
                      className="flex items-center p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-orange-500 dark:hover:border-orange-500 transition-all group text-left w-full"
                    >
                      <div className={`w-12 h-12 rounded-xl ${opt.bg} ${opt.color} flex items-center justify-center mr-4 group-hover:scale-110 transition-transform`}>
                        <opt.icon size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 dark:text-white text-lg">{opt.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-orange-500" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Perfect Match</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Based on your preferences</p>
                </div>

                <div className="space-y-4">
                  {matches.map((item, idx) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
                      <div className="h-40 w-full relative">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        <div className="absolute top-3 left-3 bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                          #{idx + 1} Match
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-900 dark:text-white text-lg">{item.name}</h4>
                          <span className="font-bold text-gray-900 dark:text-white">{formatPrice(item.price)}</span>
                        </div>
                        
                        {(item as any)._aiReason && (
                           <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-bold px-3 py-2 rounded-lg mb-4 flex items-center gap-2">
                            <Sparkles size={14} />
                            {(item as any)._aiReason}
                          </div>
                        )}
                        
                        <button 
                          onClick={() => handleAddToCart(item)}
                          className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-orange-600/20"
                        >
                          <Check size={18} /> Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </BottomSheet>
  );
}
