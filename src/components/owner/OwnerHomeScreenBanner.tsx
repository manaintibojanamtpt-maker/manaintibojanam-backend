import React, { useState } from 'react';
import { Smartphone, X, Download } from 'lucide-react';
import { useOwnerPortalInstall } from '../../hooks/useOwnerPortalInstall';

/** Prompt owners to add BhojanOS to their phone home screen for order alerts. */
export const OwnerHomeScreenBanner: React.FC = () => {
  const { showInstallBanner, ios, canNativeInstall, triggerInstall, dismiss } = useOwnerPortalInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (!showInstallBanner) return null;

  const handlePrimary = async () => {
    if (ios || !canNativeInstall) {
      setShowIosGuide(true);
      return;
    }
    await triggerInstall();
  };

  return (
    <>
      <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 relative z-10">
        <div className="flex items-start sm:items-center gap-3 pr-6">
          <Smartphone size={18} className="text-indigo-400 mt-0.5 sm:mt-0 shrink-0" />
          <div>
            <p className="text-sm font-bold text-indigo-300">Add BhojanOS to your home screen</p>
            <p className="text-xs text-indigo-300/70 mt-0.5">
              Install the owner app for one-tap access and reliable new-order sound alerts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => void handlePrimary()}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={14} />
            {ios || !canNativeInstall ? 'How to install' : 'Install app'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-2 text-indigo-300/50 hover:text-indigo-200 hover:bg-white/5"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {showIosGuide && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-labelledby="owner-install-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141416] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p id="owner-install-guide-title" className="text-lg font-black text-white">
                  Add BhojanOS to Home Screen
                </p>
                <p className="text-sm text-white/55 mt-1">iPhone / iPad — Safari</p>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="rounded-lg p-1.5 text-white/40 hover:text-white/70"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <ol className="text-sm text-white/75 space-y-3 list-decimal list-inside">
              <li>
                Tap <strong className="text-white">Share</strong> at the bottom of Safari.
              </li>
              <li>
                Choose <strong className="text-white">Add to Home Screen</strong>.
              </li>
              <li>
                Open BhojanOS from your home screen — then enable order sounds when prompted.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => {
                setShowIosGuide(false);
                dismiss();
              }}
              className="mt-6 w-full rounded-xl bg-indigo-500 py-3 text-sm font-bold text-white hover:bg-indigo-600"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default OwnerHomeScreenBanner;
