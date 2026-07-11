import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ToastHost } from '@/shared/ui/ToastHost';

export interface ToastMessage {
  id: string;
  message: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastMessage['variant']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function BdsToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((message: string, variant: ToastMessage['variant'] = 'default') => {
    setToast({ id: crypto.randomUUID(), message, variant });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <ToastHost message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      ) : null}
    </ToastContext.Provider>
  );
}

export function useBdsToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useBdsToast must be used within BdsToastProvider');
  return ctx;
}

let toastHandler: ToastContextValue['showToast'] | null = null;

export function registerToastHandler(handler: ToastContextValue['showToast']) {
  toastHandler = handler;
}

export function notifyToast(message: string, variant?: ToastMessage['variant']) {
  toastHandler?.(message, variant);
}
