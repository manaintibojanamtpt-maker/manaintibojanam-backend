import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Utensils, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DeliverySlot, MealPreference } from '../types';
import { useTenant } from '../context/TenantContext';

interface SubscriptionWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SubscriptionWizardModal: React.FC<SubscriptionWizardModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { tenantId, tenantSlug } = useTenant();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [preference, setPreference] = useState<MealPreference>('veg');
  const [startDate, setStartDate] = useState<string>('');
  const [slot, setSlot] = useState<DeliverySlot>('lunch');

  // Next day default for start date
  React.useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(tomorrow.toISOString().split('T')[0]);
      setStep(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getPrice = () => {
    if (slot === 'breakfast_lunch' || slot === 'lunch_dinner') return 6000;
    if (slot === 'all_day') return 8000;
    return 3000;
  };

  const handleComplete = () => {
    const subscriptionItem = {
      id: 'sub_' + Date.now(),
      tenantId,
      name: `Monthly Subscription - ${preference.toUpperCase()}`,
      description: `Starts: ${startDate} | Slot: ${slot}`,
      price: getPrice(),
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400&auto=format&fit=crop',
      category: 'Subscription',
      type: (preference === 'nonveg' ? 'non-veg' : 'veg') as 'veg' | 'non-veg',
      isAvailable: true,
      createdAt: new Date() as any,
      isSubscription: true,
      subscriptionDetails: {
        preference,
        startDate,
        slot
      }
    };

    addToCart(subscriptionItem);
    toast.success('Subscription plan added to cart!');
    onClose();
    navigate(tenantSlug ? `/k/${tenantSlug}/checkout` : '/checkout');
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div 
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(e, info) => {
          if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose();
          }
        }}
        className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] mb-20 sm:mb-0"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">Meal Subscription</h3>
            <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mt-1">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <X size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar relative min-h-[350px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 flex items-center justify-center">
                    <Utensils size={20} />
                  </div>
                  <h4 className="text-lg font-black text-gray-900 dark:text-white">Select Preference</h4>
                </div>
                
                <div className="grid gap-3">
                  {(['veg', 'egg', 'nonveg'] as MealPreference[]).map(pref => (
                    <button
                      key={pref}
                      onClick={() => setPreference(pref)}
                      className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
                        preference === pref 
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' 
                          : 'border-gray-100 dark:border-gray-800 hover:border-orange-200'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${preference === pref ? 'border-orange-500' : 'border-gray-300'}`}>
                        {preference === pref && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white capitalize">{pref === 'nonveg' ? 'Non-Veg' : pref}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 flex items-center justify-center">
                    <Clock size={20} />
                  </div>
                  <h4 className="text-lg font-black text-gray-900 dark:text-white">Schedule</h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Start Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="date" 
                        value={startDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 mt-6">Delivery Slot</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['breakfast', 'lunch', 'dinner', 'breakfast_lunch', 'lunch_dinner', 'all_day'] as DeliverySlot[]).map(s => (
                        <button
                          key={s}
                          onClick={() => setSlot(s)}
                          className={`p-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                            slot === s 
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600' 
                              : 'border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {s.replace('_', ' + ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-xl font-black text-gray-900 dark:text-white">Review Plan</h4>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-5 border border-gray-100 dark:border-gray-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm font-bold">Preference</span>
                    <span className="text-gray-900 dark:text-white font-black capitalize">{preference === 'nonveg' ? 'Non-Veg' : preference}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm font-bold">Start Date</span>
                    <span className="text-gray-900 dark:text-white font-black">{new Date(startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm font-bold">Delivery Slot</span>
                    <span className="text-gray-900 dark:text-white font-black capitalize">{slot.replace('_', ' + ')}</span>
                  </div>
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-gray-500 text-sm font-black uppercase tracking-widest">Monthly Total</span>
                    <span className="text-orange-500 text-2xl font-black">₹{getPrice()}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3 shrink-0">
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1 as any)}
              className="px-6 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          
          <button 
            onClick={() => step < 3 ? setStep(step + 1 as any) : handleComplete()}
            className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {step === 3 ? 'Add to Cart' : 'Continue'} 
            {step < 3 && <ArrowRight size={18} />}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SubscriptionWizardModal;
