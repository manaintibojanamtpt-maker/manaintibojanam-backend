import * as React from "react"
import { cn } from "@/lib/utils"

export interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  pauseOnHover?: boolean
  direction?: "left" | "right"
  speed?: number
  fadeEdges?: boolean
}

export function Marquee({
  children,
  pauseOnHover = false,
  direction = "left",
  speed = 30,
  fadeEdges = true,
  className,
  ...props
}: MarqueeProps) {
  return (
    <div 
      className={cn(
        "w-full overflow-hidden sm:mt-12 mt-6 z-10 relative",
        className
      )} 
      {...props}
    >
      {/* Optional gradient fade masks on edges */}
      {fadeEdges && (
        <>
          <div 
            className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 z-20 bg-gradient-to-r from-[#09090B] to-transparent" 
            aria-hidden="true" 
          />
          <div 
            className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 z-20 bg-gradient-to-l from-[#09090B] to-transparent" 
            aria-hidden="true" 
          />
        </>
      )}

      <div className="relative flex w-full overflow-hidden py-4">
        <div 
          className={cn(
            "flex w-max shrink-0 animate-marquee items-center gap-8 sm:gap-12",
            pauseOnHover && "hover:[animation-play-state:paused]",
            direction === "right" && "animate-marquee-reverse"
          )}
          style={{ "--duration": `${speed}s` } as React.CSSProperties}
        >
          {children}
          {children}
        </div>
      </div>
    </div>
  )
}

export default Marquee
