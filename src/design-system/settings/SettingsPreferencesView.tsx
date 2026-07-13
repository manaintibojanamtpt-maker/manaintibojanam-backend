import { ChevronRight } from 'lucide-react';
import { GlassCard } from '../primitives/GlassCard';
import { SectionHeader } from '../primitives/SectionHeader';
import { TransactionalPageShell } from '../cart/TransactionalPageShell';
import type { SettingsPreferenceViewModel } from './types';

export function SettingsPreferencesView({
  title = 'Preferences',
  rows,
  onRowClick,
}: {
  readonly title?: string;
  readonly rows: readonly SettingsPreferenceViewModel[];
  readonly onRowClick?: (id: string) => void;
}) {
  return (
    <GlassCard hoverEffect={false} className="!rounded-2xl !p-4" aria-label={title}>
      <SectionHeader title={title} align="left" className="!mb-1 !mt-0" />
      <p className="mb-3 text-xs text-white/45">Tap spice or dietary to update. Push notifications opens device settings.</p>
      <div className="divide-y divide-white/10">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            className="flex w-full items-center justify-between py-3 text-left first:pt-0 last:pb-0"
            aria-label={`${row.label}: ${row.value}`}
            onClick={() => onRowClick?.(row.id)}
          >
            <span className="flex items-center gap-3 text-white/80">
              <span aria-hidden>{row.icon}</span>
              {row.label}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-white/60">
              {row.value}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

export function SettingsPageView({
  title,
  subtitle,
  rows,
  onRowClick,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly rows: readonly SettingsPreferenceViewModel[];
  readonly onRowClick?: (id: string) => void;
}) {
  return (
    <TransactionalPageShell title={title} subtitle={subtitle}>
      <SettingsPreferencesView rows={rows} onRowClick={onRowClick} />
    </TransactionalPageShell>
  );
}
