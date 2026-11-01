import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AnimatedFeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The numerical index to display, e.g., "001" */
  index: string;
  /** The tag or category label */
  tag: string;
  /** The main title or description */
  title: React.ReactNode;
  /** The URL for the central image */
  imageSrc: string;
  /** The color variant which determines the gradient and tag color */
  color: "orange" | "purple" | "blue";
}

// HSL color values for each variant tuned to BhojanOS & shadcn theme tokens
const colorVariants = {
  orange: {
    '--feature-color': 'hsl(28, 95%, 52%)',
    '--feature-color-light': 'hsl(35, 100%, 85%)',
    '--feature-color-dark': 'hsl(28, 100%, 96%)',
  },
  purple: {
    '--feature-color': 'hsl(262, 85%, 60%)',
    '--feature-color-light': 'hsl(261, 100%, 87%)',
    '--feature-color-dark': 'hsl(264, 100%, 98%)',
  },
  blue: {
    '--feature-color': 'hsl(211, 100%, 60%)',
    '--feature-color-light': 'hsl(210, 100%, 83%)',
    '--feature-color-dark': 'hsl(216, 100%, 98%)',
  },
};

const AnimatedFeatureCard = React.forwardRef<
  HTMLDivElement,
  AnimatedFeatureCardProps
>(({ className, index, tag, title, imageSrc, color, ...props }, ref) => {
  const cardStyle = colorVariants[color] as React.CSSProperties;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      style={cardStyle}
      className={cn(
        "relative flex h-[390px] w-full max-w-sm flex-col justify-end overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-xl transition-colors text-white",
        className
      )}
      whileHover={shouldReduceMotion ? undefined : "hover"}
      initial="initial"
      variants={{
        initial: { y: 0 },
        hover: {
          y: -8,
          transition: { type: "spring", stiffness: 200, damping: 15 }
        },
      }}
      {...(props as any)}
    >
      {/* Background Gradient */}
      <div
        className="absolute inset-0 z-0 opacity-40 dark:opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 30%, var(--feature-color-light) 0%, transparent 70%)`
        }}
        aria-hidden="true"
      />

      {/* Index Number */}
      <div className="absolute top-6 left-6 font-mono text-base font-bold text-[#71717A]">
        {index}
      </div>

      {/* Main Image */}
      <motion.div
        className="absolute inset-0 z-10 flex items-center justify-center p-6 pointer-events-none"
        variants={
          shouldReduceMotion
            ? { initial: { scale: 1, y: 0 }, hover: { scale: 1, y: 0 } }
            : {
                initial: { scale: 1, y: 0 },
                hover: { scale: 1.1, y: -12 },
              }
        }
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <img
          src={imageSrc}
          alt={tag}
          loading="lazy"
          className="h-44 w-44 rounded-xl object-cover shadow-md border border-black/5"
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-20 rounded-xl border border-[#27272A] bg-[#18181B]/95 p-4 backdrop-blur-md shadow-lg text-white">
        <span
          className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase font-mono"
          style={{
            backgroundColor: 'var(--feature-color-dark)',
            color: 'var(--feature-color)'
          }}
        >
          {tag}
        </span>
        <p className="text-sm sm:text-base font-medium text-[#FAFAFA] leading-snug">{title}</p>
      </div>
    </motion.div>
  );
});

AnimatedFeatureCard.displayName = "AnimatedFeatureCard";

export { AnimatedFeatureCard };
export default AnimatedFeatureCard;
