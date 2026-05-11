const {setGlobalOptions} = require("firebase-functions");
const {onRequest, onCall} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// For cost control, you can set the maximum number of containers that can be running at the same time.
setGlobalOptions({ maxInstances: 10 });

// Razorpay Order Creation Function
exports.createRazorpayOrder = onCall(
  {
    region: "asia-south1",
    secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
  },
  async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to create payment order."
      );
    }

    const { amount } = data;
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid payment amount. Please update your cart before retrying."
      );
    }

    if (numericAmount < 1) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Online payment requires a minimum order value of ₹1. Please choose UPI or COD for smaller orders."
      );
    }

    try {
      const options = {
        amount: Math.round(numericAmount * 100), // amount in the smallest currency unit
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      logger.info("Razorpay order created", { orderId: order.id, amount: order.amount });

      return { success: true, order };
    } catch (error) {
      logger.error("Razorpay Order Creation Error:", error);
      const errorMessage = error.error?.description || error.message || "Failed to create Razorpay order";
      throw new functions.https.HttpsError(
        "internal",
        `${errorMessage}. Please check Razorpay configuration or use Cash on Delivery.`
      );
    }
  }
);

// Razorpay Payment Verification Function
exports.verifyRazorpayPayment = onCall(
  {
    region: "asia-south1",
    secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
  },
  async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to verify payment."
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing payment verification parameters."
      );
    }

    try {
      // Verify signature
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      const verified = generatedSignature === razorpay_signature;

      if (!verified) {
        logger.warn("Razorpay payment signature verification failed", {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id
        });
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Razorpay payment signature verification failed."
        );
      }

      logger.info("Razorpay payment verified successfully", {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      });

      return { success: true, verified: true };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      logger.error("Razorpay Payment Verification Error:", error);
      const errorMessage = error.message || "Failed to verify Razorpay payment.";
      throw new functions.https.HttpsError("internal", errorMessage);
    }
  }
);

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });