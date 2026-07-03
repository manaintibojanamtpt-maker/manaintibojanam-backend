# OrderSDK Read API v1.0.0 — DTO Reference

---

## OrderReadModel

Primary read DTO returned by all successful read methods.

### Core fields (required / normalized)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `OrderId` | Order document ID |
| `tenantId` | `TenantId` | Kitchen / storefront tenant |
| `userId` | `UserId \| null` | Customer UID; null for guest orders |
| `status` | `OrderStatus` | Normalized uppercase lifecycle status |
| `paymentMethod` | `'razorpay' \| 'cod'` | Payment rail |
| `paymentStatus` | `PaymentStatus` | Normalized payment state |
| `items` | `OrderLineItemReadModel[]` | Immutable line snapshot |
| `subtotal` | `number` | Pre-tax subtotal |
| `totalAmount` | `number` | Total charged |
| `createdAt` | `IsoDateTime` | ISO-8601 creation time |
| `updatedAt` | `IsoDateTime?` | ISO-8601 last update |

### Optional identity fields

| Field | Type |
|-------|------|
| `orderNumber` | `number` |
| `customerName` | `string \| null` |
| `phone` | `string` |

### Passthrough display fields (v1.0.0)

Optional fields preserved during strangler migration. **May be refined in v1.x minor releases** (additive only). Removal requires major version.

| Field | Type | Used by |
|-------|------|---------|
| `prepTime` | `number` | OrderTracking ETA |
| `deliveryTime` | `number` | OrderTracking ETA |
| `reviewed` | `boolean` | OrderTracking |
| `gst`, `gstAmount` | `number` | Invoice / tracking |
| `packingFee`, `deliveryFee` | `number` | Invoice |
| `address` | `string` | Delivery display |
| `deliveryPartner` | `string \| { name, phone }` | Dispatch |
| `riderName`, `riderPhone` | `string` | Dispatch |
| `trackingUrl`, `trackingLink` | `string` | GPS / partner |
| `deliveryType` | `string` | Scheduled vs ASAP |
| `scheduledTime`, `scheduledFor` | `unknown` | Scheduled orders |
| `orderType`, `deliveryTimeSlot` | `string` | MyOrders memory |
| `isCOD`, `expiresAt` | various | Payment expiry |
| `rating`, `feedback`, `feedbackStatus` | various | MyOrders rating |
| `specialInstructions` | `string` | Customer memory |
| `customerPhone` | `string` | OwnerOrders cards |
| `deliveryAddress` | `{ addressLine1, city }` | OwnerOrders |
| `deliveryAssignedAt` | `string` | Owner dispatch |
| `statusHistory`, `timeline` | `unknown` | Status timeline (read) |

---

## OrderLineItemReadModel

| Field | Type |
|-------|------|
| `menuItemId` | `string` |
| `name` | `string` |
| `unitPrice` | `number` |
| `quantity` | `number` |
| `lineSubtotal` | `number` |
| `lineTax` | `number?` |
| `lineTotal` | `number` |

---

## GuestViewTokenResult

| Field | Type |
|-------|------|
| `token` | `string` | Stateless guest JWT |
| `expiresAt` | `IsoDateTime` | Token expiry |

---

## OrderStatus (normalized)

```
PENDING | PLACED | ACCEPTED | PREPARING | READY | OUT_FOR_DELIVERY |
DELIVERED | CANCELLED | EXPIRED | ACTIVE | PAYMENT_PENDING | PAYMENT_VERIFICATION
```

Legacy source values (e.g. `placed`, `pending_payment`) are normalized by the adapter mapper.

---

## PaymentStatus (normalized)

```
pending | success | failed | expired | verified | pending_verification
```

---

## Status normalization rules (v1.0.0)

| Source | Normalized |
|--------|------------|
| `placed` | `PENDING` |
| `pending_payment` | `PAYMENT_PENDING` |
| `payment_pending_verification` | `PAYMENT_VERIFICATION` |
| Other strings | Uppercased, spaces → `_` |

---

*DTOs frozen at v1.0.0. Additive optional fields allowed in minor releases.*
