import React, { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';

const FlyToCartAnimation: React.FC = () => {
  const { flyToCartParams } = useCart();
  const [targetPos, setTargetPos] = useState({ x: window.innerWidth - 40, y: window.innerHeight - 40 });

  useEffect(() => {
    // Determine where the cart icon is
    // For mobile it's bottom right, for desktop it's top right
    const updateTarget = () => {
      const isDesktop = window.innerWidth >= 768;
      if (isDesktop) {
        setTargetPos({ x: window.innerWidth - 60, y: 30 }); // Top right approx
      } else {
        setTargetPos({ x: window.innerWidth / 2, y: window.innerHeight - 30 }); // Bottom center approx (BottomNav)
      }
    };
    
    updateTarget();
    window.addEventListener('resize', updateTarget);
    return () => window.removeEventListener('resize', updateTarget);
  }, []);

  return (
    <AnimatePresence>
      {flyToCartParams && (
        <m.img
          key={flyToCartParams.id}
          src={flyToCartParams.imageUrl}
          initial={{ 
            position: 'fixed',
            left: flyToCartParams.startX,
            top: flyToCartParams.startY,
            width: 80,
            height: 80,
            borderRadius: '50%',
            opacity: 1,
            scale: 1,
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}
          animate={{ 
            left: targetPos.x,
            top: targetPos.y,
            opacity: 0,
            scale: 0.2,
          }}
          transition={{ 
            duration: 0.6,
            ease: [0.25, 1, 0.5, 1] // cubic bezier for smooth arc-like feel
          }}
          exit={{ opacity: 0 }}
        />
      )}
    </AnimatePresence>
  );
};

export default FlyToCartAnimation;
