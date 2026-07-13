import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
  initialSnap?: number;
  panelClassName?: string;
}

let scrollLockCount = 0;

function lockPageScroll() {
  scrollLockCount += 1;
  if (scrollLockCount !== 1) return;
  const scrollRoot = document.getElementById('main-scroll-container');
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  if (scrollRoot) scrollRoot.style.overflow = 'hidden';
}

function unlockPageScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount !== 0) return;
  const scrollRoot = document.getElementById('main-scroll-container');
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  if (scrollRoot) scrollRoot.style.overflow = '';
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
  const dragControls = useDragControls();

  useEffect(() => {
    if (!isOpen) return undefined;
    lockPageScroll();
    return () => {
      unlockPageScroll();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      onClose();
    }
  };

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <m.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[1200] cursor-default border-0 bg-black/60 backdrop-blur-sm"
          />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'bottom-sheet-title' : undefined}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', bounce: 0.12, duration: 0.38 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.08}
            onDragEnd={handleDragEnd}
            className={`fixed bottom-0 left-0 right-0 z-[1201] flex flex-col rounded-t-[32px] bg-white shadow-2xl will-change-transform dark:bg-gray-900 pb-safe ${panelClassName}`.trim()}
            style={{
              height: `${snapPoints[initialSnap]}vh`,
              maxHeight: 'calc(100dvh - 24px)',
            }}
          >
            <div
              className="flex w-full shrink-0 cursor-grab touch-none justify-center pb-2 pt-4 active:cursor-grabbing"
              onPointerDown={(event) => dragControls.start(event)}
            >
              <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>
            {title ? (
              <div className="shrink-0 px-6 pb-4 text-center">
                <h3 id="bottom-sheet-title" className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {title}
                </h3>
              </div>
            ) : null}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 no-scrollbar"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {children}
            </div>
          </m.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default BottomSheet;
