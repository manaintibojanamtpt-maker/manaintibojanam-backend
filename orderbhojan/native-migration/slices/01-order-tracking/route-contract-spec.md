# Route Contract Spec: Order Tracking (Slice 01)

## Overview
This document defines the interface boundary for the first native slice: **Order Tracking**.
It establishes how the hybrid shell delegates to the native view, what parameters are passed, and the API endpoints the native view is responsible for consuming.

## 1. Native Plugin Invocation Contract

When the web app wants to hand off to the native tracking view, it will invoke the `NativeTrack` Capacitor plugin.

**Method Signature:**
```typescript
NativeTrack.open(options: { orderId: string, phone?: string })
```

**Parameters:**
*   `orderId` (string, required): The unique identifier for the order.
*   `phone` (string, optional): The phone number for guest tracking auth. If missing, the API assumes an authenticated user session.

**Fallback Behavior:**
If the plugin is unavailable or the feature flag is disabled, the web app routes to:
*   `/user/orders/:orderId` (Authenticated)
*   `/track/:orderId?phone=...` (Guest)

## 2. API Data Contract

The native implementation must consume the following endpoints using the exact same response shape as the web application.

### A. Authenticated Tracking
*   **Endpoint:** `GET /api/marketplace/orders/{orderId}/tracking`
*   **Headers:** `Authorization: Bearer <token>`
*   **Response Model:** `OrderTrackingResponseDTO`

### B. Guest Tracking
*   **Endpoint:** `GET /api/marketplace/orders/{orderId}/guest-tracking?phone={phone}`
*   **Headers:** None required.
*   **Response Model:** `OrderTrackingResponseDTO`

## 3. Core Response Model (`OrderTrackingResponseDTO`)

The native repositories must map the following JSON structure:

```json
{
  "orderId": "string",
  "orderNumber": "string",
  "status": "string",
  "paymentStatus": "string (optional)",
  "expiresAt": "ISO Date String (optional)",
  "timeline": [
    {
      "status": "string",
      "at": "ISO Date String",
      "message": "string (optional)"
    }
  ],
  "etaMinutes": {
    "min": "number",
    "max": "number"
  },
  "restaurant": {
    "displayName": "string",
    "slug": "string",
    "restaurantId": "string"
  },
  "delivery": {
    "partner": "string (optional)",
    "trackingUrl": "string (optional)",
    "riderName": "string (optional)",
    "riderPhone": "string (optional)"
  }
}
```

## 4. Polling Contract
The native views should poll the tracking endpoint every 10-15 seconds while the order is in an active state (e.g., `preparing`, `out_for_delivery`). Polling should stop if the app goes to the background or if the order reaches a terminal state (`delivered`, `cancelled`).
