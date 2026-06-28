import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Rocket, Zap, Shield, Bug, TrendingUp, Store, CreditCard, Smartphone } from 'lucide-react';
import { ReleaseNote } from '../../types';
import { getDb } from '../../lib/firebase-db';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  release: ReleaseNote | null;
  tenantId: string;
}

const categoryConfig = {
  security: { icon: Shield, color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500', label: 'Security Update' },
  performance: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-100', dot: 'bg-amber-500', label: 'Performance Improvement' },
  bugfix: { icon: Bug, color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-500', label: 'Bug Fix' },
  stability: { icon: Shield, color: 'text-blue-600', bg: 'bg-blue-100', dot: 'bg-blue-500', label: 'Stability Enhancement' },
  merchant_growth: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100', dot: 'bg-green-500', label: 'Merchant Growth' },
  storefront: { icon: Store, color: 'text-purple-600', bg: 'bg-purple-100', dot: 'bg-purple-500', label: 'Storefront Update' },
  payments: { icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-100', dot: 'bg-indigo-500', label: 'Payments Update' },
  mobile: { icon: Smartphone, color: 'text-pink-600', bg: 'bg-pink-100', dot: 'bg-pink-500', label: 'Mobile Update' },
};

export function ReleaseNotesModal({ isOpen, onClose, release, tenantId }: ReleaseNotesModalProps) {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (isOpen && release && tenantId) {
      const viewId = `${tenantId}_${release.id}`;
      setDoc(doc(getDb(), 'release_views', viewId), {
        tenantId,
        releaseId: release.id,
        version: release.version,
        viewedAt: serverTimestamp(),
      }, { merge: true }).catch((err) => {
        console.error('Failed to track release view', err);
      });
    }
  }, [isOpen, release, tenantId]);

  if (!isOpen || !release || typeof document === 'undefined') return null;

  const config = categoryConfig[release.category] || {
    icon: Rocket,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
    dot: 'bg-indigo-500',
    label: 'Update',
  };
  const Icon = config.icon;

  const publishDate = release.publishedAt?.toDate
    ? release.publishedAt.toDate()
    : release.publishedAt
      ? new Date(release.publishedAt)
      : new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(publishDate);

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="release-notes-title"
    >
      <button
        type="button"
        aria-label="Close release notes"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative z-[10001] flex w-full max-w-lg max-h-[min(92dvh,720px)] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl">
        {/* Sticky header — close always visible */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className={`inline-flex shrink-0 items-center justify-center rounded-lg p-2 ${config.bg}`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </span>
              <div className="min-w-0">
                <h2 id="release-notes-title" className="truncate text-lg font-bold text-gray-900 sm:text-xl">
                  BhojanOS {release.version}
                </h2>
                <p className="text-sm font-medium text-gray-500">{formattedDate}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">{release.title}</h3>
          <p className="mb-6 leading-relaxed text-gray-600">{release.summary}</p>

          {release.highlights && release.highlights.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-900">
                {config.label} Highlights
              </h4>
              <ul className="space-y-3 pb-2">
                {release.highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start gap-3 text-gray-600">
                    <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />
                    <span className="leading-relaxed">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 sm:w-auto sm:py-2.5"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
