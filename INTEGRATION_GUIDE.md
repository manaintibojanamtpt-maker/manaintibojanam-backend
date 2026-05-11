/**
 * INTEGRATION GUIDE - Order Tracking & Payment Verification System
 * 
 * This guide shows how to integrate the new courier tracking and payment
 * verification system into your existing codebase.
 */

// ============================================================================
// 1. COURIER BOOKING IN AdminPanel.tsx
// ============================================================================

/*
Import the CourierBookingModal in your AdminPanel.tsx:

```typescript
import { CourierBookingModal } from './admin/CourierBookingModal';
import { useState } from 'react';

// In your AdminPanel component:
const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
const [showCourierModal, setShowCourierModal] = useState(false);

// Render the modal:
{showCourierModal && selectedOrder && (
  <CourierBookingModal
    order={selectedOrder}
    isOpen={showCourierModal}
    onClose={() => setShowCourierModal(false)}
    onSuccess={(tripId, provider) => {
      console.log(`Courier booked: ${provider} - Trip ${tripId}`);
      // Refresh order list
      loadOrders();
    }}
  />
)}

// In your OrderCard or order actions, add a "Book Courier" button:
{order.status === 'READY' && (
  <button
    onClick={() => {
      setSelectedOrder(order);
      setShowCourierModal(true);
    }}
    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
  >
    Book Courier
  </button>
)}
```

REQUIREMENTS:
- Add Porter and Rapido API keys to your .env.local or Firebase config
- Store as environment variables:
  VITE_PORTER_API_KEY=your_key_here
  VITE_RAPIDO_API_KEY=your_key_here
- Update courierAdapters.ts to load from environment
*/

// ============================================================================
// 2. PAYMENT VERIFICATION IN AdminPanel.tsx
// ============================================================================

/*
Add a tab or section in your AdminPanel to show the Payment Verification Panel:

```typescript
import { PaymentVerificationPanel } from './admin/PaymentVerificationPanel';

// In your AdminPanel component, add a tab:
const [adminTab, setAdminTab] = useState<'orders' | 'payments'>('orders');

// Render:
<div className="flex gap-4 mb-4">
  <button
    onClick={() => setAdminTab('orders')}
    className={`px-4 py-2 rounded ${
      adminTab === 'orders'
        ? 'bg-orange-600 text-white'
        : 'bg-gray-200 text-gray-700'
    }`}
  >
    Orders
  </button>
  <button
    onClick={() => setAdminTab('payments')}
    className={`px-4 py-2 rounded ${
      adminTab === 'payments'
        ? 'bg-orange-600 text-white'
        : 'bg-gray-200 text-gray-700'
    }`}
  >
    Payment Verification
  </button>
</div>

{adminTab === 'payments' && <PaymentVerificationPanel />}
```
*/

// ============================================================================
// 3. CUSTOMER PAYMENT PROOF IN Checkout.tsx
// ============================================================================

/*
When customer wants to mark order as paid (UPI/Bank):

```typescript
import { PaymentProofModal } from '../components/PaymentProofModal';
import { useState } from 'react';

// In Checkout component:
const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
const [orderForProof, setOrderForProof] = useState<Order | null>(null);

// When customer clicks "I have paid" button:
const handlePaymentUnverified = (order: Order) => {
  setOrderForProof(order);
  setShowPaymentProofModal(true);
};

// Render the modal:
{showPaymentProofModal && orderForProof && (
  <PaymentProofModal
    order={orderForProof}
    isOpen={showPaymentProofModal}
    onClose={() => setShowPaymentProofModal(false)}
    onSuccess={() => {
      // Order status is now PAYMENT_VERIFICATION
      // Show confirmation message
      alert('Payment proof submitted. Verification within 24 hours.');
    }}
  />
)}
```

PAYMENT FLOW CHANGE:
Before: Customer clicks "I have paid" → Order marked PAID immediately
After:  Customer clicks "I have paid" → Show PaymentProofModal
        → Customer submits proof (UTR/screenshot)
        → Order marked PENDING_VERIFICATION
        → Admin verifies in PaymentVerificationPanel
        → Order marked VERIFIED when confirmed
*/

// ============================================================================
// 4. CUSTOMER COURIER TRACKING IN OrderStatus.tsx
// ============================================================================

/*
When displaying order status to customer, show courier info:

```typescript
import { CourierTrackingTimeline } from '../components/CourierTrackingTimeline';

// In OrderStatus page, after order status display:
{order.courierProvider && (
  <div className="mt-6 border-t pt-6">
    <h2 className="text-lg font-bold mb-4">Delivery Tracking</h2>
    <CourierTrackingTimeline order={order} />
  </div>
)}
```

This component shows:
- Rider name and phone (clickable to call)
- Estimated delivery time
- Real-time status timeline (booked → picked_up → in_transit → delivered)
- Tracking link to Porter/Rapido
- Delivery proof if completed
- Failure reason if delivery failed
*/

// ============================================================================
// 5. RAZORPAY WEBHOOK HANDLER (Backend/Cloud Function)
// ============================================================================

/*
Create a webhook handler for Razorpay payment events (Cloud Function):

```typescript
import * as functions from 'firebase-functions';
import { db } from '../lib/firebase-admin';
import { paymentVerificationService } from '../services/PaymentVerificationService';

// Cloud Function to handle Razorpay webhooks
export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Verify webhook signature (important for security!)
    const signature = req.headers['x-razorpay-signature'];
    // Implement signature verification using Razorpay key
    
    const event = req.body;
    
    // Log the webhook event
    await db.collection('razorpayWebhooks').add({
      event: event.event,
      payload: event.payload,
      receivedAt: new Date(),
      processed: false,
    });
    
    // If payment.captured event, auto-verify if proof exists
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment;
      const orderId = payment.notes?.orderId;
      
      if (orderId) {
        // This will auto-verify any matching payment proof
        await paymentVerificationService.processRazorpayWebhook(event, orderId);
      }
    }
    
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

SETUP:
1. Deploy this Cloud Function
2. Get the function URL
3. Add to Razorpay Dashboard → Settings → Webhooks
4. Select events: payment.authorized, payment.captured, payment.failed
*/

// ============================================================================
// 6. DATABASE COLLECTIONS REQUIRED
// ============================================================================

/*
Ensure these Firestore collections exist:

1. courierDispatches
   └─ Documents: {tripId}
      ├─ orderId: string
      ├─ tripId: string
      ├─ provider: 'porter' | 'rapido'
      ├─ status: string
      ├─ riderName: string
      ├─ riderPhone: string
      ├─ estimatedDelivery: timestamp
      ├─ actualDelivery: timestamp
      ├─ trackingUrl: string
      ├─ proofUrl: string
      ├─ failureReason: string
      └─ rawPayload: object (original courier API response)

2. paymentProofs
   └─ Documents: {auto-generated ID}
      ├─ orderId: string
      ├─ proofType: 'upi_screenshot' | 'bank_transfer' | 'card_transaction'
      ├─ proofValue: string (base64 image or UTR number)
      ├─ submittedAt: timestamp
      ├─ submittedBy: string (userId)
      ├─ status: 'pending_review' | 'verified' | 'rejected'
      ├─ verifiedBy: string (admin userId)
      ├─ verifiedAt: timestamp
      ├─ fraudFlags: array<string>
      └─ notes: string

3. razorpayWebhooks (for webhook logging)
   └─ Documents: {auto-generated ID}
      ├─ event: string
      ├─ payload: object
      ├─ receivedAt: timestamp
      └─ processed: boolean
*/

// ============================================================================
// 7. UPDATE ORDER STATUS TRANSITIONS
// ============================================================================

/*
The new status flow for courier-based deliveries:

READY (order prepared)
  ↓
[Admin clicks "Book Courier"]
COURIER_BOOKED (courierProvider, courierTripId stored)
  ↓
PICKED_UP (courier webhook/polling updates this)
  ↓
OUT_FOR_DELIVERY (from existing code, updated via courier status)
  ↓
DELIVERED (with deliveredTime, delivery proof URL)

For payment verification flow:
PAYMENT_VERIFICATION (after customer submits proof)
  ↓
[Admin reviews in PaymentVerificationPanel]
VERIFIED (only if proof checks pass)
  ↓
READY (after verification, order can be prepared)

In src/services/api.ts, expand validTransitions if needed:

```typescript
const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  ...existing transitions...
  READY: ['COURIER_BOOKED', 'CANCELLED'],
  COURIER_BOOKED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['OUT_FOR_DELIVERY', 'FAILED_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_DELIVERY'],
  FAILED_DELIVERY: ['COURIER_BOOKED'], // Retry with new courier
  ...
};
```
*/

// ============================================================================
// 8. ENVIRONMENT VARIABLES REQUIRED
// ============================================================================

/*
Add to your .env.local or Firebase configuration:

VITE_PORTER_API_KEY=your_porter_api_key
VITE_RAPIDO_API_KEY=your_rapido_api_key
VITE_RAZORPAY_WEBHOOK_URL=your_cloud_function_url

Load in courierAdapters.ts:

```typescript
const porterApiKey = import.meta.env.VITE_PORTER_API_KEY;
const rapidoApiKey = import.meta.env.VITE_RAPIDO_API_KEY;

export function getCourierAdapter(provider: 'porter' | 'rapido', apiKey?: string) {
  const key = apiKey || (provider === 'porter' ? porterApiKey : rapidoApiKey);
  if (!key) {
    throw new Error(`${provider} API key not configured`);
  }
  // ...
}
```
*/

// ============================================================================
// 9. TESTING THE INTEGRATION
// ============================================================================

/*
Manual testing steps:

1. COURIER BOOKING:
   - Go to Admin Panel
   - Find an order with status READY
   - Click "Book Courier"
   - Select Porter or Rapido
   - Enter valid API key
   - Click "Book Courier"
   - Verify order status changed to COURIER_BOOKED
   - Check Firebase console: order.courierProvider, courierTripId populated

2. PAYMENT VERIFICATION:
   - Create order with UPI payment method
   - Instead of marking paid directly, should open PaymentProofModal
   - Submit screenshot + UTR number
   - Order status should be PAYMENT_VERIFICATION
   - Go to Admin Panel → Payment Verification tab
   - Should see pending proof to review
   - Click "Verify Payment" → Order marked VERIFIED

3. COURIER TRACKING:
   - View order status page (OrderStatus.tsx)
   - After courier booked, should see CourierTrackingTimeline
   - Should show rider name, phone, ETA, status timeline
   - Tracking link should open courier app

4. DELIVERY COMPLETION:
   - Courier marks delivered in their app
   - Webhook triggers (or polling updates)
   - Order status → DELIVERED (deliveredTime updated)
   - Timeline shows green checkmark
   - Proof of delivery photo displayed
*/

// ============================================================================
// 10. FRAUD DETECTION RULES IMPLEMENTED
// ============================================================================

/*
Current fraud checks:

1. NO_PROOF_SUBMITTED
   - Customer tried to mark paid without proof submission
   - Fixed by PaymentProofModal requirement

2. DUPLICATE_UPI_PAYMENT
   - Same UTR used multiple times (payment already processed)
   - Checked in PaymentVerificationService.checkForDuplicateUPIPayment()

3. RAZORPAY_PAYMENT_NOT_FOUND
   - Customer claims payment but Razorpay webhook doesn't match
   - Uses webhook logs stored in razorpayWebhooks collection

4. TIMESTAMP_MISMATCH
   - Payment timestamp and proof submission > 5 minutes apart
   - Suggests fake/old proof

5. ORDER_ID_MISMATCH
   - Payment notes don't contain matching orderId
   - Indicates payment for different order

Future enhancements:
- Multiple payment failures per customer
- Duplicate customer phone numbers
- Screenshot OCR verification
- Amount verification (payment amount vs order total)
*/

export { };
