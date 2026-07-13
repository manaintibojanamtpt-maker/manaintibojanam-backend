import React, { useEffect, useRef } from 'react';
import { m, AnimatePresence, useAnimation, PanInfo } from 'framer-motion';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
  initialSnap?: number;
  panelClassName?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [90],
  initialSnap = 0,
  panelClassName = '',
}) => {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollRoot = document.getElementById('main-scroll-container');
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (scrollRoot) scrollRoot.style.overflow = 'hidden';
      void controls.start({ y: 0, transition: { type: 'spring', bounce: 0.1, duration: 0.4 } });
    } else {
      document.body.style.overflow = '';
      if (scrollRoot) scrollRoot.style.overflow = '';
      void controls.start({ y: '100%' });
    }
    return () => {
      document.body.style.overflow = '';
      if (scrollRoot) scrollRoot.style.overflow = '';
    };
  }, [isOpen, controls]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleDragEnd = async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.y;
    const velocity = info.velocity.y;

    if (offset > 150 || velocity > 500) {
      await controls.start({ y: '100%' });
      onClose();
    } else {
      controls.start({ y: 0, transition: { type: 'spring', bounce: 0.2, duration: 0.4 } });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
          />
          <m.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'bottom-sheet-title' : undefined}
            initial={{ y: '100%' }}
            animate={controls}
            exit={{ y: '100%' }}
            onAnimationComplete={() => {
              if (isOpen) controls.set({ y: 0 });
            }}
            transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.05}
            onDragEnd={handleDragEnd}
            className={`fixed bottom-0 left-0 right-0 z-[201] bg-white dark:bg-gray-900 rounded-t-[32px] shadow-2xl flex flex-col will-change-transform pb-safe ${panelClassName}`.trim()}
            style={{
              height: `${snapPoints[initialSnap]}vh`,
              maxHeight: 'calc(100vh - 40px)',
              touchAction: 'none',
            }}
          >
            <div className="w-full pt-4 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>
            {title && (
              <div className="px-6 pb-4 shrink-0 text-center">
                <h3 id="bottom-sheet-title" className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h3>
              </div>
            )}
            <div
              className="flex-1 overflow-y-auto px-6 pb-6 no-scrollbar overscroll-contain"
              style={{ touchAction: 'pan-y' }}
              role="document"
              aria-labelledby={title ? 'bottom-sheet-title' : undefined}
              onPointerDown={(e) => {
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
