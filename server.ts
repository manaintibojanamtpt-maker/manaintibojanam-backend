import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import fs from "fs";
import { createHmac } from "crypto";
import { initializeApp, getApp, getApps, deleteApp, cert } from "firebase-admin/app";
import { getFirestore, initializeFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import Razorpay from "razorpay";
import { 
  generateRegistrationOptions, 
  verifyRegistrationResponse, 
  generateAuthenticationOptions, 
  verifyAuthenticationResponse 
} from "@simplewebauthn/server";
import base64url from "base64url";
import winston from "winston";
import cron from "node-cron";
import { assertFulfillmentTransition } from "./backend-lib/paymentGate";
import { writePaymentVerification } from "./backend-lib/paymentAudit";
import {
  assertNotDuplicateUpload,
  validateKycDocument,
  type KycDocumentSlot,
} from "./backend-lib/kycDocumentValidation";
import { validateKycStorageUrl } from "./backend-lib/kycUrlValidation";
import {
  buildInlineKycDocumentUrl,
  MAX_INLINE_KYC_BYTES,
  parseInlineKycDocumentUrl,
} from "./backend-lib/kycInlineDocument";

// ================= LOGGING SETUP =================
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Firestore quota circuit breaker (must be early — used by incident logging + middleware)
const isFirestoreQuotaError = (err: any) => {
  const msg = String(err?.message || err?.code || "").toLowerCase();
  return err?.code === 8 || msg.includes("quota exceeded") || msg.includes("resource_exhausted");
};

let firestoreQuotaBackoffUntil = 0;
let lastQuotaWarnAt = 0;

const noteFirestoreQuotaExceeded = (source: string) => {
  const backoffMs = Number(process.env.FIRESTORE_QUOTA_BACKOFF_MS || 15 * 60 * 1000);
  firestoreQuotaBackoffUntil = Date.now() + backoffMs;
  const now = Date.now();
  if (now - lastQuotaWarnAt > 60_000) {
    lastQuotaWarnAt = now;
    logger.warn({
      message: "Firestore quota exceeded — pausing non-critical Firestore traffic",
      source,
      backoffMinutes: Math.round(backoffMs / 60_000),
    });
  }
};

const isFirestoreBackedOff = () => Date.now() < firestoreQuotaBackoffUntil;

// Write to system_incidents safely
const writeSystemIncident = async (type: string, status: string, payload: any, correlationId?: string) => {
  if (isFirestoreBackedOff()) return;
  try {
    if (!_db) return;
    const { randomUUID } = await import('crypto');
    await _db.collection("system_incidents").doc(randomUUID()).set({
      type,
      status,
      payload,
      correlationId: correlationId || "none",
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString()
    });
    logger.info({ message: "System incident logged", type, status, correlationId });
  } catch (err: any) {
    if (isFirestoreQuotaError(err)) noteFirestoreQuotaExceeded("writeSystemIncident");
    else logger.error({ message: "Failed to write system incident", err: err.message, correlationId });
  }
};

// ================= PAYMENT RECONCILIATION =================
const PAYMENT_PENDING_DRAFT_TTL_MS = 30 * 60 * 1000;

const toTimestampMs = (value: any): number | null => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'object' && typeof value._seconds === 'number') {
    return value._seconds * 1000;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const isDraftPaymentExpired = (draftData: Record<string, any>): boolean => {
  if (draftData.status === 'expired') return true;
  const expiresMs = toTimestampMs(draftData.expiresAt);
  return expiresMs !== null && expiresMs < Date.now();
};

const promoteDraftTransaction = async (
  draftId: string,
  paymentDetails: { razorpayOrderId: string, razorpayPaymentId: string },
  reconciliationSource: 'client_callback' | 'webhook_recovery',
  eventId?: string | null
): Promise<{ promoted: boolean; tenantId: string }> => {
  if (!_db) throw new Error("Firestore not initialized");

  let promoted = false;
  let resolvedTenantId = 'mana-inti';
  
  try {
    await _db.runTransaction(async (transaction) => {
      const draftRef = _db!.collection('order_drafts').doc(draftId);
      const draftSnap = await transaction.get(draftRef);
      
      if (!draftSnap.exists) {
        throw new Error(`Draft ${draftId} does not exist.`);
      }
      
      const draftData = draftSnap.data()!;
      resolvedTenantId = draftData.orderPayload?.tenantId || draftData.tenantId || 'mana-inti';

      if (draftData.status === 'promoted') {
        logger.info({ message: "Draft already promoted", draftId, reconciliationSource });
        return;
      }

      if (isDraftPaymentExpired(draftData)) {
        transaction.update(draftRef, { status: 'expired', updatedAt: FieldValue.serverTimestamp() });
        throw new Error('Payment session expired. Please place the order again.');
      }

      if (
        draftData.razorpayOrderId &&
        paymentDetails.razorpayOrderId &&
        draftData.razorpayOrderId !== paymentDetails.razorpayOrderId
      ) {
        throw new Error('Razorpay order mismatch for this draft.');
      }

      if (eventId) {
        const eventRef = _db!.collection('webhook_events').doc(eventId);
        const eventSnap = await transaction.get(eventRef);
        if (eventSnap.exists) {
          logger.info({ message: "Webhook event already processed", eventId, draftId });
          return;
        }
        transaction.set(eventRef, {
          id: eventId,
          draftId,
          processedAt: FieldValue.serverTimestamp(),
          status: 'success'
        });
      }

      const tenantRef = _db!.collection('tenants').doc(resolvedTenantId);
      const tenantSnap = await transaction.get(tenantRef);
      if (tenantSnap.exists) {
        const tenantData = tenantSnap.data()!;
        if (tenantData.sandboxMode) {
          const ordersSnap = await _db!.collection('orders').where('tenantId', '==', tenantRef.id).count().get();
          if (ordersSnap.data().count >= 10) {
            throw new Error('Sandbox limit exceeded. Upgrade to full activation to accept more orders.');
          }
        }
      }

      const orderStatus = draftData.subscriptionPayload ? 'ACTIVE' : 'PLACED';
      const verifiedAt = FieldValue.serverTimestamp();
      const orderRef = _db!.collection('orders').doc(draftId);
      transaction.set(orderRef, {
        ...draftData.orderPayload,
        tenantId: resolvedTenantId,
        status: orderStatus,
        paymentMethod: 'razorpay',
        paymentRail: 'gateway',
        paymentStatus: 'success',
        paymentVerifiedAt: verifiedAt,
        razorpayOrderId: paymentDetails.razorpayOrderId,
        razorpayPaymentId: paymentDetails.razorpayPaymentId,
        confirmedAt: verifiedAt,
        reconciliationSource,
        reconciliationEventId: eventId || null,
        timeline: [{
          id: `pay-${draftId}`,
          eventType: 'payment_verified',
          description: `Payment verified via ${reconciliationSource === 'webhook_recovery' ? 'Razorpay webhook' : 'Razorpay checkout'}`,
          triggeredBy: 'system',
          metadata: {
            razorpayOrderId: paymentDetails.razorpayOrderId,
            razorpayPaymentId: paymentDetails.razorpayPaymentId,
            reconciliationSource,
          },
          timestamp: new Date().toISOString(),
        }],
      });

      if (draftData.subscriptionPayload) {
        const subRef = _db!.collection('subscriptions').doc();
        transaction.set(subRef, {
          ...draftData.subscriptionPayload,
          tenantId: resolvedTenantId,
          createdAt: FieldValue.serverTimestamp()
        });
      }

      transaction.update(draftRef, {
        status: 'promoted',
        promotedAt: FieldValue.serverTimestamp(),
        razorpayPaymentId: paymentDetails.razorpayPaymentId,
      });
      promoted = true;
    });

    if (promoted) {
      await writePaymentVerification(_db, {
        tenantId: resolvedTenantId,
        orderId: draftId,
        action: 'verified',
        actorRole: 'system',
        source: reconciliationSource === 'webhook_recovery' ? 'razorpay_webhook' : 'razorpay_callback',
        razorpayOrderId: paymentDetails.razorpayOrderId,
        razorpayPaymentId: paymentDetails.razorpayPaymentId,
        previousPaymentStatus: 'pending',
        newPaymentStatus: 'success',
        reconciliationSource,
        reconciliationEventId: eventId || null,
        draftId,
      });
      logger.info({ message: "Draft successfully promoted to order", draftId, reconciliationSource });
    }

    return { promoted, tenantId: resolvedTenantId };
  } catch (error: any) {
    logger.error({ message: "Draft promotion failed", draftId, error: error.message });
    throw error;
  }
};

// ================= CONFIG =================
const PORT = Number(process.env.PORT) || 8080;

// ================= Startup Secret Validation Matrix =================
const validateSecrets = () => {
  const missingCritical = [];
  
  if (!process.env.FIREBASE_PROJECT_ID && !process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCP_PROJECT) {
    // Note: We use fallback in dev, but ideally it should crash in prod.
  }
  
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    logger.warn("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing. Online payments disabled.");
  }
  

  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn("EMAIL_USER or EMAIL_PASS missing. Reports and email notifications disabled.");
  } else if (
    process.env.EMAIL_USER === "your_email@gmail.com" ||
    process.env.EMAIL_PASS === "your_app_password"
  ) {
    logger.warn("EMAIL_USER/EMAIL_PASS still use placeholder values. Founder alerts will not send.");
  }

  const founderEmail = process.env.FOUNDER_EMAIL || "manaintibojanamtpt@gmail.com";
  logger.info({
    message: "Platform boot",
    founderEmail,
    platformTier: process.env.PLATFORM_TIER || (process.env.NODE_ENV === "production" ? "free" : "standard"),
    firebaseProject: process.env.FIREBASE_PROJECT_ID || "from firebase-applet-config.json",
  });
  
  if (!process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    logger.warn("CRON_SECRET missing. Secure cron processing vulnerable or disabled.");
  }
  
  if (!process.env.BIOMETRIC_SALT && process.env.NODE_ENV === 'production') {
    logger.warn("BIOMETRIC_SALT missing. Weak hash generation used.");
  }
};
validateSecrets();

const DIST_PATH = path.join(process.cwd(), "dist");

// ================= FIREBASE ADMIN SETUP =================
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (err) {
  console.error("Failed to read firebase-applet-config.json:", err);
}

const isFreeTierPlatform = (): boolean => {
  if (process.env.PLATFORM_TIER === "standard") return false;
  if (process.env.PLATFORM_TIER === "free") return true;
  return process.env.NODE_ENV === "production";
};

const ambientProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
const configProjectId = firebaseConfig.projectId;
const configStorageBucket =
  process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket ||
  (process.env.NODE_ENV === 'production' ? 'bhojanos-prod.firebasestorage.app' : 'bhojanos2.firebasestorage.app');
const projectId = ambientProjectId || configProjectId ||
  (process.env.NODE_ENV === 'production' ? 'bhojanos-prod' : 'bhojanos2');
const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
const FIRESTORE_READ_TIMEOUT_MS = Number(process.env.FIRESTORE_READ_TIMEOUT_MS || 12000);

/** Browser Firebase SDK config — shared by /api/client-config and /api/health?webClient=1 */
function getFirebaseWebClientConfig() {
  const pid = projectId || "bhojanos-prod";
  const webApiKey =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    "";
  const webAppId =
    process.env.FIREBASE_WEB_APP_ID ||
    process.env.VITE_FIREBASE_APP_ID ||
    "";
  const messagingSenderId =
    process.env.FIREBASE_WEB_MESSAGING_SENDER_ID ||
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    "";

  return {
    firebase: {
      apiKey: webApiKey,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${pid}.firebaseapp.com`,
      projectId: pid,
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        `${pid}.firebasestorage.app`,
      messagingSenderId,
      appId: webAppId,
    },
    configured: Boolean(webApiKey && webAppId),
  };
}

console.log("--- Firebase Admin Initialization ---");
console.log(`Ambient Project ID: ${ambientProjectId || 'not set'}`);
console.log(`Config Project ID: ${configProjectId || 'not set'}`);
console.log(`Using Project ID: ${projectId || 'unknown'}`);
console.log(`Using Database ID: ${databaseId}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Platform tier: ${isFreeTierPlatform() ? "free (Spark-safe)" : "standard"}`);
console.log("-------------------------------------");

let appAdmin: any;
try {
  if (getApps().length === 0) {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountVar) {
      try {
        const serviceAccount = JSON.parse(serviceAccountVar);
        appAdmin = initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId,
          storageBucket: configStorageBucket,
        });
        console.log(`✅ [Firebase Admin] Initialized with Service Account (Project: ${projectId})`);
      } catch (parseErr) {
        console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", parseErr);
        // Fallback
        appAdmin = initializeApp({
          projectId,
          storageBucket: configStorageBucket,
        });
      }
    } else {
      // Standard initialization for GCP/Firebase environments
      appAdmin = initializeApp({
        projectId,
        storageBucket: configStorageBucket,
      });
      console.log(`✅ [Firebase Admin] Initialized [DEFAULT] app (Project: ${appAdmin.options.projectId || 'ambient'}).`);
    }
  } else {
    appAdmin = getApp();
  }
} catch (err: any) {
  console.error(`❌ [Firebase Admin] Primary initialization failed: ${err.message}`);
  // 2. Fallback to explicit named app initialization
  try {
    const appOptions = { projectId: projectId || configProjectId, storageBucket: configStorageBucket };
    const appName = `app-fallback-${Date.now()}`;
    appAdmin = initializeApp(appOptions, appName);
    console.log(`✅ [Firebase Admin] Initialized fallback app '${appName}' (Project: ${appAdmin.options.projectId}).`);
  } catch (innerErr: any) {
    console.error(`❌ [Firebase Admin] Fallback initialization failed: ${innerErr.message}`);
  }
}

// Use a function to get the current working database instance
let _db: any;
const initFirestoreInstance = (app: any, dbId: string) => {
  try {
    const dbInstance = (dbId && dbId !== "(default)")
      ? initializeFirestore(app, { preferRest: true }, dbId)
      : initializeFirestore(app, { preferRest: true });
    console.log(`✅ [Firestore Admin] Initialized instance for database: ${dbId || '(default)'}`);
    return dbInstance;
  } catch (err: any) {
    console.warn(`⚠️ [Firestore Admin] Failed to init with database '${dbId}': ${err.message}`);
    return getFirestore(app);
  }
};

if (appAdmin) {
  _db = initFirestoreInstance(appAdmin, databaseId);
}

// Proxy to ensure all routes use the latest _db instance
export const db = new Proxy({} as any, {
  get: (_, prop) => {
    if (!_db) {
      console.warn("⚠️ [Firestore Proxy] _db is not initialized yet. Attempting emergency init.");
      try {
        const app = getApps().length > 0 ? getApp() : initializeApp();
        // Try named database first if available
        if (databaseId && databaseId !== "(default)") {
          try {
            _db = initializeFirestore(app, { preferRest: true }, databaseId);
            console.log(`✅ [Firestore Proxy] Emergency init successful with named database: ${databaseId}`);
          } catch (e) {
            _db = getFirestore(app);
            console.log(`⚠️ [Firestore Proxy] Emergency init fallback to default database.`);
          }
        } else {
          _db = getFirestore(app);
          console.log(`✅ [Firestore Proxy] Emergency init successful with default database.`);
        }
      } catch (err: any) {
        console.error(`🚨 [Firestore Proxy] Emergency init failed: ${err.message}`);
        return (...args: any[]) => {
          throw new Error(`Firestore not initialized. Cannot call ${String(prop)}: ${err.message}`);
        };
      }
    }
    
    if (prop === "databaseId") return (_db as any).databaseId || "(default)";
    
    const value = (_db as any)[prop];
    if (typeof value === 'function') {
      return (...args: any[]) => {
        return value.apply(_db, args);
      };
    }
    return value;
  }
});

let connectionLogs: string[] = [];
const logConnection = (msg: string) => {
  const timestamped = `[${new Date().toISOString()}] ${msg}`;
  console.log(msg);
  connectionLogs.push(timestamped);
  if (connectionLogs.length > 100) connectionLogs.shift();
};

const withTimeout = async <T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = FIRESTORE_READ_TIMEOUT_MS
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const isFirestorePermissionError = (err: any) =>
  err?.code === 7 || String(err?.message || '').includes("PERMISSION_DENIED");

const isFirestoreNotFoundError = (err: any) =>
  err?.code === 5 || String(err?.message || '').includes("NOT_FOUND");

const firestoreCountSince = async (collectionName: string, field: string, sinceIso: string): Promise<number> => {
  if (!_db) return 0;
  try {
    const snapshot = await _db
      .collection(collectionName)
      .where(field, ">=", sinceIso)
      .count()
      .get();
    return snapshot.data().count;
  } catch (err: any) {
    if (isFirestoreQuotaError(err)) {
      noteFirestoreQuotaExceeded(`count:${collectionName}`);
      throw err;
    }
    const fallback = await _db
      .collection(collectionName)
      .where(field, ">=", sinceIso)
      .limit(200)
      .get();
    return fallback.size;
  }
};

// Test connection and handle fallback
const verifyConnection = async () => {
  const testConnection = async (dbInstance: any, label: string) => {
    if (!dbInstance) return false;
    const dbId = (dbInstance as any).databaseId || "(default)";
    const projId = (dbInstance as any).projectId || "unknown";
    try {
      // Use a simple get to test permissions
      await dbInstance.collection("_admin_test_").doc("connection").get();
      logConnection(`✅ [Firestore Admin] Connection SUCCESS: ${label} [Project: ${projId}, DB: ${dbId}]`);
      return true;
    } catch (err: any) {
      logConnection(`ℹ️ [Firestore Admin] Connection FAILED: ${label} [Project: ${projId}, DB: ${dbId}] - ${err.message} (Code: ${err.code})`);
      return false;
    }
  };

  logConnection(`[Firestore Admin] Starting exhaustive connection verification...`);
  
  // 2. Try combinations with Ambient Project ID
  if (ambientProjectId) {
    console.log(`[Firestore Admin] Testing combinations with Ambient Project ID: ${ambientProjectId}`);
    try {
      const app = initializeApp({ projectId: ambientProjectId }, `verify-ambient-${Date.now()}`);
      
      // Try named database
      if (databaseId && databaseId !== "(default)") {
        const dbNamed = initializeFirestore(app, { preferRest: true }, databaseId);
        if (await testConnection(dbNamed, "Ambient Proj + Named DB")) {
          _db = dbNamed; appAdmin = app; return;
        }
      }
      
      // Try default database
      const dbDefault = getFirestore(app);
      if (await testConnection(dbDefault, "Ambient Proj + Default DB")) {
        _db = dbDefault; appAdmin = app; return;
      }
    } catch (e) {}
  }

  // 3. Try combinations with Config Project ID
  if (configProjectId && configProjectId !== ambientProjectId) {
    console.log(`[Firestore Admin] Testing combinations with Config Project ID: ${configProjectId}`);
    try {
      const app = initializeApp({ projectId: configProjectId }, `verify-config-${Date.now()}`);
      
      // Try named database
      if (databaseId && databaseId !== "(default)") {
        const dbNamed = initializeFirestore(app, { preferRest: true }, databaseId);
        if (await testConnection(dbNamed, "Config Proj + Named DB")) {
          _db = dbNamed; appAdmin = app; return;
        }
      }
      
      // Try default database
      const dbDefault = getFirestore(app);
      if (await testConnection(dbDefault, "Config Proj + Default DB")) {
        _db = dbDefault; appAdmin = app; return;
      }
    } catch (e) {}
  }

  // 4. Try completely ambient (no project ID)
  console.log(`[Firestore Admin] Testing completely ambient initialization...`);
  try {
    const app = initializeApp({}, `verify-pure-ambient-${Date.now()}`);
    
    if (databaseId && databaseId !== "(default)") {
      const dbNamed = initializeFirestore(app, { preferRest: true }, databaseId);
      if (await testConnection(dbNamed, "Pure Ambient + Named DB")) {
        _db = dbNamed; appAdmin = app; return;
      }
    }
    
    const dbDefault = getFirestore(app);
    if (await testConnection(dbDefault, "Pure Ambient + Default DB")) {
      _db = dbDefault; appAdmin = app; return;
    }
  } catch (e) {}

  // 5. Last resort: Try any existing app
  const apps = getApps();
  logConnection(`[Firestore Admin] Found ${apps.length} existing apps.`);
  for (const app of apps) {
    const appProjId = app.options.projectId || "unknown";
    logConnection(`[Firestore Admin] Testing existing app: ${app.name} [Project: ${appProjId}]`);
    const dbDefault = getFirestore(app);
    if (await testConnection(dbDefault, `Existing App (${app.name}) + Default DB`)) {
      _db = dbDefault; appAdmin = app; return;
    }
    if (databaseId && databaseId !== "(default)") {
      const dbNamed = initializeFirestore(app, { preferRest: true }, databaseId);
      if (await testConnection(dbNamed, `Existing App (${app.name}) + Named DB`)) {
        _db = dbNamed; appAdmin = app; return;
      }
    }
  }

  console.error("🚨 [Firestore Admin] ALL connection fallbacks failed. Permission errors are likely.");
};

// We will call this only inside startServer to avoid redundant calls

// ================= RAZORPAY SETUP =================
// ================= RAZORPAY SETUP =================
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

const isRazorpayConfigured = !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && 
                               !RAZORPAY_KEY_ID.includes("placeholder") && 
                               !RAZORPAY_KEY_SECRET.includes("placeholder"));

const razorpay = isRazorpayConfigured 
  ? new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    })
  : null;

const verifyRazorpaySignature = (orderId: string, paymentId: string, signature: string) => {
  if (!isRazorpayConfigured) return false;
  const hmac = createHmac("sha256", RAZORPAY_KEY_SECRET);
  hmac.update(orderId + "|" + paymentId);
  const generatedSignature = hmac.digest("hex");
  return generatedSignature === signature;
};


const app = express();
app.set('trust proxy', 1);

// ================= MIDDLEWARE =================
// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", globalLimiter);

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Strict limit for sensitive routes
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication Middlewares
const verifyFirebaseToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAdminAuth(appAdmin).verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    logger.error({ message: "Firebase token verification failed", error: error.message });
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

const requireAdmin = async (req: any, res: any, next: any) => {
  await verifyFirebaseToken(req, res, () => {
    if (req.user && req.user.admin === true) {
      next();
    } else {
      logger.warn({ message: "Admin access denied for user", uid: req.user?.uid });
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    }
  });
};

const requireSuperadmin = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAdminAuth(appAdmin).verifyIdToken(token);
    req.user = decodedToken;
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    let role = userDoc.data()?.role;
    const email = (decodedToken.email || userDoc.data()?.email || '').toLowerCase();
    if (role !== 'superadmin' && email) {
      const byEmail = await db.collection('users').where('email', '==', email).limit(5).get();
      for (const doc of byEmail.docs) {
        if (doc.data()?.role === 'superadmin') {
          role = 'superadmin';
          break;
        }
      }
    }
    const isFounder =
      email === 'manaintibojanamtpt@gmail.com' ||
      email === 'bhojanos26@gmail.com' ||
      email === (process.env.FOUNDER_EMAIL || 'manaintibojanamtpt@gmail.com').trim().toLowerCase();
    if (role === 'superadmin' || decodedToken.admin === true || isFounder) {
      return next();
    }
    logger.warn({ message: 'Superadmin access denied', uid: decodedToken.uid, role, email });
    return res.status(403).json({ success: false, error: 'Forbidden: Superadmin access required' });
  } catch (error: any) {
    logger.error({ message: 'Superadmin auth failed', error: error.message });
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

const serializeFirestoreValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return { seconds: Math.floor(date.getTime() / 1000), _type: 'timestamp' };
  }
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeFirestoreValue(v);
    }
    return out;
  }
  return value;
};

const assertOrderStatusAccess = async (req: any, orderData: Record<string, any>): Promise<boolean> => {
  if (req.user?.admin === true) return true;
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  const ownedTenantIds: string[] = userDoc.data()?.ownedTenantIds || [];
  return ownedTenantIds.includes(orderData.tenantId);
};

const applyOrderStatusUpdate = async (
  orderId: string,
  orderData: Record<string, any>,
  status: string,
  deliveryData?: Record<string, any>
) => {
  const currentStatus = orderData.status || 'UNKNOWN';
  const gate = assertFulfillmentTransition(orderData, status);
  if (!gate.allowed) {
    logger.warn({
      message: 'Payment gate blocked order status transition',
      orderId,
      tenantId: orderData.tenantId,
      fromStatus: currentStatus,
      toStatus: status,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: orderData.paymentStatus,
      code: gate.code,
    });
    const err: any = new Error(gate.error || 'Payment verification required.');
    err.code = gate.code || 'PAYMENT_NOT_VERIFIED';
    err.statusCode = 402;
    throw err;
  }

  const updatePayload: Record<string, any> = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
    statusHistory: FieldValue.arrayUnion({
      status,
      timestamp: new Date().toISOString(),
      description: `Order moved from ${currentStatus} to ${status}`,
      metadata: deliveryData || {},
    }),
  };

  if (deliveryData) {
    if (deliveryData.deliveryPartner) updatePayload.deliveryPartner = deliveryData.deliveryPartner;
    if (deliveryData.trackingUrl) updatePayload.trackingUrl = deliveryData.trackingUrl;
    if (deliveryData.trackingLink) updatePayload.trackingLink = deliveryData.trackingLink;
    if (deliveryData.riderName) updatePayload.riderName = deliveryData.riderName;
    if (deliveryData.riderPhone) updatePayload.riderPhone = deliveryData.riderPhone;
    if (deliveryData.deliveryAssignedAt) updatePayload.deliveryAssignedAt = deliveryData.deliveryAssignedAt;
  }

  await db.collection('orders').doc(orderId).update(updatePayload);
  return { ...orderData, ...updatePayload, id: orderId };
};

const expireUnpaidPayments = async (): Promise<{ draftsExpired: number; ordersExpired: number }> => {
  if (!_db) return { draftsExpired: 0, ordersExpired: 0 };

  const now = Date.now();
  let draftsExpired = 0;
  let ordersExpired = 0;

  const draftSnap = await _db.collection('order_drafts').where('status', '==', 'pending_payment').limit(200).get();
  for (const draftDoc of draftSnap.docs) {
    const draftData = draftDoc.data();
    if (!isDraftPaymentExpired(draftData)) continue;
    await draftDoc.ref.update({
      status: 'expired',
      updatedAt: FieldValue.serverTimestamp(),
    });
    draftsExpired += 1;
  }

  const recentOrdersSnap = await _db.collection('orders').orderBy('createdAt', 'desc').limit(250).get();
  for (const orderDoc of recentOrdersSnap.docs) {
    const orderData = orderDoc.data();
    if (orderData.isCOD || String(orderData.paymentMethod || '').toLowerCase() === 'cod') continue;

    const paymentStatus = String(orderData.paymentStatus || 'pending').toLowerCase();
    if (!['pending', 'pending_verification'].includes(paymentStatus)) continue;

    const expiresMs = toTimestampMs(orderData.expiresAt);
    if (expiresMs === null || expiresMs >= now) continue;

    const status = String(orderData.status || '').toUpperCase();
    if (['EXPIRED', 'CANCELLED', 'DELIVERED'].includes(status)) continue;

    await orderDoc.ref.update({
      status: 'EXPIRED',
      paymentStatus: 'expired',
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writePaymentVerification(_db, {
      tenantId: orderData.tenantId || 'mana-inti',
      orderId: orderDoc.id,
      action: 'expired',
      actorRole: 'system',
      source: 'system_expiry',
      previousPaymentStatus: paymentStatus,
      newPaymentStatus: 'expired',
    });
    ordersExpired += 1;
  }

  return { draftsExpired, ordersExpired };
};

app.use(cors());

// Webhook Scaffold (Must be before bodyParser.json)
app.post("/api/webhooks/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
  const correlationId = req.headers["x-correlation-id"] || "webhook-" + Date.now();
  const signature = req.headers["x-razorpay-signature"];
  const eventId = req.headers["x-razorpay-event-id"] || "unknown";

  try {
    if (!signature || !isRazorpayConfigured) {
      return res.status(400).send("Invalid signature or configuration");
    }

    const hmac = createHmac("sha256", RAZORPAY_KEY_SECRET);
    hmac.update(req.body); // req.body is a Buffer here
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== signature) {
      logger.error({ message: "Webhook signature mismatch", eventId, correlationId });
      return res.status(400).send("Signature mismatch");
    }

    const payload = JSON.parse(req.body.toString());
    
    // DETECT-ONLY MODE Logging
    logger.info({ message: "Razorpay Webhook Received", eventId, type: payload.event, correlationId });
    await writeSystemIncident("WEBHOOK_RECEIVED", "DETECTED", {
      event: payload.event,
      eventId,
      payload: payload.payload
    }, correlationId as string);

    // BATCH 2: RECONCILIATION PROMOTION
    if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity;
      const draftId = paymentEntity?.notes?.draftId;
      
      if (draftId) {
        try {
          await promoteDraftTransaction(
            draftId,
            { 
              razorpayOrderId: paymentEntity.order_id, 
              razorpayPaymentId: paymentEntity.id 
            },
            'webhook_recovery',
            eventId as string
          );
        } catch (promoErr: any) {
          logger.error({ message: "Webhook Promotion Failed", draftId, eventId, err: promoErr.message });
        }
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    logger.error({ message: "Webhook processing error", err: err.message, correlationId });
    res.status(500).send("Webhook error");
  }
});

// KYC inline upload — small JSON body; bypasses Firebase Storage (avoids storage-rules hangs)
app.post(
  "/api/owner/kyc/upload-inline",
  strictLimiter,
  verifyFirebaseToken,
  bodyParser.json({ limit: "2mb" }),
  async (req: any, res: any) => {
    try {
      const userId = req.user.uid;
      const { tenantId, slot, fileName, contentType, fileBase64, fileHash, fileSize } = req.body || {};

      if (!tenantId || !slot || !fileName || !fileBase64 || !fileHash) {
        return res.status(400).json({ error: "Missing required upload fields." });
      }
      if (slot !== "identity" && slot !== "business") {
        return res.status(400).json({ error: "Invalid document slot." });
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(String(fileBase64), "base64");
      } catch {
        return res.status(400).json({ error: "Invalid file encoding." });
      }

      const decodedSize = buffer.length;
      const declaredSize = Number(fileSize) || decodedSize;
      if (decodedSize <= 0 || decodedSize > MAX_INLINE_KYC_BYTES) {
        return res.status(400).json({ error: "File must be between 1 byte and 750KB." });
      }
      if (Math.abs(decodedSize - declaredSize) > 1024) {
        return res.status(400).json({ error: "File size mismatch. Please retry the upload." });
      }

      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        return res.status(403).json({ error: "User not found." });
      }

      const ownedTenantIds: string[] = userDoc.data()?.ownedTenantIds || [];
      if (!ownedTenantIds.includes(tenantId)) {
        return res.status(403).json({ error: "You do not own this kitchen." });
      }

      const tenantDoc = await db.collection("tenants").doc(tenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ error: "Kitchen not found." });
      }

      const kyc = tenantDoc.data()?.kyc as Record<string, unknown> | undefined;
      const fileDescriptor = {
        name: String(fileName),
        size: decodedSize,
        type: String(contentType || "application/octet-stream"),
      };

      const validationError = validateKycDocument(fileDescriptor, slot as KycDocumentSlot);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      try {
        assertNotDuplicateUpload(String(fileHash), slot as KycDocumentSlot, kyc);
      } catch (dupErr: any) {
        return res.status(409).json({ error: dupErr.message });
      }

      const documentUrl = buildInlineKycDocumentUrl(String(tenantId), slot);
      const prefix = slot === "identity" ? "identity" : "business";

      await db.collection("tenants").doc(tenantId).collection("kycPrivate").doc(slot).set({
        dataBase64: buffer.toString("base64"),
        contentType: fileDescriptor.type,
        fileName: fileDescriptor.name,
        fileHash: String(fileHash),
        fileSize: decodedSize,
        uploadedBy: userId,
        uploadedAt: FieldValue.serverTimestamp(),
      });

      await db.collection("tenants").doc(tenantId).update({
        [`kyc.${prefix}DocumentUrl`]: documentUrl,
        [`kyc.${prefix}DocumentHash`]: String(fileHash),
        [`kyc.${prefix}DocumentFileName`]: fileDescriptor.name,
        [`kyc.${prefix}DocumentStorage`]: "inline",
        "kyc.verificationLevel": 1,
        "kyc.status": "pending_verification",
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info({ message: "KYC inline document uploaded", tenantId, slot, userId, bytes: decodedSize });
      res.json({ success: true, url: documentUrl, fileName: fileDescriptor.name });
    } catch (err: any) {
      logger.error({
        message: "KYC inline upload failed",
        err: err.message,
        stack: err.stack,
        uid: req.user?.uid,
      });
      res.status(500).json({ error: err.message || "Upload failed." });
    }
  },
);

app.use(bodyParser.json());

// Correlation ID Middleware
app.use(async (req: any, res, next) => {
  let correlationId = req.headers["x-correlation-id"];
  if (!correlationId) {
    const { randomUUID } = await import('crypto');
    correlationId = randomUUID();
  }
  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId as string);
  next();
});

// In-memory cache for tenant validation (10 mins; stale-while-revalidate during quota)
const tenantCache: Record<string, { exists: boolean; status?: string; expiresAt: number }> = {};
const tenantLookupInflight = new Map<string, Promise<{ exists: boolean; status?: string }>>();
let lastTenantValidationErrorLogAt = 0;
const TENANT_CACHE_MS = Number(process.env.TENANT_CACHE_MS || 10 * 60 * 1000);

const shouldBypassTenantValidation = (path: string) =>
  path.startsWith("/api/health") ||
  path.startsWith("/api/server-time") ||
  path.startsWith("/api/env-debug") ||
  path.startsWith("/api/firestore-") ||
  path.startsWith("/api/cron/") ||
  path.startsWith("/api/admin/") ||
  path.startsWith("/api/webhooks/") ||
  path.startsWith("/api/monitoring/") ||
  path.startsWith("/api/client-errors") ||
  path.startsWith("/api/client-config") ||
  path.startsWith("/api/notifications/") ||
  path.startsWith("/api/owner/") ||
  path.startsWith("/api/platform/") ||
  path.startsWith("/api/auth/");

const loadTenantRecord = async (tenantId: string) => {
  if (tenantLookupInflight.has(tenantId)) {
    return tenantLookupInflight.get(tenantId)!;
  }

  const lookup = (async () => {
    const docSnap = await _db!.collection("tenants").doc(tenantId).get();
    return docSnap.exists
      ? { exists: true, status: docSnap.data()?.status as string | undefined }
      : { exists: false };
  })();

  tenantLookupInflight.set(tenantId, lookup);
  try {
    return await lookup;
  } finally {
    tenantLookupInflight.delete(tenantId);
  }
};

// Tenant Context Middleware — API routes only (never block marketing/static page loads)
app.use(async (req: any, res, next) => {
  const defaultTenantId = req.headers["x-tenant-id"] || req.query.tenantId || "mana-inti";

  if (!req.path.startsWith("/api/")) {
    req.tenantId = defaultTenantId;
    return next();
  }

  const tenantId = String(defaultTenantId);

  if (shouldBypassTenantValidation(req.path)) {
    req.tenantId = tenantId;
    return next();
  }

  try {
    const now = Date.now();
    let cached = tenantCache[tenantId];

    if (isFirestoreBackedOff()) {
      if (cached) {
        req.tenantId = tenantId;
        return next();
      }
      req.tenantId = tenantId;
      return next();
    }

    if (!cached || cached.expiresAt < now) {
      if (_db) {
        try {
          const record = await loadTenantRecord(tenantId);
          cached = { ...record, expiresAt: now + TENANT_CACHE_MS };
          tenantCache[tenantId] = cached;
        } catch (err: any) {
          if (isFirestoreQuotaError(err)) {
            noteFirestoreQuotaExceeded("tenantValidation");
            if (cached) {
              req.tenantId = tenantId;
              return next();
            }
            tenantCache[tenantId] = { exists: true, expiresAt: now + TENANT_CACHE_MS };
            req.tenantId = tenantId;
            return next();
          }
          throw err;
        }
      } else {
        req.tenantId = tenantId;
        return next();
      }
    }

    if (!cached.exists) {
      return res.status(400).json({ success: false, error: "Invalid Tenant ID" });
    }

    if (cached.status === "suspended") {
      return res.status(403).json({ success: false, error: "Tenant account is suspended" });
    }

    req.tenantId = tenantId;
    next();
  } catch (err: any) {
    const now = Date.now();
    if (now - lastTenantValidationErrorLogAt > 60_000) {
      lastTenantValidationErrorLogAt = now;
      console.error("Tenant validation error:", err?.message || err);
    }
    if (isFirestoreQuotaError(err)) noteFirestoreQuotaExceeded("tenantValidation");
    req.tenantId = tenantId;
    next();
  }
});

// SERVER TIME
app.get("/api/server-time", (req, res) => {
  res.json({ time: new Date().toISOString() });
});

// ENV DEBUG
app.get("/api/env-debug", (_, res) => {
  const sanitizedEnv: any = {};
  for (const key in process.env) {
    if (key.includes("KEY") || key.includes("SECRET") || key.includes("PASSWORD") || key.includes("TOKEN")) {
      sanitizedEnv[key] = "********";
    } else {
      sanitizedEnv[key] = process.env[key];
    }
  }
  res.json(sanitizedEnv);
});

// HEALTH CHECK
app.get("/api/health", async (req, res) => {
  const emailConfigured = Boolean(
    (process.env.EMAIL_USER || process.env.SMTP_USER) &&
      (process.env.EMAIL_PASS || process.env.SMTP_PASS) &&
      process.env.EMAIL_USER !== "your_email@gmail.com" &&
      process.env.EMAIL_PASS !== "your_app_password"
  );
  const status: any = {
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    email: {
      configured: emailConfigured,
      founderRecipient: (process.env.FOUNDER_EMAIL || "manaintibojanamtpt@gmail.com").trim().toLowerCase(),
    },
    firestore: {
      backedOff: isFirestoreBackedOff(),
      backoffUntil: firestoreQuotaBackoffUntil > Date.now()
        ? new Date(firestoreQuotaBackoffUntil).toISOString()
        : null,
      projectId,
    },
    platform: {
      tier: isFreeTierPlatform() ? "free" : "standard",
      build: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || "local",
    },
    firebase: {
      projectId: projectId || "unknown",
      databaseId: databaseId || "(default)",
      initialized: !!_db,
      activeDatabaseId: _db?.databaseId || "(default)",
      appProjectId: appAdmin?.options?.projectId || "unknown",
      apps: getApps().length
    }
  };
  if (req.query.webClient === "1") {
    status.webClient = getFirebaseWebClientConfig();
  }
  res.json(status);
});

/** Public Firebase web SDK config — fixes Vercel builds missing VITE_FIREBASE_* (frontend/backend project split). */
app.get("/api/client-config", (req, res) => {
  res.set("Cache-Control", "public, max-age=300");
  res.json(getFirebaseWebClientConfig());
});

app.get("/api/admin/verify-connection", async (req, res) => {
  try {
    logConnection("--- Manual Connection Verification Triggered ---");
    await verifyConnection();
    res.json({ 
      status: "ok", 
      message: "Connection verification completed.",
      logs: connectionLogs,
      firebase: {
        projectId: projectId || "unknown",
        databaseId: databaseId || "(default)",
        initialized: !!_db,
        activeDatabaseId: _db?.databaseId || "(default)",
        appProjectId: appAdmin?.options?.projectId || "unknown"
      }
    });
  } catch (err: any) {
    logConnection(`Manual Verification Error: ${err.message}`);
    res.status(500).json({ status: "error", message: err.message, logs: connectionLogs });
  }
});

// FIRESTORE STATUS (DEBUG)
app.get("/api/firestore-debug", async (_, res) => {
  res.json({
    ambientProjectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "not set",
    configProjectId: firebaseConfig.projectId || "not set",
    usingProjectId: projectId,
    usingDatabaseId: databaseId,
    initialized: !!_db,
    activeDatabaseId: _db?.databaseId || "unknown",
    apps: getApps().map(a => ({ name: a.name, projectId: a.options.projectId }))
  });
});

// FIRESTORE STATUS (OLD)
app.get("/api/firestore-status", async (_, res) => {
  try {
    const settingsDoc: any = await withTimeout(
      db.collection("adminSettings").doc("global").get(),
      "firestore-status adminSettings/global read"
    );
    const menuSnapshot: any = await withTimeout(
      db.collection("menu").limit(1).get(),
      "firestore-status menu limit(1) read"
    );

    res.json({
      success: true,
      databaseId: db.databaseId || "(default)",
      projectId: projectId,
      checks: {
        adminSettingsGlobal: {
          ok: true,
          exists: settingsDoc.exists,
        },
        menuLimit1: {
          ok: true,
          size: menuSnapshot.size,
          empty: menuSnapshot.empty,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      code: err.code,
      databaseId: db.databaseId || "(default)",
      projectId: projectId
    });
  }
});

// ================= HELPERS =================
const sanitizeData = (data: any): any => {
  // Firestore doesn't like undefined values, convert them to null
  return JSON.parse(JSON.stringify(data, (key, value) => {
    return value === undefined ? null : value;
  }));
};

// Client Errors Endpoint
app.post("/api/client-errors", (req: any, res) => {
  const { error, info } = req.body;
  logger.error({ message: "Client React Error", error, info, correlationId: req.correlationId });
  res.json({ status: "logged" });
});

// Monitoring / incident response intake
app.post("/api/monitoring/log", async (req: any, res) => {
  try {
    if (isFirestoreBackedOff()) {
      return res.status(202).json({ success: true, skipped: "firestore_quota_backoff" });
    }

    const { type, payload } = req.body || {};
    if (!type || typeof type !== "string") {
      return res.status(400).json({ success: false, error: "Missing incident type" });
    }

    // Drop noisy telemetry while quota is tight (client-side errors about quota itself)
    const payloadText = JSON.stringify(payload || {}).toLowerCase();
    if (payloadText.includes("quota exceeded") || payloadText.includes("resource-exhausted")) {
      return res.status(202).json({ success: true, skipped: "quota_noise" });
    }

    const correlationId = req.correlationId || `mon-${Date.now()}`;
    const enrichedPayload = {
      ...(payload || {}),
      loggedAt: new Date().toISOString(),
      correlationId,
    };

    await writeSystemIncident(type, "DETECTED", enrichedPayload, correlationId);

    const shouldMirrorToClientErrors = [
      "system_errors",
      "merchant_blockers",
      "payment_incidents",
      "security_events",
      "firestore_errors",
    ].includes(type);

    if (shouldMirrorToClientErrors && _db) {
      await _db.collection("client_errors").add({
        level: enrichedPayload.severity === "Critical" ? "CRITICAL" : "ERROR",
        message:
          enrichedPayload.error ||
          enrichedPayload.blockerType ||
          enrichedPayload.failureReason ||
          type,
        contextSummary: JSON.stringify(enrichedPayload).slice(0, 500),
        tenantId: enrichedPayload.tenantId || "unknown",
        route: enrichedPayload.route || "",
        incidentType: type,
        correlationId,
        timestamp: FieldValue.serverTimestamp(),
        resolved: false,
      });
    }

    res.json({ success: true, correlationId });
  } catch (err: any) {
    logger.error({ message: "Monitoring log failed", err: err.message, correlationId: req.correlationId });
    res.status(500).json({ success: false, error: "Failed to log incident" });
  }
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  logger.error({ message: "Unhandled Express Error", err: err.message, stack: err.stack, correlationId: req.correlationId });
  res.status(500).json({ success: false, error: "Internal Server Error" });
});

const seedMenu = async () => {
  const snapshot = await db.collection("menu").limit(1).get();
  if (snapshot.empty) {
    console.log("Seeding menu items...");
    const defaultMenu = [
      {
        name: "Chicken Biryani",
        price: 199,
        category: "Biryani",
        image: "https://i.pinimg.com/1200x/85/91/46/859146f57df94f4fb8e474446b666d6c.jpg",
        description: "Authentic Andhra style spicy chicken biryani.",
        discount: 10,
        isAvailable: true
      },
      {
        name: "Veg Thali",
        price: 150,
        category: "Meals",
        image: "https://i.pinimg.com/1200x/62/39/a4/6239a4a14a8e76ad94ba900f0520fbd7.jpg",
        description: "Traditional home-style veg thali with rice, sambar, and curries.",
        discount: 0,
        isAvailable: true
      }
    ];
    for (const item of defaultMenu) {
      await db.collection("menu").add({ ...item, createdAt: FieldValue.serverTimestamp() });
    }
  }
};

const seedCategories = async () => {
  const snapshot = await db.collection("categories").limit(1).get();
  if (snapshot.empty) {
    console.log("Seeding categories...");
    const defaultCategories = [
      { name: "Biryani", priority: 10, isActive: true },
      { name: "Meals", priority: 9, isActive: true },
      { name: "Starters", priority: 8, isActive: true },
      { name: "Desserts", priority: 7, isActive: true }
    ];
    for (const cat of defaultCategories) {
      await db.collection("categories").add({ ...cat, createdAt: FieldValue.serverTimestamp() });
    }
  }
};

let settingsCache: { data: any; expiresAt: number } | null = null;
const SETTINGS_CACHE_MS = Number(process.env.SETTINGS_CACHE_MS || 5 * 60 * 1000);

const DEFAULT_ADMIN_SETTINGS = {
  gst: 5,
  packingFee: 10,
  deliveryFee: 30,
  isStoreOpen: true,
  storeTiming: {
    openTime: "09:00",
    closeTime: "22:30",
    isManualOverride: false,
  },
  workflow: {
    autoMode: true,
    autoRetryWorker: true,
  },
};

const getSettings = async () => {
  if (settingsCache && Date.now() < settingsCache.expiresAt) {
    return settingsCache.data;
  }

  if (isFirestoreBackedOff()) {
    return settingsCache?.data ?? DEFAULT_ADMIN_SETTINGS;
  }

  try {
    if (!_db) {
      console.warn("⚠️ [Firestore Admin] _db not initialized in getSettings, using defaults.");
      return DEFAULT_ADMIN_SETTINGS;
    }
    const doc: any = await withTimeout(
      db.collection("adminSettings").doc("global").get(),
      "adminSettings/global read"
    );
    if (!doc.exists) {
      if (!isFreeTierPlatform()) {
        try {
          await withTimeout(
            db.collection("adminSettings").doc("global").set(DEFAULT_ADMIN_SETTINGS),
            "adminSettings/global default write"
          );
        } catch (e: any) {
          console.warn("⚠️ Failed to save default settings (might be read-only):", e.message);
        }
      }
      settingsCache = { data: DEFAULT_ADMIN_SETTINGS, expiresAt: Date.now() + SETTINGS_CACHE_MS };
      return DEFAULT_ADMIN_SETTINGS;
    }
    const data = doc.data();
    settingsCache = { data, expiresAt: Date.now() + SETTINGS_CACHE_MS };
    return data;
  } catch (err: any) {
    if (isFirestoreQuotaError(err)) {
      noteFirestoreQuotaExceeded("getSettings");
      if (settingsCache) return settingsCache.data;
    }

    // If it's code 5 (NOT_FOUND), it just means the document doesn't exist yet
    if (isFirestoreNotFoundError(err)) {
      settingsCache = { data: DEFAULT_ADMIN_SETTINGS, expiresAt: Date.now() + SETTINGS_CACHE_MS };
      return DEFAULT_ADMIN_SETTINGS;
    }

    if (isFirestorePermissionError(err)) {
      console.warn("⚠️ [Firestore Admin] Permission denied in getSettings.");
      return DEFAULT_ADMIN_SETTINGS;
    }

    console.error("❌ [Firestore Admin] Error fetching settings:", err.message);
    return DEFAULT_ADMIN_SETTINGS;
  }
};

import nodemailer from "nodemailer";

// --- NOTIFICATION HELPERS ---
type EmailSendResult = { sent: boolean; skipped?: boolean; reason?: string; messageId?: string };

const getFounderEmail = (): string =>
  (process.env.FOUNDER_EMAIL || "manaintibojanamtpt@gmail.com").trim().toLowerCase();

const getEmailFromAddress = (): string | null => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  return process.env.EMAIL_FROM || user || null;
};

const isEmailConfigured = (): boolean => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  return Boolean(
    user &&
      pass &&
      user !== "your_email@gmail.com" &&
      pass !== "your_app_password"
  );
};

const getEmailConfigStatus = () => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const maskedUser = user
    ? `${user.slice(0, 3)}***@${user.split("@")[1] || "?"}`
    : null;
  return {
    configured: isEmailConfigured(),
    smtpHost: process.env.EMAIL_HOST || "smtp.gmail.com",
    smtpPort: Number(process.env.EMAIL_PORT) || 587,
    senderUser: maskedUser,
    founderEmail: getFounderEmail(),
    emailFrom: getEmailFromAddress(),
  };
};

const formatEmailFromHeader = (brandLabel = "Mana Inti Bojanam"): string => {
  const emailFrom = getEmailFromAddress();
  if (!emailFrom) return "";
  if (emailFrom.includes("<")) return emailFrom;
  return `"${brandLabel}" <${emailFrom}>`;
};

const getTransporter = () => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT) || 587;

  if (!isEmailConfigured()) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000, // 5 seconds
  });
};

const classifyError = (channel: string, err: any): 'RETRYABLE' | 'NON_RETRYABLE' => {
  const code = err.code || err.message || '';
  if (channel === 'EMAIL') {
    if (
      code.includes('EAUTH') ||
      code.includes('EMAIL_NOT_CONFIGURED') ||
      code.includes('invalid email') ||
      err.status === 400
    ) {
      return 'NON_RETRYABLE';
    }
    return 'RETRYABLE';
  }
  if (channel === 'WHATSAPP') {
    if (err.status === 400 || err.status === 401 || err.status === 404) return 'NON_RETRYABLE';
    return 'RETRYABLE';
  }
  if (channel === 'FCM') {
    if (code.includes('invalid-registration-token') || code.includes('registration-token-not-registered') || code.includes('invalid-argument')) return 'NON_RETRYABLE';
    return 'RETRYABLE';
  }
  return 'RETRYABLE';
};

const enqueueNotification = async (payload: any) => {
  try {
    if (!_db) return;
    const { randomUUID } = await import('crypto');
    const delaySec = 60 + Math.floor(Math.random() * 15);
    const nextRetryAt = new Date(Date.now() + delaySec * 1000);
    
    await _db.collection('notification_outbox').doc(randomUUID()).set({
      ...payload,
      status: 'RETRY_PENDING',
      lockedUntil: null,
      attemptCount: 1,
      maxAttempts: 5,
      nextRetryAt: nextRetryAt.toISOString(), // Firestore doesn't like Date objects natively without Timestamp conversion sometimes, but ISO string is safe
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("Failed to enqueue notification:", err.message);
  }
};

const getFounderDisplayName = (): string =>
  (process.env.FOUNDER_NAME || "The BhojanOS Team").trim();

const getPublicAppBaseUrl = (): string =>
  (process.env.PUBLIC_APP_URL || "https://www.bhojanos.com").replace(/\/$/, "");

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildOwnerWelcomeEmailHtml = (params: {
  ownerName: string;
  restaurantName: string;
  tenantSlug: string;
}): string => {
  const founderName = getFounderDisplayName();
  const founderEmail = getFounderEmail();
  const setupUrl = `${getPublicAppBaseUrl()}/owner/setup`;
  const storefrontUrl = `${getPublicAppBaseUrl()}/k/${encodeURIComponent(params.tenantSlug)}`;
  const safeOwner = escapeHtml(params.ownerName || "there");
  const safeRestaurant = escapeHtml(params.restaurantName || "your kitchen");

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1410; max-width: 560px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1A0505 0%, #2d1208 100%); padding: 28px 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ff9f1c; font-size: 22px;">Welcome to BhojanOS</h1>
        <p style="margin: 8px 0 0; color: #f5e6dc; font-size: 14px;">Your direct ordering OS is ready to set up.</p>
      </div>
      <div style="padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
        <p>Hi ${safeOwner},</p>
        <p>
          Thank you for joining BhojanOS with <strong>${safeRestaurant}</strong>.
          We're excited to help you launch your own storefront, accept orders, and grow repeat customers — with 0% commission.
        </p>
        <p><strong>Your next steps:</strong></p>
        <ol>
          <li>Finish store setup (location, delivery, payments, menu)</li>
          <li>Publish your storefront when you're ready to go live</li>
          <li>Share your store link with customers</li>
        </ol>
        <p style="margin: 24px 0;">
          <a href="${setupUrl}" style="display: inline-block; background: #ff6b35; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: bold;">
            Continue setup
          </a>
        </p>
        <p style="font-size: 14px; color: #555;">
          Your storefront will be available at:<br />
          <a href="${storefrontUrl}" style="color: #ff6b35;">${storefrontUrl}</a>
        </p>
        <p style="margin-top: 28px; font-size: 14px; color: #555;">
          — ${founderName}<br />
          BhojanOS<br />
          <a href="mailto:${founderEmail}" style="color: #ff6b35;">${founderEmail}</a>
        </p>
      </div>
    </div>
  `;
};

async function sendOwnerWelcomeEmail(params: {
  to: string;
  ownerName: string;
  restaurantName: string;
  tenantSlug: string;
}): Promise<EmailSendResult> {
  const founderEmail = getFounderEmail();
  const subject = `Welcome to BhojanOS — ${params.restaurantName} is ready to set up`;
  const html = buildOwnerWelcomeEmailHtml(params);

  return sendEmailNotification(params.to, subject, html, {
    fromLabel: "BhojanOS",
    replyTo: founderEmail,
  });
}

async function sendEmailNotification(
  to: string,
  subject: string,
  body: string,
  options?: { fromLabel?: string; replyTo?: string }
): Promise<EmailSendResult> {
  const transporter = getTransporter();
  const emailFrom = getEmailFromAddress();

  if (!transporter || !emailFrom) {
    const reason = "Email credentials missing or using placeholders";
    console.warn(`⚠️ ${reason}. Skipping email to ${to}.`);
    console.log("💡 Set EMAIL_USER and EMAIL_PASS (Gmail App Password) on the backend host (e.g. Render).");
    return { sent: false, skipped: true, reason };
  }

  try {
    console.log(`📧 Attempting to send email to: ${to} (Subject: ${subject})`);

    const info = await transporter.sendMail({
      from: formatEmailFromHeader(options?.fromLabel),
      to,
      replyTo: options?.replyTo,
      subject,
      html: body,
    });
    console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
    if (err.code === "EAUTH") {
      console.error("🔑 Authentication failed. Use a Gmail App Password for EMAIL_PASS.");
    }

    await enqueueNotification({
      channel: "EMAIL",
      recipient: to,
      messagePayload: { subject, body },
      correlationId: `email-${Date.now()}`,
      relatedEntities: {},
      failureType: classifyError("EMAIL", err),
      lastError: err.message || String(err),
      attempts: [{ timestamp: new Date().toISOString(), errorReason: err.message }],
    });
    throw err;
  }
}

const normalizeIndianPhone = (phone?: string | null) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  return digits;
};

async function sendWhatsAppNotification(to: string, message: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || "v20.0";
  const normalizedPhone = normalizeIndianPhone(to);

  if (!normalizedPhone) {
    console.warn("WhatsApp notification skipped because phone number is missing.");
    return;
  }

  if (!token || !phoneNumberId) {
    console.log(`[WHATSAPP MOCK] To: ${normalizedPhone} | Message: ${message}`);
    console.log("Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to enable Meta WhatsApp delivery.");
    return;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: "text",
        text: {
          preview_url: true,
          body: message
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`WhatsApp notification failed: ${response.status} ${errorText}`);
      return;
    }

    console.log(`WhatsApp notification sent to ${normalizedPhone}`);
  } catch (err: any) {
    console.error(`WhatsApp notification error for ${normalizedPhone}:`, err.message);
    await enqueueNotification({
      channel: 'WHATSAPP',
      recipient: normalizedPhone,
      messagePayload: { body: message },
      correlationId: `whatsapp-${Date.now()}`,
      relatedEntities: {},
      failureType: classifyError('WHATSAPP', err),
      lastError: err.message || String(err),
      attempts: [{ timestamp: new Date().toISOString(), errorReason: err.message }]
    });
  }
}

const buildOrderNotification = (order: any, status: string) => {
  const orderLabel = order.orderNumber ? `#${order.orderNumber}` : order.id ? `#${String(order.id).slice(-6).toUpperCase()}` : "";
  const statusKey = String(status || "").toUpperCase();

  const messages: Record<string, { title: string; body: string }> = {
    PENDING: {
      title: "Order placed",
      body: `Your order ${orderLabel} has been placed successfully.`
    },
    ACCEPTED: {
      title: "Order accepted",
      body: `Your order ${orderLabel} has been accepted by Mana Inti Bojanam.`
    },
    PREPARING: {
      title: "Chef is preparing your order",
      body: `Your order ${orderLabel} is now being prepared.`
    },
    READY: {
      title: "Order is ready",
      body: `Your order ${orderLabel} is ready for pickup or delivery.`
    },
    OUT_FOR_DELIVERY: {
      title: "Out for delivery",
      body: `Your order ${orderLabel} is on the way.`
    },
    DISPATCHED: {
      title: "Out for delivery",
      body: `Your order ${orderLabel} has been dispatched.`
    },
    DELIVERED: {
      title: "Order delivered",
      body: `Your order ${orderLabel} has been delivered. Enjoy your meal!`
    },
    CANCELLED: {
      title: "Order cancelled",
      body: `Your order ${orderLabel} has been cancelled.`
    },
    PAYMENT_VERIFICATION: {
      title: "Payment not confirmed",
      body: `Payment for order ${orderLabel} was not confirmed. Please complete checkout or contact support.`
    }
  };

  return messages[statusKey] || {
    title: "Order update",
    body: `Your order ${orderLabel} status changed to ${statusKey || "updated"}.`
  };
};

async function sendPushNotificationToUser(userId: string, title: string, body: string, data: Record<string, string>) {
  try {
    if (!appAdmin || !_db) {
      console.warn("Push notification skipped because Firebase Admin is not initialized.");
      return;
    }

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.warn(`Push notification skipped because user ${userId} was not found.`);
      return;
    }

    const user = userDoc.data() || {};
    const tokens = Array.from(new Set([...(user.deviceTokens || []), ...(user.fcmTokens || [])])).filter(Boolean);

    if (tokens.length === 0) {
      console.log(`Push notification skipped because user ${userId} has no device tokens.`);
      return;
    }

    const safeData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value || "")])
    );

    const response = await getMessaging(appAdmin).sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: safeData,
      webpush: {
        notification: {
          title,
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png"
        },
        fcmOptions: {
          link: safeData.url || "/my-orders"
        }
      }
    });

    const invalidTokens = response.responses
      .map((result, index) => ({ result, token: tokens[index] }))
      .filter(({ result }) => {
        const code = result.error?.code || "";
        return code.includes("registration-token-not-registered") || code.includes("invalid-registration-token");
      })
      .map(({ token }) => token);

    if (invalidTokens.length > 0) {
      await db.collection("users").doc(userId).set({
        deviceTokens: FieldValue.arrayRemove(...invalidTokens),
        fcmTokens: FieldValue.arrayRemove(...invalidTokens)
      }, { merge: true });
    }

    console.log(`Push notification result for ${userId}: ${response.successCount}/${tokens.length} sent.`);
  } catch (err: any) {
    console.error(`Push notification error for ${userId}:`, err.message);
    await enqueueNotification({
      channel: 'FCM',
      recipient: userId,
      messagePayload: { title, body, data },
      correlationId: `fcm-${Date.now()}`,
      relatedEntities: { userId },
      failureType: classifyError('FCM', err),
      lastError: err.message || String(err),
      attempts: [{ timestamp: new Date().toISOString(), errorReason: err.message }]
    });
  }
}

// ================= PREP ALERTS WORKER =================
const processPrepAlertsBatch = async () => {
  if (!_db || isFirestoreBackedOff()) return;
  try {
    const now = Date.now();
    
    // Find accepted orders first, then detect scheduled shape in code.
    // Older docs may have orderType/isScheduled instead of deliveryType.
    const snapshot = await _db.collection('orders')
      .where('status', '==', 'ACCEPTED')
      .limit(100)
      .get();
      
    if (snapshot.empty) return;

    for (const docSnapshot of snapshot.docs) {
      const order = docSnapshot.data();
      if (order.prepAlertSent === true) continue;

      const isScheduledOrder =
        String(order.deliveryType || '').toLowerCase() === 'scheduled' ||
        String(order.orderType || '').toLowerCase() === 'scheduled' ||
        String(order.fulfillmentType || '').toLowerCase() === 'scheduled' ||
        order.isScheduled === true ||
        Boolean(order.scheduledFor || order.scheduledTime);

      if (!isScheduledOrder) continue;

      const scheduledValue = order.scheduledFor || order.scheduledTime;
      const scheduledMs = typeof scheduledValue?.toDate === 'function'
        ? scheduledValue.toDate().getTime()
        : scheduledValue
          ? new Date(scheduledValue).getTime()
          : 0;
      
      if (!scheduledMs || Number.isNaN(scheduledMs)) continue;
      
      const prepStart = scheduledMs - 60 * 60000; // 60 minutes before scheduled time
      if (now >= prepStart) {
        // Time to prepare!
        try {
          await docSnapshot.ref.update({
            status: 'PREPARING',
            prepAlertSent: true,
            updatedAt: FieldValue.serverTimestamp()
          });
          logger.info({ message: "Order transitioned to PREPARING", orderId: docSnapshot.id });
          
          if (order.userId) {
            await enqueueNotification({
              channel: 'FCM',
              recipient: order.userId,
              messagePayload: {
                title: "Order Preparing 🍲",
                body: `Your scheduled order #${order.orderNumber || docSnapshot.id.slice(-4)} is now being prepared!`,
                data: { url: "/my-orders" }
              },
              correlationId: `prep-${docSnapshot.id}`,
              relatedEntities: { orderId: docSnapshot.id, userId: order.userId }
            });
          }
        } catch (err: any) {
          logger.error({ message: "Failed to process prep alert", orderId: docSnapshot.id, err: err.message });
        }
      }
    }
  } catch (err: any) {
    if (isFirestoreQuotaError(err)) {
      noteFirestoreQuotaExceeded("processPrepAlertsBatch");
    } else {
      logger.error({ message: "processPrepAlertsBatch error", err: err.message });
    }
  }
};

// ================= NOTIFICATION OUTBOX WORKER =================
const processOutboxBatch = async () => {
  if (!_db || isFirestoreBackedOff()) return;
  try {
    const now = new Date();
    
    // 1. Fetch pending notifications
    const snapshot = await _db.collection('notification_outbox')
      .where('status', '==', 'RETRY_PENDING')
      .where('nextRetryAt', '<=', now.toISOString())
      .limit(20)
      .get();
      
    if (snapshot.empty) return;

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
      // 2. Acquire Lease
      const lockTime = new Date(now.getTime() + 5 * 60000).toISOString();
      try {
        await docSnapshot.ref.update({
          status: 'PROCESSING',
          lockedUntil: lockTime
        });
      } catch (lockErr) {
        continue; // Someone else grabbed it or doc changed
      }

      // 3. Process
      let success = false;
      let currentError = null;
      const startTime = Date.now();

      try {
        if (data.channel === 'EMAIL') {
          const emailResult = await sendEmailNotification(
            data.recipient,
            data.messagePayload.subject,
            data.messagePayload.body
          );
          if (!emailResult.sent) {
            const configErr = new Error(emailResult.reason || "Email not sent");
            (configErr as any).code = emailResult.skipped ? "EMAIL_NOT_CONFIGURED" : "EMAIL_SEND_FAILED";
            throw configErr;
          }
        } else if (data.channel === 'WHATSAPP') {
          await sendWhatsAppNotification(data.recipient, data.messagePayload.body);
        } else if (data.channel === 'FCM') {
          await sendPushNotificationToUser(data.recipient, data.messagePayload.title, data.messagePayload.body, data.messagePayload.data || {});
        }
        success = true;
      } catch (sendErr: any) {
        currentError = sendErr;
        // Specifically handle FCM Token Cleanup for Non-Retryable errors caught in the worker
        if (data.channel === 'FCM' && (sendErr.message.includes('invalid-registration-token') || sendErr.message.includes('registration-token-not-registered'))) {
          try {
            await _db.collection("users").doc(data.recipient).set({
              deviceTokens: FieldValue.arrayRemove(data.messagePayload.token), // If we knew the token, but we send to userId
              fcmTokens: FieldValue.arrayRemove(data.messagePayload.token)
            }, { merge: true });
          } catch(e) {}
        }
      }

      const durationMs = Date.now() - startTime;
      
      // 4. Resolve State
      if (success) {
        // Hard delete DELIVERED items to save space
        await docSnapshot.ref.delete();
      } else {
        const failureType = classifyError(data.channel, currentError);
        const attemptCount = (data.attemptCount || 1) + 1;
        const attempts = data.attempts || [];
        attempts.push({
          timestamp: new Date().toISOString(),
          errorReason: currentError?.message || String(currentError),
          durationMs
        });

        if (failureType === 'NON_RETRYABLE' || attemptCount > (data.maxAttempts || 5)) {
          await docSnapshot.ref.update({
            status: 'DEAD_LETTER',
            lockedUntil: null,
            failureType,
            lastError: currentError?.message || String(currentError),
            attempts
          });
        } else {
          // Calculate Capped Exponential Backoff with Jitter
          const BASE_DELAY_SEC = 60;
          const MAX_BACKOFF_SEC = 3600;
          const JITTER_MAX_SEC = 15;
          
          const boundedAttempt = Math.min(attemptCount, 10);
          const rawBackoff = BASE_DELAY_SEC * Math.pow(2, boundedAttempt - 1);
          const jitter = Math.floor(Math.random() * JITTER_MAX_SEC);
          const delaySec = Math.min(rawBackoff, MAX_BACKOFF_SEC) + jitter;
          
          await docSnapshot.ref.update({
            status: 'RETRY_PENDING',
            lockedUntil: null,
            attemptCount,
            nextRetryAt: new Date(Date.now() + delaySec * 1000).toISOString(),
            lastError: currentError?.message || String(currentError),
            attempts
          });
        }
      }
    }
  } catch (err: any) {
    if (isFirestoreQuotaError(err)) {
      noteFirestoreQuotaExceeded("processOutboxBatch");
    } else {
      console.error("Outbox Processing Error:", err.message);
    }
  }
};

async function notifyCustomer(order: any, status: string) {
  const statusMessages: Record<string, string> = {
    PENDING: `Your order #${order.orderNumber} has been placed successfully! We'll start preparing it soon.`,
    PREPARING: `Good news! Our chef is now preparing your order #${order.orderNumber}. It will be ready shortly.`,
    READY: `Your order #${order.orderNumber} is ready and waiting for pickup/delivery!`,
    OUT_FOR_DELIVERY: `Your order #${order.orderNumber} is out for delivery! 🛵 Our rider is on the way to your location.`,
    DELIVERED: `Your order #${order.orderNumber} has been delivered. Enjoy your delicious home-cooked meal! 🍛`,
    CANCELLED: `Your order #${order.orderNumber} has been cancelled. If you paid online, your refund will be processed within 5-7 business days.`
  };

  let message = statusMessages[status] || `Order #${order.orderNumber} status updated to ${status}`;
  
  // Add tracking info if available
  if (status === 'OUT_FOR_DELIVERY' && order.deliveryPartner) {
    message += `\n\n*Delivery Partner:* ${order.deliveryPartner}`;
    if (order.riderName) message += `\n*Rider:* ${order.riderName} (${order.riderPhone || 'N/A'})`;
    if (order.trackingUrl || order.trackingLink) message += `\n*Track here:* ${order.trackingUrl || order.trackingLink}`;
  }

  const trackingLink = `${process.env.APP_URL || 'http://localhost:3000'}/order/${order.id}`;
  const userEmail = order.userEmail || order.email;

  if (userEmail) {
    const emailBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
        <h2 style="color: #ea580c;">Mana Inti Bojanam</h2>
        <p>Hi ${order.userName || 'Customer'},</p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        
        ${order.deliveryTimeSlot && order.deliveryTimeSlot !== 'ASAP' ? `
          <div style="background-color: #fff7ed; padding: 10px; border-radius: 5px; margin: 15px 0; border: 1px solid #ffedd5;">
            <p style="margin: 0; color: #ea580c; font-weight: bold;">Scheduled Delivery: ${order.deliveryTimeSlot}</p>
          </div>
        ` : ''}

        <p><b>Order Details:</b></p>
        <ul>
          ${order.items.map((i: any) => `<li>${i.name} x ${i.quantity}</li>`).join('')}
        </ul>
        <p><b>Total:</b> ₹${order.totalAmount}</p>
        <p><b>Payment Method:</b> ${order.paymentMethod === 'razorpay' || order.paymentMethod === 'online' || order.paymentMethod === 'upi' ? 'Online (Razorpay)' : 'Cash on Delivery'}</p>
        
        <div style="margin-top: 20px; text-align: center;">
          <a href="${trackingLink}" style="background-color: #ea580c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Order Status</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">Order ID: #${order.orderNumber}</p>
        <p style="font-size: 12px; color: #666;">This is an automated notification. Please do not reply to this email.</p>
      </div>
    `;
    await sendEmailNotification(userEmail, `Order Status Update - #${order.orderNumber}`, emailBody);
  }
  
  if (order.phone) {
    let whatsappMsg = `${message}\n\n`;
    if (order.deliveryTimeSlot && order.deliveryTimeSlot !== 'ASAP') {
      whatsappMsg += `*Scheduled For:* ${order.deliveryTimeSlot}\n\n`;
    }
    whatsappMsg += `*Track your order here:* ${trackingLink}\n\nThank you for ordering from Mana Inti Bojanam!`;
    await sendWhatsAppNotification(order.phone, whatsappMsg);
  }

  if (order.userId) {
    const push = buildOrderNotification(order, status);
    await sendPushNotificationToUser(order.userId, push.title, push.body, {
      orderId: order.id || "",
      status: String(status || ""),
      type: "order_status_update",
      url: `/order/${order.id}`
    });
  }
}

async function notifyAdmin(order: any) {
  const message = `🚨 *New Order Received!* 🚨\n\n` +
    `*Order:* #${order.orderNumber}\n` +
    `*Customer:* ${order.userName || 'Guest'}\n` +
    `*Phone:* ${order.phone}\n` +
    `*Items:* ${order.items.map((i: any) => `${i.name} x${i.quantity}`).join(', ')}\n` +
    `*Total:* ₹${order.totalAmount}\n` +
    `*Payment:* ${order.paymentMethod.toUpperCase()}\n\n` +
    `Check admin dashboard for details.`;
  await sendWhatsAppNotification("917666258454", message); // Using the business number from Checkout.tsx
}

// ================= AUTO WORKFLOW WORKER =================
const startAutoWorkflow = () => {
  setInterval(async () => {
    try {
      const settings = await getSettings();
      if (!settings.workflow?.autoMode) return;

      const now = Date.now();
      const snapshot = await db.collection("orders")
        .where("status", "in", ["PENDING", "PREPARING", "READY"])
        .get();

      for (const doc of snapshot.docs) {
        const order = doc.data();
        const createdAt = order.createdAt?.toDate ? order.createdAt.toDate().getTime() : new Date(order.createdAt).getTime();
        const elapsedMinutes = (now - createdAt) / 60000;

        let newStatus = null;
        if (order.status === "PENDING" && elapsedMinutes >= 1) {
          newStatus = "PREPARING";
        } else if (order.status === "PREPARING" && elapsedMinutes >= 5) {
          newStatus = "READY";
        }

        if (newStatus) {
          await doc.ref.update({ status: newStatus });
          console.log(`⚙️ Auto Workflow: Order #${order.orderNumber} updated to ${newStatus}`);
        }
      }
    } catch (err) {
      console.error("Auto Workflow Error:", err);
    }
  }, 30000); // Check every 30 seconds
};

// ================= EMAIL NOTIFICATION =================
app.post("/api/send-order-email", async (req, res) => {
  const { order } = req.body;
  if (!order) return res.status(400).json({ success: false, error: "Order data missing" });

  await notifyCustomer(order, 'PENDING');
  res.json({ success: true });
});

// ================= WHATSAPP NOTIFICATION =================
app.post("/api/notify/whatsapp", async (req, res) => {
  const { orderId, phoneNumber, message } = req.body;
  
  // LOGIC: In production, integrate with Twilio or Meta WhatsApp API
  console.log(`📱 [WHATSAPP MOCK] To: ${phoneNumber} | Order: ${orderId}`);
  console.log(`Message: ${message}`);

  // Simulate success
  res.json({ 
    success: true, 
    provider: "mock",
    timestamp: new Date().toISOString() 
  });
});

// ================= ADMIN REPORT =================
app.post("/api/admin/send-report", requireAdmin, async (req: any, res: any) => {
  const { data, email } = req.body;
  if (!data || !email) return res.status(400).json({ success: false, error: "Missing data or email" });

  try {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000, // 5 seconds
    });

    const mailOptions = {
      from: `"Mana Inti Bojanam Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Business Report - ${new Date().toLocaleDateString()}`,
      text: `Please find the attached business report for ${new Date().toLocaleDateString()}.`,
      attachments: [
        {
          filename: `Business_Report_${new Date().toLocaleDateString()}.xlsx`,
          content: buffer
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err: any) {
    console.error("❌ Report email failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= COUPON VALIDATION =================
app.post("/api/coupons/validate", async (req, res) => {
  const { code, subtotal } = req.body;
  
  if (!_db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const couponSnap = await _db.collection("coupons")
      .where("code", "==", code.toUpperCase())
      .limit(1)
      .get();

    if (couponSnap.empty) {
      return res.status(404).json({ valid: false, message: "Invalid coupon code" });
    }

    const coupon = couponSnap.docs[0].data();
    
    // Check if active
    if (coupon.isActive === false) {
      return res.status(400).json({ valid: false, message: "This coupon is no longer active" });
    }
    
    // Check expiry
    if (coupon.expiryDate) {
      const expiry = new Date(coupon.expiryDate);
      expiry.setHours(23, 59, 59, 999);
      if (expiry < new Date()) {
        return res.status(400).json({ valid: false, message: "Coupon has expired" });
      }
    }

    // Check min order
    if (coupon.minOrder && subtotal < coupon.minOrder) {
      return res.status(400).json({ 
        valid: false, 
        message: `Minimum order of ₹${coupon.minOrder} required` 
      });
    }

    res.json({ 
      valid: true, 
      discount: coupon.discountValue, 
      type: coupon.discountType,
      code: coupon.code,
      minOrder: coupon.minOrder || 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= MENU ITEM REVIEWS =================
app.post("/api/menu/review", async (req, res) => {
  const { menuItemId, userId, userEmail, rating, feedback } = req.body;
  
  if (!_db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const batch = _db.batch();
    const reviewRef = _db.collection("reviews").doc();
    
    const reviewData = {
      menuItemId,
      userId,
      userEmail,
      rating: Number(rating),
      feedback,
      createdAt: FieldValue.serverTimestamp()
    };

    batch.set(reviewRef, reviewData);

    // Update menu item rating and count
    const menuItemRef = _db.collection("menu").doc(menuItemId);
    const menuItemSnap = await menuItemRef.get();
    
    if (menuItemSnap.exists()) {
      const data = menuItemSnap.data();
      const currentRating = data?.rating || 0;
      const currentCount = data?.reviewCount || 0;
      
      const newCount = currentCount + 1;
      const newRating = ((currentRating * currentCount) + Number(rating)) / newCount;
      
      batch.update(menuItemRef, {
        rating: Number(newRating.toFixed(1)),
        reviewCount: newCount
      });
    }

    await batch.commit();
    res.json({ success: true, message: "Review submitted successfully" });
  } catch (err: any) {
    console.error("Menu Review Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= REVIEWS SUBMISSION (ORDER) =================
app.post("/api/reviews/submit", async (req, res) => {
  const { orderId, userId, rating, feedback, items } = req.body;
  
  if (!_db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const batch = _db.batch();
    const reviewRef = _db.collection("reviews").doc();
    
    batch.set(reviewRef, {
      orderId,
      userId,
      rating,
      feedback,
      items,
      createdAt: FieldValue.serverTimestamp()
    });

    // Update order with rating
    const orderRef = _db.collection("orders").doc(orderId);
    batch.update(orderRef, { rating, feedback });

    // Update menu items ratings (simplified: just increment count and order count)
    for (const item of items) {
      const menuRef = _db.collection("menu").doc(item.id);
      batch.update(menuRef, {
        itemOrderCount: FieldValue.increment(item.quantity),
        reviewCount: FieldValue.increment(1)
      });
    }

    await batch.commit();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= REGISTRATION APIs =================
app.post("/api/register-owner-check", strictLimiter, async (req, res) => {
  try {
    const { email, fingerprint, recaptchaToken } = req.body;
    
    if (!_db) return res.status(500).json({ success: false, error: 'Database not initialized' });

    // 1. Bot Protection (reCAPTCHA)
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (secret) {
      if (!recaptchaToken) return res.status(400).json({ success: false, error: 'reCAPTCHA required' });
      const verifyRes = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${recaptchaToken}`, { method: 'POST' });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return res.status(400).json({ success: false, error: 'reCAPTCHA validation failed' });
      }
    } else {
      console.warn('⚠️ RECAPTCHA_SECRET_KEY is missing. Registration proceeding without bot protection.');
    }

    // 2. Trial Abuse Defense (Fingerprint)
    if (fingerprint) {
       const snap = await _db.collection('trial_fingerprints').doc(fingerprint).get();
       if (snap.exists && snap.data()?.trialUsed) {
         return res.status(403).json({ success: false, error: 'Trial limit exceeded for this device or environment.' });
       }
       // Mark it immediately to prevent parallel abuse. 
       await _db.collection('trial_fingerprints').doc(fingerprint).set({
         trialUsed: true,
         email: email,
         createdAt: FieldValue.serverTimestamp()
       });
    }
    
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ message: "Registration check error", err: err.message });
    res.status(500).json({ success: false, error: 'Registration validation failed' });
  }
});

// ================= OWNER PROVISIONING (Admin SDK — bypasses client Firestore rules) =================

const OWNER_RESERVED_SLUGS = [
  'dominos', 'swiggy', 'zomato', 'kfc', 'mcdonalds', 'burgerking', 'subway',
  'admin', 'support', 'api', 'system', 'bhojanos',
];

const slugFromRestaurantName = (restaurantName: string): string =>
  restaurantName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const isReservedOwnerSlug = (slug: string): boolean =>
  OWNER_RESERVED_SLUGS.some((reserved) => slug.startsWith(reserved));

const FOUNDER_TENANT_ID = (process.env.FOUNDER_TENANT_ID || "mana-inti").trim();

const isFounderOwnerEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const founderEnv = (process.env.FOUNDER_EMAIL || "manaintibojanamtpt@gmail.com").trim().toLowerCase();
  return (
    normalized === "manaintibojanamtpt@gmail.com" ||
    normalized === founderEnv ||
    normalized === "bhojanos26@gmail.com"
  );
};

/** Founder standalone kitchen — mana-inti owner + superadmin role + admin API claims. */
async function linkFounderTenantIfNeeded(userId: string, email?: string | null): Promise<string[]> {
  if (!isFounderOwnerEmail(email)) return [];

  const normalizedEmail = email!.trim().toLowerCase();
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();
  const existingOwned: string[] = userDoc.exists ? userDoc.data()?.ownedTenantIds || [] : [];
  const tenantIds = Array.from(new Set([...existingOwned.filter(Boolean), FOUNDER_TENANT_ID]));

  await db.collection("tenants").doc(FOUNDER_TENANT_ID).set({ ownerId: userId }, { merge: true });

  await userRef.set(
    {
      userId,
      ownedTenantIds: tenantIds,
      role: "superadmin",
      email: normalizedEmail,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await getAdminAuth(appAdmin).setCustomUserClaims(userId, { admin: true });

  return tenantIds;
}

/** Link tenant docs to user via Admin SDK (client cannot write ownedTenantIds/role). */
async function syncOwnerTenantsForUser(
  userId: string,
  email?: string | null,
): Promise<string[]> {
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  const existingOwned: string[] = userDoc.exists ? userDoc.data()?.ownedTenantIds || [] : [];

  if (isFounderOwnerEmail(email || userDoc.data()?.email)) {
    return linkFounderTenantIfNeeded(userId, email || userDoc.data()?.email);
  }

  if (existingOwned.length > 0) {
    return existingOwned.filter(Boolean);
  }

  const byOwnerSnap = await db.collection('tenants').where('ownerId', '==', userId).get();
  let tenantIds = byOwnerSnap.docs.map((d) => d.id);

  const normalizedEmail = (email || userDoc.data()?.email || '').trim().toLowerCase();
  if (tenantIds.length === 0 && normalizedEmail) {
    const emailQueries = [
      db.collection('tenants').where('kyc.email', '==', normalizedEmail),
      db.collection('tenants').where('email', '==', normalizedEmail),
      db.collection('tenants').where('ownerEmail', '==', normalizedEmail),
    ];
    const found = new Set<string>();
    for (const q of emailQueries) {
      try {
        const snap = await q.get();
        snap.docs.forEach((d) => found.add(d.id));
      } catch {
        /* index may not exist for optional fields */
      }
    }
    tenantIds = Array.from(found);
    await Promise.all(
      tenantIds.map((tenantId) =>
        db.collection('tenants').doc(tenantId).set({ ownerId: userId }, { merge: true }),
      ),
    );
  }

  if (tenantIds.length > 0) {
    await userRef.set(
      {
        ownedTenantIds: tenantIds,
        role: 'owner',
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  return tenantIds;
}

app.post('/api/owner/sync-tenants', verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const ownedTenantIds = await syncOwnerTenantsForUser(userId, req.user.email);
    res.json({ success: true, ownedTenantIds });
  } catch (err: any) {
    logger.error({ message: 'Owner tenant sync failed', err: err.message, uid: req.user?.uid });
    res.status(500).json({ success: false, error: err.message || 'Failed to sync owner tenants' });
  }
});

const MAX_MENU_IMAGE_CHARS = 900_000;

async function assertOwnerTenantAccess(
  userId: string,
  tenantId: string,
  email?: string | null,
): Promise<string> {
  if (!tenantId) {
    const err: any = new Error('tenantId is required');
    err.statusCode = 400;
    throw err;
  }

  let resolvedTenantId = tenantId.trim();
  let tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
  if (!tenantDoc.exists) {
    const bySlug = await db.collection('tenants').where('slug', '==', resolvedTenantId).limit(1).get();
    if (!bySlug.empty) {
      resolvedTenantId = bySlug.docs[0].id;
      tenantDoc = bySlug.docs[0];
    }
  }

  if (!tenantDoc.exists) {
    const err: any = new Error('Tenant not found');
    err.statusCode = 404;
    throw err;
  }

  const tenantData = tenantDoc.data() || {};
  const tenantOwnerId = tenantData.ownerId;
  const tenantSlug = typeof tenantData.slug === 'string' ? tenantData.slug.trim() : '';
  if (tenantOwnerId && tenantOwnerId === userId) {
    return resolvedTenantId;
  }

  await syncOwnerTenantsForUser(userId, email);

  const userDoc = await db.collection('users').doc(userId).get();
  const data = userDoc.exists ? userDoc.data() || {} : {};
  const owned: string[] = data.ownedTenantIds || [];
  const role = data.role;
  const normalizedEmail = (email || data.email || '').toLowerCase();

  const ownsTenant =
    owned.includes(resolvedTenantId) ||
    (tenantSlug && owned.includes(tenantSlug));

  if (
    ownsTenant ||
    role === 'superadmin' ||
    role === 'admin' ||
    isFounderOwnerEmail(normalizedEmail)
  ) {
    return resolvedTenantId;
  }

  if (normalizedEmail) {
    const byEmail = await db.collection('users').where('email', '==', normalizedEmail).limit(3).get();
    for (const docSnap of byEmail.docs) {
      const docOwned: string[] = docSnap.data()?.ownedTenantIds || [];
      const docRole = docSnap.data()?.role;
      if (docOwned.includes(resolvedTenantId) || docRole === 'superadmin' || docRole === 'admin') {
        return resolvedTenantId;
      }
    }
  }

  const err: any = new Error('Unauthorized for this tenant');
  err.statusCode = 403;
  throw err;
}

function normalizeMenuItemPayload(body: Record<string, unknown>, tenantId: string) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const price = Number(body.price);
  const type = body.type === 'non-veg' ? 'non-veg' : 'veg';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const image = typeof body.image === 'string' ? body.image : '';
  const isAvailable = body.isAvailable !== false;

  if (!name || !category || !Number.isFinite(price) || price < 0) {
    const err: any = new Error('Name, category, and a valid price are required');
    err.statusCode = 400;
    throw err;
  }
  if (image.length > MAX_MENU_IMAGE_CHARS) {
    const err: any = new Error('Image is too large. Use a smaller photo (under 200KB).');
    err.statusCode = 400;
    throw err;
  }

  return {
    tenantId,
    name,
    category,
    price,
    type,
    description,
    image,
    isAvailable,
  };
}

app.post('/api/owner/menu/items', verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
    const resolvedTenantId = await assertOwnerTenantAccess(userId, tenantId, req.user.email);
    const item = normalizeMenuItemPayload(req.body || {}, resolvedTenantId);
    const ref = await db.collection('menu').add({
      ...item,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.json({ success: true, id: ref.id });
  } catch (err: any) {
    const status = err.statusCode || 500;
    logger.error({ message: 'Owner menu create failed', err: err.message, uid: req.user?.uid });
    res.status(status).json({ success: false, error: err.message || 'Failed to save menu item' });
  }
});

app.put('/api/owner/menu/items/:id', verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const itemId = req.params.id;
    const existing = await db.collection('menu').doc(itemId).get();
    if (!existing.exists) {
      return res.status(404).json({ success: false, error: 'Menu item not found' });
    }
    const tenantId =
      (typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '') ||
      existing.data()?.tenantId;
    const resolvedTenantId = await assertOwnerTenantAccess(userId, tenantId, req.user.email);
    const item = normalizeMenuItemPayload({ ...existing.data(), ...req.body }, resolvedTenantId);
    await db.collection('menu').doc(itemId).set(
      { ...item, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    res.json({ success: true, id: itemId });
  } catch (err: any) {
    const status = err.statusCode || 500;
    logger.error({ message: 'Owner menu update failed', err: err.message, uid: req.user?.uid });
    res.status(status).json({ success: false, error: err.message || 'Failed to update menu item' });
  }
});

app.delete('/api/owner/menu/items/:id', verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const itemId = req.params.id;
    const existing = await db.collection('menu').doc(itemId).get();
    if (!existing.exists) {
      return res.status(404).json({ success: false, error: 'Menu item not found' });
    }
    const tenantId = existing.data()?.tenantId;
    await assertOwnerTenantAccess(userId, tenantId, req.user.email);
    await db.collection('menu').doc(itemId).delete();
    res.json({ success: true, id: itemId });
  } catch (err: any) {
    const status = err.statusCode || 500;
    logger.error({ message: 'Owner menu delete failed', err: err.message, uid: req.user?.uid });
    res.status(status).json({ success: false, error: err.message || 'Failed to delete menu item' });
  }
});

const CLOUD_KITCHEN_TEMPLATE_ITEMS = [
  { name: 'Idli (3)', price: 70, category: 'Breakfast', type: 'veg', isVeg: true, description: 'Soft steamed idlis with sambar and coconut chutney.' },
  { name: 'Plain Dosa', price: 50, category: 'Breakfast', type: 'veg', isVeg: true, description: 'Crispy golden dosa with chutney and sambar.' },
  { name: 'Masala Dosa', price: 80, category: 'Breakfast', type: 'veg', isVeg: true, description: 'Crispy dosa with spiced potato masala filling.' },
  { name: 'Sambar Rice', price: 119, category: 'Meals', type: 'veg', isVeg: true, description: 'Hot sambar rice with lentil stew and tempering.' },
  { name: 'Curd Rice', price: 129, category: 'Meals', type: 'veg', isVeg: true, description: 'Creamy curd rice with mild seasoning.' },
  { name: 'Veg Fried Rice', price: 99, category: 'Rice', type: 'veg', isVeg: true, description: 'Classic veg fried rice with crunchy vegetables.' },
  { name: 'Chicken Fried Rice', price: 189, category: 'Rice', type: 'non-veg', isVeg: false, description: 'Chicken fried rice with tender meat and crisp veggies.' },
  { name: 'Andhra Veg Thali (Mini)', price: 149, category: 'Thali', type: 'veg', isVeg: true, description: 'Compact Andhra veg thali for a lighter meal.' },
];

app.post('/api/owner/menu/seed-template', verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
    const resolvedTenantId = await assertOwnerTenantAccess(userId, tenantId, req.user.email);

    const existing = await db.collection('menu').where('tenantId', '==', resolvedTenantId).get();
    if (existing.size >= 3) {
      return res.status(400).json({ success: false, error: 'Menu already has items. Edit in Menu Builder or delete items first.' });
    }

    const existingNames = new Set(
      existing.docs.map((d) => (d.data().name || '').toString().trim().toLowerCase()),
    );

    let added = 0;
    const batch = db.batch();
    for (const item of CLOUD_KITCHEN_TEMPLATE_ITEMS) {
      if (existingNames.has(item.name.trim().toLowerCase())) continue;
      const ref = db.collection('menu').doc();
      batch.set(ref, {
        tenantId: resolvedTenantId,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        type: item.type,
        isVeg: item.isVeg,
        isAvailable: true,
        image: '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      added += 1;
    }

    if (added === 0) {
      return res.status(400).json({ success: false, error: 'All template items already exist in your menu.' });
    }

    await batch.commit();

    res.json({ success: true, added, tenantId: resolvedTenantId });
  } catch (err: any) {
    const status = err.statusCode || 500;
    logger.error({ message: 'Owner menu seed failed', err: err.message, uid: req.user?.uid });
    res.status(status).json({ success: false, error: err.message || 'Failed to import template menu' });
  }
});

app.post('/api/owner/onboarding/step', verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const { tenantId, step, payload, nextStep, isComplete } = req.body || {};
    if (!tenantId || typeof tenantId !== 'string') {
      return res.status(400).json({ success: false, error: 'tenantId is required' });
    }
    const resolvedTenantId = await assertOwnerTenantAccess(userId, tenantId, req.user.email);
    const updates: Record<string, unknown> = { ...(payload || {}), updatedAt: FieldValue.serverTimestamp() };

    if (typeof nextStep === 'number') {
      updates['onboardingStatus.currentStep'] = nextStep;
    }
    if (isComplete === true) {
      updates['onboardingStatus.isComplete'] = true;
      updates['onboardingStatus.completedAt'] = FieldValue.serverTimestamp();
      updates['onboardingStatus.migrated'] = false;
    }

    await db.collection('tenants').doc(resolvedTenantId).set(updates, { merge: true });
    res.json({ success: true, tenantId: resolvedTenantId, step, nextStep });
  } catch (err: any) {
    const status = err.statusCode || 500;
    logger.error({ message: 'Owner onboarding step save failed', err: err.message, uid: req.user?.uid });
    res.status(status).json({ success: false, error: err.message || 'Failed to save onboarding step' });
  }
});

app.post('/api/owner/provision', strictLimiter, verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const { name, email, restaurantName, mobileNumber } = req.body || {};

    if (!restaurantName || typeof restaurantName !== 'string') {
      return res.status(400).json({ success: false, error: 'Restaurant name is required.' });
    }

    const slug = slugFromRestaurantName(restaurantName);
    if (!slug) {
      return res.status(400).json({ success: false, error: 'Please enter a valid restaurant name.' });
    }
    if (isReservedOwnerSlug(slug)) {
      return res.status(400).json({ success: false, error: 'This store name is reserved or unavailable. Please choose another.' });
    }

    const ownerEmail = (email || req.user.email || '').trim().toLowerCase();
    const ownerName = (name || req.user.name || 'Owner').trim();

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const existingOwned: string[] = userDoc.exists ? userDoc.data()?.ownedTenantIds || [] : [];
    if (existingOwned.length > 0) {
      return res.json({ success: true, tenantSlug: existingOwned[0], alreadyProvisioned: true });
    }

    const tenantRef = db.collection('tenants').doc(slug);
    const tenantDoc = await tenantRef.get();
    if (tenantDoc.exists) {
      const existingOwnerId = tenantDoc.data()?.ownerId;
      if (existingOwnerId && existingOwnerId !== userId) {
        return res.status(409).json({ success: false, error: 'This store name is already taken. Please choose another.' });
      }
    }

    const nowIso = new Date().toISOString();
    await userRef.set(
      {
        userId,
        name: ownerName,
        email: ownerEmail,
        role: 'owner',
        ownedTenantIds: [slug],
        updatedAt: FieldValue.serverTimestamp(),
        ...(userDoc.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );

    await tenantRef.set(
      {
        name: restaurantName.trim(),
        slug,
        ownerId: userId,
        status: 'draft',
        storeStatus: 'draft',
        subscription: {
          planId: 'starter',
          status: 'active',
          startDate: nowIso,
          trialUsed: false,
        },
        legal: { status: 'pending' },
        fssai: {
          verificationStatus: 'not_submitted',
          registrationDate: nowIso,
        },
        kyc: {
          ownerName,
          email: ownerEmail,
          emailVerificationStatus: 'pending',
          mobileNumber: mobileNumber || '',
          mobileVerificationStatus: 'pending',
          verificationLevel: 0,
        },
        onboardingStatus: {
          isComplete: false,
          currentStep: 1,
          migrated: false,
        },
        paymentConfig: {
          defaultProvider: 'cod',
          providers: {
            cod: { enabled: true },
            razorpay: { enabled: false },
          },
        },
        pricingConfig: {
          gstPercent: 0,
          packingFee: 0,
        },
        deliveryConfig: {
          enabled: true,
          freeRadius: 2,
          paidRadius: 5,
          maxRadius: 10,
          baseFee: 0,
          perKmCharge: 0,
          prepTime: 20,
          feesConfigured: false,
        },
        settings: { theme: 'orange' },
        updatedAt: FieldValue.serverTimestamp(),
        ...(tenantDoc.exists ? {} : { createdAt: nowIso }),
      },
      { merge: true },
    );

    logger.info({ message: 'Owner store provisioned', userId, tenantSlug: slug });
    res.json({ success: true, tenantSlug: slug });
  } catch (err: any) {
    logger.error({ message: 'Owner provision failed', err: err.message, uid: req.user?.uid });
    res.status(500).json({ success: false, error: err.message || 'Failed to provision store' });
  }
});

app.post("/api/owner/welcome-email", strictLimiter, verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const { tenantSlug } = req.body || {};

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(403).json({ success: false, error: "User not found" });
    }

    const userData = userDoc.data() || {};
    const ownedTenantIds: string[] = userData.ownedTenantIds || [];
    const resolvedTenantSlug = tenantSlug || ownedTenantIds[0];

    if (!resolvedTenantSlug) {
      return res.status(400).json({ success: false, error: "No tenant associated with this account" });
    }

    if (!ownedTenantIds.includes(resolvedTenantSlug)) {
      return res.status(403).json({ success: false, error: "Unauthorized for this tenant" });
    }

    const tenantRef = db.collection("tenants").doc(resolvedTenantSlug);
    const tenantDoc = await tenantRef.get();
    if (!tenantDoc.exists) {
      return res.status(404).json({ success: false, error: "Tenant not found" });
    }

    const tenantData = tenantDoc.data() || {};
    if (tenantData.ownerId && tenantData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: "Unauthorized for this tenant" });
    }

    if (tenantData.communications?.welcomeEmailSentAt) {
      return res.json({
        success: true,
        alreadySent: true,
        sentAt: tenantData.communications.welcomeEmailSentAt,
      });
    }

    const recipientEmail = (
      tenantData.kyc?.email ||
      userData.email ||
      req.user.email ||
      ""
    )
      .trim()
      .toLowerCase();

    if (!recipientEmail) {
      return res.status(400).json({ success: false, error: "Tenant email address is missing" });
    }

    const ownerName = tenantData.kyc?.ownerName || userData.name || req.user.name || "there";
    const restaurantName = tenantData.name || resolvedTenantSlug;

    const emailResult = await sendOwnerWelcomeEmail({
      to: recipientEmail,
      ownerName,
      restaurantName,
      tenantSlug: resolvedTenantSlug,
    });

    if (!emailResult.sent) {
      return res.status(503).json({
        success: false,
        error: emailResult.reason || "Welcome email could not be sent",
        skipped: emailResult.skipped,
      });
    }

    await tenantRef.set(
      {
        communications: {
          ...(tenantData.communications || {}),
          welcomeEmailSentAt: new Date().toISOString(),
          welcomeEmailRecipient: recipientEmail,
        },
      },
      { merge: true }
    );

    logger.info({
      message: "Owner welcome email sent",
      tenantSlug: resolvedTenantSlug,
      recipientEmail,
      messageId: emailResult.messageId,
    });

    res.json({
      success: true,
      emailSent: true,
      recipientEmail,
      messageId: emailResult.messageId,
    });
  } catch (err: any) {
    logger.error({ message: "Owner welcome email error", error: err.message });
    res.status(500).json({ success: false, error: err.message || "Failed to send welcome email" });
  }
});

// ================= RAZORPAY APIs =================
app.post("/api/create-razorpay-order", strictLimiter, async (req, res) => {
  try {
    const { draftId, planId, userId } = req.body;
    
    if (!draftId && !planId) {
      return res.status(400).json({ success: false, error: 'draftId or planId is required for payment generation' });
    }

    if (!_db) {
      return res.status(500).json({ success: false, error: 'Database not initialized' });
    }

    let finalAmount = 0;

    if (draftId) {
      // Phase 1 Security Patch: Authoritative Backend Recalculation
      const draftDoc = await _db.collection('order_drafts').doc(draftId).get();
      if (!draftDoc.exists) {
        return res.status(404).json({ success: false, error: 'Draft not found' });
      }
      const draftDocData = draftDoc.data() || {};

      if (draftDocData.status === 'promoted') {
        return res.status(409).json({ success: false, error: 'This order draft was already paid and promoted.' });
      }

      if (isDraftPaymentExpired(draftDocData)) {
        await _db.collection('order_drafts').doc(draftId).update({
          status: 'expired',
          updatedAt: FieldValue.serverTimestamp(),
        });
        return res.status(410).json({ success: false, error: 'Payment session expired. Please place the order again.' });
      }

      const draft = draftDocData.orderPayload || draftDocData;

      let calculatedSubtotal = 0;
      if (draft.items && Array.isArray(draft.items)) {
        for (const item of draft.items) {
          if (!item.menuItemId) continue;
          const menuDoc = await _db.collection('menu').doc(item.menuItemId).get();
          if (menuDoc.exists) {
            calculatedSubtotal += (menuDoc.data().price * item.quantity);
          }
        }
      }

      // Reconstruct totals
      const tax = calculatedSubtotal * 0.05; // 5% GST
      const packingFee = draft.packingFee || 0;
      const deliveryFee = draft.deliveryFee || 0;
      const discount = draft.discountAmount || 0;
      
      finalAmount = calculatedSubtotal > 0 
        ? calculatedSubtotal + tax + packingFee + deliveryFee - discount
        : draft.totalAmount; // Fallback
    } else if (planId) {
      // Hardcoded Authoritative Subscription Prices
      if (planId === '1_meal') finalAmount = 3000;
      else if (planId === '2_meals') finalAmount = 5500;
      else if (planId === 'premium') finalAmount = 6500;
      else return res.status(400).json({ success: false, error: 'Invalid planId' });
    }

    const amount = finalAmount;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid calculated amount' });
    }

    if (!isRazorpayConfigured) {
      const message = 'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.';
      console.warn(`⚠️ ${message}`);
      
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ 
          success: true, 
          isMock: true,
          order: {
            id: `mock_order_${Date.now()}`,
            amount: Math.round(amount * 100),
            currency: "INR"
          },
        });
      }

      return res.status(500).json({ success: false, error: message });
    }

    const options = {
      amount: Math.round(amount * 100), // amount in the smallest currency unit
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        draftId,
        userId: userId || 'anonymous'
      }
    };
    const order = await razorpay.orders.create(options);
    logger.info({ message: "Razorpay order created", amount, orderId: order.id, draftId, correlationId: (req as any).correlationId });

    if (draftId) {
      await _db.collection('order_drafts').doc(draftId).update({
        razorpayOrderId: order.id,
        expiresAt: new Date(Date.now() + PAYMENT_PENDING_DRAFT_TTL_MS),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    res.json({ success: true, order, key: RAZORPAY_KEY_ID });
  } catch (err: any) {
    const correlationId = (req as any).correlationId;
    logger.error({ message: "Razorpay Order Creation Error", err: err.error?.description || err.message, correlationId });
    const errorMessage = err.error?.description || err.message || "Failed to create Razorpay order";
    res.status(500).json({ 
      success: false, 
      error: `${errorMessage}. Please check your Razorpay keys in the Secrets panel or use Cash on Delivery.` 
    });
  }
});

app.post("/api/verify-razorpay-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, draftId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !draftId) {
      return res.status(400).json({ success: false, error: 'Missing payment verification parameters or draftId.' });
    }

    if (!isRazorpayConfigured) {
      const message = 'Razorpay is not configured for verification. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.';
      console.warn(`⚠️ ${message}`);
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ success: true, verified: true, isMock: true });
      }
      return res.status(500).json({ success: false, error: message });
    }

    const verified = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!verified) {
      logger.warn({ message: 'Razorpay signature verification failed', draftId, razorpay_order_id });
      return res.status(400).json({ success: false, verified: false, error: 'Razorpay payment signature verification failed.' });
    }

    const draftDoc = await _db.collection('order_drafts').doc(draftId).get();
    if (!draftDoc.exists) {
      return res.status(404).json({ success: false, error: 'Order draft not found.' });
    }
    const draftData = draftDoc.data() || {};
    if (isDraftPaymentExpired(draftData)) {
      logger.warn({ message: 'Verify rejected: draft payment session expired', draftId });
      await _db.collection('order_drafts').doc(draftId).update({
        status: 'expired',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return res.status(410).json({ success: false, error: 'Payment session expired. Please place the order again.' });
    }

    const promotion = await promoteDraftTransaction(
      draftId,
      { razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id },
      'client_callback'
    );

    res.json({ success: true, verified: true, orderId: draftId, promoted: promotion.promoted });
  } catch (err: any) {
    console.error("Razorpay Payment Verification Error:", err);
    logger.error({ message: 'Razorpay payment verification error', draftId: req.body?.draftId, error: err.message });
    const errorMessage = err.message || "Failed to verify Razorpay payment.";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// NOTIFY REGISTRATION
app.post("/api/admin/notify-registration", requireAdmin, async (req: any, res: any) => {
  try {
    const { displayName, email, phoneNumber } = req.body;
    
    console.log(`🆕 New Registration: ${displayName} (${email})`);
    
    await sendEmailNotification(
      email,
      "Welcome to Mana Inti Bojanam!",
      `<h1>Welcome ${displayName}!</h1><p>Thank you for registering with Mana Inti Bojanam. We are excited to serve you authentic Andhra meals.</p>`
    );
    
    await sendWhatsAppNotification(phoneNumber, `Welcome to Mana Inti Bojanam, ${displayName}! We are excited to serve you authentic Andhra meals.`);
    
    res.json({ success: true });
  } catch (err: any) {
    console.error("Registration Notification Error:", err);
    res.status(500).json({ success: false, error: "Failed to send notification" });
  }
});

// GET MENU
app.get("/api/menu", async (_, res) => {
  try {
    const snapshot: any = await withTimeout(db.collection("menu").get(), "menu collection read");
    const menu = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: menu });
  } catch (err: any) {
    console.error("Menu read error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch menu",
      detail: err.message,
      code: err.code,
      databaseId: _db?.databaseId || "(default)",
      projectId: projectId || "unknown",
    });
  }
});

// LIGHTWEIGHT MENU DIAGNOSTIC
app.get("/api/menu-ping", async (_, res) => {
  try {
    const snapshot: any = await withTimeout(
      db.collection("menu").limit(1).get(),
      "menu limit(1) read"
    );
    res.json({
      success: true,
      size: snapshot.size,
      empty: snapshot.empty,
      databaseId: _db?.databaseId || "(default)",
      projectId: projectId || "unknown",
    });
  } catch (err: any) {
    console.error("Menu ping error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to read menu limit(1)",
      detail: err.message,
      code: err.code,
      databaseId: _db?.databaseId || "(default)",
      projectId: projectId || "unknown",
    });
  }
});

// GET SETTINGS
app.get("/api/admin/settings", requireAdmin, async (_: any, res: any) => {
  try {
    const settings = await getSettings();
    res.json({ success: true, data: settings });
  } catch (err: any) {
    console.error("Settings read error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settings",
      detail: process.env.NODE_ENV === 'production' ? undefined : err.message,
      databaseId: _db?.databaseId || "(default)",
      projectId: projectId || "unknown",
    });
  }
});

// ================= ORDERS =================

// CREATE ORDER
app.post("/api/orders", verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const { 
      items, 
      address, 
      phone, 
      userId, 
      userName,
      userEmail,
      paymentMethod, 
      razorpayOrderId, 
      razorpayPaymentId, 
      instructions,
      deliveryPartner,
      trackingLink,
      riderName,
      riderPhone,
      status,
      couponCode,
      deliveryTimeSlot
    } = req.body;

    if (!items || !phone || !address) {
      console.warn("⚠️ Order placement failed: Missing required fields", { items: !!items, phone: !!phone, address: !!address });
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: "Items must be an array" });
    }

    console.log(`📦 Processing order for ${userName || phone} (${items.length} items) [DEPRECATED /api/orders creator]`);
    const settings = await getSettings();
    console.log(`⚙️ Using settings: GST=${settings.gst}%, Packing=₹${settings.packingFee}, Delivery=₹${settings.deliveryFee}`);

    // Deprecation notice: the SPA writes orders directly to Firestore (src/services/api.ts:createOrder).
    // Keep this endpoint for backward compatibility, but make the deprecation explicit.
    res.setHeader('Deprecation', 'true');
    res.setHeader('X-Deprecated-Endpoint', '/api/orders');

    // Normalize payment method into SPA-compatible values
    const paymentMethodRaw = String(paymentMethod || '').toLowerCase();
    const normalizedPaymentMethod = paymentMethodRaw === 'cod' ? 'cod' : 'razorpay';

    // PRICING ENGINE (create immutable per-item snapshots like the SPA)
    let subtotal = 0;
    const gstRate = Number(settings.gst || 0);
    const orderItems = (items as any[]).map((i: any) => {
      const unitPrice = Number(i.unitPrice ?? i.price ?? 0);
      const quantity = Number(i.quantity ?? 1);
      const discountPct = Number(i.discount ?? 0);
      const lineSubtotal = unitPrice * quantity;
      const discountAmount = (unitPrice * discountPct) / 100 * quantity;
      const lineTax = (lineSubtotal * gstRate) / 100;
      const lineTotal = lineSubtotal + lineTax - discountAmount;
      subtotal += lineSubtotal;

      return {
        menuItemId: String(i.menuItemId ?? i.id ?? ''),
        name: String(i.name ?? 'Item'),
        unitPrice,
        quantity,
        lineSubtotal,
        discount: discountAmount,
        discountApplied: discountPct > 0,
        lineTax,
        lineTotal,
      };
    });

    if (isNaN(subtotal) || subtotal < 0) {
      console.error("❌ Invalid subtotal calculated:", subtotal);
      return res.status(400).json({ success: false, error: "Invalid order total" });
    }

    // COUPON VALIDATION (RE-VALIDATE ON BACKEND)
    let discountAmount = 0;
    let appliedCouponData = null;

    if (couponCode && _db) {
      const couponSnap = await _db.collection("coupons")
        .where("code", "==", couponCode.toUpperCase())
        .where("isActive", "==", true)
        .limit(1)
        .get();

      if (!couponSnap.empty) {
        const coupon = couponSnap.docs[0].data();
        const isExpired = coupon.expiryDate && new Date(coupon.expiryDate).setHours(23, 59, 59, 999) < new Date().getTime();
        const isMinOrderMet = !coupon.minOrder || subtotal >= coupon.minOrder;

        if (!isExpired && isMinOrderMet) {
          if (coupon.discountType === 'percentage') {
            discountAmount = (subtotal * coupon.discountValue) / 100;
          } else {
            discountAmount = coupon.discountValue;
          }
          appliedCouponData = {
            code: coupon.code,
            discountValue: coupon.discountValue,
            discountType: coupon.discountType,
            amount: discountAmount
          };
        }
      }
    }

    const gstAmount = (subtotal * gstRate) / 100;
    const totalAmount = subtotal - discountAmount + gstAmount + Number(settings.packingFee || 0) + Number(settings.deliveryFee || 0);

    const orderNumber = Math.floor(100000 + Math.random() * 900000);

    const isOnline = normalizedPaymentMethod === 'razorpay';
    const expiresAt = isOnline ? new Date(Date.now() + 5 * 60 * 1000) : null;

    const order = {
      orderNumber,
      userId: userId || null,
      customerName: userName || null,
      userEmail: userEmail || null,
      phone,
      address,

      items: orderItems,
      subtotal,
      discountAmount,
      appliedCoupon: appliedCouponData,
      gst: gstRate,
      gstAmount,
      packingFee: Number(settings.packingFee || 0),
      deliveryFee: Number(settings.deliveryFee || 0),
      totalAmount,

      // Canonical lifecycle fields used by the SPA
      status: String(status || "PLACED").toUpperCase(),
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: isOnline ? 'pending' : 'pending',
      expiresAt,
      isCOD: normalizedPaymentMethod === 'cod',

      // Optional extras (kept for compatibility)
      razorpayOrderId: razorpayOrderId || null,
      razorpayPaymentId: razorpayPaymentId || null,
      instructions: instructions || null,
      deliveryPartner: deliveryPartner || null,
      trackingLink: trackingLink || null,
      riderName: riderName || null,
      riderPhone: riderPhone || null,
      deliveryTimeSlot: deliveryTimeSlot || "ASAP",
      eta: 30 + Math.floor(Math.random() * 15), // Random ETA between 30-45 mins

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Sanitize data to remove any undefined values
    const sanitizedOrder = sanitizeData(order);
    sanitizedOrder.createdAt = FieldValue.serverTimestamp(); // Restore server timestamp

    let docRef;
    try {
      console.log(`[Firestore Admin] Attempting to place order #${orderNumber} in database: ${db.databaseId || '(default)'}`);
      docRef = await db.collection("orders").add(sanitizedOrder);
      console.log(`✅ [Firestore Admin] Order #${orderNumber} placed successfully. Doc ID: ${docRef.id}`);
      
      // Increment itemOrderCount for each item in the order
      const batch = db.batch();
      for (const item of orderItems) {
        if (item.menuItemId) {
          const menuRef = db.collection("menu").doc(item.menuItemId);
          batch.update(menuRef, {
            itemOrderCount: FieldValue.increment(item.quantity)
          });
        }
      }
      await batch.commit().catch(err => console.error("⚠️ Failed to update itemOrderCount:", err));
    } catch (dbErr: any) {
      console.error("❌ Order Placement Firestore Error:", dbErr);
      console.error(`[Firestore Admin] Error Details: Code=${dbErr.code}, Message=${dbErr.message}, Stack=${dbErr.stack}`);
      
      // Try one last time with a fresh getFirestore() if it's a permission or not found issue
      if (dbErr.code === 7 || dbErr.code === 5 || dbErr.message.includes("PERMISSION_DENIED") || dbErr.message.includes("NOT_FOUND")) {
        console.log("⚠️ Attempting emergency fallback for order placement...");
        try {
          // Try with completely ambient initialization for the fallback
          const emergencyApp = getApps().length > 0 ? getApp() : initializeApp();
          
          // Try named database first if available
          let emergencyDb;
          if (databaseId && databaseId !== "(default)") {
            try {
              emergencyDb = getFirestore(emergencyApp, databaseId);
              console.log(`[Firestore Admin] Emergency fallback using named database: ${databaseId}`);
            } catch (e) {
              emergencyDb = getFirestore(emergencyApp);
              console.log(`[Firestore Admin] Emergency fallback using default database.`);
            }
          } else {
            emergencyDb = getFirestore(emergencyApp);
            console.log(`[Firestore Admin] Emergency fallback using default database.`);
          }

          docRef = await emergencyDb.collection("orders").add(sanitizedOrder);
          console.log(`✅ [Firestore Admin] Emergency fallback successful. Doc ID: ${docRef.id}`);
        } catch (fallbackErr: any) {
          console.error("❌ [Firestore Admin] Emergency fallback also failed:", fallbackErr.message);
          
          // If we still get NOT_FOUND, it's a project-level issue
          if (fallbackErr.code === 5 || fallbackErr.message.includes("NOT_FOUND")) {
            console.error("🚨 CRITICAL: Firestore database not found. This project may not have a Firestore database initialized.");
            console.error("👉 ACTION REQUIRED: Please ensure you have run the 'Set up Firebase' tool in AI Studio to provision your database.");
          }
          throw dbErr; // Throw original error
        }
      } else {
        throw dbErr;
      }
    }
    
    // UPDATE USER PREFERENCES
    if (userId) {
      try {
        const prefRef = db.collection("userPreferences").doc(userId);
        const prefDoc = await prefRef.get();
        
        const newOrderInfo = {
          orderId: docRef.id,
          items: orderItems.map((i: any) => ({ id: i.menuItemId, name: i.name, category: i.category })),
          totalAmount,
          createdAt: new Date().toISOString()
        };
  
        if (!prefDoc.exists) {
          await prefRef.set({
            lastOrders: [newOrderInfo],
            favoriteItems: orderItems.map((i: any) => i.menuItemId),
            lastOrderTime: FieldValue.serverTimestamp(),
            lastInstructions: instructions || null
          });
        } else {
          const data = prefDoc.data();
          const lastOrders = [newOrderInfo, ...(data.lastOrders || [])].slice(0, 10);
          const favoriteItems = Array.from(new Set([...(data.favoriteItems || []), ...orderItems.map((i: any) => i.menuItemId)]));
          
          await prefRef.update({
            lastOrders,
            favoriteItems,
            lastOrderTime: FieldValue.serverTimestamp(),
            lastInstructions: instructions || data.lastInstructions
          });
        }
      } catch (prefErr) {
        console.warn("⚠️ Failed to update user preferences, but order was placed:", prefErr);
      }
    }

    // NOTIFICATION LOGIC (Simulated)
    console.log(`🔔 New Order: #${orderNumber} placed by ${userName || phone}`);
    const orderWithId = { ...order, id: docRef.id };
    await notifyCustomer(orderWithId, 'PLACED');
    await notifyAdmin(orderWithId);
    
    res.json({
      success: true,
      orderId: docRef.id,
      orderNumber,
      totalAmount,
      deprecated: true,
      deprecation: {
        endpoint: '/api/orders',
        replacement: 'Firestore direct write via src/services/api.ts#createOrder',
        note: 'This endpoint remains for backward compatibility but should not be used for new clients.'
      }
    });

  } catch (err: any) {
    console.error("Order Placement Error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "Failed to place order",
      code: err.code || 500,
      databaseId: _db?.databaseId || "(default)",
      projectId: projectId || "unknown",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// GET ORDER BY ID
app.get("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("orders").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch order" });
  }
});

// UPDATE ORDER STATUS
app.patch("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      deliveryPartner, 
      trackingLink, 
      riderName, 
      riderPhone 
    } = req.body;
    
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp()
    };

    if (status) updateData.status = status;
    if (deliveryPartner !== undefined) updateData.deliveryPartner = deliveryPartner;
    if (trackingLink !== undefined) updateData.trackingLink = trackingLink;
    if (riderName !== undefined) updateData.riderName = riderName;
    if (riderPhone !== undefined) updateData.riderPhone = riderPhone;

    const orderRef = db.collection("orders").doc(id);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const orderData = orderDoc.data() || {};

    if (status) {
      const gate = assertFulfillmentTransition(orderData, status);
      if (!gate.allowed) {
        logger.warn({
          message: 'Payment gate blocked PATCH order status',
          orderId: id,
          tenantId: orderData.tenantId,
          fromStatus: orderData.status,
          toStatus: status,
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus,
          code: gate.code,
        });
        return res.status(402).json({ success: false, error: gate.error, code: gate.code });
      }
    }

    if (status === 'CANCELLED') {
      const currentStatus = orderDoc.data()?.status;
      if (!['PENDING', 'PLACED'].includes(String(currentStatus || '').toUpperCase())) {
        return res.status(400).json({ success: false, error: "Only newly placed orders can be cancelled" });
      }

      const createdAt = orderDoc.data()?.createdAt?.toDate ? orderDoc.data().createdAt.toDate().getTime() : new Date(orderDoc.data().createdAt).getTime();
      const now = Date.now();
      const elapsedSeconds = (now - createdAt) / 1000;
      
      if (elapsedSeconds > 60) {
        return res.status(400).json({ success: false, error: "Cancellation window (60s) has expired" });
      }
    }

    const previousStatus = orderDoc.data()?.status;
    await orderRef.update(updateData);

    // Trigger notification if needed
    const mergedOrderData = { id: orderDoc.id, ...orderDoc.data(), ...updateData };
    if (status && status !== previousStatus) {
      await notifyCustomer(mergedOrderData, status);
    }

    if (status === 'PAYMENT_VERIFICATION') {
      // Notify admin about payment submission
      const adminMsg = `💰 *Payment Submitted!* 💰\n\n` +
        `*Order:* #${mergedOrderData.orderNumber}\n` +
        `*Customer:* ${mergedOrderData.userName || 'Guest'}\n` +
        `*Total:* ₹${mergedOrderData.total}\n\n` +
        `Please verify payment and update status to 'PENDING' in admin panel.`;
      await sendWhatsAppNotification("917666258454", adminMsg);
    }

    res.json({ success: true, message: "Order updated successfully" });
  } catch (err: any) {
    console.error("Order Update Error:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to update order" });
  }
});

// BEST-EFFORT STATUS NOTIFICATION
// Used by admin/client flows that update Firestore directly and then ask the API
// to fan out email, WhatsApp, and push notifications without re-writing order data.
app.post("/api/orders/:id/notify-status", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const orderDoc = await db.collection("orders").doc(id).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const orderData = { id: orderDoc.id, ...orderDoc.data() };
    const notificationStatus = status || orderData.status;

    await notifyCustomer(orderData, notificationStatus);
    res.json({ success: true, message: "Order notification sent" });
  } catch (err: any) {
    console.error("Order Notification Error:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to send order notification" });
  }
});

// GET ORDERS BY USER ID
app.get("/api/orders/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.collection("orders")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch user orders" });
  }
});

// ================= WEBAUTHN / PASSKEYS =================
const rpName = 'Mana Inti Bojanam';
// Origin and rpID should be dynamic to support local dev and multiple domains
const getOrigin = (req: any) => {
  // Use explicitly passed origin from client (most reliable for PWA standalone)
  if (req.body?.origin) {
    return req.body.origin.replace(/\/$/, '');
  }
  // Fallback to headers
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    return origin.replace(/\/$/, '');
  }
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = forwardedProto || req.protocol;
  const host = req.headers.host;
  return `${proto}://${host}`;
};

const getRpID = (req: any) => {
  const origin = getOrigin(req);
  try {
    const url = new URL(origin);
    return url.hostname;
  } catch (e) {
    const host = req.headers.host || '';
    return host.split(':')[0];
  }
};

// In-memory cache for challenges (In a multi-server setup, use Redis or Firestore)
const challengeCache = new Map<string, string>();

// Clean up old challenges periodically
setInterval(() => { challengeCache.clear(); }, 1000 * 60 * 60);

// 1. Generate Registration Options
app.post("/api/auth/generate-registration-options", async (req, res) => {
  try {
    const { userId, email, displayName } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    // Ensure user exists
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get existing passkeys to exclude them
    const passkeysSnapshot = await db.collection("users").doc(userId).collection("passkeys").get();
    const excludeCredentials = passkeysSnapshot.docs.map(doc => ({
      id: doc.id, // In v13, this must be a base64url string, which our doc.id already is
      type: 'public-key' as const,
      transports: doc.data().transports || [],
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID: getRpID(req),
      userID: new Uint8Array(Buffer.from(userId)), // SimpleWebAuthn v13 requires Uint8Array
      userName: email || `user-${userId}`,
      userDisplayName: displayName || "User",
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform", // Force FaceID/TouchID/Windows Hello
      },
    });

    // Store challenge against userId for verification step
    challengeCache.set(`reg_${userId}`, options.challenge);

    res.json(options);
  } catch (error: any) {
    console.error("Generate Registration Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Verify Registration
app.post("/api/auth/verify-registration", async (req, res) => {
  try {
    const { userId, response } = req.body;
    const expectedChallenge = challengeCache.get(`reg_${userId}`);

    if (!expectedChallenge) {
      return res.status(400).json({ error: "Challenge expired or not found" });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpID(req),
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credential } = registrationInfo;
      const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;
      const credentialIdString = credentialID; // In v13, credential.id is already a base64url string
      
      // Save the passkey to the user's subcollection
      await db.collection("users").doc(userId).collection("passkeys").doc(credentialIdString).set({
        publicKey: base64url.encode(Buffer.from(credentialPublicKey)),
        counter,
        transports: response.response.transports || [],
        createdAt: FieldValue.serverTimestamp()
      });

      // Also save mapping for discoverable login
      await db.collection("passkeys").doc(credentialIdString).set({
        userId,
        createdAt: FieldValue.serverTimestamp()
      });

      challengeCache.delete(`reg_${userId}`);
      res.json({ verified: true });
    } else {
      res.status(400).json({ error: "Verification failed" });
    }
  } catch (error: any) {
    console.error("Verify Registration Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Generate Authentication Options
app.post("/api/auth/generate-authentication-options", async (req, res) => {
  try {
    // Generate a generic challenge for autofill/discoverable credentials
    const challengeId = Math.random().toString(36).substring(2, 15);
    
    const options = await generateAuthenticationOptions({
      rpID: getRpID(req),
      userVerification: "preferred",
    });

    challengeCache.set(`auth_${challengeId}`, options.challenge);
    res.json({ options, challengeId });
  } catch (error: any) {
    console.error("Generate Auth Options Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Verify Authentication & Generate Firebase Token
app.post("/api/auth/verify-authentication", async (req, res) => {
  try {
    const { challengeId, response } = req.body;
    const expectedChallenge = challengeCache.get(`auth_${challengeId}`);

    if (!expectedChallenge) {
      return res.status(400).json({ error: "Challenge expired or not found" });
    }

    const credentialIdString = response.id;
    
    // Look up who owns this credential
    const passkeyMapping = await db.collection("passkeys").doc(credentialIdString).get();
    if (!passkeyMapping.exists) {
      return res.status(404).json({ error: "Passkey not registered on this server" });
    }

    const userId = passkeyMapping.data()?.userId;
    const passkeyDoc = await db.collection("users").doc(userId).collection("passkeys").doc(credentialIdString).get();
    
    if (!passkeyDoc.exists) {
      return res.status(404).json({ error: "Passkey revoked or not found" });
    }

    const passkeyData = passkeyDoc.data();
    const publicKey = Uint8Array.from(base64url.toBuffer(passkeyData?.publicKey));
    const credential = {
      id: credentialIdString,
      publicKey,
      counter: passkeyData?.counter || 0,
      transports: passkeyData?.transports || [],
    };

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpID(req),
      credential,
    });

    if (verification.verified) {
      // Update the counter
      await passkeyDoc.ref.update({
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: FieldValue.serverTimestamp()
      });

      // MINT FIREBASE CUSTOM TOKEN
      const authInstance = getAdminAuth(appAdmin);
      const customToken = await authInstance.createCustomToken(userId);

      challengeCache.delete(`auth_${challengeId}`);
      res.json({ verified: true, token: customToken });
    } else {
      res.status(400).json({ error: "Authentication signature verification failed" });
    }
  } catch (error: any) {
    console.error("Verify Authentication Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= NATIVE BIOMETRICS =================

/**
 * Register a biometric device secret for a user.
 * The device generates a random secret and stores it in the hardware-backed keychain.
 * This secret is hashed and stored on the server to allow future session restoration.
 */
app.post("/api/auth/biometric/register", verifyFirebaseToken, strictLimiter, async (req: any, res: any) => {
  try {
    const { userId, deviceSecret, deviceName } = req.body;
    if (!userId || !deviceSecret) {
      return res.status(400).json({ error: "Missing userId or deviceSecret" });
    }

    // Hash the secret before storing
    const secretHash = createHmac("sha256", process.env.BIOMETRIC_SALT || 'mana-inti-salt').update(deviceSecret).digest("hex");
    const deviceId = createHmac("sha256", userId).update(deviceName || 'default').digest("hex").substring(0, 16);

    await db.collection("users").doc(userId).collection("biometric_devices").doc(deviceId).set({
      secretHash,
      deviceName: deviceName || "Unknown Device",
      createdAt: FieldValue.serverTimestamp(),
      lastUsedAt: FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Biometric Register Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify a biometric device secret and return a Firebase Custom Token.
 * This allows "restoring" a session after successful biometric authentication on the device.
 */
app.post("/api/auth/biometric/verify", strictLimiter, async (req, res) => {
  try {
    const { userId, deviceSecret, deviceName } = req.body;
    if (!userId || !deviceSecret) {
      return res.status(400).json({ error: "Missing userId or deviceSecret" });
    }

    const deviceId = createHmac("sha256", userId).update(deviceName || 'default').digest("hex").substring(0, 16);
    const deviceDoc = await db.collection("users").doc(userId).collection("biometric_devices").doc(deviceId).get();

    if (!deviceDoc.exists) {
      return res.status(401).json({ error: "Biometric device not registered" });
    }

    // Verify hashed secret
    const incomingHash = createHmac("sha256", process.env.BIOMETRIC_SALT || 'mana-inti-salt').update(deviceSecret).digest("hex");
    if (deviceDoc.data()?.secretHash !== incomingHash) {
      return res.status(401).json({ error: "Invalid biometric secret" });
    }

    // Update last used
    await deviceDoc.ref.update({ lastUsedAt: FieldValue.serverTimestamp() });

    // Mint Custom Token
    const authInstance = getAdminAuth(appAdmin);
    const customToken = await authInstance.createCustomToken(userId);

    res.json({ verified: true, token: customToken });
  } catch (error: any) {
    console.error("Biometric Verify Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= OWNER PORTAL =================

app.post("/api/owner/kyc/register", strictLimiter, verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const { tenantId, slot, fileName, contentType, fileHash, documentUrl, fileSize } = req.body || {};

    if (!tenantId || !slot || !fileName || !fileHash || !documentUrl) {
      return res.status(400).json({ error: "Missing required document fields." });
    }
    if (slot !== "identity" && slot !== "business") {
      return res.status(400).json({ error: "Invalid document slot." });
    }

    if (!validateKycStorageUrl(String(documentUrl), String(tenantId), configStorageBucket)
      && !parseInlineKycDocumentUrl(String(documentUrl))) {
      return res.status(400).json({ error: "Invalid document URL for this kitchen." });
    }

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: "User not found." });
    }

    const ownedTenantIds: string[] = userDoc.data()?.ownedTenantIds || [];
    if (!ownedTenantIds.includes(tenantId)) {
      return res.status(403).json({ error: "You do not own this kitchen." });
    }

    const tenantDoc = await db.collection("tenants").doc(tenantId).get();
    if (!tenantDoc.exists) {
      return res.status(404).json({ error: "Kitchen not found." });
    }

    const kyc = tenantDoc.data()?.kyc as Record<string, unknown> | undefined;
    const fileDescriptor = {
      name: String(fileName),
      size: Number(fileSize) || 0,
      type: String(contentType || "application/octet-stream"),
    };

    if (fileDescriptor.size <= 0 || fileDescriptor.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "File must be between 1 byte and 10MB." });
    }

    const validationError = validateKycDocument(fileDescriptor, slot as KycDocumentSlot);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      assertNotDuplicateUpload(String(fileHash), slot as KycDocumentSlot, kyc);
    } catch (dupErr: any) {
      return res.status(409).json({ error: dupErr.message });
    }

    const prefix = slot === "identity" ? "identity" : "business";
    await db.collection("tenants").doc(tenantId).update({
      [`kyc.${prefix}DocumentUrl`]: String(documentUrl),
      [`kyc.${prefix}DocumentHash`]: String(fileHash),
      [`kyc.${prefix}DocumentFileName`]: fileDescriptor.name,
      "kyc.verificationLevel": 1,
      "kyc.status": "pending_verification",
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info({ message: "KYC document registered", tenantId, slot, userId });
    res.json({ success: true, url: documentUrl, fileName: fileDescriptor.name });
  } catch (err: any) {
    logger.error({ message: "KYC register failed", err: err.message, uid: req.user?.uid });
    res.status(500).json({ error: err.message || "Failed to save document." });
  }
});

app.get("/api/owner/kyc/document/:tenantId/:slot", verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const { tenantId, slot } = req.params;

    if (slot !== "identity" && slot !== "business") {
      return res.status(400).json({ error: "Invalid document slot." });
    }

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: "User not found." });
    }

    const ownedTenantIds: string[] = userDoc.data()?.ownedTenantIds || [];
    const isAdmin = req.user?.admin === true;
    if (!isAdmin && !ownedTenantIds.includes(tenantId)) {
      return res.status(403).json({ error: "You do not have access to this document." });
    }

    const privateDoc = await db.collection("tenants").doc(tenantId).collection("kycPrivate").doc(slot).get();
    if (!privateDoc.exists) {
      return res.status(404).json({ error: "Document not found." });
    }

    const data = privateDoc.data()!;
    const buffer = Buffer.from(String(data.dataBase64 || ""), "base64");
    res.setHeader("Content-Type", data.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${data.fileName || slot}.pdf"}`);
    res.send(buffer);
  } catch (err: any) {
    logger.error({ message: "KYC document download failed", err: err.message, uid: req.user?.uid });
    res.status(500).json({ error: err.message || "Failed to load document." });
  }
});

app.get("/api/owner/orders", verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (!userDoc.exists) return res.status(403).json({ error: "User not found" });
    const userData = userDoc.data();
    
    if (!userData?.ownedTenantIds || userData.ownedTenantIds.length === 0) {
      return res.status(403).json({ error: "Unauthorized. Not a tenant owner." });
    }

    const tenantId = userData.ownedTenantIds[0]; // For Sprint 1, single tenant
    
    const snapshot = await db.collection("orders")
      .where("tenantId", "==", tenantId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
      
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, orders });
  } catch (error: any) {
    console.error("Owner Orders Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/owner/feedback", verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) return res.status(403).json({ error: "User not found" });
    const userData = userDoc.data();

    if (!userData?.ownedTenantIds?.length) {
      return res.status(403).json({ error: "Unauthorized. Not a tenant owner." });
    }

    const tenantId = userData.ownedTenantIds[0];
    const { type, description, rating, plan, businessType, merchantHealthSnapshot, ownerName, ownerEmail } = req.body;

    const tenantDoc = await db.collection("tenants").doc(tenantId).get();
    const tenantName = tenantDoc.exists ? (tenantDoc.data()?.name || tenantId) : tenantId;

    const founderEmail = getFounderEmail();
    const subject = `[BhojanOS Merchant Feedback] ${type || "general"} — ${tenantName}`;
    const body = [
      "Merchant feedback received",
      "",
      `Tenant: ${tenantName} (${tenantId})`,
      `Owner: ${ownerName || userData.name || userId}`,
      `Owner Email: ${ownerEmail || userData.email || req.user.email || "N/A"}`,
      `Category: ${type || "general"}`,
      `Plan: ${plan || "unknown"}`,
      `Business Type: ${businessType || "unknown"}`,
      `Merchant Health Score: ${merchantHealthSnapshot ?? "N/A"}`,
      rating ? `Rating: ${rating}/5` : "",
      "",
      "Message:",
      description || "No additional message provided.",
    ].filter(Boolean).join("\n");

    await sendEmailNotification(founderEmail, subject, body);

    const transporter = getTransporter();
    res.json({ success: true, emailSent: Boolean(transporter) });
  } catch (error: any) {
    console.error("Owner Feedback Email Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/owner/orders/:id/status", verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const orderId = req.params.id;
    const { status, deliveryData } = req.body;
    const userId = req.user.uid;
    
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.ownedTenantIds || userData.ownedTenantIds.length === 0) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    if (!userData.ownedTenantIds.includes(orderDoc.data()?.tenantId)) {
      return res.status(403).json({ error: "Order does not belong to your tenant" });
    }

    const mergedOrder = await applyOrderStatusUpdate(orderId, orderDoc.data() || {}, status, deliveryData);
    const shouldNotify = status === 'OUT_FOR_DELIVERY' ? (deliveryData?.notifyCustomer !== false) : true;
    
    if (shouldNotify) {
      notifyCustomer(mergedOrder, status).catch(console.error);
    }
    
    res.json({ success: true, message: `Order marked as ${status}` });
  } catch (error: any) {
    console.error("Owner Status Update Error:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message, code: error.code });
  }
});

app.patch("/api/orders/:id/status", verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const orderId = req.params.id;
    const { status, trackingData } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }

    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const orderData = orderDoc.data() || {};
    const allowed = await assertOrderStatusAccess(req, orderData);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const mergedOrder = await applyOrderStatusUpdate(orderId, orderData, status, trackingData);
    await notifyCustomer(mergedOrder, status).catch(console.error);

    res.json({ success: true, message: `Order updated to ${status}` });
  } catch (error: any) {
    console.error('Order status update error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message, code: error.code });
  }
});

// ================= WORKER CRON =================
app.post("/api/cron/expire-unpaid-payments", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await expireUnpaidPayments();
    res.json({ success: true, ...result });
  } catch (err: any) {
    logger.error({ message: "Expire unpaid payments failed", error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cron/process-workers", async (req, res) => {
  // Simple auth via cron secret (configure CRON_SECRET in environment)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await Promise.all([
      processOutboxBatch(),
      processPrepAlertsBatch()
    ]);
    res.json({ success: true, message: "Workers processed successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Alias for backward compatibility if external services already hit this endpoint
app.post("/api/cron/process-outbox", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    await processOutboxBatch();
    res.json({ success: true, message: "Outbox processed" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= TENANT NOTIFICATION CENTER =================

const STOREFRONT_BASE_URL = process.env.STOREFRONT_BASE_URL || "https://bhojanos.com";

app.post("/api/notifications/analyze", async (req, res) => {
  try {
    const { tenantId, jobType = "morning_brief" } = req.body || {};
    if (!tenantId) {
      return res.status(400).json({ success: false, error: "tenantId required" });
    }
    if (!_db) {
      return res.status(503).json({ success: false, error: "Database unavailable" });
    }

    const { processTenantNotifications } = await import("./src/modules/notifications/server/TenantNotificationWorker");
    const count = await processTenantNotifications(
      _db,
      tenantId,
      jobType,
      sendWhatsAppNotification,
      STOREFRONT_BASE_URL
    );

    res.json({ success: true, notificationsCreated: count });
  } catch (err: any) {
    logger.error({ message: "Notification analyze failed", error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/cron/founder-alerts", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const jobType = req.body?.jobType || "hourly";
    if (jobType === "daily") {
      await runDailyFounderDigest();
    } else {
      await runHourlyAutoPilotAggregator();
    }
    res.json({ success: true, jobType, founderEmail: getFounderEmail() });
  } catch (err: any) {
    logger.error({ message: "Founder alerts cron failed", error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cron/tenant-notifications", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const jobType = req.body?.jobType || "morning_brief";
    if (!_db) {
      return res.status(503).json({ success: false, error: "Database unavailable" });
    }

    const { processAllTenants } = await import("./src/modules/notifications/server/TenantNotificationWorker");
    const result = await processAllTenants(_db, jobType, sendWhatsAppNotification, STOREFRONT_BASE_URL);
    res.json({ success: true, ...result, jobType });
  } catch (err: any) {
    logger.error({ message: "Tenant notification cron failed", error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/notifications/push", async (req, res) => {
  try {
    const { userId, tenantId, title, body, actionUrl } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ success: false, error: "title and body required" });
    }

    let targetUserId = userId;
    if (!targetUserId && tenantId && _db) {
      const tenantSnap = await _db.collection("tenants").doc(tenantId).get();
      targetUserId = tenantSnap.data()?.ownerId;
    }

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: "userId or tenantId required" });
    }

    await sendPushNotificationToUser(targetUserId, title, body, { actionUrl: actionUrl || "/owner/dashboard" });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/notifications/email", async (req, res) => {
  try {
    const { to, subject, htmlBody } = req.body || {};
    if (!to || !subject || !htmlBody) {
      return res.status(400).json({ success: false, error: "to, subject, and htmlBody required" });
    }
    const result = await sendEmailNotification(to, subject, htmlBody);
    if (!result.sent) {
      return res.status(503).json({ success: false, error: result.reason || "Email not sent", skipped: result.skipped });
    }
    res.json({ success: true, messageId: result.messageId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/admin/email/status", requireAdmin, async (_req: any, res: any) => {
  res.json({ success: true, ...getEmailConfigStatus() });
});

app.post("/api/admin/email/test-founder", requireAdmin, async (_req: any, res: any) => {
  const status = getEmailConfigStatus();
  if (!status.configured) {
    return res.status(503).json({
      success: false,
      error: "Email SMTP is not configured on this server. Set EMAIL_USER and EMAIL_PASS on Render.",
      ...status,
    });
  }

  const founderEmail = getFounderEmail();
  try {
    const result = await sendEmailNotification(
      founderEmail,
      "[BhojanOS] Founder Test Alert",
      `<h2>Founder email test</h2><p>Sent at ${new Date().toISOString()}.</p><p>If you received this, AutoPilot and digest alerts are wired correctly.</p>`,
      { fromLabel: "BhojanOS AutoPilot" }
    );
    if (!result.sent) {
      return res.status(503).json({ success: false, founderEmail, ...result });
    }
    res.json({ success: true, founderEmail, messageId: result.messageId });
  } catch (err: any) {
    res.status(500).json({ success: false, founderEmail, error: err.message });
  }
});

let outboxInterval: NodeJS.Timeout | null = null;
const defaultWorkerIntervalMs = isFreeTierPlatform()
  ? 10 * 60 * 1000
  : process.env.NODE_ENV === "production"
    ? 5 * 60 * 1000
    : 60 * 1000;
const WORKER_INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS || defaultWorkerIntervalMs);

const startOutboxWorker = () => {
  if (outboxInterval) return;
  const freeTier = isFreeTierPlatform();
  outboxInterval = setInterval(async () => {
    if (isFirestoreBackedOff()) return;
    try {
      if (freeTier) {
        // Spark-safe: email outbox only, no settings read, no prep-alerts scan
        await processOutboxBatch();
        return;
      }
      const settings = await getSettings();
      if (settings.workflow?.autoRetryWorker !== false) {
        await processOutboxBatch();
        await processPrepAlertsBatch();
      }
    } catch (err: any) {
      if (isFirestoreQuotaError(err)) {
        noteFirestoreQuotaExceeded("outboxWorker");
      } else {
        console.error("Outbox worker interval error:", err);
      }
    }
  }, WORKER_INTERVAL_MS);
  console.log(
    `✅ Background workers every ${Math.round(WORKER_INTERVAL_MS / 1000)}s (${freeTier ? "free-tier: outbox only" : "standard"})`
  );
};

async function startServer() {
  const isBhojanMarketingRequest = (req: express.Request) => {
    const host = (req.hostname || req.headers.host?.toString().split(":")[0] || "").toLowerCase();
    const isBhojanHost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.includes("bhojanos") ||
      host.includes("firebaseapp.com");
    if (!isBhojanHost) return false;
    const pathname = req.path.split("?")[0].replace(/\/$/, "") || "/";
    return ["/", "/onboard", "/pricing", "/about", "/platform", "/security", "/contact", "/blog"].includes(pathname);
  };

  const marketingShellMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api") || req.path.startsWith("/src") || req.path.startsWith("/@") || req.path.includes(".")) {
      return next();
    }
    if (!isBhojanMarketingRequest(req)) return next();
    req.url = "/marketing.html";
    return next();
  };

  // ================= FRONTEND =================
  if (process.env.NODE_ENV !== "production") {
    app.use(marketingShellMiddleware);
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    if (fs.existsSync(DIST_PATH)) {
      app.use(express.static(DIST_PATH));
      app.get("*", (req, res) => {
        if (req.path.startsWith("/api")) return;
        if (isBhojanMarketingRequest(req)) {
          const marketingPath = path.join(DIST_PATH, "marketing.html");
          if (fs.existsSync(marketingPath)) {
            return res.sendFile(marketingPath);
          }
        }
        const indexPath = path.join(DIST_PATH, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send("Frontend build not found. Please run 'npm run build'.");
        }
      });
    } else {
      console.warn("⚠️ Warning: 'dist' folder not found. Serving API only.");
      app.get("/", (req, res) => {
        res.json({ 
          message: "Mana Inti Bojanam API is running.",
          frontendStatus: "Not built. Run 'npm run build' to serve the frontend."
        });
      });
    }
  }

  // ================= START =================
  // await verifyConnection(); // Ensure connection is verified before starting

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(
      `📦 Build ${process.env.RENDER_GIT_COMMIT?.slice(0, 7) || "local"} | tier=${isFreeTierPlatform() ? "free" : "standard"} | project=${projectId}`
    );
    try {
      // await seedMenu();
      // await seedCategories();
      console.log("✅ Menu and Categories seeding check bypassed");
      // startAutoWorkflow();
      console.log("✅ Auto Workflow worker bypassed");
      startOutboxWorker();
      console.log("✅ Outbox worker initialized");

      const emailStatus = getEmailConfigStatus();
      if (emailStatus.configured) {
        console.log(`✅ Email configured → founder alerts to ${emailStatus.founderEmail}`);
      } else {
        console.warn("⚠️ Email NOT configured — founder alerts and briefings will not send until EMAIL_USER/EMAIL_PASS are set on the backend.");
      }
      
      // Initialize StoreBrain lazily (avoid full menu scan on every deploy boot)
      if (process.env.STOREBRAIN_REFRESH_ON_STARTUP === "true") {
        brain.refresh().catch(() => undefined);
      }
      console.log("✅ StoreBrain ready (lazy refresh on AI chat)");
    } catch (err) {
      console.error("❌ Seeding/Brain failed:", err);
    }
  });
}

// ================= AUTOPILOT MONITORING SYSTEM =================
let consecutiveEmailFailures = 0;

const sendFounderAlert = async (subject: string, html: string) => {
  const founderEmail = getFounderEmail();
  const sentAt = new Date().toISOString();
  let status = "SUCCESS";
  let providerResponse = "OK";

  try {
    const result = await sendEmailNotification(
      founderEmail,
      `[AutoPilot] ${subject}`,
      html,
      { fromLabel: "BhojanOS AutoPilot" }
    );

    if (!result.sent) {
      status = result.skipped ? "SKIPPED" : "FAILED";
      providerResponse = result.reason || "Not sent";
      consecutiveEmailFailures++;
      logger.warn({
        message: "Founder alert not delivered",
        subject,
        founderEmail,
        reason: providerResponse,
      });
    } else {
      consecutiveEmailFailures = 0;
      providerResponse = result.messageId || "OK";
      logger.info({ message: "Founder Alert Sent", subject, founderEmail });
    }
  } catch (err: any) {
    status = "FAILED";
    providerResponse = err.message;
    consecutiveEmailFailures++;
    logger.error({ message: "Failed to send founder alert", err, founderEmail });

    if (consecutiveEmailFailures >= 3 && _db) {
      logger.error({
        message: "CRITICAL: 3 Consecutive Email Failures",
        severity: "critical",
        type: "EMAIL_DELIVERY_FAILURE",
      });
      await _db
        .collection("critical_alert_failures")
        .add({
          severity: "critical",
          type: "EMAIL_DELIVERY_FAILURE",
          timestamp: new Date().toISOString(),
          failureCount: consecutiveEmailFailures,
          founderEmail,
        })
        .catch(console.error);
    }
  } finally {
    if (_db) {
      await _db
        .collection("alert_delivery_logs")
        .add({ recipient: founderEmail, subject, sentAt, status, providerResponse })
        .catch(console.error);
    }
  }
};

const withCronHealth = (jobName: string, fn: Function) => {
  return async () => {
    if (isFirestoreBackedOff()) {
      logger.warn({ message: "Skipping cron job during Firestore quota backoff", jobName });
      return;
    }
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    let status = "SUCCESS";
    try {
      await fn();
    } catch (err: any) {
      status = "FAILED";
      if (isFirestoreQuotaError(err)) {
        noteFirestoreQuotaExceeded(`cron:${jobName}`);
      }
      throw err;
    } finally {
      const completedAt = new Date().toISOString();
      const duration = Date.now() - startMs;
      if (_db && !isFirestoreBackedOff() && !isFreeTierPlatform()) {
        await _db
          .collection("cron_health")
          .add({ jobName, startedAt, completedAt, duration, status })
          .catch((err: any) => {
            if (isFirestoreQuotaError(err)) noteFirestoreQuotaExceeded("cron_health");
          });
      }
    }
  };
};

const runHourlyAutoPilotAggregator = async () => {
  if (!_db) return;
  logger.info({ message: "Running Hourly AutoPilot Aggregator" });
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

  const fifteenMinsAgo = Date.now() - 900_000;
  const heartbeatDoc = await _db.collection("system_meta").doc("heartbeat").get();
  const heartbeatTs = heartbeatDoc.exists
    ? new Date(String(heartbeatDoc.data()?.timestamp || 0)).getTime()
    : 0;
  const isHeartbeatHealthy = heartbeatTs >= fifteenMinsAgo;
  if (!isHeartbeatHealthy) {
    await sendFounderAlert(
      `CRITICAL: Missing Heartbeat`,
      `<p>No heartbeat received for 15 minutes. Potential server or deployment failure.</p>`
    );
  }

  const crashes = await firestoreCountSince("system_errors", "serverTimestamp", oneHourAgo);
  const payments = await firestoreCountSince("payment_incidents", "serverTimestamp", oneHourAgo);
  const security = await firestoreCountSince("security_events", "serverTimestamp", oneHourAgo);
  const firestore = await firestoreCountSince("firestore_errors", "serverTimestamp", oneHourAgo);
  const apiErrs = await firestoreCountSince("api_errors", "serverTimestamp", oneHourAgo);
  const blockers = await firestoreCountSince("merchant_blockers", "serverTimestamp", oneHourAgo);
  let emailFails = 0;
  try {
    const failedAlerts = await _db!
      .collection("alert_delivery_logs")
      .where("sentAt", ">=", oneHourAgo)
      .where("status", "==", "FAILED")
      .count()
      .get();
    emailFails = failedAlerts.data().count;
  } catch (err: any) {
    if (isFirestoreQuotaError(err)) noteFirestoreQuotaExceeded("alert_delivery_logs");
  }

  let score = 100 - crashes * 5 - payments * 10 - security * 5 - firestore * 2 - apiErrs * 2 - blockers * 15 - emailFails * 5;
  if (!isHeartbeatHealthy) score -= 50;
  score = Math.max(0, score);

  let statusLabel = "🟢 Healthy";
  if (score < 50) statusLabel = "🔴 Critical";
  else if (score < 80) statusLabel = "🟡 Degraded";

  await _db.collection("platform_health_reports").add({
    timestamp: new Date().toISOString(),
    score,
    statusLabel,
    metrics: { crashes, payments, security, firestore, apiErrs, blockers, emailFails, isHeartbeatHealthy },
  });

  if (score < 80 || crashes > 5 || payments > 2 || security > 5 || blockers > 0) {
    await sendFounderAlert(
      `Health Drop: ${statusLabel} (Score ${score})`,
      `
        <h2>Platform Health Alert: ${statusLabel}</h2>
        <p>The AutoPilot system detected anomalies in the last hour:</p>
        <ul>
          <li>Health Score: <b>${score}</b></li>
          <li>Merchant Revenue Blockers: <b>${blockers}</b></li>
          <li>Crashes: ${crashes}</li>
          <li>Payment Failures: ${payments}</li>
          <li>Security Incidents: ${security}</li>
          <li>Firestore Errors: ${firestore}</li>
          <li>API Errors: ${apiErrs}</li>
          <li>Heartbeat Freshness: ${isHeartbeatHealthy ? "Healthy" : "Failing"}</li>
        </ul>
      `
    );
  }
};

const runDailyFounderDigest = async () => {
  logger.info({ message: "Running Daily Founder Digest" });
  const istTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  let digestHtml = `<h2>BhojanOS Daily Digest</h2><p>Report generated at ${istTime} IST.</p>`;

  if (_db) {
    try {
      const healthSnap = await _db
        .collection("platform_health_reports")
        .orderBy("timestamp", "desc")
        .limit(1)
        .get();
      const latestHealth = healthSnap.docs[0]?.data();
      const tenantCountSnap = await _db.collection("tenants").count().get();
      const tenantCount = tenantCountSnap.data().count;

      digestHtml += `<ul>
        <li>Active tenants: <b>${tenantCount}</b></li>
        ${
          latestHealth
            ? `<li>Latest platform health: <b>${latestHealth.score}</b> (${latestHealth.statusLabel || "unknown"})</li>`
            : "<li>Platform health: no recent report</li>"
        }
      </ul>
      <p>Open the Super Admin dashboard for full investor metrics.</p>`;
    } catch (err: any) {
      digestHtml += `<p>Metrics snapshot unavailable (${err.message}). Check Super Admin dashboard.</p>`;
    }
  }

  await sendFounderAlert("Daily Digest", digestHtml);
};

const initializeMonitoringJobs = () => {
  if (!_db) return;

  const registerJobs = () => {
    const freeTier = isFreeTierPlatform();
    logger.info({ message: "Registering background cron jobs", platformTier: freeTier ? "free" : "standard" });

    const heartbeatCron = freeTier ? "*/30 * * * *" : "*/15 * * * *";
    cron.schedule(heartbeatCron, async () => {
      if (isFirestoreBackedOff()) return;
      try {
        await _db!.collection("system_meta").doc("heartbeat").set(
          {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || "development",
            serverUptime: process.uptime(),
            memoryUsage: process.memoryUsage().heapUsed,
            nodeVersion: process.version,
            buildVersion: "FounderBeta",
          },
          { merge: true }
        );
      } catch (e: any) {
        if (isFirestoreQuotaError(e)) {
          noteFirestoreQuotaExceeded("heartbeat");
        } else {
          logger.error({ message: "Heartbeat failure", error: e });
        }
      }
    });

    const expireCron = freeTier ? "*/15 * * * *" : "*/10 * * * *";
    cron.schedule(expireCron, withCronHealth("Expire Unpaid Payments", async () => {
    const result = await expireUnpaidPayments();
    if (result.draftsExpired > 0 || result.ordersExpired > 0) {
      logger.info({ message: "Expired unpaid payment sessions", ...result });
    }
  }));

  if (!freeTier) {
  // Phase 16: Hourly AutoPilot Aggregator (Extended)
  cron.schedule("0 * * * *", withCronHealth("Hourly AutoPilot Aggregator", runHourlyAutoPilotAggregator));

  // Daily Founder Digest
  cron.schedule("0 8 * * *", withCronHealth("Daily Founder Digest", runDailyFounderDigest));

  // Tenant AI Notification Center — Morning Brief (8 AM)
  cron.schedule("0 8 * * *", withCronHealth("Tenant Morning Brief", async () => {
    if (!_db) return;
    const { processAllTenants } = await import("./src/modules/notifications/server/TenantNotificationWorker");
    const baseUrl = process.env.STOREFRONT_BASE_URL || "https://bhojanos.com";
    await processAllTenants(_db, "morning_brief", sendWhatsAppNotification, baseUrl);
  }));

  // Tenant Evening Report (8 PM)
  cron.schedule("0 20 * * *", withCronHealth("Tenant Evening Report", async () => {
    if (!_db) return;
    const { processAllTenants } = await import("./src/modules/notifications/server/TenantNotificationWorker");
    const baseUrl = process.env.STOREFRONT_BASE_URL || "https://bhojanos.com";
    await processAllTenants(_db, "evening_report", sendWhatsAppNotification, baseUrl);
  }));

  // Tenant Weekly Report (Monday 8 AM)
  cron.schedule("0 8 * * 1", withCronHealth("Tenant Weekly Report", async () => {
    if (!_db) return;
    const { processAllTenants } = await import("./src/modules/notifications/server/TenantNotificationWorker");
    const baseUrl = process.env.STOREFRONT_BASE_URL || "https://bhojanos.com";
    await processAllTenants(_db, "weekly_report", sendWhatsAppNotification, baseUrl);
  }));

  // Tenant Monthly Report (1st of month 8 AM)
  cron.schedule("0 8 1 * *", withCronHealth("Tenant Monthly Report", async () => {
    if (!_db) return;
    const { processAllTenants } = await import("./src/modules/notifications/server/TenantNotificationWorker");
    const baseUrl = process.env.STOREFRONT_BASE_URL || "https://bhojanos.com";
    await processAllTenants(_db, "monthly_report", sendWhatsAppNotification, baseUrl);
  }));

  // Critical alert scan every 15 minutes
  cron.schedule("*/15 * * * *", withCronHealth("Tenant Critical Alert Scan", async () => {
    if (!_db) return;
    const { processAllTenants } = await import("./src/modules/notifications/server/TenantNotificationWorker");
    const baseUrl = process.env.STOREFRONT_BASE_URL || "https://bhojanos.com";
    await processAllTenants(_db, "critical_scan", sendWhatsAppNotification, baseUrl);
  }));
  } else {
    logger.info({ message: "Free tier: AutoPilot + tenant report crons disabled to protect Firestore quota" });
  }
  };

  const startupDelayMs = Number(process.env.CRON_STARTUP_DELAY_MS || 120_000);
  setTimeout(registerJobs, startupDelayMs);
  logger.info({ message: "Cron jobs deferred after deploy", startupDelayMs });
};

initializeMonitoringJobs();

startServer();



// ================= AI ASSISTANT =================
import { processAIRequest } from "./aiProvider";
import { brain } from "./storeBrain";

app.post("/api/ai/chat", strictLimiter, async (req, res) => {
  try {
    if (brain.menu.size === 0 && !isFirestoreBackedOff()) {
      await brain.refresh();
    }

    const { contents, systemInstruction } = req.body;
    
    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({ success: false, error: "Missing or invalid 'contents' array." });
    }
    
    const result = await processAIRequest(contents, systemInstruction || "");
    
    if (result.toolCall) {
      return res.json({ 
        success: true, 
        toolCall: { name: result.toolCall.name, args: result.toolCall.args } 
      });
    }
    
    if ('text' in result) {
      return res.json({ success: true, text: result.text });
    }

    res.json({ success: true });
  } catch (err: any) {
    logger.error({ message: "AI Error", error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: err.message || "AI processing failed." });
  }
});


/** Merge duplicate users/{docId} rows for one email onto Firebase Auth UID. */
async function reconcileUserDocsForEmail(
  email: string,
  options?: { preferredRole?: string; deleteOrphans?: boolean },
) {
  const normalizedEmail = email.trim().toLowerCase();
  const authAdmin = getAdminAuth(appAdmin);
  const authUser = await authAdmin.getUserByEmail(normalizedEmail);
  const canonicalUid = authUser.uid;

  const snap = await db.collection("users").where("email", "==", normalizedEmail).get();
  const duplicateDocIds: string[] = [];
  const merged: Record<string, unknown> = {
    userId: canonicalUid,
    email: normalizedEmail,
    name: authUser.displayName || normalizedEmail.split("@")[0] || "User",
    updatedAt: new Date().toISOString(),
  };

  const roleRank: Record<string, number> = {
    user: 0,
    owner: 1,
    admin: 2,
    superadmin: 3,
  };

  let bestRole = "user";

  for (const userDoc of snap.docs) {
    const data = userDoc.data() || {};
    if (userDoc.id !== canonicalUid) {
      duplicateDocIds.push(userDoc.id);
    }

    const docRole = typeof data.role === "string" ? data.role : "user";
    if ((roleRank[docRole] ?? 0) > (roleRank[bestRole] ?? 0)) {
      bestRole = docRole;
    }

    if (Array.isArray(data.ownedTenantIds) && data.ownedTenantIds.length > 0) {
      const existing = Array.isArray(merged.ownedTenantIds) ? (merged.ownedTenantIds as string[]) : [];
      merged.ownedTenantIds = Array.from(new Set([...existing, ...data.ownedTenantIds.filter(Boolean)]));
    }

    if (data.referralCode && !merged.referralCode) merged.referralCode = data.referralCode;
    if (data.phone && !merged.phone) merged.phone = data.phone;
    if (data.name && !merged.name) merged.name = data.name;

    const tokens = [
      ...(Array.isArray(data.deviceTokens) ? data.deviceTokens : []),
      ...(Array.isArray(data.fcmTokens) ? data.fcmTokens : []),
    ].filter(Boolean);
    if (tokens.length > 0) {
      const existing = Array.isArray(merged.deviceTokens) ? (merged.deviceTokens as string[]) : [];
      merged.deviceTokens = Array.from(new Set([...existing, ...tokens]));
    }

    if (data.notifications && typeof data.notifications === "object") {
      merged.notifications = data.notifications;
    }
  }

  if (options?.preferredRole) {
    bestRole = options.preferredRole;
  }

  merged.role = bestRole;

  await db.collection("users").doc(canonicalUid).set(merged, { merge: true });

  if (options?.deleteOrphans) {
    for (const orphanId of duplicateDocIds) {
      await db.collection("users").doc(orphanId).delete();
    }
  }

  return {
    canonicalUid,
    email: normalizedEmail,
    duplicateDocIds,
    mergedRole: bestRole,
    authDisplayName: authUser.displayName || null,
  };
}

// ================= BOOTSTRAP ADMIN CLAIM =================
app.post("/api/admin/grant-claim", async (req, res) => {
  const { secret, uid } = req.body;
  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ success: false, error: "No bootstrap secret configured" });
  }
  if (secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ success: false, error: "Invalid bootstrap secret" });
  }
  if (!uid) {
    return res.status(400).json({ success: false, error: "Missing uid" });
  }
  
  try {
    await getAdminAuth(appAdmin).setCustomUserClaims(uid, { admin: true });
    res.json({ success: true, message: `Admin claim granted to user ${uid}` });
  } catch (err: any) {
    logger.error({ message: "Failed to grant admin claim", error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Grant superadmin role in Firestore (client cannot write role field). Lookup by uid or email. */
app.post("/api/platform/grant-superadmin", async (req, res) => {
  const { secret, uid, email } = req.body || {};
  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ success: false, error: "No bootstrap secret configured" });
  }
  if (secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ success: false, error: "Invalid bootstrap secret" });
  }

  try {
    const authAdmin = getAdminAuth(appAdmin);
    let targetUid = typeof uid === "string" ? uid.trim() : "";
    let targetEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!targetUid && targetEmail) {
      const userRecord = await authAdmin.getUserByEmail(targetEmail);
      targetUid = userRecord.uid;
      targetEmail = userRecord.email || targetEmail;
    }

    if (!targetUid) {
      return res.status(400).json({ success: false, error: "Provide uid or email of an existing Firebase Auth user" });
    }

    const userRecord = await authAdmin.getUser(targetUid);
    targetEmail = targetEmail || userRecord.email || "";

    const reconciled = targetEmail
      ? await reconcileUserDocsForEmail(targetEmail, { preferredRole: "superadmin", deleteOrphans: false })
      : null;

    await db.collection("users").doc(targetUid).set(
      {
        userId: targetUid,
        role: "superadmin",
        email: targetEmail,
        name: userRecord.displayName || targetEmail.split("@")[0] || "Super Admin",
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    await authAdmin.setCustomUserClaims(targetUid, { admin: true });

    if (isFounderOwnerEmail(targetEmail)) {
      await linkFounderTenantIfNeeded(targetUid, targetEmail);
    }

    logger.info({ message: "Superadmin granted", uid: targetUid, email: targetEmail, reconciled });
    res.json({
      success: true,
      uid: targetUid,
      email: targetEmail,
      duplicateDocIds: reconciled?.duplicateDocIds || [],
      message:
        "Superadmin role granted on Auth UID doc. Sign out and sign in again at /super-admin/login." +
        (reconciled?.duplicateDocIds?.length
          ? ` Found ${reconciled.duplicateDocIds.length} duplicate user doc(s) — safe to delete after verifying login.`
          : ""),
    });
  } catch (err: any) {
    logger.error({ message: "Failed to grant superadmin", error: err.message });
    const status = err.code === "auth/user-not-found" ? 404 : 500;
    res.status(status).json({ success: false, error: err.message || "Failed to grant superadmin" });
  }
});

/** Platform data for superadmin dashboard — Admin SDK bypasses client Firestore rule edge cases. */
app.get('/api/platform/superadmin-data', requireSuperadmin, async (_req: any, res: any) => {
  try {
    const [tenantsSnap, leadsSnap] = await Promise.all([
      db.collection('tenants').get(),
      db.collection('salesPipeline').get(),
    ]);

    const tenants = tenantsSnap.docs
      .map((d) => ({ id: d.id, ...(serializeFirestoreValue(d.data()) as Record<string, unknown>) }))
      .sort((a, b) => {
        const aSec = (a.createdAt as { seconds?: number })?.seconds ?? 0;
        const bSec = (b.createdAt as { seconds?: number })?.seconds ?? 0;
        return bSec - aSec;
      });

    const leads = leadsSnap.docs
      .map((d) => ({ id: d.id, ...(serializeFirestoreValue(d.data()) as Record<string, unknown>) }))
      .sort((a, b) => {
        const aSec = (a.createdAt as { seconds?: number })?.seconds ?? 0;
        const bSec = (b.createdAt as { seconds?: number })?.seconds ?? 0;
        return bSec - aSec;
      });

    res.json({
      success: true,
      tenants,
      leads,
      projectId: process.env.FIREBASE_PROJECT_ID || appAdmin.options?.projectId || null,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error({ message: 'Superadmin data fetch failed', error: err.message });
    res.status(500).json({ success: false, error: err.message || 'Failed to load platform data' });
  }
});

const DEFAULT_MIGRATION_COLLECTIONS = ['tenants', 'salesPipeline', 'release_notes', 'users'] as const;

function getBhojanos2SourceDb() {
  const sourceJson = process.env.SOURCE_FIREBASE_SERVICE_ACCOUNT;
  if (!sourceJson) {
    throw new Error(
      'SOURCE_FIREBASE_SERVICE_ACCOUNT is not set. Add the bhojanos2 service account JSON on Render, run migration, then remove it.',
    );
  }
  const serviceAccount = JSON.parse(sourceJson);
  const sourceProjectId = process.env.SOURCE_FIREBASE_PROJECT_ID || 'bhojanos2';
  const appName = 'migration-source-bhojanos2';
  let sourceApp = getApps().find((a) => a.name === appName);
  if (!sourceApp) {
    sourceApp = initializeApp(
      { credential: cert(serviceAccount), projectId: sourceProjectId },
      appName,
    );
  }
  return getFirestore(sourceApp);
}

async function migrateFirestoreCollection(
  sourceDb: FirebaseFirestore.Firestore,
  targetDb: FirebaseFirestore.Firestore,
  collectionName: string,
  options?: { merge?: boolean; dryRun?: boolean },
) {
  const snap = await sourceDb.collection(collectionName).get();
  if (options?.dryRun) {
    return { collection: collectionName, count: snap.size, dryRun: true as const };
  }

  let written = 0;
  let batch = targetDb.batch();
  let batchSize = 0;
  for (const docSnap of snap.docs) {
    batch.set(
      targetDb.collection(collectionName).doc(docSnap.id),
      docSnap.data(),
      { merge: options?.merge !== false },
    );
    batchSize += 1;
    written += 1;
    if (batchSize >= 400) {
      await batch.commit();
      batch = targetDb.batch();
      batchSize = 0;
    }
  }
  if (batchSize > 0) {
    await batch.commit();
  }
  return { collection: collectionName, count: written, dryRun: false as const };
}

/** Copy superadmin dashboard collections from bhojanos2 → bhojanos-prod (Path A data backfill). */
app.post('/api/platform/migrate-from-bhojanos2', async (req, res) => {
  const { secret, dryRun, collections } = req.body || {};
  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ success: false, error: 'No bootstrap secret configured' });
  }
  if (secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ success: false, error: 'Invalid bootstrap secret' });
  }

  const targetProjectId = process.env.FIREBASE_PROJECT_ID || appAdmin.options?.projectId || 'bhojanos-prod';
  const sourceProjectId = process.env.SOURCE_FIREBASE_PROJECT_ID || 'bhojanos2';
  const selectedCollections: string[] = Array.isArray(collections) && collections.length > 0
    ? collections.filter((c: unknown) => typeof c === 'string')
    : [...DEFAULT_MIGRATION_COLLECTIONS];

  try {
    const sourceDb = getBhojanos2SourceDb();
    const targetDb = db;
    const results = [];

    for (const collectionName of selectedCollections) {
      results.push(
        await migrateFirestoreCollection(sourceDb, targetDb, collectionName, {
          merge: true,
          dryRun: dryRun === true,
        }),
      );
    }

    let founderLink: string[] = [];
    if (dryRun !== true) {
      const founderEmail = getFounderEmail();
      try {
        const authAdmin = getAdminAuth(appAdmin);
        const founderUser = await authAdmin.getUserByEmail(founderEmail);
        founderLink = await linkFounderTenantIfNeeded(founderUser.uid, founderEmail);
      } catch (linkErr: any) {
        logger.warn({ message: 'Founder re-link after migration skipped', error: linkErr.message });
      }
    }

    res.json({
      success: true,
      dryRun: dryRun === true,
      sourceProjectId,
      targetProjectId,
      collections: results,
      founderTenantIds: founderLink.length > 0 ? founderLink : undefined,
      message:
        dryRun === true
          ? `Dry run complete. ${results.reduce((n, r) => n + r.count, 0)} documents would be copied.`
          : `Migrated ${results.reduce((n, r) => n + r.count, 0)} documents into ${targetProjectId}. Owner Auth UIDs on prod may differ from bhojanos2 — owners re-register or use repair-user-by-email.`,
    });
  } catch (err: any) {
    logger.error({ message: 'bhojanos2 migration failed', error: err.message });
    res.status(500).json({ success: false, error: err.message || 'Migration failed' });
  }
});

/** Diagnose + merge duplicate users/{docId} profiles for one email onto Firebase Auth UID. */
app.post("/api/platform/repair-user-by-email", async (req, res) => {
  const { secret, email, deleteOrphans } = req.body || {};
  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ success: false, error: "No bootstrap secret configured" });
  }
  if (secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ success: false, error: "Invalid bootstrap secret" });
  }
  if (!email || typeof email !== "string") {
    return res.status(400).json({ success: false, error: "email is required" });
  }

  try {
    const result = await reconcileUserDocsForEmail(email, {
      deleteOrphans: deleteOrphans === true,
      preferredRole: isFounderOwnerEmail(email) ? "superadmin" : undefined,
    });
    const founderTenants = await linkFounderTenantIfNeeded(result.canonicalUid, email);
    res.json({
      success: true,
      ...result,
      ownedTenantIds: founderTenants.length > 0 ? founderTenants : undefined,
      message:
        founderTenants.length > 0
          ? `Founder profile linked to ${FOUNDER_TENANT_ID} at users/${result.canonicalUid}.`
          : result.duplicateDocIds.length > 0
            ? `Merged profile onto users/${result.canonicalUid}. Duplicate doc IDs: ${result.duplicateDocIds.join(", ")}`
            : `Profile OK at users/${result.canonicalUid} (no duplicates found).`,
    });
  } catch (err: any) {
    logger.error({ message: "Failed to repair user by email", error: err.message });
    const status = err.code === "auth/user-not-found" ? 404 : 500;
    res.status(status).json({ success: false, error: err.message || "Repair failed" });
  }
});
