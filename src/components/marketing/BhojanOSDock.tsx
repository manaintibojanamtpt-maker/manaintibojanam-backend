import React, { useEffect, useState } from 'react';
import {
  Store,
  LayoutDashboard,
  Calculator,
  CreditCard,
  BookOpen,
  ArrowUpRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedDock, DockItemData } from '../ui/animated-dock';

export const BHOJANOS_DOCK_ITEMS: DockItemData[] = [
  {
    link: '/',
    label: 'Home',
    Icon: <Store size={20} />,
  },
  {
    link: '/#kds',
    label: 'Kitchen OS',
    Icon: <LayoutDashboard size={20} />,
    badge: 'Live',
  },
  {
    link: '/#calculator',
    label: 'Savings Calculator',
    Icon: <Calculator size={20} />,
  },
  {
    link: '/pricing',
    label: 'Pricing & Plans',
    Icon: <CreditCard size={20} />,
  },
  {
    link: '/blog',
    label: 'Resources',
    Icon: <BookOpen size={20} />,
  },
  {
    link: '/owner/register',
    label: 'Launch Storefront',
    Icon: <ArrowUpRight size={20} className="text-[#D97706]" />,
    badge: 'Free',
  },
];

export const BhojanOSDock: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show dock after scrolling down past the initial hero banner (e.g. > 300px)
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 30, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 25, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="fixed bottom-5 left-1/2 z-[75] hidden sm:flex pointer-events-auto"
          aria-label="Floating quick navigation dock"
        >
          <AnimatedDock items={BHOJANOS_DOCK_ITEMS} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BhojanOSDock;
