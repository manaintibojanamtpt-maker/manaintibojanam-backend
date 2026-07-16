type PerfMarkName =
  | 'app_start'
  | 'first_paint'
  | 'discovery_fetch_start'
  | 'discovery_fetch_end'
  | 'cart_to_checkout'
  | 'checkout_prepare_start'
  | 'checkout_prepare_end'
  | 'checkout_bill_ready'
  | 'pay_tap'
  | 'pay_next_step';

interface PerfEntry {
  readonly name: PerfMarkName;
  readonly at: number;
  readonly detail?: string;
}

declare global {
  interface Window {
    __OB_PERF__?: PerfEntry[];
  }
}

const marks = new Map<PerfMarkName, number>();

function record(name: PerfMarkName, detail?: string): void {
  const at = performance.now();
  marks.set(name, at);
  const entry: PerfEntry = { name, at, detail };
  if (import.meta.env.DEV) {
    console.debug(`[OB perf] ${name}${detail ? ` — ${detail}` : ''}`, `${at.toFixed(1)}ms`);
  }
  if (typeof window !== 'undefined') {
    window.__OB_PERF__ = [...(window.__OB_PERF__ ?? []), entry];
  }
}

export function markPerf(name: PerfMarkName, detail?: string): void {
  record(name, detail);
}

export function markPerfOnce(name: PerfMarkName, detail?: string): void {
  if (marks.has(name)) return;
  record(name, detail);
}

export function measurePerf(start: PerfMarkName, end: PerfMarkName, label?: string): number | null {
  const startAt = marks.get(start);
  const endAt = marks.get(end);
  if (startAt == null || endAt == null) return null;
  const duration = endAt - startAt;
  if (import.meta.env.DEV) {
    console.debug(`[OB perf] ${label ?? `${start}→${end}`}: ${duration.toFixed(1)}ms`);
  }
  return duration;
}

export function getPerfMarks(): ReadonlyMap<PerfMarkName, number> {
  return marks;
}
