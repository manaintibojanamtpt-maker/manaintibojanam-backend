const {setGlobalOptions} = require("firebase-functions");
const {onRequest, onCall} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// For cost control, you can set the maximum number of containers that can be running at the same time.
setGlobalOptions({ maxInstances: 10 });

// NOTE:
// The Razorpay `createRazorpayOrder` and `verifyRazorpayPayment` functions 
// have been securely migrated to the main Render backend (`server.ts`).
// This ensures a single source of truth for all payment reconciliation and webhook handling.

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });