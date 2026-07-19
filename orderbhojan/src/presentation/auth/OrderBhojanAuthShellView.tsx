import type { ReactNode } from 'react';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { Skeleton } from '@bhojan/storefront-design-system/primitives/Skeleton';
import type { AuthTabId } from '@bhojan/storefront-design-system/auth';

const LOGO_SRC = '/brand/orderbhojan-logo.png';
const BRAND_TAGLINE = 'Home Food · Faster · Healthier';

export interface OrderBhojanAuthShellViewProps {
  readonly loading?: boolean;
  readonly title: string;
  readonly subtitle: string;
  readonly tabs?: readonly { id: AuthTabId; label: string }[];
  readonly activeTab?: AuthTabId;
  readonly onTabChange?: (tab: AuthTabId) => void;
  readonly children?: ReactNode;
  readonly errorMessage?: string;
  readonly onDismissError?: () => void;
}

function AuthBrandMark({ compact = false }: { readonly compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'gap-2' : 'gap-3'}`}>
      <div className="ob-auth-brand-glow relative">
        <img
          src={LOGO_SRC}
          alt="OrderBhojan"
          className={`ob-auth-brand-logo object-cover ${compact ? 'h-16 w-16' : 'h-[5.5rem] w-[5.5rem]'}`}
          width={compact ? 64 : 88}
          height={compact ? 64 : 88}
          decoding="async"
          fetchPriority="high"
        />
      </div>
      {!compact ? (
        <p className="ob-auth-tagline max-w-[16rem] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
          {BRAND_TAGLINE}
        </p>
      ) : null}
    </div>
  );
}

function AuthTabBar({
  tabs,
  activeTab,
  onTabChange,
}: {
  readonly tabs: readonly { id: AuthTabId; label: string }[];
  readonly activeTab: AuthTabId;
  readonly onTabChange: (tab: AuthTabId) => void;
}) {
  const columnClass =
    tabs.length === 2 ? 'grid-cols-2' : tabs.length === 1 ? 'grid-cols-1' : 'grid-cols-3';

  return (
    <div
      className={`mb-6 grid ${columnClass} gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1`}
      role="tablist"
      aria-label="Sign in options"
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? 'bg-gradient-to-r from-[#FF7A00] to-[#FF9F1C] text-white shadow-[0_8px_24px_-12px_rgba(255,122,0,0.65)]'
                : 'text-white/55 hover:text-white/85'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function OrderBhojanAuthShellView({
  loading = false,
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  children,
  errorMessage,
  onDismissError,
}: OrderBhojanAuthShellViewProps) {
  if (loading) {
    return (
      <div className="ob-auth-shell">
        <GlassCard hoverEffect={false} className="ob-auth-card w-full max-w-md !rounded-[2rem] !p-8">
          <AuthBrandMark compact />
          <Skeleton className="mx-auto mt-6 h-8 w-48 rounded-xl" />
          <Skeleton className="mt-3 h-4 w-full rounded-lg" />
          <Skeleton className="mt-2 h-4 w-[80%] rounded-lg" />
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="ob-auth-shell">
      <GlassCard hoverEffect={false} className="ob-auth-card w-full max-w-md !rounded-[2rem] !p-8 !pt-7">
        <div className="mb-6 flex justify-center">
          <AuthBrandMark />
        </div>

        <header className="mb-6 text-center">
          <h1 className="ob-auth-title text-[1.65rem] font-bold leading-[1.15] tracking-tight text-white sm:text-[1.85rem]">
            {title}
          </h1>
          <p className="mt-2 text-[15px] font-medium leading-relaxed text-white/55">{subtitle}</p>
        </header>

        {tabs && activeTab && onTabChange ? (
          <AuthTabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
        ) : null}

        <div className="flex flex-col gap-4">{children}</div>

        {errorMessage ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {errorMessage}
            {onDismissError ? (
              <SoftButton type="button" tone="ghost" size="compact" className="ml-2" onClick={onDismissError}>
                Dismiss
              </SoftButton>
            ) : null}
          </p>
        ) : null}
      </GlassCard>
    </div>
  );
}
