import React from "react";
import { Spinner } from "@/components/ui/spinner";

const sizes = [
  {
    tiny: "px-2 h-7 text-xs font-medium",
    small: "px-3.5 h-8 text-xs font-semibold",
    medium: "px-5 h-10 text-sm font-semibold",
    large: "px-6 h-12 text-base font-semibold"
  },
  {
    tiny: "w-7 h-7 text-xs",
    small: "w-8 h-8 text-xs",
    medium: "w-10 h-10 text-sm",
    large: "w-12 h-12 text-base"
  }
];

const types = {
  primary: "bg-[#09090B] dark:bg-[#ededed] hover:bg-[#27272A] dark:hover:bg-[#cccccc] text-white !text-white dark:text-[#0a0a0a] fill-white dark:fill-[#0a0a0a]",
  secondary: "bg-white dark:bg-[#171717] hover:bg-[#F4F4F5] dark:hover:bg-[#ffffff17] text-[#09090B] dark:text-[#ededed] fill-[#09090B] dark:fill-[#ededed] border border-[#E4E4E7] dark:border-[#ffffff24]",
  tertiary: "bg-transparent dark:bg-transparent hover:bg-[#F4F4F5] dark:hover:bg-[#ffffff17] text-[#09090B] dark:text-[#ededed] fill-[#09090B] dark:fill-[#ededed]",
  error: "bg-[#ea001d] dark:bg-[#e2162a] hover:bg-[#ae292f] dark:hover:bg-[#ff565f] text-white !text-white fill-white",
  warning: "bg-[#ff9300] hover:bg-[#d27504] text-[#0a0a0a] fill-[#0a0a0a]"
};

const shapes = {
  square: {
    tiny: "rounded",
    small: "rounded-md",
    medium: "rounded-md",
    large: "rounded-lg"
  },
  circle: {
    tiny: "rounded-full",
    small: "rounded-full",
    medium: "rounded-full",
    large: "rounded-full"
  },
  rounded: {
    tiny: "rounded-full",
    small: "rounded-full",
    medium: "rounded-full",
    large: "rounded-full"
  }
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: keyof typeof sizes[0];
  type?: keyof typeof types;
  shape?: keyof typeof shapes;
  svgOnly?: boolean;
  children?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  shadow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  ref?: React.Ref<any>;
  href?: string;
  target?: string;
  rel?: string;
  className?: string;
}

export const Button = ({
  size = "medium",
  type = "primary",
  shape = "rounded",
  svgOnly = false,
  children,
  prefix,
  suffix,
  shadow = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  ref,
  href,
  target,
  rel,
  className = "",
  style,
  ...rest
}: ButtonProps) => {
  const isWhiteText = type === 'primary' || type === 'error';
  const forcedColor = isWhiteText ? '#FFFFFF' : undefined;

  const combinedClasses = `inline-flex justify-center items-center gap-1.5 duration-150 transition-all cursor-pointer select-none no-underline ${sizes[+svgOnly][size]} ${(disabled || loading) ? "bg-[#f2f2f2] dark:bg-[#1a1a1a] text-[#8f8f8f] fill-[#8f8f8f] border border-[#ebebeb] dark:border-[#2e2e2e] cursor-not-allowed pointer-events-none" : types[type]} ${shapes[shape][size]}${shadow ? " shadow-[0_1px_2px_rgba(0,0,0,0.06),_0_0_0_1px_rgba(0,0,0,0.08)]" : ""}${fullWidth ? " w-full" : ""} focus:shadow-[0_0_0_2px_hsla(0,0%,100%,1),0_0_0_4px_oklch(57.61%_0.2508_258.23)] active:scale-[0.98] ${className}`.trim();

  const content = (
    <>
      {loading ? (
        <Spinner size={size === "large" ? 22 : 16} color={isWhiteText ? '#FFFFFF' : '#8f8f8f'} />
      ) : prefix}
      {children && (
        <span 
          style={{ color: forcedColor }}
          className={`overflow-hidden whitespace-nowrap overflow-ellipsis ${isWhiteText ? 'text-white !text-white' : ''} ${size === "tiny" ? "" : "px-0.5"}`}
        >
          {children}
        </span>
      )}
      {!loading && suffix}
    </>
  );

  const mergedStyle: React.CSSProperties = {
    color: forcedColor,
    ...style,
  };

  if (href) {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        target={target}
        rel={rel}
        onClick={onClick}
        data-btn={type}
        style={mergedStyle}
        className={combinedClasses}
        {...(rest as any)}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      tabIndex={0}
      data-btn={type}
      style={mergedStyle}
      className={combinedClasses}
      {...rest}
    >
      {content}
    </button>
  );
};
