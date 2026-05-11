# Push Notifications Setup Guide

Complete guide to set up real-time push notifications for admin and customer in Mana Inti Bojanam app.

## Overview

The system uses **Firebase Cloud Messaging (FCM)** to send push notifications:
- **Admins** receive notifications for new orders with order details
- **Customers** receive notifications for order status updates
- Works on web (PWA), iOS, and Android platforms
- Device tokens are stored in Firestore and managed automatically

## Architecture

```
Order Created in Firestore
    ↓
Cloud Function Triggered (orders/{orderId}/onCreate)
    ↓
Fetch Admin Device Tokens from /users collection
    ↓
Send Multicast Notification via FCM
    ↓
Admin Device Receives Push Notification
    ↓
Service Worker handles background notification
    ↓
Shows notification + app toast if open
```

## Setup Steps

### 1. Firebase Console Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project "mana-inti-bojanam-pune-492610"
3. Navigate to **Project Settings** (⚙️ icon, top left)
4. Go to **Cloud Messaging** tab
5. Copy your **Web API Key (Server Key)** - you'll need this
6. Copy your **Sender ID** - you'll also need this

### 2. Get VAPID Key

A VAPID key is required for web push notifications on browsers:

**Option A: Generate new VAPID key**
```bash
# Install web-push globally
npm install -g web-push

# Generate new key pair
web-push generate-vapid-keys

# You'll get output like:
# Public Key: ...
# Private Key: ...
```

**Option B: Use Firebase Console's auto-generated key**
- In Cloud Messaging tab, look for "Web Configuration"
- Firebase may auto-generate this for you

Save both public and private keys for configuration.

### 3. Update Firebase Configuration

Update `src/firebase-applet-config.json` to include the Web API Key:

```json
{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "mana-inti-bojanam-pune-492610.firebaseapp.com",
  "projectId": "mana-inti-bojanam-pune-492610",
  "storageBucket": "mana-inti-bojanam-pune-492610.appspot.com",
  "messagingSenderId": "YOUR_SENDER_ID",
  "appId": "YOUR_APP_ID",
  "measurementId": "YOUR_MEASUREMENT_ID"
}
```

### 4. Update NotificationService VAPID Key

Edit `src/services/NotificationService.ts`:

```typescript
const VAPID_KEY = 'YOUR_PUBLIC_VAPID_KEY_HERE';
```

Replace with the public key from step 2.

### 5. Install Cloud Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Initialize TypeScript (if needed)
npm run build
```

### 6. Deploy Cloud Functions

```bash
# From project root
firebase deploy --only functions

# Monitor deployment
firebase functions:log

# You should see functions deployed:
# - notifyAdminNewOrder
# - notifyCustomerOrderStatus
# - testNotification
```

### 7. Update Firestore Rules

The existing rules already support device token storage. The `/users/{userId}` rule allows authenticated users to update their own profile including `deviceTokens`:

```firestore
match /users/{userId} {
  allow update: if isAuthenticated() && (isOwner(userId) || isAdmin());
}
```

No changes needed unless you want additional restrictions.

### 8. Enable Service Worker

The app uses a service worker to handle background notifications. Ensure `public/service-worker.js` exists and is properly registered.

Check `src/services/NotificationService.ts` line ~40 for registration:

```typescript
const registration = await navigator.serviceWorker.register('/service-worker.js', {
  scope: '/'
});
```

### 9. Test the Setup

#### Test in Development

1. Start the app locally:
```bash
npm run dev
```

2. Open admin panel (login with admin credentials)

3. You should see a notification permission prompt - **allow it**

4. Go to Firestore console and create a test order:
```
Collection: orders
Document: auto-ID
{
  orderNumber: 1001,
  userId: "customer-uid",
  phoneNumber: "9999999999",
  items: [{name: "Biryani", quantity: 1, price: 250}],
  totalAmount: 250,
  status: "placed",
  address: "Test Address",
  createdAt: (current timestamp)
}
```

5. Check browser notifications - you should see admin notification

#### Test Notifications Manually

Using Firebase hosted functions or local emulator:

```bash
# Start emulator
firebase emulators:start --only functions,firestore

# In another terminal, test function
firebase functions:call testNotification -- \
  --data='{"userId":"YOUR_ADMIN_UID","title":"Test","body":"This is a test"}'
```

### 10. Deploy to Production

```bash
# Build the app
npm run build

# Deploy hosting and functions
firebase deploy

# Check deployment
firebase hosting:channel:list
```

## File Changes Summary

**Frontend Files Updated:**
- `src/services/NotificationService.ts` - Enhanced with `registerDeviceToken()` and `unregisterDeviceToken()`
- `src/hooks/useAdminNotifications.ts` - New hook for admin notification setup
- `src/pages/AdminPanel.tsx` - Added `useAdminNotifications()` hook
- `src/services/StorageService.ts` - New image upload service for menu items
- `src/components/ImageUpload.tsx` - New image upload UI component
- `src/pages/Login.tsx` - Fixed logo rendering (object-contain instead of object-cover)

**Backend Files Created:**
- `functions/src/notifications.ts` - Cloud Functions for FCM notifications

**Configuration Files:**
- `firestore.rules` - Already has proper permissions for deviceTokens
- `firebase.json` - Ensure functions are configured

## Environment Variables

Add to `.env` or `firebase.json`:

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_SENDER_ID=your_sender_id
VITE_FCM_VAPID_KEY=your_public_vapid_key
```

## Troubleshooting

### No notifications appearing

**Check 1:** Is FCM initialized?
```typescript
// Add to browser console in admin panel
notificationService.isFCMAvailable() // Should return true
```

**Check 2:** Permission granted?
```typescript
notificationService.isNotificationEnabled() // Should return true
```

**Check 3:** Device token registered?
- Open Firestore console
- Check `/users/your-admin-uid` document
- Should have `deviceTokens` array with tokens

**Check 4:** Cloud Function running?
```bash
firebase functions:log
# Check for errors in function execution
```

### VAPID Key Error

```
Error: Invalid VAPID key
```

Replace `YOUR_FIREBASE_VAPID_KEY_HERE` in `NotificationService.ts` with actual public VAPID key.

### Service Worker Not Registering

Common on development environments. Make sure:
1. App is served over HTTPS (except localhost)
2. `public/service-worker.js` exists
3. No browser extensions blocking service workers
4. DevTools > Application > Service Workers shows registered

### Token Not Saving to Firestore

Check:
1. User is authenticated (`userProfile` exists)
2. Firestore rules allow user to update own document
3. Browser console for errors in `registerDeviceToken()`

## Testing on Different Platforms

### Web/PWA
✅ Fully supported with current setup
- Notifications while app in foreground (via toast + notification API)
- Notifications in background (via service worker)

### iOS PWA
⚠️ Limited support (iOS PWA limitations)
- No push notification support via FCM in iOS PWA
- Can use in-app notifications as fallback

### Android
✅ Fully supported via Android app built with Capacitor/React Native
- Set up Capacitor for native builds
- Use native FCM integration

## Security Considerations

1. **Device tokens are user-specific** - stored encrypted in Firestore
2. **Notification data is limited** - only contains orderId and metadata
3. **Authentication required** - only authenticated users can register tokens
4. **Admin-only functions** - new order notifications require admin role
5. **Token cleanup** - invalid tokens are automatically removed on next attempt

## Cost Implications

Firebase offers **free tier** for:
- First 100 FCM sends per day (then $0.001 per message)
- Cloud Functions: 2M invocations/month free
- Firestore: 50K reads/day free

For typical home delivery business (50-100 orders/day):
- Monthly FCM cost: ~$30-60
- Cloud Functions: negligible (within free tier)

## Next Steps

1. ✅ Complete setup above
2. ✅ Test locally with development order
3. ✅ Deploy Cloud Functions
4. ✅ Deploy app to Firebase Hosting
5. ✅ Monitor notifications in production
6. ✅ Gather admin feedback and adjust preferences

## Support

For issues:
1. Check Firebase function logs: `firebase functions:log`
2. Browser console for client-side errors
3. Firestore console to verify data structure
4. Firebase Emulator for local testing

## References

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications](https://firebase.google.com/docs/messaging/js-overview)
- [VAPID Key Generation](https://web-push-codelab.glitch.me/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
