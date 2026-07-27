import type { ReactNode } from 'react';

export interface TransactionalPageShellProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly className?: string;
  /** When true, defers bottom chrome padding to MarketplaceLayout scroll container. */
  readonly embedded?: boolean;
}

export function TransactionalPageShell({
  title,
  subtitle,
  children,
  className = '',
  embedded = false,
}: TransactionalPageShellProps) {
  const showTitleBlock = !embedded && Boolean(title || subtitle);

  return (
    <div
      className={`ob-transactional-shell flex flex-col gap-4 bg-[#050403] pt-4 text-[#fff8f0] md:mx-auto md:max-w-lg ${
        embedded ? 'min-h-0' : 'min-h-[100dvh] pb-[var(--ob-chrome-bottom)]'
      } ${className}`.trim()}
      style={{
        backgroundImage:
          'radial-gradient(ellipse 120% 80% at 50% -18%, rgba(232,93,4,0.12), transparent 52%), radial-gradient(ellipse 70% 45% at 100% 8%, rgba(244,162,97,0.06), transparent 42%)',
      }}
    >
      {showTitleBlock ? (
        <header className="flex flex-col gap-1">
          {title ? <h1 className="text-2xl font-extrabold tracking-tight text-[#fff8f0]">{title}</h1> : null}
          {subtitle ? <p className="text-sm text-[#c4b5a5]">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}
