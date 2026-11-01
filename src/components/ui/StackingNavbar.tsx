import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Flame, Layers, Percent, Tag, Users, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StackingNavbarItemData {
  href: string;
  label: string;
  icon?: React.ReactNode;
  isAccent?: boolean;
}

export interface StackingNavbarProps {
  items?: StackingNavbarItemData[];
  className?: string;
}

const DEFAULT_ITEMS: StackingNavbarItemData[] = [
  { href: '#kds', label: 'Kitchen KDS', icon: <Flame size={14} className="text-[#D97706]" /> },
  { href: '#features', label: 'Platform', icon: <Layers size={14} className="text-zinc-400" /> },
  { href: '#comparison', label: 'Savings Calc', icon: <Percent size={14} className="text-emerald-400" /> },
  { href: '#pricing', label: 'Pricing', icon: <Tag size={14} className="text-amber-400" /> },
  { href: '#leadership', label: 'Leadership', icon: <Users size={14} className="text-blue-400" /> },
  { href: '/owner/register', label: 'Start Free', isAccent: true, icon: <ArrowUpRight size={14} /> },
];

export const StackingNavbar: React.FC<StackingNavbarProps> = ({
  items = DEFAULT_ITEMS,
  className,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <nav
      aria-label="Quick platform navigator"
      className={cn(
        "relative flex items-center py-2 px-3 rounded-full bg-[#111114]/90 border border-[#27272A] shadow-2xl backdrop-blur-xl transition-all cursor-pointer select-none",
        className
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onClick={() => setExpanded((prev) => !prev)}
    >
      <div className="flex items-center">
        {items.map((item, index) => (
          <StackingNavbarItem
            key={item.href + index}
            href={item.href}
            expanded={expanded}
            index={index}
            isAccent={item.isAccent}
            icon={item.icon}
          >
            {item.label}
          </StackingNavbarItem>
        ))}
      </div>

      {/* Subtle indicator when collapsed */}
      {!expanded && (
        <span className="ml-3 hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 pl-1 pr-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" />
          Hover to expand
        </span>
      )}
    </nav>
  );
};

const StackingNavbarItem: React.FC<{
  href: string;
  children: React.ReactNode;
  expanded: boolean;
  index: number;
  isAccent?: boolean;
  icon?: React.ReactNode;
}> = ({ href, children, expanded, index, isAccent = false, icon }) => {
  const shouldReduceMotion = useReducedMotion();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Stack offset: collapsed items overlap to create the stacked deck effect
  const offset = index === 0 ? 0 : -88 * index;

  return (
    <motion.div
      initial={{ x: offset }}
      animate={{ x: expanded ? 0 : offset }}
      transition={{
        duration: shouldReduceMotion ? 0.01 : 0.45,
        type: 'spring',
        stiffness: 280,
        damping: 24,
        delay: shouldReduceMotion ? 0 : 0.03 * index,
      }}
      style={{ zIndex: 100 - index }}
      className="relative flex-shrink-0"
    >
      <Link
        to={href}
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 sm:py-3 rounded-full transition-all duration-300 border shadow-lg whitespace-nowrap cursor-pointer active:scale-95",
          isAccent
            ? "bg-[#D97706] text-white border-[#D97706] hover:bg-[#F59E0B] hover:border-[#F59E0B] shadow-[#D97706]/30"
            : "bg-[#18181B] text-zinc-200 border-[#27272A] hover:bg-[#27272A] hover:text-white hover:border-[#D97706]/70 shadow-black/50"
        )}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
      </Link>
    </motion.div>
  );
};

export default StackingNavbar;
