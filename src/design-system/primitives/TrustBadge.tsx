import React from 'react';
import { m } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface TrustBadgeProps {
  title: string;
  delay?: number;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ title, delay = 0 }) => {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5"
    >
      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
      <span className="text-gray-900 dark:text-gray-300 font-semibold text-sm">
        {title}
      </span>
    </m.div>
  );
};
