import * as React from "react";
import {
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import { cn } from "@/lib/utils";

export interface DockItemData {
  link: string;
  Icon: React.ReactNode;
  label: string;
  target?: string;
  badge?: string;
}

export interface AnimatedDockProps {
  className?: string;
  items: DockItemData[];
}

export const AnimatedDock: React.FC<AnimatedDockProps> = ({
  className,
  items,
}) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.nav
      aria-label="BhojanOS quick navigation"
      onMouseMove={(event) => mouseX.set(event.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto flex h-16 items-end gap-2.5 sm:gap-3 rounded-2xl border border-white/10 bg-[#18181B]/90 px-3 sm:px-4 pb-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl select-none",
        className
      )}
    >
      {items.map((item) => (
        <DockItem
          key={item.label}
          mouseX={mouseX}
          label={item.label}
          badge={item.badge}
        >
          <a
            href={item.link}
            target={item.target}
            rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
            aria-label={item.label}
            className="flex h-full w-full items-center justify-center text-zinc-300 hover:text-white transition-colors focus:outline-none"
          >
            {item.Icon}
          </a>
        </DockItem>
      ))}
    </motion.nav>
  );
};

interface DockItemProps {
  mouseX: MotionValue<number>;
  label: string;
  badge?: string;
  children: React.ReactNode;
}

export const DockItem: React.FC<DockItemProps> = ({
  mouseX,
  label,
  badge,
  children,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();

  const distance = useTransform(mouseX, (value) => {
    const bounds = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: 0,
    };
    return value - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(
    distance,
    [-150, 0, 150],
    shouldReduceMotion ? [44, 44, 44] : [42, 62, 42]
  );

  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const iconScale = useTransform(
    width,
    [42, 62],
    shouldReduceMotion ? [1, 1] : [1, 1.25]
  );

  const iconSpring = useSpring(iconScale, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const isVisibleTooltip = hovered || focused;

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="relative flex aspect-square items-center justify-center rounded-xl border border-white/10 bg-[#111114] hover:bg-[#27272A] hover:border-[#D97706]/60 text-white transition-colors focus-within:ring-2 focus-within:ring-[#D97706] focus-within:ring-offset-1 focus-within:ring-offset-[#09090B]"
    >
      {/* Floating Animated Tooltip Pill */}
      <AnimatePresence>
        {isVisibleTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#18181B] border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl pointer-events-none z-50 flex items-center gap-1.5"
          >
            <span>{label}</span>
            {badge && (
              <span className="rounded bg-[#D97706] px-1 py-0.2 text-[9px] font-mono uppercase text-white">
                {badge}
              </span>
            )}
            {/* Tooltip triangle notch */}
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-[#18181B]" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        style={{ scale: iconSpring }}
        className="flex h-full w-full items-center justify-center"
      >
        {children}
      </motion.div>

      <span className="sr-only">{label}</span>
    </motion.div>
  );
};

export default AnimatedDock;
