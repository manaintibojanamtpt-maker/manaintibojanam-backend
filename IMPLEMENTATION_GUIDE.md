# Mana Inti Bojanam - Production Refactor Implementation Guide

## Overview

This document outlines the comprehensive production audit findings, root causes, and implementation roadmap for the Mana Inti Bojanam mobile food delivery app. This refactor addresses 15 critical issues covering order state management, pricing accuracy, payments, notifications, and system hardening.

**Status:** Phase 3 - Active Implementation
**Last Updated:** $(date)
**Target Completion:** Post-implementation testing and deployment

---

## ✅ Completed Implementations

The following foundational files have been created/updated:

### 1. **NotificationService.ts** (UPDATED)
**File:** `src/services/NotificationService.ts`
**Status:** ✅ Complete - Firebase Cloud Messaging integration

**Key Features:**
- Firebase Cloud Messaging (FCM) integration with VAPid key support
- Service Worker registration for background notifications
- Foreground notification handling while app is open
- Contextual permission request (post-login, not aggressive)
- Token management and storage
- Status-specific notification messages (Accepted, Preparing, Out for Delivery, Delivered, Cancelled)
- Fallback to toast notifications for non-permission users

**Critical Configuration:**
```typescript
// REQUIRED: Set Firebase VAPid Key
const VAPID_KEY = 'YOUR_FIREBASE_VAPID_KEY_HERE';
// Get from: Firebase Console → Project Settings → Cloud Messaging
```

**Methods:**
- `initializeFCM()` - Initialize FCM after login
- `requestPermission()` - Request notification permissions contextually
- `retrieveFCMToken()` - Get device FCM token for backend storage
- `setupForegroundNotifications()` - Handle messages while app open
- `simulatePushNotification()` - Test notifications
- `isNotificationEnabled()` - Check if notifications are enabled

### 2. **EmailService.ts** (NEW)
**File:** `src/services/EmailService.ts`
**Status:** ✅ Complete - Transactional email integration

**Key Features:**
- Order confirmation emails with itemized receipts
- Order status update emails (Accepted, Preparing, Ready, Out for Delivery, Delivered, Cancelled)
- Payment confirmation and failure notifications
- Delivery feedback thank-you emails
- Order cancellation emails with refund information
- HTML template rendering with brand styling
- Number-to-words conversion for invoice readability
- Recipient validation and error handling

**Critical Configuration:**
Backend must implement `/api/emails/*` endpoints with:
- SendGrid API integration (recommended for scale)
- SMTP provider alternative (for basic setup)
- HTML email templates with brand logo/colors

**Email Types Implemented:**
1. **Order Confirmation** - Sent when order placed
   - Items breakdown with per-item pricing
   - Total breakdown (subtotal, GST, delivery fee)
   - Delivery address and estimate
   - Support phone number

2. **Order Status Update** - Sent when status changes
   - Status-specific emoji and message
   - Estimated delivery time
   - Courier details (if applicable)
   - Tracking link

3. **Payment Confirmation** - Sent when payment verified
   - Payment method and transaction ID
   - Amount in words (for compliance)
   - Payment date/time
   - Support email

4. **Feedback Thank-You** - Sent after rating submitted
   - Star rating display
   - Contextual gratitude message
   - Feedback category summary

5. **Payment Failed** - Sent if payment fails
   - Retry link with order context
   - Support contact
   - Amount in words

6. **Order Cancelled** - Sent if order cancelled
   - Cancellation reason
   - Refund amount and status
   - Support contact

### 3. **OrderStateService.ts** (NEW)
**File:** `src/services/OrderStateService.ts`
**Status:** ✅ Complete - Strict state machine validation

**Key Features:**
- Enforces valid status transitions
- Prevents invalid state changes (e.g., DELIVERED → PENDING)
- Event emission on successful transitions
- Idempotency checking (prevents duplicate updates)
- Detailed logging for audit trails
- Complete transition matrix with documentation

**Valid Transitions:**
```
PENDING → [PREPARING, CANCELLED, PAYMENT_PENDING, PAYMENT_VERIFICATION]
PAYMENT_PENDING → [PAYMENT_VERIFICATION, CANCELLED]
PAYMENT_VERIFICATION → [ACCEPTED, CANCELLED]
ACCEPTED → [PREPARING, CANCELLED]
PREPARING → [READY, CANCELLED]
READY → [COURIER_BOOKED, CANCELLED]
COURIER_BOOKED → [PICKED_UP, CANCELLED]
PICKED_UP → [OUT_FOR_DELIVERY, FAILED_DELIVERY]
OUT_FOR_DELIVERY → [DELIVERED, FAILED_DELIVERY]
DELIVERED → [] (terminal state)
FAILED_DELIVERY → [CANCELLED] (can retry as new order)
CANCELLED → [] (terminal state)
```

**Methods:**
- `validateTransition(currentStatus, targetStatus)` - Check if transition allowed
- `emitOrderEvent(orderId, eventType, details)` - Emit event with subscribers
- `onStatusChanged(callback)` - Subscribe to status changes
- `getValidTransitions(currentStatus)` - Get allowed next states

### 4. **OrderEventPopup.tsx** (NEW)
**File:** `src/components/OrderEventPopup.tsx`
**Status:** ✅ Complete - Real-time order event notifications

**Key Features:**
- Premium animated popup component with Framer Motion
- Status-specific icons (✅ Accepted, 👨‍🍳 Preparing, 🛵 Out for Delivery, 🍛 Delivered, ❌ Cancelled)
- Auto-dismiss after 5 seconds
- Fixed top-center positioning with mobile safe-area handling
- Glass-morphism styling with orange accent
- Fade entrance and slide-down exit animations
- Responsive on all screen sizes

**Props:**
```typescript
interface OrderEventPopupProps {
  orderId: string;
  status: OrderStatus;
  prevStatus?: OrderStatus;
  message?: string;
  icon?: string;
  onDismiss?: () => void;
}
```

**Usage:**
```tsx
<OrderEventPopup
  orderId={order.id}
  status={order.status}
  prevStatus={prevStatus}
  message="Restaurant has accepted your order!"
  icon="✅"
  onDismiss={() => setShowPopup(false)}
/>
```

### 5. **DeliveryFeedbackModal.tsx** (NEW)
**File:** `src/components/DeliveryFeedbackModal.tsx`
**Status:** ✅ Complete - Post-delivery feedback collection

**Key Features:**
- Auto-triggers when order reaches DELIVERED status
- Star rating input (1-5 stars) with hover effects
- Optional feedback text area
- Experience tag selection (Food Quality, Delivery Speed, Driver Behavior, Packaging)
- Firestore submission with order linking
- Modal animations (scale entrance, backdrop blur)
- Form validation (rating required, text optional)

**Props:**
```typescript
interface DeliveryFeedbackModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (feedback: OrderFeedback) => void;
}
```

**Auto-Trigger Logic:**
- Checks `order.status === DELIVERED`
- Checks `order.feedbackStatus === PENDING`
- Shows only once per order
- Can be dismissed but will re-appear on page reload

### 6. **types.ts** (UPDATED)
**File:** `src/types.ts`
**Status:** ✅ Complete - Enhanced data models

**New Interfaces:**

1. **OrderItem** - Immutable pricing snapshot
   ```typescript
   interface OrderItem {
     menuItemId: string;
     name: string;
     unitPrice: number;        // Price at time of order
     quantity: number;
     addOns?: AddOnItem[];
     addOnsTotal?: number;
     lineSubtotal: number;
     discount?: number;
     lineTax?: number;
     lineTotal: number;        // Final line total
     notes?: string;
   }
   ```

2. **FeedbackStatus** - Enum for feedback tracking
   ```typescript
   enum FeedbackStatus {
     NOT_ELIGIBLE = 'NOT_ELIGIBLE',
     PENDING = 'PENDING',
     SUBMITTED = 'SUBMITTED'
   }
   ```

3. **OrderTimelineEvent** - Audit trail event
   ```typescript
   interface OrderTimelineEvent {
     id: string;
     eventType: 'status_change' | 'payment_verified' | 'payment_failed' | ...;
     description: string;
     previousStatus?: OrderStatus;
     newStatus?: OrderStatus;
     triggeredBy: 'system' | 'admin' | 'customer' | 'courier';
     triggeredByUser?: string;
     metadata?: Record<string, any>;
     timestamp: any;
   }
   ```

4. **OrderFeedback** - Customer feedback document
   ```typescript
   interface OrderFeedback {
     id: string;
     orderId: string;
     userId: string;
     rating: number;           // 1-5
     feedback?: string;
     experienceTags?: Array<{...}>;
     submittedAt: any;
   }
   ```

**Updated Order Interface:**
- Changed `items: CartItem[]` → `items: OrderItem[]`
- Added `feedbackStatus: FeedbackStatus`
- Added `rating?, feedback?, feedbackTags?, feedbackSubmittedAt?`
- Added `timeline?: OrderTimelineEvent[]`
- Added `specialInstructions?: string`
- Added `emailSentAt?, smsConfirmationSentAt?`
- Added `fcmTokens?` to UserProfile

---

## 📋 Pending Implementations

### HIGH PRIORITY (Correctness & Data Integrity)

#### 1. **Checkout.tsx Refactor** 
**File:** `src/pages/Checkout.tsx`
**Impact:** CRITICAL - Fixes ₹0 pricing bug
**Effort:** 2-3 hours

**Required Changes:**
1. When order placed, create immutable OrderItem[] from CartItem[]
2. For each cart item, resolve current MenuItem price
3. Capture pricing snapshot at order creation time
4. Never rely on live menu prices after order placed

**Implementation Pattern:**
```typescript
// Before order creation:
const orderItems: OrderItem[] = cartItems.map(cartItem => {
  const menuItem = menuItems.find(m => m.id === cartItem.id);
  return {
    menuItemId: cartItem.id,
    name: cartItem.name,
    unitPrice: menuItem?.price || cartItem.price,  // From menu, not cart
    quantity: cartItem.quantity,
    lineSubtotal: (menuItem?.price || cartItem.price) * cartItem.quantity,
    lineTotal: (menuItem?.price || cartItem.price) * cartItem.quantity
  };
});

const order = {
  items: orderItems,  // NOT cartItems
  subtotal: calculateSubtotal(orderItems),
  ...
};
```

**Testing:**
- Place order at price ₹100/item
- Change menu price to ₹200
- Verify order still shows ₹100/item (immutable snapshot)
- Invoice and order detail both consistent

---

#### 2. **api.ts - updateOrderStatus() Integration**
**File:** `src/services/api.ts`
**Impact:** CRITICAL - Fixes order status mismatch bug
**Effort:** 2 hours

**Replace:** Current loose validation
**With:** OrderStateService strict validation

**Implementation:**
```typescript
import { OrderStateService } from './OrderStateService';

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  const orderDoc = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderDoc);
  const currentOrder = orderSnap.data();

  // Validate transition
  const isValid = OrderStateService.validateTransition(
    currentOrder.status,
    newStatus
  );

  if (!isValid) {
    throw new Error(`Invalid transition from ${currentOrder.status} to ${newStatus}`);
  }

  // Emit event
  OrderStateService.emitOrderEvent(orderId, 'status_change', {
    from: currentOrder.status,
    to: newStatus,
    timestamp: serverTimestamp()
  });

  // Update document
  await updateDoc(orderDoc, {
    status: newStatus,
    updatedAt: serverTimestamp(),
    timeline: arrayUnion({
      id: generateId(),
      eventType: 'status_change',
      description: `Order status changed from ${currentOrder.status} to ${newStatus}`,
      previousStatus: currentOrder.status,
      newStatus,
      triggeredBy: 'admin',
      timestamp: serverTimestamp()
    })
  });
}
```

**Testing:**
- Try to transition DELIVERED → PENDING (should fail)
- Try PENDING → PREPARING (should succeed)
- Verify timeline events recorded

---

#### 3. **PaymentVerificationService Integration**
**File:** `src/services/api.ts` + `src/services/PaymentVerificationService.ts`
**Impact:** HIGH - Fixes payment verification sync
**Effort:** 3 hours

**Required Changes:**
1. Link payment proofs to orders
2. Admin approves proof → order status escalates
3. Create admin UI for payment verification queue
4. Real-time sync when status changes

**Implementation Pattern:**
```typescript
// When proof verified by admin:
async function approvePaymentProof(proofId: string, orderId: string) {
  // Update proof
  await updateDoc(doc(db, 'paymentProofs', proofId), {
    status: 'verified',
    verifiedAt: serverTimestamp(),
    verifiedBy: adminUser.uid
  });

  // Update order payment and status
  await updateDoc(doc(db, 'orders', orderId), {
    paymentStatus: 'verified',
    paymentVerifiedAt: serverTimestamp(),
    paymentVerifiedBy: adminUser.uid,
    status: OrderStatus.ACCEPTED,  // Auto-transition
    updatedAt: serverTimestamp()
  });

  // Trigger email notification
  await emailService.sendPaymentConfirmationEmail({
    recipientEmail: order.email,
    recipientName: order.customerName,
    orderId,
    orderNumber: order.orderNumber,
    amount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: 'verified'
  });

  // Trigger FCM notification
  notificationService.simulatePushNotification(orderId, 'accepted');
}
```

---

#### 4. **Order Creation - Payment Method Normalization**
**File:** `src/pages/Checkout.tsx` + `src/services/api.ts`
**Impact:** MEDIUM - Fixes payment method mismatch
**Effort:** 1 hour

**Issue:** Form uses 'phonepe', 'gpay' but Order expects 'razorpay', 'cod', 'upi', 'online'

**Fix:**
```typescript
const paymentMethodMap: Record<string, Order['paymentMethod']> = {
  'phonepe': 'razorpay',
  'gpay': 'razorpay',
  'phonepe-upi': 'upi',
  'upi': 'upi',
  'cod': 'cod',
  'online': 'razorpay'
};

const normalizedMethod = paymentMethodMap[selectedPaymentMethod] || 'cod';
```

---

### MEDIUM PRIORITY (User Experience)

#### 5. **OrderTracking.tsx Integration**
**File:** `src/pages/OrderStatus.tsx`
**Impact:** HIGH - Enables real-time order popups
**Effort:** 2 hours

**Required Changes:**
1. Subscribe to OrderStateService events
2. Show OrderEventPopup on status change
3. Auto-trigger DeliveryFeedbackModal on DELIVERED
4. Connect to NotificationService for FCM

**Implementation:**
```typescript
useEffect(() => {
  // Subscribe to state changes
  const unsubscribe = OrderStateService.onStatusChanged((event) => {
    if (event.orderId === orderId) {
      setPrevStatus(order.status);
      setShowEventPopup(true);

      // Trigger notification
      notificationService.simulatePushNotification(
        orderId,
        event.newStatus.toLowerCase()
      );
    }
  });

  return () => unsubscribe();
}, [orderId]);

// Show feedback modal when delivered
useEffect(() => {
  if (
    order.status === OrderStatus.DELIVERED &&
    order.feedbackStatus === FeedbackStatus.PENDING
  ) {
    setShowFeedbackModal(true);
  }
}, [order.status, order.feedbackStatus]);
```

---

#### 6. **MyOrders.tsx Event Integration**
**File:** `src/pages/MyOrders.tsx`
**Impact:** MEDIUM - Show popups for all order events
**Effort:** 1.5 hours

**Required Changes:**
1. Import OrderEventPopup, DeliveryFeedbackModal
2. Detect status changes via prevStatus comparison
3. Show popup on change
4. Auto-show feedback modal for delivered orders

---

#### 7. **AdminPanel.tsx Status Validation**
**File:** `src/pages/AdminPanel.tsx`
**Impact:** HIGH - Prevent invalid status transitions
**Effort:** 2 hours

**Required Changes:**
1. Disable invalid status buttons per current state
2. Show only valid next-state buttons
3. Add timeline view showing status history
4. Add audit trail comments

**Implementation:**
```typescript
const validNextStates = OrderStateService.getValidTransitions(order.status);

// Only show buttons for valid transitions
const statusButtons = validNextStates.map(status => (
  <button
    key={status}
    onClick={() => updateOrderStatus(order.id, status)}
    className="px-4 py-2 bg-orange-500 text-white rounded"
  >
    Mark as {status}
  </button>
));
```

---

#### 8. **Payment Verification Admin Queue**
**File:** `src/components/admin/PaymentVerificationQueue.tsx` (NEW)
**Impact:** HIGH - Enable payment proof verification
**Effort:** 3-4 hours

**Features:**
- Real-time query of pending payment proofs
- Proof image/UTR display in modal
- Approve/Reject buttons
- Reason for rejection (if applicable)
- Auto-transition order status
- Audit trail of verification action

**Component Structure:**
```tsx
export function PaymentVerificationQueue() {
  const [pendingProofs, setPendingProofs] = useState<PaymentProof[]>([]);
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);

  useEffect(() => {
    // Query paymentProofs where status = 'pending'
    const q = query(
      collection(db, 'paymentProofs'),
      where('status', '==', 'pending'),
      orderBy('submittedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingProofs(snapshot.docs.map(doc => doc.data() as PaymentProof));
    });

    return unsubscribe;
  }, []);

  return (
    <div>
      <h2>Payment Verification Queue ({pendingProofs.length})</h2>
      {pendingProofs.map(proof => (
        <ProofCard
          key={proof.id}
          proof={proof}
          onApprove={() => approveProof(proof.id, proof.orderId)}
          onReject={() => rejectProof(proof.id, proof.orderId)}
        />
      ))}
      
      {selectedProof && (
        <ProofPreviewModal
          proof={selectedProof}
          onApprove={() => approveProof(selectedProof.id, selectedProof.orderId)}
          onReject={() => rejectProof(selectedProof.id, selectedProof.orderId)}
          onClose={() => setSelectedProof(null)}
        />
      )}
    </div>
  );
}
```

---

### LOW PRIORITY (Backend & Hardening)

#### 9. **Cloud Functions for Event Handlers** (NEW)
**Files:** `functions/src/index.ts`
**Impact:** CRITICAL - Enable automated workflows
**Effort:** 4-5 hours

**Required Functions:**

1. **onOrderStatusChanged** - Trigger when order.status updates
   - Send FCM push notification
   - Send transactional email
   - Record timeline event
   - Log to Firestore audit trail

2. **onPaymentProofVerified** - Trigger when payment verified
   - Update order status to ACCEPTED
   - Send payment confirmation email
   - Send FCM notification
   - Clear payment verification alert

3. **onOrderDelivered** - Trigger when order reaches DELIVERED
   - Send delivery confirmation email
   - Prepare feedback request
   - Record delivery timestamp

4. **onFeedbackSubmitted** - Trigger when feedback submitted
   - Send thank-you email
   - Update ratings aggregate
   - Trigger reward/loyalty logic

**Setup:**
```bash
cd functions
npm init
npm install firebase-admin firebase-functions
npm install --save google-cloud-tasks
```

**Example Function:**
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onOrderStatusChanged = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const prevOrder = change.before.data();
    const newOrder = change.after.data();

    if (prevOrder.status !== newOrder.status) {
      const orderId = context.params.orderId;

      // 1. Send FCM notification
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(newOrder.userId)
        .get();
      
      const fcmTokens = userDoc.data()?.fcmTokens || [];
      
      await admin.messaging().sendMulticast({
        tokens: fcmTokens,
        notification: {
          title: `Order ${newOrder.orderNumber} Updated`,
          body: `Status: ${newOrder.status}`
        },
        data: {
          orderId,
          status: newOrder.status
        }
      });

      // 2. Send email
      // await emailService.sendOrderStatusUpdateEmail({...});

      // 3. Record timeline event
      await admin.firestore()
        .collection('orders')
        .doc(orderId)
        .update({
          timeline: admin.firestore.FieldValue.arrayUnion({
            id: admin.firestore.Timestamp.now().toMillis().toString(),
            eventType: 'status_change',
            description: `Status changed from ${prevOrder.status} to ${newOrder.status}`,
            previousStatus: prevOrder.status,
            newStatus: newOrder.status,
            triggeredBy: 'system',
            timestamp: admin.firestore.Timestamp.now()
          })
        });
    }
  });
```

---

#### 10. **Firestore Security Rules Enhancement**
**File:** `firestore.rules`
**Impact:** HIGH - Data protection
**Effort:** 1-2 hours

**Required Rules:**

1. **Orders Collection:**
   - Users can only read their own orders
   - Admin can read all orders
   - Only admin/system can update status (not customer)
   - Users can only write specific fields (feedback, address)

2. **PaymentProofs Collection:**
   - Users can submit proofs to their own orders
   - Admin can verify proofs
   - Users cannot read others' proofs

3. **PaymentVerificationService Collection:**
   - Users cannot access
   - Only admin can view/verify

**Rules Structure:**
```
match /databases/{database}/documents {
  match /orders/{orderId} {
    allow read: if request.auth.uid == resource.data.userId || 
                   (request.auth.token.admin == true);
    allow create: if request.auth.uid != null;
    allow update: if request.auth.token.admin == true ||
                     (request.auth.uid == resource.data.userId &&
                      request.resource.data.diff(resource.data).affectedKeys()
                        .hasOnly(['feedback', 'rating', 'feedbackStatus']));
  }

  match /paymentProofs/{proofId} {
    allow read: if request.auth.token.admin == true;
    allow create: if request.auth.uid != null;
    allow update: if request.auth.token.admin == true;
  }
}
```

---

#### 11. **Login Page Final Polish** (Continued from Phase 2)
**File:** `src/pages/Login.tsx`
**Impact:** MEDIUM - Brand perception
**Effort:** 1 hour

**Remaining Tasks:**
1. Verify logo displays without cropping at all breakpoints
2. Ensure fonts are readable (not oversized)
3. Confirm no section overlap on mobile
4. Validate safe-area handling for notch devices
5. Test on actual devices (iPhone 12+, Pixel 5+, Samsung S21+)

**Testing Checklist:**
- [ ] Logo visible 100% on 375px width (iPhone SE)
- [ ] Logo visible 100% on 414px width (iPhone 12)
- [ ] Logo visible 100% on 412px width (Pixel 5)
- [ ] No overlap between sections on portrait
- [ ] Landscape mode readable
- [ ] Safe area respected on notch devices
- [ ] Font sizes readable (min 14px)
- [ ] Loading states smooth
- [ ] Error messages display properly

---

## 🛠️ Implementation Roadmap

### Phase 1: Data Integrity & State Management (1-2 days)
**Priority:** CRITICAL
**Owner:** Backend/Full-stack
**Deliverables:** 
- Checkout.tsx refactored with OrderItem snapshots ✓
- api.ts updated with OrderStateService validation ✓
- PaymentMethod normalization ✓

**Success Criteria:**
- Order shows correct per-item prices
- Status transitions validated
- No ₹0 display bugs
- Payment method normalized across flows

### Phase 2: Real-Time Notifications & Feedback (1-2 days)
**Priority:** HIGH
**Owner:** Frontend/Full-stack
**Deliverables:**
- OrderTracking.tsx shows OrderEventPopup ✓
- MyOrders.tsx auto-triggers DeliveryFeedbackModal ✓
- NotificationService FCM working ✓
- Email notifications configured ✓

**Success Criteria:**
- Customer sees popup when order status changes
- Feedback modal appears after delivery
- Push notifications received in background
- Email confirmations sent

### Phase 3: Admin & Backend Hardening (1-2 days)
**Priority:** HIGH
**Owner:** Full-stack/Backend
**Deliverables:**
- AdminPanel status validation ✓
- PaymentVerificationQueue component ✓
- Cloud Functions deployed ✓
- Firestore security rules updated ✓

**Success Criteria:**
- Admin cannot move order to invalid state
- Payment verification queue functional
- Timeline displayed for audit trail
- All events trigger email/push notifications

### Phase 4: Testing & Deployment (1 day)
**Priority:** CRITICAL
**Owner:** QA/Backend
**Deliverables:**
- E2E test matrix created and executed
- Security review completed
- Performance validated
- Production deployment guide finalized

**Success Criteria:**
- All 15 issues resolved and tested
- No regressions in existing flows
- Performance metrics acceptable
- Security rules validated

---

## 🧪 QA Checklist & Test Matrix

### Customer App Tests

#### Order Placement Flow
- [ ] Phone login → add to cart → checkout → COD order placed
- [ ] Order shows in MyOrders with PENDING status
- [ ] Popup shows "Order Placed" confirmation
- [ ] Email confirmation received
- [ ] Order number increments sequentially
- [ ] Cart clears after order placed

#### Order Status Updates (Admin → Customer)
- [ ] Admin marks order ACCEPTED → Customer sees popup ✅
- [ ] Admin marks order PREPARING → Customer sees popup 👨‍🍳
- [ ] Admin marks order READY → Customer sees popup 📦
- [ ] Admin marks order OUT_FOR_DELIVERY → Customer sees popup 🛵
- [ ] Admin marks order DELIVERED → Customer sees popup 🍛
- [ ] Popups auto-dismiss after 5 seconds
- [ ] Status emails received at each step
- [ ] Timeline shows all status transitions

#### Pricing Accuracy
- [ ] Order placed at ₹100/item shows ₹100 even after menu price changes to ₹200
- [ ] Line total calculated correctly: (unitPrice × quantity) + addOns + tax
- [ ] Invoice displays per-item breakdown (not ₹0)
- [ ] Total matches sum of lineItems
- [ ] Discount applied correctly

#### Payment Flow (UPI)
- [ ] UPI payment initiation works on Android Chrome
- [ ] UPI payment initiation works on Safari (iOS)
- [ ] Payment proof screenshot upload possible
- [ ] Admin can verify screenshot
- [ ] Order status auto-transitions to ACCEPTED after verification
- [ ] Verification email sent to customer
- [ ] Payment failure email sent if rejected

#### Feedback Flow
- [ ] After order DELIVERED, feedback modal auto-appears
- [ ] Star rating selectable (1-5)
- [ ] Feedback text optional but message always required
- [ ] Tags selectable (Food Quality, Delivery Speed, etc.)
- [ ] Submit button disabled until rating selected
- [ ] Thank-you email sent after feedback
- [ ] Modal dismissible without feedback (but can re-appear)

#### Notifications
- [ ] Permission request appears contextually (post-login)
- [ ] Foreground notifications show in-app
- [ ] Background notifications received when app closed
- [ ] Notification click opens order details
- [ ] Notification badge increments correctly

### Admin Panel Tests

#### Status Management
- [ ] Invalid status transitions blocked (e.g., DELIVERED→PENDING)
- [ ] Only valid next-state buttons shown
- [ ] Status buttons disabled for terminal states (DELIVERED, CANCELLED)
- [ ] Status update triggers customer notification
- [ ] Timeline updated with status change event

#### Payment Verification
- [ ] Pending proofs show in queue
- [ ] Proof image displays in preview modal
- [ ] Approve button marks proof verified
- [ ] Reject button cancels order
- [ ] Rejection reason recorded
- [ ] Customer notified via email
- [ ] Order auto-transitions to ACCEPTED on approval

#### Order Management
- [ ] Timeline shows all historical events
- [ ] Audit trail shows who changed what and when
- [ ] Can add notes to order (links to timeline)
- [ ] Customer info displayed correctly
- [ ] Pricing breakdown shows per-item
- [ ] Courier information displays when assigned

### Integration Tests

#### Firebase Sync
- [ ] Order placed in customer app → immediately visible in admin
- [ ] Admin status change → customer app updates in real-time
- [ ] Payment proof uploaded → admin sees immediately
- [ ] Feedback submitted → appears in admin ratings

#### Email Service
- [ ] Order confirmation has right template and logo
- [ ] Emails sent to correct recipient
- [ ] Amount displayed in words (for compliance)
- [ ] HTML renders correctly on Gmail, Outlook
- [ ] Unsubscribe link present
- [ ] Support contact info included

#### FCM Notifications
- [ ] Token retrieved after permission granted
- [ ] Token sent to backend for storage
- [ ] Backend has token for sending
- [ ] Message delivered within 5 seconds
- [ ] Background notification shows system notification
- [ ] Clicking notification navigates to order

### Security Tests
- [ ] User cannot read other users' orders
- [ ] Admin required to verify payments
- [ ] Payment proof cannot be forged
- [ ] Status transition logs accessible only to admin
- [ ] User cannot directly update their order status

---

## 📁 File Structure After Implementation

```
src/
├── App.tsx
├── constants.ts
├── firebase.ts
├── index.css
├── main.tsx
├── types.ts                          (UPDATED - new OrderItem, FeedbackStatus)
├── vite-env.d.ts
├── assets/
├── components/
│   ├── AIAssistant.tsx
│   ├── Banner.tsx
│   ├── BottomNav.tsx
│   ├── CourierTrackingTimeline.tsx
│   ├── DesktopSidebar.tsx
│   ├── DigitalInvoice.tsx           (should use OrderItem pricing)
│   ├── ErrorBoundary.tsx
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── InstallPrompt.tsx
│   ├── MenuItemCard.tsx
│   ├── MobileRestaurantHeader.tsx
│   ├── Navbar.tsx
│   ├── OrderTracking.tsx            (UPDATED - include popups)
│   ├── OrderEventPopup.tsx           (NEW)
│   ├── DeliveryFeedbackModal.tsx     (NEW)
│   ├── PaymentProofModal.tsx
│   ├── admin/
│   │   ├── OrderDetailsModal.tsx
│   │   ├── PaymentVerificationPanel.tsx
│   │   ├── PaymentVerificationQueue.tsx  (NEW)
│   │   └── ...
│   └── ...
├── context/
├── lib/
├── pages/
│   ├── Login.tsx                    (UPDATED - final polish)
│   ├── MyOrders.tsx                 (UPDATED - include popups)
│   ├── OrderStatus.tsx              (UPDATED - integrate services)
│   ├── Checkout.tsx                 (UPDATED - OrderItem snapshot)
│   ├── AdminPanel.tsx               (UPDATED - status validation)
│   └── ...
├── services/
│   ├── api.ts                       (UPDATED - use OrderStateService)
│   ├── NotificationService.ts       (UPDATED - FCM integration)
│   ├── EmailService.ts              (NEW)
│   ├── OrderStateService.ts         (NEW)
│   ├── PaymentVerificationService.ts (UPDATED - link to orders)
│   ├── courierAdapters.ts
│   └── ...
└── COMPREHENSIVE_AUDIT_REPORT.md    (Reference document)
└── IMPLEMENTATION_GUIDE.md          (This file)

functions/                           (NEW - Backend)
├── src/
│   ├── index.ts                     (Cloud Functions)
│   ├── onOrderStatusChanged.ts
│   ├── onPaymentProofVerified.ts
│   ├── onOrderDelivered.ts
│   └── ...
├── package.json
└── tsconfig.json

firestore.rules                      (UPDATED - security hardening)
.env.example                         (Updated with FCM & email config)
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] All tests passing
- [ ] Code reviewed by team
- [ ] Security rules reviewed
- [ ] Performance tested (Lighthouse >90)
- [ ] Mobile tested on 3+ devices
- [ ] Email templates tested
- [ ] FCM configuration verified

### Firebase Configuration
- [ ] Firebase Console → Cloud Messaging → VAPid Key obtained
- [ ] VAPid key added to NotificationService
- [ ] FCM enabled in Firebase project
- [ ] Service Worker deployed to `/public/service-worker.js`
- [ ] Web App token configured
- [ ] Firestore security rules deployed
- [ ] Cloud Functions deployed

### Backend Configuration
- [ ] SendGrid API key configured (or SMTP provider)
- [ ] Email sender address verified
- [ ] Email templates created (HTML)
- [ ] `/api/emails/*` endpoints implemented
- [ ] PaymentVerificationService integrated
- [ ] Razorpay webhook configured
- [ ] Database indexes created for queries
- [ ] Environment variables set on backend

### Testing
- [ ] Run full E2E test matrix
- [ ] Smoke test all critical flows
- [ ] Load test with 100+ concurrent orders
- [ ] Email delivery tested (check spam folder)
- [ ] FCM notifications verified
- [ ] Admin workflows validated

### Deployment
```bash
# Build and test
npm run build
npm run test:e2e

# Deploy frontend
firebase deploy --only hosting

# Deploy backend
cd functions && npm run deploy

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Post-deployment verification
# 1. Check Firebase Console for errors
# 2. Monitor Cloud Logging for issues
# 3. Spot-check email deliverability
# 4. Verify FCM tokens being obtained
# 5. Run smoke tests on production
```

### Post-Deployment Monitoring
- [ ] Firebase Console → Performance → check error rates
- [ ] Cloud Logging → check for exceptions
- [ ] Email delivery → verify orders being confirmed
- [ ] FCM → verify tokens and message delivery
- [ ] Real user monitoring → check page load times
- [ ] Customer feedback → monitor for new issues

---

## 📞 Support & Troubleshooting

### Common Issues

#### FCM Token Not Retrieving
**Problem:** NotificationService.retrieveFCMToken() returns null

**Causes:**
1. VAPid key not set
2. Service Worker not registered
3. Notification permission not granted
4. Browser doesn't support FCM

**Solution:**
```typescript
// 1. Check VAPid key
console.log('VAPid:', process.env.REACT_APP_FCM_VAPID_KEY);

// 2. Check service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});

// 3. Check notification permission
console.log('Permission:', Notification.permission);

// 4. Check browser support
console.log('FCM support:', 'serviceWorker' in navigator);
```

#### Emails Not Sending
**Problem:** Email service returns false

**Causes:**
1. Backend `/api/emails/*` endpoints not implemented
2. SendGrid API key invalid
3. Sender email not verified
4. Email template invalid

**Solution:**
```typescript
// Test backend endpoint
const testEmail = await fetch('/api/emails/order-confirmation', {
  method: 'POST',
  body: JSON.stringify({
    type: 'order_confirmation',
    recipientEmail: 'test@example.com',
    // ... payload fields
  })
});
console.log('Email test:', await testEmail.json());
```

#### Order Status Not Showing Popups
**Problem:** OrderEventPopup not appearing

**Causes:**
1. OrderStateService not subscribed
2. prevStatus not changing
3. Component unmounting before popup shows

**Solution:**
```typescript
// Check subscription
const unsubscribe = OrderStateService.onStatusChanged((event) => {
  console.log('Status changed event:', event);
});

// Check prevStatus
console.log('prevStatus:', prevStatus, 'newStatus:', order.status);

// Ensure component mounted
useEffect(() => {
  console.log('Component mounted, orderId:', orderId);
  // ... rest of effect
}, [orderId]);
```

---

## 📚 Additional Resources

- **Firebase Docs:** https://firebase.google.com/docs
- **Firestore Security Rules:** https://firebase.google.com/docs/firestore/security/start
- **Cloud Messaging:** https://firebase.google.com/docs/cloud-messaging
- **SendGrid Integration:** https://docs.sendgrid.com/
- **Razorpay API:** https://razorpay.com/docs/api/
- **Framer Motion:** https://www.framer.com/motion/

---

## 🎯 Success Metrics

After complete implementation, the following metrics should be achieved:

### Correctness
- ✅ 0 order status mismatches (admin vs customer)
- ✅ 0 ₹0 pricing display bugs
- ✅ 100% of payment proofs traceable
- ✅ 0 orphaned orders

### User Experience
- ✅ <2s average popup response time
- ✅ >90% feedback collection rate
- ✅ <500ms notification latency
- ✅ 100% email delivery rate

### Performance
- ✅ <3s order creation
- ✅ <1s status update propagation
- ✅ <100ms admin panel load
- ✅ <50MB bundle size

### Security
- ✅ 0 unauthorized order access
- ✅ All payment proofs verified
- ✅ Full audit trail maintained
- ✅ Firestore rules enforced

---

## 📝 Notes

**Last Updated:** [Current Date]
**Status:** Active Implementation
**Next Review:** After Phase 1 completion

For questions or updates, refer to COMPREHENSIVE_AUDIT_REPORT.md for detailed root-cause analysis.
