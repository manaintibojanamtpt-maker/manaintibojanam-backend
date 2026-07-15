import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';

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

function isMobileTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return true;
  return navigator.maxTouchPoints > 1 && window.matchMedia('(pointer: coarse)').matches;
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
  const isMobileTouch = useMemo(() => isMobileTouchDevice(), []);
  const [panelReady, setPanelReady] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPanelReady(false);
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    setPanelReady(true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !panelReady) return undefined;
    lockPageScroll();
    return () => {
      unlockPageScroll();
    };
  }, [isOpen, panelReady]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const panelHeightStyle = {
    height: `${snapPoints[initialSnap]}vh`,
    maxHeight: 'calc(100dvh - 24px)',
  };

  const panelBaseClass =
    `fixed bottom-0 left-0 right-0 z-[1201] flex flex-col rounded-t-[32px] bg-white shadow-2xl dark:bg-gray-900 pb-safe ${panelClassName}`.trim();

  const panelContent = (
    <>
      <div className="flex w-full shrink-0 justify-center pb-2 pt-4">
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
        className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 no-scrollbar touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
    </>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <m.button
            key="bottom-sheet-backdrop"
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: panelReady ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isMobileTouch ? 0.12 : 0.2 }}
            onClick={panelReady ? onClose : undefined}
            className={`fixed inset-0 z-[1200] cursor-default touch-manipulation border-0 bg-black/60 backdrop-blur-sm${panelReady ? '' : ' pointer-events-none'}`.trim()}
          />
          <div
            key="bottom-sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'bottom-sheet-title' : undefined}
            className={panelBaseClass}
            style={{
              ...panelHeightStyle,
              transform: 'translate3d(0,0,0)',
              WebkitTransform: 'translate3d(0,0,0)',
            }}
          >
            {panelContent}
          </div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default BottomSheet;
