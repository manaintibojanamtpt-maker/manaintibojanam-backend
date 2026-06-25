import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Linkedin, Mail, User } from 'lucide-react';
import { executiveTeam, Executive } from '../config/team';

const ExecutiveCard: React.FC<{ executive: Executive; index: number }> = ({ executive, index }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <m.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      className="group relative flex flex-col bg-white dark:bg-[#0A0A0A] rounded-[2rem] p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-500 border border-black/5 dark:border-white/[0.08]"
    >
      {/* Animated Border Glow for Dark Mode */}
      <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#FF6B00]/20 via-transparent to-[#A855F7]/20 dark:from-[#FF6B00]/40 dark:via-transparent dark:to-[#A855F7]/40 pointer-events-none -z-10" />
      
      {/* Soft gradient background */}
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white via-white to-orange-50/30 dark:from-white/[0.02] dark:via-transparent dark:to-transparent pointer-events-none -z-10" />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
        {/* Profile Image */}
        <div className="relative w-32 h-32 rounded-full flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FF6B00] to-[#A855F7] animate-pulse opacity-50 blur-md group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute inset-[3px] rounded-full bg-white dark:bg-[#0A0A0A] overflow-hidden z-10 flex items-center justify-center">
            {!imageError ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gray-100 dark:bg-white/5 animate-pulse" />
                )}
                <img
                  src={executive.image}
                  alt={executive.alt}
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                />
              </>
            ) : (
              <User className="w-12 h-12 text-gray-300 dark:text-white/20" />
            )}
          </div>
        </div>

        {/* Name, Title, and Socials */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">
            {executive.name}
          </h3>
          <p className="text-[#FF6B00] font-medium text-sm mb-4 leading-relaxed">
            {executive.title}
          </p>
          <div className="flex gap-3">
            {executive.linkedIn && (
              <a
                href={executive.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-white/60 hover:text-[#FF6B00] dark:hover:text-[#FF6B00] transition-colors border border-black/5 dark:border-white/5"
                aria-label={`LinkedIn profile for ${executive.name}`}
              >
                <Linkedin size={18} />
              </a>
            )}
            {executive.email && (
              <a
                href={`mailto:${executive.email}`}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-white/60 hover:text-[#FF6B00] dark:hover:text-[#FF6B00] transition-colors border border-black/5 dark:border-white/5"
                aria-label={`Email ${executive.name}`}
              >
                <Mail size={18} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      <p className="text-gray-600 dark:text-white/70 text-sm sm:text-base leading-relaxed mb-6">
        {executive.bio}
      </p>

      {/* Responsibilities */}
      <div className="mt-auto">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-white/40 mb-3">
          Core Responsibilities
        </h4>
        <div className="flex flex-wrap gap-2">
          {executive.responsibilities.map((resp, i) => (
            <span
              key={i}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.04] text-gray-700 dark:text-white/80 border border-transparent dark:border-white/5 group-hover:border-black/5 dark:group-hover:border-white/10 transition-colors"
            >
              {resp}
            </span>
          ))}
        </div>
      </div>
    </m.article>
  );
};

export const ExecutiveLeadership: React.FC = () => {
  return (
    <section className="relative w-full py-24 sm:py-32 overflow-hidden bg-white dark:bg-[#030303]" aria-labelledby="leadership-heading">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#FF6B00]/5 to-transparent blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <header className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 dark:bg-[#FF6B00]/10 border border-orange-100 dark:border-[#FF6B00]/20 text-[#FF6B00] font-semibold text-sm mb-6"
          >
            Executive Leadership
          </m.div>
          <m.h2
            id="leadership-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-6"
          >
            Building the Future of AI-Powered Restaurant Commerce
          </m.h2>
          <m.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-600 dark:text-white/60 leading-relaxed"
          >
            Our leadership team brings together decades of expertise in artificial intelligence, enterprise SaaS, and operational excellence to redefine how restaurants scale.
          </m.p>
        </header>

        {/* Grid Layout: 1 col mobile, 2 col tablet, 2 col desktop (2x2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
          {executiveTeam.map((executive, index) => (
            <ExecutiveCard key={executive.id} executive={executive} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExecutiveLeadership;
