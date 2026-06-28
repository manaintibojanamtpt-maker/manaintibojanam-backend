import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomerPreviewBanner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-[60] bg-amber-400 text-black px-4 py-2 border-b border-amber-500/30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
        <p className="font-semibold truncate">
          Previewing your store as a customer would see it
        </p>
        <button
          type="button"
          onClick={() => navigate('/owner/dashboard')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-black/10 hover:bg-black/15 px-3 py-1.5 text-xs font-bold transition-colors"
        >
          <ArrowLeft size={14} />
          Owner portal
        </button>
      </div>
    </div>
  );
};

export default CustomerPreviewBanner;
