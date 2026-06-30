import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useStorefrontInstall } from '../hooks/useStorefrontInstall';
import { slugToDisplayName } from '../lib/tenantPath';

type Variant = 'icon' | 'pill' | 'compact';

interface StorefrontInstallButtonProps {
  variant?: Variant;
  className?: string;
}

const StorefrontInstallButton: React.FC<StorefrontInstallButtonProps> = ({
  variant = 'pill',
  className = '',
}) => {
  const { tenantInfo, tenantSlug } = useTenant();
  const { showInstallAction, ios, canNativeInstall, triggerInstall } = useStorefrontInstall();
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  if (!showInstallAction || !tenantSlug) return null;

  const kitchenName = tenantInfo?.name || slugToDisplayName(tenantSlug);
  const shortLabel = variant === 'icon' ? 'Install app' : `Install ${kitchenName}`;

  const handleClick = async () => {
    if (ios || !canNativeInstall) {
      setIosGuideOpen(true);
      return;
    }
    await triggerInstall();
  };

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => void handleClick()}
          aria-label={shortLabel}
          title={shortLabel}
          className={`w-11 h-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors active:scale-95 ${className}`}
        >
          <Smartphone size={20} className="text-orange-500" />
        </button>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={() => void handleClick()}
          className={`inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-[11px] font-bold text-orange-400 hover:bg-orange-500/15 transition-colors ${className}`}
        >
          <Download size={13} aria-hidden />
          Install
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleClick()}
          className={`inline-flex items-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-500 hover:bg-orange-500/15 transition-colors ${className}`}
        >
          <Download size={16} aria-hidden />
          Install app
        </button>
      )}

      {iosGuideOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
          onClick={() => setIosGuideOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p id="install-guide-title" className="text-lg font-black text-white">
                  Add {kitchenName} to Home Screen
                </p>
                <p className="text-sm text-white/50 mt-1">
                  One-tap ordering — opens your kitchen, not the BhojanOS marketing site.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIosGuideOpen(false)}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <ol className="space-y-3 text-sm text-white/80 mb-5">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400 font-bold text-xs">
                  1
                </span>
                <span>
                  Tap <strong className="text-white">Share</strong>{' '}
                  <Share size={14} className="inline -mt-0.5 text-blue-400" aria-hidden /> at the bottom of Safari.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400 font-bold text-xs">
                  2
                </span>
                <span>
                  Choose <strong className="text-white">Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400 font-bold text-xs">
                  3
                </span>
                <span>
                  Open the icon — you&apos;ll land on{' '}
                  <code className="text-[11px] text-orange-300/90">/k/{tenantSlug}</code> for quick reorders.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setIosGuideOpen(false)}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 text-sm transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default StorefrontInstallButton;
