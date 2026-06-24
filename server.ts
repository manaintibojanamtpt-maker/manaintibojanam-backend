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

// Write to system_incidents safely
const writeSystemIncident = async (type: string, status: string, payload: any, correlationId?: string) => {
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
    logger.error({ message: "Failed to write system incident", err: err.message, correlationId });
  }
};

// ================= PAYMENT RECONCILIATION =================
const promoteDraftTransaction = async (
  draftId: string,
  paymentDetails: { razorpayOrderId: string, razorpayPaymentId: string },
  reconciliationSource: 'client_callback' | 'webhook_recovery',
  eventId?: string | null
): Promise<boolean> => {
  if (!_db) throw new Error("Firestore not initialized");
  
  try {
    await _db.runTransaction(async (transaction) => {
      const draftRef = _db!.collection('order_drafts').doc(draftId);
      const draftSnap = await transaction.get(draftRef);
      
      if (!draftSnap.exists) {
        throw new Error(`Draft ${draftId} does not exist.`);
      }
      
      const draftData = draftSnap.data()!;
      if (draftData.status === 'promoted') {
        logger.info({ message: "Draft already promoted", draftId, reconciliationSource });
        return; // Already processed
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

      // Phase 2 Security Patch: Sandbox Enforcement
      const tenantRef = _db!.collection('tenants').doc(draftData.tenantId || 'mana-inti');
      const tenantSnap = await transaction.get(tenantRef);
      if (tenantSnap.exists) {
        const tenantData = tenantSnap.data()!;
        if (tenantData.sandboxMode) {
          // Do a non-transactional count query (safe enough for sandbox limits)
          const ordersSnap = await _db!.collection('orders').where('tenantId', '==', tenantRef.id).count().get();
          if (ordersSnap.data().count >= 10) {
            throw new Error('Sandbox limit exceeded. Upgrade to full activation to accept more orders.');
          }
        }
      }

      const orderRef = _db!.collection('orders').doc(draftId); // Draft ID becomes Order ID
      transaction.set(orderRef, {
        ...draftData.orderPayload,
        tenantId: draftData.tenantId || 'mana-inti',
        status: draftData.subscriptionPayload ? 'ACTIVE' : 'PLACED',
        paymentStatus: 'success',
        razorpayOrderId: paymentDetails.razorpayOrderId,
        razorpayPaymentId: paymentDetails.razorpayPaymentId,
        confirmedAt: FieldValue.serverTimestamp(),
        reconciliationSource,
        reconciliationEventId: eventId || null
      });

      if (draftData.subscriptionPayload) {
        const subRef = _db!.collection('subscriptions').doc();
        transaction.set(subRef, {
          ...draftData.subscriptionPayload,
          tenantId: draftData.tenantId || 'mana-inti',
          createdAt: FieldValue.serverTimestamp()
        });
      }

      transaction.update(draftRef, { status: 'promoted' });
    });
    
    logger.info({ message: "Draft successfully promoted to order", draftId, reconciliationSource });
    return true;
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
  }
  
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

const ambientProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
const configProjectId = firebaseConfig.projectId;
// Prioritize config project ID as it's the one explicitly provisioned for the app
const projectId = configProjectId || ambientProjectId || 'mana-inti-bojanam-pune-492610'; 
const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
const FIRESTORE_READ_TIMEOUT_MS = Number(process.env.FIRESTORE_READ_TIMEOUT_MS || 12000);

console.log("--- Firebase Admin Initialization ---");
console.log(`Ambient Project ID: ${ambientProjectId || 'not set'}`);
console.log(`Config Project ID: ${configProjectId || 'not set'}`);
console.log(`Using Project ID: ${projectId || 'unknown'}`);
console.log(`Using Database ID: ${databaseId}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
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
          projectId: projectId
        });
        console.log(`✅ [Firebase Admin] Initialized with Service Account (Project: ${projectId})`);
      } catch (parseErr) {
        console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", parseErr);
        // Fallback
        appAdmin = initializeApp(projectId ? { projectId } : {});
      }
    } else {
      // Standard initialization for GCP/Firebase environments
      appAdmin = initializeApp(projectId ? { projectId } : {});
      console.log(`✅ [Firebase Admin] Initialized [DEFAULT] app (Project: ${appAdmin.options.projectId || 'ambient'}).`);
    }
  } else {
    appAdmin = getApp();
  }
} catch (err: any) {
  console.error(`❌ [Firebase Admin] Primary initialization failed: ${err.message}`);
  // 2. Fallback to explicit named app initialization
  try {
    const appOptions = { projectId: projectId || configProjectId };
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

// In-memory cache for tenant validation (5 mins)
const tenantCache: Record<string, { exists: boolean, status?: string, expiresAt: number }> = {};

// Tenant Context Middleware
app.use(async (req: any, res, next) => {
  // Extract tenantId from custom header or query param
  let tenantId = req.headers["x-tenant-id"] || req.query.tenantId;
  
  if (!tenantId) {
    tenantId = "mana-inti";
  }
  
  if (req.path.startsWith('/api/health') || req.path.startsWith('/api/server-time')) {
    req.tenantId = tenantId;
    return next();
  }

  try {
    const now = Date.now();
    let cached = tenantCache[tenantId as string];
    
    if (!cached || cached.expiresAt < now) {
      if (_db) {
        const docSnap = await _db.collection('tenants').doc(tenantId as string).get();
        if (docSnap.exists) {
          cached = { exists: true, status: docSnap.data()?.status, expiresAt: now + 300000 };
        } else {
          cached = { exists: false, expiresAt: now + 300000 };
        }
        tenantCache[tenantId as string] = cached;
      } else {
        // DB not initialized yet, allow pass-through
        req.tenantId = tenantId;
        return next();
      }
    }

    if (!cached.exists) {
      return res.status(400).json({ success: false, error: "Invalid Tenant ID" });
    }

    if (cached.status === 'suspended') {
      return res.status(403).json({ success: false, error: "Tenant account is suspended" });
    }

    req.tenantId = tenantId;
    next();
  } catch (err) {
    console.error("Tenant validation error:", err);
    req.tenantId = "mana-inti";
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
  const status: any = {
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    firebase: {
      projectId: projectId || "unknown",
      databaseId: databaseId || "(default)",
      initialized: !!_db,
      activeDatabaseId: _db?.databaseId || "(default)",
      appProjectId: appAdmin?.options?.projectId || "unknown",
      apps: getApps().length
    }
  };
  res.json(status);
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

const getSettings = async () => {
  try {
    if (!_db) {
      console.warn("⚠️ [Firestore Admin] _db not initialized in getSettings, using defaults.");
      return {
        gst: 5,
        packingFee: 10,
        deliveryFee: 30,
        isStoreOpen: true,
        storeTiming: {
          openTime: "09:00",
          closeTime: "22:30",
          isManualOverride: false
        },
        workflow: {
          autoMode: true
        }
      };
    }
    const doc: any = await withTimeout(
      db.collection("adminSettings").doc("global").get(),
      "adminSettings/global read"
    );
    if (!doc.exists) {
      const defaultSettings = {
        gst: 5,
        packingFee: 10,
        deliveryFee: 30,
        isStoreOpen: true,
        storeTiming: {
          openTime: "09:00",
          closeTime: "22:30",
          isManualOverride: false
        },
        workflow: {
          autoMode: true
        }
      };
      // Don't block on setting defaults if it fails
      try {
        await withTimeout(
          db.collection("adminSettings").doc("global").set(defaultSettings),
          "adminSettings/global default write"
        );
      } catch (e: any) {
        console.warn("⚠️ Failed to save default settings (might be read-only):", e.message);
      }
      return defaultSettings;
    }
    return doc.data();
  } catch (err: any) {
    // If it's code 5 (NOT_FOUND), it just means the document doesn't exist yet
    if (isFirestoreNotFoundError(err)) {
      const defaultSettings = {
        gst: 5,
        packingFee: 10,
        deliveryFee: 30,
        isStoreOpen: true,
        storeTiming: {
          openTime: "09:00",
          closeTime: "22:30",
          isManualOverride: false
        },
        workflow: {
          autoMode: true
        }
      };
      return defaultSettings;
    }

    // Handle PERMISSION_DENIED
    if (isFirestorePermissionError(err)) {
      console.warn("⚠️ [Firestore Admin] Permission denied in getSettings.");
      
      // Return defaults instead of crashing
      return {
        gst: 5,
        packingFee: 10,
        deliveryFee: 30,
        isStoreOpen: true,
        storeTiming: {
          openTime: "09:00",
          closeTime: "22:30",
          isManualOverride: false
        },
        workflow: {
          autoMode: true
        }
      };
    }

    console.error("❌ [Firestore Admin] Error fetching settings:", err.message);
    // If we get permission denied here, it means our verified _db is still failing
    // This could happen if permissions changed or if verifyConnection gave a false positive
    return {
      gst: 5,
      packingFee: 10,
      deliveryFee: 30,
      isStoreOpen: true,
      storeTiming: {
        openTime: "09:00",
        closeTime: "22:30",
        isManualOverride: false
      },
      workflow: {
        autoMode: true
      }
    };
  }
};

import nodemailer from "nodemailer";

// --- NOTIFICATION HELPERS ---
const getTransporter = () => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT) || 587;

  if (!user || !pass || user === "your_email@gmail.com" || pass === "your_app_password") {
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
    if (code.includes('EAUTH') || code.includes('invalid email') || err.status === 400) return 'NON_RETRYABLE';
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

async function sendEmailNotification(to: string, subject: string, body: string) {
  try {
    const transporter = getTransporter();
    const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER;

    if (!transporter || !emailFrom) {
      console.warn("⚠️ Email credentials missing or using placeholders. Skipping email notification.");
      console.log("💡 To enable emails, set EMAIL_USER and EMAIL_PASS in the Secrets panel.");
      return;
    }

    console.log(`📧 Attempting to send email to: ${to} (Subject: ${subject})`);

    const info = await transporter.sendMail({
      from: emailFrom.includes('<') ? emailFrom : `"Mana Inti Bojanam" <${emailFrom}>`,
      to,
      subject,
      html: body,
    });
    console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
  } catch (err: any) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
    if (err.code === 'EAUTH') {
      console.error("🔑 Authentication failed. Please check your EMAIL_USER and EMAIL_PASS (App Password).");
    }
    
    await enqueueNotification({
      channel: 'EMAIL',
      recipient: to,
      messagePayload: { subject, body },
      correlationId: `email-${Date.now()}`,
      relatedEntities: {},
      failureType: classifyError('EMAIL', err),
      lastError: err.message || String(err),
      attempts: [{ timestamp: new Date().toISOString(), errorReason: err.message }]
    });
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
      title: "Payment submitted",
      body: `Payment for order ${orderLabel} is waiting for verification.`
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
  if (!_db) return;
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
    logger.error({ message: "processPrepAlertsBatch error", err: err.message });
  }
};

// ================= NOTIFICATION OUTBOX WORKER =================
const processOutboxBatch = async () => {
  if (!_db) return;
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
          await sendEmailNotification(data.recipient, data.messagePayload.subject, data.messagePayload.body);
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
    console.error("Outbox Processing Error:", err.message);
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
      const draft = draftDoc.data();

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
      return res.status(400).json({ success: false, verified: false, error: 'Razorpay payment signature verification failed.' });
    }

    // Call Canonical Promotion Flow
    await promoteDraftTransaction(
      draftId,
      { razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id },
      'client_callback'
    );

    res.json({ success: true, verified: true, orderId: draftId });
  } catch (err: any) {
    console.error("Razorpay Payment Verification Error:", err);
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
    const orderData = { id: orderDoc.id, ...orderDoc.data(), ...updateData };
    if (status && status !== previousStatus) {
      await notifyCustomer(orderData, status);
    }

    if (status === 'PAYMENT_VERIFICATION') {
      // Notify admin about payment submission
      const adminMsg = `💰 *Payment Submitted!* 💰\n\n` +
        `*Order:* #${orderData.orderNumber}\n` +
        `*Customer:* ${orderData.userName || 'Guest'}\n` +
        `*Total:* ₹${orderData.total}\n\n` +
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

    const currentStatus = orderDoc.data()?.status || 'UNKNOWN';

    const updatePayload: any = { 
      status, 
      updatedAt: FieldValue.serverTimestamp(),
      statusHistory: FieldValue.arrayUnion({
        status,
        timestamp: new Date().toISOString(),
        description: `Order moved from ${currentStatus} to ${status}`,
        metadata: deliveryData || {}
      })
    };

    if (deliveryData) {
      if (deliveryData.deliveryPartner) updatePayload.deliveryPartner = deliveryData.deliveryPartner;
      if (deliveryData.trackingUrl) updatePayload.trackingUrl = deliveryData.trackingUrl;
      if (deliveryData.riderName) updatePayload.riderName = deliveryData.riderName;
      if (deliveryData.riderPhone) updatePayload.riderPhone = deliveryData.riderPhone;
      if (deliveryData.deliveryAssignedAt) updatePayload.deliveryAssignedAt = deliveryData.deliveryAssignedAt;
    }

    await orderRef.update(updatePayload);
    
    // Notify customer
    const mergedOrder = { ...orderDoc.data(), ...updatePayload, id: orderId };
    const shouldNotify = status === 'OUT_FOR_DELIVERY' ? (deliveryData?.notifyCustomer !== false) : true;
    
    if (shouldNotify) {
      notifyCustomer(mergedOrder, status).catch(console.error);
    }
    
    res.json({ success: true, message: `Order marked as ${status}` });
  } catch (error: any) {
    console.error("Owner Status Update Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= WORKER CRON =================
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

let outboxInterval: NodeJS.Timeout | null = null;
const startOutboxWorker = () => {
  if (outboxInterval) return;
  // Run every 60 seconds
  outboxInterval = setInterval(async () => {
    try {
      // Optional feature flag check if needed
      const settings = await getSettings();
      if (settings.workflow?.autoRetryWorker !== false) {
        await processOutboxBatch();
        await processPrepAlertsBatch();
      }
    } catch (err) {
      console.error("Outbox worker interval error:", err);
    }
  }, 60000);
};

async function startServer() {
  // ================= FRONTEND =================
  if (process.env.NODE_ENV !== "production") {
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
    try {
      // await seedMenu();
      // await seedCategories();
      console.log("✅ Menu and Categories seeding check bypassed");
      // startAutoWorkflow();
      console.log("✅ Auto Workflow worker bypassed");
      startOutboxWorker();
      console.log("✅ Outbox worker initialized");
      
      // Initialize StoreBrain locally
      brain.refresh();
      console.log("✅ StoreBrain initialized");
    } catch (err) {
      console.error("❌ Seeding/Brain failed:", err);
    }
  });
}

// ================= AUTOPILOT MONITORING SYSTEM =================
const getAutoPilotTransporter = () => {
  const nodemailer = require("nodemailer");
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER || "bhojanos26@gmail.com",
      pass: process.env.EMAIL_PASS || "fallback_pass"
    }
  });
};

let consecutiveEmailFailures = 0;

const sendFounderAlert = async (subject: string, html: string) => {
  const sentAt = new Date().toISOString();
  let status = 'SUCCESS';
  let providerResponse = 'OK';
  try {
    const transporter = getAutoPilotTransporter();
    const info = await transporter.sendMail({
      from: '"BhojanOS AutoPilot" <bhojanos26@gmail.com>',
      to: "bhojanos26@gmail.com",
      subject: `[AutoPilot] ${subject}`,
      html
    });
    providerResponse = info?.response || 'OK';
    consecutiveEmailFailures = 0;
    logger.info({ message: "Founder Alert Sent", subject });
  } catch (err: any) {
    status = 'FAILED';
    providerResponse = err.message;
    consecutiveEmailFailures++;
    logger.error({ message: "Failed to send founder alert", err });
    
    if (consecutiveEmailFailures >= 3 && _db) {
      logger.error({ message: "CRITICAL: 3 Consecutive Email Failures", severity: "critical", type: "EMAIL_DELIVERY_FAILURE" });
      await _db.collection('critical_alert_failures').add({
        severity: "critical",
        type: "EMAIL_DELIVERY_FAILURE",
        timestamp: new Date().toISOString(),
        failureCount: consecutiveEmailFailures
      }).catch(console.error);
    }
  } finally {
    if (_db) {
      await _db.collection('alert_delivery_logs').add({ recipient: 'bhojanos26@gmail.com', subject, sentAt, status, providerResponse }).catch(console.error);
    }
  }
};

const withCronHealth = (jobName: string, fn: Function) => {
  return async () => {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    let status = 'SUCCESS';
    try {
      await fn();
    } catch (err) {
      status = 'FAILED';
      throw err;
    } finally {
      const completedAt = new Date().toISOString();
      const duration = Date.now() - startMs;
      if (_db) {
        await _db.collection('cron_health').add({ jobName, startedAt, completedAt, duration, status }).catch(console.error);
      }
    }
  };
};

const initializeMonitoringJobs = () => {
  if (!_db) return;

  // Phase 12: Platform Heartbeat System
  cron.schedule("*/5 * * * *", async () => {
    try {
      await _db.collection('system_heartbeats').add({
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        serverUptime: process.uptime(),
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user,
        nodeVersion: process.version,
        buildVersion: 'FounderBeta'
      });
    } catch (e) {
      logger.error({ message: 'Heartbeat failure', error: e });
    }
  });

  // Phase 16: Hourly AutoPilot Aggregator (Extended)
  cron.schedule("0 * * * *", withCronHealth("Hourly AutoPilot Aggregator", async () => {
    logger.info({ message: "Running Hourly AutoPilot Aggregator" });
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    
    // Check Heartbeat Freshness (15 min rule)
    const fifteenMinsAgo = new Date(Date.now() - 900000).toISOString();
    const recentHeartbeats = await _db.collection('system_heartbeats').where("timestamp", ">=", fifteenMinsAgo).limit(1).get();
    const isHeartbeatHealthy = !recentHeartbeats.empty;
    if (!isHeartbeatHealthy) {
       await sendFounderAlert(`CRITICAL: Missing Heartbeat`, `<p>No heartbeat received for 15 minutes. Potential server or deployment failure.</p>`);
    }

    // Check Cron Execution (Did we miss a cycle?)
    const fetchCount = async (coll: string) => {
      const snap = await _db.collection(coll).where("serverTimestamp", ">=", oneHourAgo).get();
      return snap.size;
    };
    
    const crashes = await fetchCount("system_errors");
    const payments = await fetchCount("payment_incidents");
    const security = await fetchCount("security_events");
    const firestore = await fetchCount("firestore_errors");
    const apiErrs = await fetchCount("api_errors");
    const blockers = await fetchCount("merchant_blockers");
    const emailFails = await _db.collection('alert_delivery_logs').where("sentAt", ">=", oneHourAgo).where("status", "==", "FAILED").get().then((s: any) => s.size);
    
    let score = 100 - (crashes * 5) - (payments * 10) - (security * 5) - (firestore * 2) - (apiErrs * 2) - (blockers * 15) - (emailFails * 5);
    if (!isHeartbeatHealthy) score -= 50;
    score = Math.max(0, score);

    let statusLabel = '🟢 Healthy';
    if (score < 50) statusLabel = '🔴 Critical';
    else if (score < 80) statusLabel = '🟡 Degraded';
    
    await _db.collection("platform_health_reports").add({
      timestamp: new Date().toISOString(),
      score,
      statusLabel,
      metrics: { crashes, payments, security, firestore, apiErrs, blockers, emailFails, isHeartbeatHealthy }
    });
    
    if (score < 80 || crashes > 5 || payments > 2 || security > 5 || blockers > 0) {
      await sendFounderAlert(`Health Drop: ${statusLabel} (Score ${score})`, `
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
          <li>Heartbeat Freshness: ${isHeartbeatHealthy ? 'Healthy' : 'Failing'}</li>
        </ul>
      `);
    }
  }));

  // Daily Founder Digest
  cron.schedule("0 8 * * *", withCronHealth("Daily Founder Digest", async () => {
    logger.info({ message: "Running Daily Founder Digest" });
    await sendFounderAlert("Daily Digest", "<h2>BhojanOS Daily Digest</h2><p>Report generated at 08:00 AM.</p><p>Check Dashboard for full metrics.</p>");
  }));
};

initializeMonitoringJobs();

startServer();



// ================= AI ASSISTANT =================
import { processAIRequest } from "./aiProvider";
import { brain } from "./storeBrain";

app.post("/api/ai/chat", strictLimiter, async (req, res) => {
  try {
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
