import type { ReactNode } from 'react';

export interface TransactionalPageShellProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function TransactionalPageShell({
  title,
  subtitle,
  children,
  className = '',
}: TransactionalPageShellProps) {
  return (
    <div
      className={`flex min-h-[100dvh] flex-col gap-4 bg-[#070504] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-white md:mx-auto md:max-w-lg ${className}`.trim()}
      style={{
        backgroundImage:
          'radial-gradient(ellipse 120% 80% at 50% -18%, rgba(255,107,53,0.14), transparent 52%), radial-gradient(ellipse 70% 45% at 100% 8%, rgba(255,159,28,0.07), transparent 42%)',
      }}
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
        {subtitle ? <p className="text-sm text-white/60">{subtitle}</p> : null}
      </header>
      {children}
    </div>
  );
}
