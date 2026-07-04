export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  readonly correlationId?: string;
  readonly feature?: string;
  readonly [key: string]: unknown;
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const payload = context ? ` ${JSON.stringify(context)}` : '';
  return `[OrderBhojan:${level}] ${message}${payload}`;
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (import.meta.env.DEV) {
      console.debug(formatMessage('debug', message, context));
    }
  },
  info(message: string, context?: LogContext) {
    console.info(formatMessage('info', message, context));
  },
  warn(message: string, context?: LogContext) {
    console.warn(formatMessage('warn', message, context));
  },
  error(message: string, context?: LogContext) {
    console.error(formatMessage('error', message, context));
  },
};
