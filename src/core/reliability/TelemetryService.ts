import { sanitizeLogString } from './sanitizers';
import { getDb } from '../../lib/firebase-db';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface TelemetryMeta {
  route?: string;
  userId?: string;
  context?: string;
  tenantId?: string;
  [key: string]: any;
}

export interface TelemetryEvent {
  id: string;
  timestamp: number;
  level: LogLevel;
  type: string;
  message: string;
  count: number;
  tenantId: string;
  signature?: string; // internal for dedup
}

class TelemetryServiceImpl {
  private ringBuffer: TelemetryEvent[] = [];
  private currentTenantId: string = 'UNRESOLVED';
  private MAX_BUFFER_SIZE = 50;
  private lastCriticalWriteTime: number = 0;

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  private pushToBuffer(level: LogLevel, message: string, meta?: TelemetryMeta) {
    const sanitizedMsg = sanitizeLogString(message);
    const signature = this.hashString(`${level}:${sanitizedMsg}`);
    
    const now = Date.now();
    const existingIdx = this.ringBuffer.findIndex(
      e => e.signature === signature && (now - e.timestamp) < 60000
    );

    if (existingIdx !== -1) {
      this.ringBuffer[existingIdx].count += 1;
      this.ringBuffer[existingIdx].timestamp = now;
      return;
    }

    const event: TelemetryEvent = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      timestamp: now,
      level,
      type: meta?.context || 'APP',
      message: sanitizedMsg,
      count: 1,
      tenantId: meta?.tenantId || this.currentTenantId,
      signature
    };

    this.ringBuffer.push(event);
    if (this.ringBuffer.length > this.MAX_BUFFER_SIZE) {
      this.ringBuffer.shift();
    }
  }

  public logInfo(message: string, meta?: TelemetryMeta) {
    this.pushToBuffer('INFO', message, meta);
    console.info(`[INFO] ${message}`, meta);
  }

  public logWarn(message: string, meta?: TelemetryMeta) {
    this.pushToBuffer('WARN', message, meta);
    console.warn(`[WARN] ${message}`, meta);
  }

  public logError(error: Error | string, meta?: TelemetryMeta) {
    const msg = error instanceof Error ? `${error.message}\n${error.stack}` : error;
    this.pushToBuffer('ERROR', msg, meta);
    console.error(`[ERROR]`, error, meta);
  }

  public async logCritical(error: Error | string, meta?: TelemetryMeta) {
    const msg = error instanceof Error ? `${error.message}\n${error.stack}` : error;
    this.pushToBuffer('CRITICAL', msg, meta);
    console.error(`[CRITICAL]`, error, meta);
    
    const now = Date.now();
    // Rate limit: Max 1 write per 1 minute to prevent Firestore quota exhaustion
    if (now - this.lastCriticalWriteTime < 60000) {
      return;
    }

    try {
      this.lastCriticalWriteTime = now;
      await addDoc(collection(getDb(), 'client_errors'), {
        level: 'CRITICAL',
        message: sanitizeLogString(msg),
        contextSummary: this.buildContextSummary(),
        tenantId: meta?.tenantId || this.currentTenantId,
        route: meta?.route || window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp(),
        resolved: false
      });
    } catch (dbErr) {
      console.error("Failed to write critical incident to Firestore", dbErr);
    }
  }

  public initializeGlobalHandlers() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('error', (event: ErrorEvent) => {
      this.logCritical(`Global Error: ${event.message}`, { 
        route: window.location.pathname,
        stack: event.error?.stack 
      });
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.logCritical(`Unhandled Rejection: ${String(event.reason)}`, {
        route: window.location.pathname
      });
    });
  }

  public setTenantContext(tenantId: string) {
    this.currentTenantId = tenantId;
  }

  public buildContextSummary(): string {
    const recentLogs = this.ringBuffer.slice(-10);
    let summary = recentLogs.map(log => `[${new Date(log.timestamp).toLocaleTimeString()} ${log.level}] ${log.message}`).join(' | ');
    if (summary.length > 500) {
      summary = '...' + summary.substring(summary.length - 497);
    }
    return summary;
  }
}

export const TelemetryService = new TelemetryServiceImpl();
