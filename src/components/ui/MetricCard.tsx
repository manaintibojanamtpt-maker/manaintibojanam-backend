import React from 'react';
import { m } from 'framer-motion';

interface MetricCardProps {
  value: string;
  label: string;
  delay?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({ value, label, delay = 0 }) => {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col items-center justify-center p-8 bg-white dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-3xl"
    >
      <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] to-[#A855F7] mb-2 tracking-tighter">
        {value}
      </span>
      <span className="text-gray-600 dark:text-gray-400 font-semibold text-sm uppercase tracking-widest text-center">
        {label}
      </span>
    </m.div>
  );
};
