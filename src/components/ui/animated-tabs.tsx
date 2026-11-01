"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface AnimatedTabsProps {
  tabs: (TabItem | { label: string })[];
  activeTab?: string;
  value?: string;
  onChange?: (tab: string) => void;
  className?: string;
  tabClassName?: string;
  activeBgClassName?: string;
  activeTabClassName?: string;
  size?: "sm" | "default" | "lg";
  ariaLabel?: string;
}

export function AnimatedTabs({
  tabs,
  activeTab: controlledActiveTab,
  value,
  onChange,
  className,
  tabClassName,
  activeBgClassName,
  activeTabClassName,
  size = "default",
  ariaLabel = "Navigation tabs",
}: AnimatedTabsProps) {
  const getTabKey = (tab: TabItem | { label: string }) =>
    "id" in tab && tab.id ? tab.id : tab.label;

  const firstKey = tabs.length > 0 ? getTabKey(tabs[0]) : "";
  const [internalActiveTab, setInternalActiveTab] = useState<string>(firstKey);

  const activeKey =
    controlledActiveTab !== undefined
      ? controlledActiveTab
      : value !== undefined
      ? value
      : internalActiveTab;

  const resolvedActiveBg = activeTabClassName || activeBgClassName || "bg-[#D97706] text-white";

  const containerRef = useRef<HTMLDivElement>(null);
  const outerWrapperRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  const updateClipPath = () => {
    const container = containerRef.current;
    const activeTabElement = activeTabRef.current;

    if (container && activeTabElement) {
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeTabElement.getBoundingClientRect();

      if (containerRect.width > 0) {
        const clipLeft = Math.max(0, activeRect.left - containerRect.left);
        const clipRight = Math.min(containerRect.width, activeRect.right - containerRect.left);

        const leftPercent = ((clipLeft / containerRect.width) * 100).toFixed(2);
        const rightPercent = (
          100 - (clipRight / containerRect.width) * 100
        ).toFixed(2);

        container.style.clipPath = `inset(0 ${rightPercent}% 0 ${leftPercent}% round 9999px)`;
      }
    }
  };

  useEffect(() => {
    updateClipPath();
    if (activeTabRef.current && outerWrapperRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeKey, tabs]);

  useEffect(() => {
    const handleResize = () => {
      updateClipPath();
    };

    window.addEventListener("resize", handleResize);
    const ro = new ResizeObserver(handleResize);
    if (outerWrapperRef.current) {
      ro.observe(outerWrapperRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
    };
  }, []);

  const handleSelect = (key: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(key);
    }
    onChange?.(key);
  };

  const sizeClasses = {
    sm: "h-7 px-3 text-xs gap-1.5",
    default: "h-9 px-4 text-sm gap-2",
    lg: "h-11 px-5 text-base gap-2.5",
  }[size];

  return (
    <div
      ref={outerWrapperRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative mx-auto flex w-fit max-w-full items-center overflow-x-auto scrollbar-none rounded-full border border-white/10 bg-[#18181B]/80 p-1 backdrop-blur-md shadow-inner",
        className
      )}
    >
      {/* 1. CLIPPED ACTIVE HIGHLIGHT LAYER */}
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-0 z-10 w-full overflow-hidden [clip-path:inset(0px_75%_0px_0%_round_9999px)] [transition:clip-path_0.25s_cubic-bezier(0.4,0,0.2,1)]"
        aria-hidden="true"
      >
        <div className="relative flex w-full items-center justify-start sm:justify-center min-w-max px-1">
          {tabs.map((tab, index) => {
            const key = getTabKey(tab);
            const icon = "icon" in tab ? tab.icon : null;
            const badge = "badge" in tab ? tab.badge : null;

            return (
              <div
                key={`active-${key}-${index}`}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full font-semibold whitespace-nowrap shadow-sm select-none",
                  sizeClasses,
                  tabClassName,
                  resolvedActiveBg
                )}
              >
                {icon && <span className="shrink-0">{icon}</span>}
                <span>{tab.label}</span>
                {badge !== undefined && badge !== null && (
                  <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {badge}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. BASE INTERACTIVE LAYER */}
      <div className="relative flex w-full items-center justify-start sm:justify-center min-w-max px-1">
        {tabs.map((tab, index) => {
          const key = getTabKey(tab);
          const isActive = activeKey === key;
          const icon = "icon" in tab ? tab.icon : null;
          const badge = "badge" in tab ? tab.badge : null;

          return (
            <button
              key={`base-${key}-${index}`}
              ref={isActive ? activeTabRef : null}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleSelect(key)}
              className={cn(
                "flex shrink-0 items-center justify-center cursor-pointer rounded-full font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]",
                isActive ? "text-white font-semibold" : "text-zinc-400 hover:text-white",
                sizeClasses,
                tabClassName
              )}
            >
              {icon && <span className="shrink-0 opacity-80">{icon}</span>}
              <span>{tab.label}</span>
              {badge !== undefined && badge !== null && (
                <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-zinc-300">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AnimatedTabs;
