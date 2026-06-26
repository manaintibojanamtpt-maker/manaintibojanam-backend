import React from 'react';
import { m } from 'framer-motion';

interface TimelineCardProps {
  year: string;
  title: string;
  description?: string;
  isLast?: boolean;
  delay?: number;
}

export const TimelineCard: React.FC<TimelineCardProps> = ({ year, title, description, isLast = false, delay = 0 }) => {
  return (
    <div className="relative flex gap-6 pb-12">
      {/* Connector Line */}
      {!isLast && (
        <div className="absolute top-10 left-3 bottom-0 w-0.5 bg-gradient-to-b from-[#FF6B00]/50 to-transparent dark:from-white/10 dark:to-transparent" />
      )}
      
      {/* Bullet */}
      <div className="relative z-10 w-6 h-6 rounded-full bg-white dark:bg-[#0A0A0A] border-4 border-[#FF6B00] flex-shrink-0 mt-1 shadow-[0_0_15px_rgba(255,107,0,0.3)]" />
      
      {/* Content */}
      <m.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay }}
        className="flex-1"
      >
        <span className="text-[#FF6B00] font-bold tracking-widest uppercase text-sm mb-1 block">
          {year}
        </span>
        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h4>
        {description && (
          <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
            {description}
          </p>
        )}
      </m.div>
    </div>
  );
};
