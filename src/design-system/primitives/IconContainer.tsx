import React from 'react';

export const IconContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`w-12 h-12 rounded-xl bg-orange-50 dark:bg-[#FF6B00]/10 border border-orange-100 dark:border-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00] ${className}`}>
      {children}
    </div>
  );
};
