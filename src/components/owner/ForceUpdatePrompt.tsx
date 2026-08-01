import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { isUpdateRequired } from '../../lib/androidBridge';
import { isNativePlatform, openExternalUrl } from '../../lib/nativePlatform';

export const ForceUpdatePrompt: React.FC = () => {
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    if (!isNativePlatform()) return;
    
    isUpdateRequired().then(required => {
      if (required) {
        setNeedsUpdate(true);
      }
    });
  }, []);

  if (!needsUpdate) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 mx-auto">
          <Download className="w-8 h-8 text-amber-400" />
        </div>
        
        <h2 className="text-2xl font-bold tracking-tight text-white mb-3">
          Update Required
        </h2>
        
        <p className="text-white/70 text-sm leading-relaxed mb-8">
          A new version of the app is available. Please update to continue using BhojanOS and access the latest features and security improvements.
        </p>

        <button 
          onClick={() => {
            // Replace with your actual Play Store link or direct APK link
            openExternalUrl('market://details?id=com.bhojanos.app');
          }}
          className="w-full bg-white text-black font-semibold py-3.5 rounded-xl text-[15px]"
        >
          Update Now
        </button>
      </div>
    </div>
  );
};
