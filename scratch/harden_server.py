import re

def main():
    with open('server.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Insert imports
    if 'import rateLimit' not in content:
        content = content.replace(
            'import express from "express";',
            'import express from "express";\nimport rateLimit from "express-rate-limit";'
        )

    # 2. Add Environment Validation
    if 'Startup Secret Validation Matrix' not in content:
        validation_code = """
// ================= Startup Secret Validation Matrix =================
const validateSecrets = () => {
  const missingCritical = [];
  
  if (!process.env.FIREBASE_PROJECT_ID && !process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCP_PROJECT) {
    // Note: We use fallback in dev, but ideally it should crash in prod.
  }
  
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    logger.warn("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing. Online payments disabled.");
  }
  
  if (!process.env.GEMINI_API_KEY) {
    logger.warn("GEMINI_API_KEY missing. AI Assistant will be disabled.");
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
"""
        content = content.replace(
            'const PORT = Number(process.env.PORT) || 8080;',
            'const PORT = Number(process.env.PORT) || 8080;\n' + validation_code
        )

    # 3. Add middlewares after `const app = express();`
    if 'const globalLimiter' not in content:
        middlewares = """
const app = express();

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
"""
        content = content.replace('const app = express();\n\n// ================= MIDDLEWARE =================', middlewares)

    # 4. Patch protected routes
    content = content.replace('app.post("/api/admin/send-report", async (req, res) => {', 'app.post("/api/admin/send-report", requireAdmin, async (req: any, res: any) => {')
    content = content.replace('app.post("/api/admin/notify-registration", async (req, res) => {', 'app.post("/api/admin/notify-registration", requireAdmin, async (req: any, res: any) => {')
    content = content.replace('app.get("/api/admin/settings", async (_, res) => {', 'app.get("/api/admin/settings", requireAdmin, async (_: any, res: any) => {')
    
    content = content.replace('app.post("/api/orders", async (req, res) => {', 'app.post("/api/orders", verifyFirebaseToken, async (req: any, res: any) => {')
    content = content.replace('app.post("/api/orders/:id/notify-status", async (req, res) => {', 'app.post("/api/orders/:id/notify-status", requireAdmin, async (req: any, res: any) => {')
    content = content.replace('app.post("/api/auth/biometric/register", async (req, res) => {', 'app.post("/api/auth/biometric/register", verifyFirebaseToken, strictLimiter, async (req: any, res: any) => {')
    content = content.replace('app.post("/api/auth/biometric/verify", async (req, res) => {', 'app.post("/api/auth/biometric/verify", strictLimiter, async (req, res) => {')
    
    # 5. Add /api/create-razorpay-order strict limiter
    content = content.replace('app.post("/api/create-razorpay-order", async (req, res) => {', 'app.post("/api/create-razorpay-order", strictLimiter, async (req, res) => {')

    # 6. Add AI Endpoint
    if 'app.post("/api/ai/chat"' not in content:
        ai_endpoint = """
// ================= AI ASSISTANT =================
import { GoogleGenAI } from "@google/genai";
app.post("/api/ai/chat", strictLimiter, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ success: false, error: "AI Assistant is not configured on this server." });
    }
    const ai = new GoogleGenAI({ apiKey });
    const { messages, userMessage, systemInstruction } = req.body;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...messages.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), { role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });
    
    res.json({ success: true, text: response.text });
  } catch (err: any) {
    logger.error({ message: "AI Error", error: err.message });
    res.status(500).json({ success: false, error: "AI processing failed." });
  }
});
"""
        content = content + "\n" + ai_endpoint

    # 7. Add Bootstrap Admin endpoint
    if 'app.post("/api/admin/grant-claim"' not in content:
        bootstrap_endpoint = """
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
"""
        content = content + "\n" + bootstrap_endpoint

    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Patched server.ts")

if __name__ == "__main__":
    main()
