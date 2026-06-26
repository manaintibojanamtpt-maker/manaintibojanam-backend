import React from 'react';
import { m } from 'framer-motion';

interface TechBadgeProps {
  name: string;
  icon?: React.ReactNode;
  delay?: number;
}

export const TechBadge: React.FC<TechBadgeProps> = ({ name, icon, delay = 0 }) => {
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
    >
      {icon && <div className="text-gray-500 dark:text-gray-400">{icon}</div>}
      <span className="text-gray-900 dark:text-white font-semibold text-sm tracking-wide">
        {name}
      </span>
    </m.div>
  );
};
