import React from 'react';
import { m } from 'framer-motion';

interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ label, title, description, align = 'center', className = '' }) => {
  return (
    <header className={`mb-16 sm:mb-24 ${align === 'center' ? 'text-center mx-auto' : 'text-left'} max-w-3xl ${className}`}>
      {label && (
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-[#FF6B00] font-semibold text-xs tracking-wide uppercase mb-6`}
        >
          {label}
        </m.div>
      )}
      
        <m.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.1] mb-6"
        >
          {title}
        </m.h2>
  
        {description && (
          <m.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-400 font-medium leading-relaxed"
          >
          {description}
        </m.p>
      )}
    </header>
  );
};
