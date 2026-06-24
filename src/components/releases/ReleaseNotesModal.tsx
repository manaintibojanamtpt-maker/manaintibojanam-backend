import React, { useEffect } from 'react';
import { X, Rocket, Zap, Shield, Bug, TrendingUp, Store, CreditCard, Smartphone } from 'lucide-react';
import { ReleaseNote } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { getDb } from '../../lib/firebase-db';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  release: ReleaseNote | null;
  tenantId: string;
}

const categoryConfig = {
  security: { icon: Shield, color: 'text-red-600', bg: 'bg-red-100', label: 'Security Update' },
  performance: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Performance Improvement' },
  bugfix: { icon: Bug, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Bug Fix' },
  stability: { icon: Shield, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Stability Enhancement' },
  merchant_growth: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100', label: 'Merchant Growth' },
  storefront: { icon: Store, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Storefront Update' },
  payments: { icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Payments Update' },
  mobile: { icon: Smartphone, color: 'text-pink-600', bg: 'bg-pink-100', label: 'Mobile Update' }
};

export function ReleaseNotesModal({ isOpen, onClose, release, tenantId }: ReleaseNotesModalProps) {
  useEffect(() => {
    if (isOpen && release && tenantId) {
      // Record view
      const viewId = `${tenantId}_${release.id}`;
      setDoc(doc(getDb(), 'release_views', viewId), {
        tenantId,
        releaseId: release.id,
        version: release.version,
        viewedAt: serverTimestamp()
      }, { merge: true }).catch(err => {
        console.error("Failed to track release view", err);
      });
    }
  }, [isOpen, release, tenantId]);

  if (!isOpen || !release) return null;

  const config = categoryConfig[release.category] || { icon: Rocket, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Update' };
  const Icon = config.icon;

  const publishDate = release.publishedAt?.toDate ? release.publishedAt.toDate() : new Date(release.publishedAt);
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(publishDate);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`inline-flex items-center justify-center p-2 rounded-lg ${config.bg}`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    BhojanOS {release.version}
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">{formattedDate}</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {release.title}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {release.summary}
            </p>

            {release.highlights && release.highlights.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                  {config.label} Highlights
                </h4>
                <ul className="space-y-3">
                  {release.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-600">
                      <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${config.bg.replace('bg-', 'bg-').replace('100', '500')}`} />
                      <span className="leading-relaxed">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
