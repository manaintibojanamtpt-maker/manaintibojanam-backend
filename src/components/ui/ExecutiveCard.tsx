import React from 'react';
import { m } from 'framer-motion';
import { Linkedin, Mail } from 'lucide-react';

import { ProfileImage } from './ProfileImage';

export interface Executive {
  name: string;
  designation: string;
  imageUrl?: string;
  alt: string;
  bio: string;
  linkedIn?: string;
  email?: string;
}

interface ExecutiveCardProps {
  executive: Executive;
  delay?: number;
}

export const ExecutiveCard: React.FC<ExecutiveCardProps> = ({ executive, delay = 0 }) => {

  return (
    <m.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="group relative flex flex-col bg-white dark:bg-[#0A0A0A] rounded-[2rem] p-6 sm:p-8 hover:shadow-xl transition-all duration-500 border border-black/5 dark:border-white/[0.08]"
    >
      <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#FF6B00]/10 via-transparent to-[#A855F7]/10 dark:from-[#FF6B00]/20 dark:via-transparent dark:to-[#A855F7]/20 pointer-events-none -z-10" />
      
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
        <ProfileImage 
          name={executive.name} 
          imageUrl={executive.imageUrl} 
          alt={executive.alt} 
        />

        <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 mt-2">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">
            {executive.name}
          </h3>
          <p className="text-[#FF6B00] font-semibold text-sm mb-4">
            {executive.designation}
          </p>
          <div className="flex gap-3">
            {executive.linkedIn && (
              <a href={executive.linkedIn} className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-white/60 hover:text-[#FF6B00] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <Linkedin size={18} />
              </a>
            )}
            {executive.email && (
              <a href={`mailto:${executive.email}`} className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-white/60 hover:text-[#FF6B00] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <Mail size={18} />
              </a>
            )}
          </div>
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
        {executive.bio}
      </p>
    </m.article>
  );
};
