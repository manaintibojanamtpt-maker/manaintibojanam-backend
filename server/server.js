const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const admin = require('firebase-admin');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT is missing. Biometrics and admin features will fail.');
  }
} catch (err) {
  console.error('Failed to initialize Firebase Admin:', err);
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

// RP ID should be the domain without protocol
const rpID = process.env.PASSKEY_RP_ID || 'mana-inti-bojanam-pune-492610.web.app';
// Expected Origin should be the full URL
const expectedOrigin = process.env.PASSKEY_ORIGIN || 'https://mana-inti-bojanam-pune-492610.web.app';

// Initialize Razorpay conditionally
let razorpay;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } else {
    console.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Payments will fail.');
  }
} catch (err) {
  console.error('Failed to initialize Razorpay:', err);
}

app.get('/', (req, res) => {
  res.send('Server running');
});

app.get('/api/auth/health', (req, res) => {
  res.json({
    status: 'ok',
    firebaseInitialized: !!db,
    rpID,
    origin: expectedOrigin,
    timestamp: new Date().toISOString()
  });
});

// --- Biometric Auth Endpoints ---

app.post('/api/auth/generate-registration-options', async (req, res) => {
  try {
    const { userId, email, displayName } = req.body;
    if (!db) {
      console.error('Registration attempt failed: Firestore database is not initialized. Check FIREBASE_SERVICE_ACCOUNT env var.');
      return res.status(500).json({ error: 'Server database is not initialized. Please ensure the Firebase Service Account is configured on Render.' });
    }

    // Get existing authenticators for this user
    const userDoc = await db.collection('users').doc(userId).get();
    const userAuths = userDoc.exists ? (userDoc.data().authenticators || []) : [];

    const options = await generateRegistrationOptions({
      rpName: 'Mana Inti Bojanam',
      rpID,
      userID: userId,
      userName: email || userId,
      userDisplayName: displayName || email || userId,
      attestationType: 'none',
      excludeCredentials: userAuths.map(auth => ({
        id: auth.credentialID,
        type: 'public-key',
        transports: auth.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Enforce Face ID / Touch ID / Fingerprint
      },
    });

    // Store challenge in Firestore with a 5-minute TTL
    await db.collection('challenges').doc(userId).set({
      challenge: options.challenge,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json(options);
  } catch (error) {
    console.error('Registration options error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/verify-registration', async (req, res) => {
  try {
    const { userId, response } = req.body;
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const challengeDoc = await db.collection('challenges').doc(userId).get();
    if (!challengeDoc.exists) {
      return res.status(400).json({ error: 'Challenge expired or not found' });
    }

    const { challenge } = challengeDoc.data();

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (verification.verified) {
      const { registrationInfo } = verification;
      const { credentialPublicKey, credentialID, counter } = registrationInfo;

      const newAuthenticator = {
        credentialID: Buffer.from(credentialID).toString('base64'),
        credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        transports: response.response.transports,
      };

      // Save to user's document
      await db.collection('users').doc(userId).update({
        authenticators: admin.firestore.FieldValue.arrayUnion(newAuthenticator),
        hasBiometrics: true
      });

      // Cleanup challenge
      await db.collection('challenges').doc(userId).delete();

      res.json({ verified: true });
    } else {
      res.status(400).json({ verified: false, error: 'Verification failed' });
    }
  } catch (error) {
    console.error('Registration verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/generate-authentication-options', async (req, res) => {
  try {
    // Authentication options are usually user-less first to allow "discoverable credentials" (Passkeys)
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
    });

    // Store challenge in a generic doc for verification (or we can use a specific ID if passed)
    const challengeId = crypto.randomBytes(16).toString('hex');
    await db.collection('challenges').doc(challengeId).set({
      challenge: options.challenge,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ options, challengeId });
  } catch (error) {
    console.error('Authentication options error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/verify-authentication', async (req, res) => {
  try {
    const { challengeId, response } = req.body;
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const challengeDoc = await db.collection('challenges').doc(challengeId).get();
    if (!challengeDoc.exists) {
      return res.status(400).json({ error: 'Challenge expired or not found' });
    }

    const { challenge } = challengeDoc.data();

    // Find the user who owns this credential
    const credentialID = response.id;
    const userQuery = await db.collection('users').where('authenticators', 'array-contains-any', [{ credentialID }]).get();
    
    // The 'array-contains-any' is tricky with objects. We might need to iterate or use a mapping.
    // Optimization: In a production app, we'd have a separate 'authenticators' collection indexed by credentialID.
    // For now, let's do a more robust search if simple query fails.
    let targetUserDoc = null;
    let targetAuth = null;

    const allUsersWithAuths = await db.collection('users').where('hasBiometrics', '==', true).get();
    for (const doc of allUsersWithAuths.docs) {
      const auths = doc.data().authenticators || [];
      const found = auths.find(a => a.credentialID === credentialID);
      if (found) {
        targetUserDoc = doc;
        targetAuth = found;
        break;
      }
    }

    if (!targetUserDoc || !targetAuth) {
      return res.status(400).json({ error: 'User not found for this passkey' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(targetAuth.credentialID, 'base64'),
        credentialPublicKey: Buffer.from(targetAuth.credentialPublicKey, 'base64'),
        counter: targetAuth.counter,
      },
    });

    if (verification.verified) {
      // Update counter
      const updatedAuths = targetUserDoc.data().authenticators.map(a => 
        a.credentialID === credentialID ? { ...a, counter: verification.authenticationInfo.newCounter } : a
      );
      await targetUserDoc.ref.update({ authenticators: updatedAuths });

      // Create Firebase Custom Token
      const customToken = await admin.auth().createCustomToken(targetUserDoc.id);

      // Cleanup challenge
      await db.collection('challenges').doc(challengeId).delete();

      res.json({ verified: true, token: customToken });
    } else {
      res.status(400).json({ verified: false, error: 'Verification failed' });
    }
  } catch (error) {
    console.error('Authentication verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Razorpay Endpoints ---

app.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const options = {
      amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    if (!razorpay) {
      return res.status(500).json({ error: 'Razorpay is not configured on the server.' });
    }

    const order = await razorpay.orders.create(options);
    res.json({
      order_id: order.id,
      amount: order.amount
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Something went wrong while creating order' });
  }
});

app.post('/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      return res.json({ success: true, message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ success: false, error: "Invalid signature" });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
