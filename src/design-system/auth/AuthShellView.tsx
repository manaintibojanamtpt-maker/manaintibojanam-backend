import type { ReactNode } from 'react';
import { GlassCard } from '../primitives/GlassCard';
import { SectionHeader } from '../primitives/SectionHeader';
import { SoftButton } from '../primitives/SoftButton';
import { Skeleton } from '../primitives/Skeleton';

export type AuthTabId = 'google' | 'phone' | 'guest';

export interface AuthShellViewProps {
  readonly loading?: boolean;
  readonly brandLabel?: string;
  readonly title: string;
  readonly subtitle: string;
  readonly tabs?: readonly { id: AuthTabId; label: string }[];
  readonly activeTab?: AuthTabId;
  readonly onTabChange?: (tab: AuthTabId) => void;
  readonly children?: ReactNode;
  readonly errorMessage?: string;
  readonly onDismissError?: () => void;
}

export function AuthShellView({
  loading = false,
  brandLabel = 'ORDERBHOJAN',
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  children,
  errorMessage,
  onDismissError,
}: AuthShellViewProps) {
  if (loading) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center px-4">
        <GlassCard hoverEffect={false} className="w-full max-w-md !rounded-[2rem] !p-8">
          <Skeleton className="mx-auto h-8 w-40" />
          <Skeleton className="mt-4 h-4 w-full" />
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-4 py-8">
      <GlassCard hoverEffect={false} className="w-full max-w-md !rounded-[2rem] !p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF7A00]">{brandLabel}</p>
        <SectionHeader title={title} description={subtitle} align="left" className="!mb-6 !mt-2" />

        {tabs && activeTab && onTabChange ? (
          <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id ? 'bg-[#FF7A00] text-white' : 'text-white/60 hover:text-white'
                }`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-4">{children}</div>

        {errorMessage ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
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
