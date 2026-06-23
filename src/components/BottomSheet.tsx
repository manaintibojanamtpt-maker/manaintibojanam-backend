import React, { useEffect, useRef } from 'react';
import { m, AnimatePresence, useAnimation, PanInfo } from 'framer-motion';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
  initialSnap?: number;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  title,
  snapPoints = [90], // percentage of screen height
  initialSnap = 0
}) => {
  const controls = useAnimation();
  const y = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.y;
    const velocity = info.velocity.y;

    if (offset > 150 || velocity > 500) {
      await controls.start({ y: "100%" });
      onClose();
    } else {
      controls.start({ y: 0, transition: { type: "spring", bounce: 0.2, duration: 0.4 } });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />
          
          {/* Sheet */}
          <m.div
            ref={containerRef}
            initial={{ y: "100%" }}
            animate={controls}
            exit={{ y: "100%" }}
            onAnimationComplete={() => {
              if (isOpen) controls.set({ y: 0 });
            }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.05}
            onDragEnd={handleDragEnd}
            className={`fixed bottom-0 left-0 right-0 z-[101] bg-white dark:bg-gray-900 rounded-t-[32px] shadow-2xl flex flex-col will-change-transform pb-safe`}
            style={{ 
              height: `${snapPoints[initialSnap]}vh`,
              maxHeight: 'calc(100vh - 40px)',
              touchAction: 'none' // Prevent pull-to-refresh when dragging sheet
            }}
          >
            {/* Drag Handle */}
            <div className="w-full pt-4 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Header */}
            {title && (
              <div className="px-6 pb-4 shrink-0 text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h3>
              </div>
            )}

            {/* Scrollable Content Area */}
            <div 
              className="flex-1 overflow-y-auto px-6 pb-6 no-scrollbar overscroll-contain"
              style={{ touchAction: 'pan-y' }}
              onPointerDown={(e) => {
                // Prevent drag on the scrollable area unless at the very top
                const target = e.currentTarget;
                if (target.scrollTop > 0) {
                  e.stopPropagation();
                }
              }}
            >
              {children}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
