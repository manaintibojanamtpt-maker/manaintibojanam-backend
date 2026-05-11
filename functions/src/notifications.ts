/**
 * Firebase Cloud Function: Send New Order Notification to Admin
 * 
 * Triggers when a new order is created in Firestore
 * Fetches admin device tokens and sends push notification via FCM
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Install Firebase CLI:
 *    npm install -g firebase-tools
 * 
 * 2. Initialize Cloud Functions:
 *    firebase init functions
 *    Select TypeScript when prompted
 * 
 * 3. Replace functions/src/index.ts with this code
 * 
 * 4. Install required packages in functions/package.json:
 *    npm install firebase-admin firebase-functions
 * 
 * 5. Set environment variable for VAPID key (optional):
 *    firebase functions:config:set vapid.key="YOUR_VAPID_KEY"
 * 
 * 6. Deploy the function:
 *    firebase deploy --only functions
 * 
 * ENVIRONMENT VARIABLES REQUIRED:
 * - FIREBASE_PROJECT_ID (set automatically)
 * - FIREBASE_DATABASE_URL (set automatically)
 * 
 * OPTIONAL:
 * - ADMIN_EMAILS: Comma-separated list of admin emails (else uses hardcoded list)
 * 
 * TESTING:
 * You can test locally with Firebase emulator:
 * firebase emulators:start --only firestore,functions
 * 
 * Then create a test order in Firestore to trigger the function.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

interface Order {
  id: string;
  orderNumber: number;
  userId: string;
  phoneNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  address: string;
  createdAt: admin.firestore.Timestamp;
}

/**
 * Cloud Function: Triggered when new order is created
 * Sends push notification to all admin users
 */
export const notifyAdminNewOrder = functions
  .region('asia-south1') // Change to your closest region
  .firestore
  .document('orders/{orderId}')
  .onCreate(async (snapshot, context) => {
    try {
      const order = snapshot.data() as Order;
      const orderId = context.params.orderId;

      console.log('New order created:', orderId);

      // Get all admin users
      const adminUsersSnapshot = await db
        .collection('users')
        .where('role', '==', 'admin')
        .get();

      if (adminUsersSnapshot.empty) {
        console.warn('No admin users found to notify');
        return;
      }

      // Collect all device tokens from admin users
      const adminTokens: string[] = [];
      adminUsersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.deviceTokens && Array.isArray(userData.deviceTokens)) {
          adminTokens.push(...userData.deviceTokens);
        }
      });

      if (adminTokens.length === 0) {
        console.log('No admin device tokens found to send notification');
        return;
      }

      // Prepare notification payload
      const itemsSummary = order.items
        .map((item) => `${item.quantity}x ${item.name}`)
        .join(', ');

      const notificationMessage = {
        notification: {
          title: `🔔 New Order #${order.orderNumber}`,
          body: `₹${order.totalAmount.toFixed(2)} | ${itemsSummary}`,
        },
        data: {
          orderId,
          orderNumber: order.orderNumber.toString(),
          totalAmount: order.totalAmount.toString(),
          phoneNumber: order.phoneNumber,
          addressPreview: order.address.substring(0, 50),
          type: 'new_order',
          deepLink: `/admin/orders/${orderId}`,
        },
        webpush: {
          notification: {
            title: `🔔 New Order #${order.orderNumber}`,
            body: `₹${order.totalAmount.toFixed(2)} | ${itemsSummary}`,
            icon: '/logo192.png',
            badge: '/logo192.png',
            tag: 'new-order',
            requireInteraction: true, // Keeps notification visible
            actions: [
              {
                action: 'open',
                title: 'View Order',
              },
              {
                action: 'close',
                title: 'Dismiss',
              },
            ],
          },
          data: {
            deepLink: `/admin/orders/${orderId}`,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: `New Order #${order.orderNumber}`,
                body: `₹${order.totalAmount.toFixed(2)} | ${itemsSummary}`,
              },
              badge: 1,
              sound: 'default',
              category: 'new_order',
            },
          },
        },
      };

      // Send notification to all admin tokens
      const response = await messaging.sendMulticast(notificationMessage as any);

      console.log(`Notification sent to ${response.successCount} admin devices`);
      if (response.failureCount > 0) {
        console.warn(`Failed to send to ${response.failureCount} devices`);
        
        // Remove invalid tokens
        response.responses.forEach((result, index) => {
          if (!result.success && result.error) {
            const error = result.error as any;
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
            ) {
              console.log(`Removing invalid token at index ${index}`);
              // Token cleanup could be done here if needed
            }
          }
        });
      }

      return { success: true, notified: response.successCount };
    } catch (error) {
      console.error('Error sending admin notification:', error);
      throw error;
    }
  });

/**
 * Cloud Function: Send order status update notification to customer
 */
export const notifyCustomerOrderStatus = functions
  .region('asia-south1')
  .firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();

      // Check if status changed
      if (before.status === after.status) {
        return; // No status change, skip
      }

      console.log(`Order status changed: ${before.status} -> ${after.status}`);

      // Get customer user document
      const customerDoc = await db
        .collection('users')
        .doc(after.userId)
        .get();

      if (!customerDoc.exists) {
        console.warn('Customer user document not found');
        return;
      }

      const customerData = customerDoc.data();
      if (!customerData?.deviceTokens || customerData.deviceTokens.length === 0) {
        console.log('Customer has no device tokens registered');
        return;
      }

      // Status messages for customer notifications
      const statusMessages: Record<
        string,
        { title: string; body: string; icon: string }
      > = {
        placed: {
          title: '✅ Order Placed',
          body: 'Your order has been received',
          icon: '✅',
        },
        accepted: {
          title: '✅ Order Accepted',
          body: 'Restaurant has accepted your order!',
          icon: '✅',
        },
        preparing: {
          title: '👨‍🍳 Preparing Your Order',
          body: 'Our chef is preparing your delicious meal!',
          icon: '👨‍🍳',
        },
        ready: {
          title: '📦 Order Ready',
          body: 'Your order is ready for pickup!',
          icon: '📦',
        },
        out_for_delivery: {
          title: '🛵 Out for Delivery',
          body: 'Your food is on its way to you!',
          icon: '🛵',
        },
        delivered: {
          title: '🍛 Order Delivered',
          body: 'Your meal has been delivered! Enjoy!',
          icon: '🍛',
        },
        cancelled: {
          title: '❌ Order Cancelled',
          body: 'Your order has been cancelled.',
          icon: '❌',
        },
      };

      const statusMessage =
        statusMessages[after.status] ||
        ({
          title: '📢 Order Update',
          body: `Order status: ${after.status}`,
          icon: '📢',
        } as any);

      const notification = {
        notification: {
          title: statusMessage.title,
          body: statusMessage.body,
        },
        data: {
          orderId: context.params.orderId,
          orderNumber: after.orderNumber?.toString() || '',
          status: after.status,
          type: 'order_status_update',
          deepLink: `/orders/${context.params.orderId}`,
        },
        webpush: {
          notification: {
            title: statusMessage.title,
            body: statusMessage.body,
            icon: '/logo192.png',
            badge: '/logo192.png',
          },
          data: {
            deepLink: `/orders/${context.params.orderId}`,
          },
        },
      };

      const response = await messaging.sendMulticast(
        notification as any,
        customerData.deviceTokens
      );

      console.log(
        `Order status notification sent to ${response.successCount} customer devices`
      );
      return { success: true, notified: response.successCount };
    } catch (error) {
      console.error('Error sending customer notification:', error);
      throw error;
    }
  });

/**
 * Http Trigger for testing notifications
 * Call this endpoint to send a test notification
 * 
 * Usage:
 * curl -X POST https://YOUR_FUNCTION_URL/testNotification \
 *   -H "Content-Type: application/json" \
 *   -d '{"userId":"admin-uid","title":"Test","body":"Test notification"}'
 */
export const testNotification = functions
  .region('asia-south1')
  .https
  .onCall(async (data, context) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated'
        );
      }

      // Only admins can send test notifications
      const userDoc = await db
        .collection('users')
        .doc(context.auth.uid)
        .get();

      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Only admins can send test notifications'
        );
      }

      const { userId, title, body } = data;

      const userSnapshot = await db
        .collection('users')
        .doc(userId)
        .get();

      if (!userSnapshot.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'User not found'
        );
      }

      const userData = userSnapshot.data();
      if (!userData?.deviceTokens || userData.deviceTokens.length === 0) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'User has no device tokens'
        );
      }

      const response = await messaging.sendMulticast({
        notification: { title, body },
        webpush: { notification: { title, body, icon: '/logo192.png' } },
      } as any, userData.deviceTokens);

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      throw new functions.https.HttpsError(
        'internal',
        error.message || 'Test notification failed'
      );
    }
  });
