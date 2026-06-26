import { getAuth } from 'firebase/auth';
import { 
  getDoc as sdkGetDoc, 
  getDocs as sdkGetDocs, 
  setDoc as sdkSetDoc, 
  updateDoc as sdkUpdateDoc, 
  addDoc as sdkAddDoc, 
  deleteDoc as sdkDeleteDoc,
  DocumentReference,
  Query,
  WithFieldValue,
  UpdateData,
  DocumentData
} from 'firebase/firestore';

export type IncidentType = 'system_errors' | 'api_errors' | 'firestore_errors' | 'payment_incidents' | 'security_events' | 'performance_metrics' | 'merchant_blockers' | 'onboarding_events';

export const logIncident = async (type: IncidentType, payload: any) => {
  try {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    
    fetch('/api/monitoring/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ type, payload })
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Monitoring API returned ${response.status}`);
      }
    }).catch((err) => {
      console.warn('Telemetry fetch failed, queueing offline...', err);
      queueTelemetry(type, payload);
    });
  } catch (err) {
    console.warn('Failed to log incident, queueing offline...', err);
    queueTelemetry(type, payload);
  }
};

const queueTelemetry = (type: IncidentType, payload: any) => {
  if (typeof window === 'undefined') return;
  try {
    const queue = JSON.parse(localStorage.getItem('monitoringQueue') || '[]');
    queue.push({ type, payload, timestamp: new Date().toISOString() });
    localStorage.setItem('monitoringQueue', JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to write to monitoringQueue', e);
  }
};

const flushMonitoringQueue = async () => {
  if (typeof window === 'undefined') return;
  try {
    const queueStr = localStorage.getItem('monitoringQueue');
    if (!queueStr) return;
    const queue = JSON.parse(queueStr);
    if (!Array.isArray(queue) || queue.length === 0) return;

    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    // Process up to 10 events to avoid payload bloat
    const batch = queue.splice(0, 10);
    localStorage.setItem('monitoringQueue', JSON.stringify(queue));

    for (const event of batch) {
      await fetch('/api/monitoring/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ type: event.type, payload: event.payload })
      }).catch((e) => {
        // Re-queue on failure
        queueTelemetry(event.type, event.payload);
      });
    }
  } catch (e) {
    console.error('Flush monitoring queue failed', e);
  }
};

const getCommonMetadata = () => {
  const auth = getAuth();
  return {
    route: window.location.pathname,
    browser: navigator.userAgent,
    device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
    userId: auth.currentUser?.uid || 'anonymous',
    timestamp: new Date().toISOString()
  };
};

export const initializeMonitoring = () => {
  if (typeof window === 'undefined') return;

  // Phase 14: Flush queue on load, network recovery, and interval
  flushMonitoringQueue();
  window.addEventListener('online', flushMonitoringQueue);
  setInterval(flushMonitoringQueue, 300000); // 5 minutes

  // Phase 2: Global Runtime Monitoring
  window.addEventListener('error', (event) => {
    logIncident('system_errors', {
      ...getCommonMetadata(),
      error: event.message,
      source: event.filename,
      lineNumber: event.lineno,
      stackTrace: event.error?.stack || 'No stack trace'
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logIncident('system_errors', {
      ...getCommonMetadata(),
      error: event.reason?.message || 'Unhandled Promise Rejection',
      stackTrace: event.reason?.stack || 'No stack trace'
    });
  });

  // Phase 3: API Monitoring
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const startTime = performance.now();
    try {
      const response = await originalFetch(...args);
      const responseTime = performance.now() - startTime;
      
      // Do not intercept our own monitoring endpoint to prevent infinite loops
      if (typeof args[0] === 'string' && args[0].includes('/api/monitoring/log')) {
        return response;
      }

      if (!response.ok) {
        logIncident('api_errors', {
          ...getCommonMetadata(),
          endpoint: typeof args[0] === 'string' ? args[0] : (args[0] as any)?.url || (args[0] as any)?.href,
          statusCode: response.status,
          responseTime,
          payloadSize: response.headers.get('content-length') || 0,
          failureReason: `HTTP ${response.status} ${response.statusText}`,
          severity: response.status >= 500 ? 'Critical' : 'Warning'
        });
      }
      return response;
    } catch (error: any) {
      const responseTime = performance.now() - startTime;
      logIncident('api_errors', {
        ...getCommonMetadata(),
        endpoint: typeof args[0] === 'string' ? args[0] : (args[0] as any)?.url || (args[0] as any)?.href,
        statusCode: 0,
        responseTime,
        payloadSize: 0,
        failureReason: error.message || 'Network Error',
        severity: 'Critical'
      });
      throw error;
    }
  };

  // Phase 7: Performance Monitoring
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name === 'first-contentful-paint' || entry.name === 'largest-contentful-paint') {
          const loadTime = entry.startTime;
          if (loadTime > 2000) {
            logIncident('performance_metrics', {
              ...getCommonMetadata(),
              metric: entry.name,
              value: loadTime,
              severity: loadTime > 5000 ? 'Critical' : 'Warning'
            });
          }
        }
      });
    });
    observer.observe({ type: 'paint', buffered: true });
  } catch (e) {
    console.warn('PerformanceObserver not supported');
  }
};

// Phase 4: Firestore Monitoring Service (Wrappers)
export const FirestoreMonitoringService = {
  getDoc: async <T extends DocumentData>(ref: DocumentReference<T>) => {
    const startTime = performance.now();
    try {
      return await sdkGetDoc(ref);
    } catch (error: any) {
      logIncident('firestore_errors', { ...getCommonMetadata(), operation: 'getDoc', path: ref.path, error: error.message, code: error.code, latency: performance.now() - startTime });
      throw error;
    }
  },
  getDocs: async <T extends DocumentData>(query: Query<T>) => {
    const startTime = performance.now();
    try {
      return await sdkGetDocs(query);
    } catch (error: any) {
      logIncident('firestore_errors', { ...getCommonMetadata(), operation: 'getDocs', error: error.message, code: error.code, latency: performance.now() - startTime });
      throw error;
    }
  },
  setDoc: async <T extends DocumentData>(ref: DocumentReference<T>, data: WithFieldValue<T>, options?: any) => {
    const startTime = performance.now();
    try {
      return options ? await sdkSetDoc(ref, data, options) : await sdkSetDoc(ref, data);
    } catch (error: any) {
      logIncident('firestore_errors', { ...getCommonMetadata(), operation: 'setDoc', path: ref.path, error: error.message, code: error.code, latency: performance.now() - startTime });
      throw error;
    }
  },
  updateDoc: async <T extends DocumentData>(ref: DocumentReference<T>, data: UpdateData<T>) => {
    const startTime = performance.now();
    try {
      return await sdkUpdateDoc(ref, data);
    } catch (error: any) {
      logIncident('firestore_errors', { ...getCommonMetadata(), operation: 'updateDoc', path: ref.path, error: error.message, code: error.code, latency: performance.now() - startTime });
      throw error;
    }
  },
  addDoc: async <T extends DocumentData>(collRef: any, data: WithFieldValue<T>) => {
    const startTime = performance.now();
    try {
      return await sdkAddDoc(collRef, data);
    } catch (error: any) {
      logIncident('firestore_errors', { ...getCommonMetadata(), operation: 'addDoc', path: collRef.path, error: error.message, code: error.code, latency: performance.now() - startTime });
      throw error;
    }
  },
  deleteDoc: async <T extends DocumentData>(ref: DocumentReference<T>) => {
    const startTime = performance.now();
    try {
      return await sdkDeleteDoc(ref);
    } catch (error: any) {
      logIncident('firestore_errors', { ...getCommonMetadata(), operation: 'deleteDoc', path: ref.path, error: error.message, code: error.code, latency: performance.now() - startTime });
      throw error;
    }
  }
};
