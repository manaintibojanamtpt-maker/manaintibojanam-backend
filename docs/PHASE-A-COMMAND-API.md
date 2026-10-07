# Phase A — Order Command API

The single write path for order state. The POS, the owner portal and any future
client apply changes here instead of writing Firestore directly.

```
POST /api/v1/tenants/{tenantId}/orders/{orderId}/commands
Authorization: Bearer <Firebase ID token>
Idempotency-Key: <client-generated command id>
Content-Type: application/json
```

## Why this exists

Before it, a POS could write any field on any order document, including
`paymentStatus`. A crashed tab, a duplicated request or a buggy client could mark
orders paid, move an order backwards through the kitchen, or silently lose a
payment. This endpoint makes each of those one atomic, authenticated, auditable,
idempotent transaction.

## Guarantees

1. **Authentication is mandatory.** There is no anonymous path. An absent or
   invalid token is `401`.
2. **Tenant membership is checked before anything else,** so a signed-in user
   from another tenant cannot learn whether an order exists.
3. **Roles come from data, never from the request,** and never default to the
   most privileged value. An account with no role for a tenant is refused.
4. **Path parameters win over the body.** `tenantId` and `orderId` in the
   payload are ignored; the authorised path is authoritative.
5. **One transaction writes four things together:** the order change, the
   monotonic `version`, the durable receipt in `order_commands`, and the outbox
   event in `outbox`. Either all four land or none do.
6. **Timestamps and audit fields are server-owned.** A client clock is stored for
   diagnostics only and never decides ordering.

## Idempotency

`Idempotency-Key` must equal the `commandId` in the body. One key, one command.

The receipt is keyed `order_commands/{tenantId}__{commandId}`, so two tenants can
never read each other's outcome, and the stored `fingerprint` covers the command
type and payload.

| Situation | Result |
|---|---|
| Same key, same payload, already applied | `200` with `replayed: true` and the original version. No second write, no second outbox event. |
| Same key, different payload | `409 IDEMPOTENCY_KEY_CONFLICT`. Nothing is applied. |
| `CONCURRENCY_CONFLICT` or `ORDER_NOT_FOUND` | `409`/`404`, and **no receipt is written**, so the client can re-read state and retry the same key. |
| Deterministic rejection (`INVALID_PAYLOAD`, `PAYMENT_AMOUNT_MISMATCH`, `PROVIDER_VERIFIED_PAYMENT_REQUIRED`, `TENANT_MISMATCH`, …) | Receipt is written. Replaying the same key returns the same answer. |

The distinction matters: pinning an optimistic failure would make the command
permanently unretryable, because the client must change `expectedVersion` to
succeed and the changed payload would then read as key reuse.

### expectedVersion: retry versus revision

`expectedVersion` is the client's precondition, and the two ways a client can get
a `CONCURRENCY_CONFLICT` require opposite handling. The client distinguishes
them explicitly:

| Client situation | `commandId` | `expectedVersion` | Receipt |
|---|---|---|---|
| **Transport retry** — the request may never have arrived | unchanged | unchanged | Replays the committed receipt |
| **Revision after a real conflict** — the server reported a newer version | unchanged | replaced with the server's `currentVersion` | None was written, so the retry proceeds |

A transport retry is the same logical command and must keep the identical
fingerprint so it reads as a replay. A revision is a *different* logical command
arriving under the same id, which is why it needs a fresh `expectedVersion` —
and why the conflict it follows must never have been pinned.

The client records `expectedVersionRevision` on the queue row each time it
revises, so a retry after a revision is still recognised as the same command. A
retry that has not been revised is never resent with a changed precondition:
that would be indistinguishable from a second, conflicting command reusing a key.

The global `idempotency_keys` middleware deliberately skips this path. It records
the key before the handler runs and caches the response, which would replay a
cached `409` for 24 hours to a client retrying with fresh state.

## Commands

`CreateOrder`, `AcceptOrder`, `RejectOrder`, `MarkPreparing`, `MarkReady`,
`UpdateOrderStatus`, `RecordPayment`, `CreateKot`.

| Command | Allowed roles |
|---|---|
| `CreateOrder` | owner, manager, cashier, admin |
| `AcceptOrder`, `UpdateOrderStatus` | owner, manager, cashier, kitchen, admin |
| `RejectOrder`, `MarkPreparing`, `MarkReady`, `CreateKot` | owner, manager, kitchen, admin |
| `RecordPayment` | owner, manager, cashier, admin |

Kitchen cannot record payments, and no client can change `paymentStatus` through
`UpdateOrderStatus`.

### CreateOrder

Creation is a command like any other, so an order that exists offline is created
by the same authenticated, idempotent, audited path as every other change.

**Identity is minted once, by the client.** The POS generates the order id,
persists it in IndexedDB, and sends it as the payload's `orderId`. That id becomes
the server's document id. It is also the `Idempotency-Key` of the creation
command and is reused by every later command for that order. A retry therefore
cannot be mistaken for a different order, and no server-side "match by number"
heuristic is needed.

**The server trusts none of the money.** The payload carries items
(`menuItemId`, `quantity`) and customer details only. Prices, discounts, tax and
totals are recomputed server-side:

- Menu prices are read inside the same transaction as the write.
- A price for a published, available menu item is used as-is, and the order is
  recorded with `pricingSource: 'menu'` — every line came from the tenant's own
  menu.
- A price for an item that is not published or unavailable is clamped to the
  current menu price and the order is recorded with
  `pricingSource: 'client_unverified'` — no tenant menu document priced at least
  one line. The order is still created: losing a walk-in sale because a menu row
  was edited offline is worse than a flagged price. The flag makes it auditable.
- The client-sent total is ignored. `subtotal`, `discount`, `taxes`, `total` and
  `pricingSource` are all server-written.

Validation rejects an empty or oversized cart (>100 lines, subtotal above
1,000,000), a non-positive or non-integer quantity (>999), an unknown
`orderType`, a gateway payment method recorded as staff-collected, and any
attempt to arrive in a status other than `PLACED`.

**One transaction writes** the order at `version: 1`, the durable receipt, and an
`order.placed` outbox event. A creation never lands without its receipt, and a
receipt never lands without the order.

| Situation | Result |
|---|---|
| New `orderId` | `200`, order at `version: 1`, `order.placed` emitted |
| Same command id replayed | `200` with `replayed: true`; no second order, no second event |
| `orderId` already exists | `409 ORDER_ALREADY_EXISTS`, **no receipt written** — the client re-reads the order instead |
| Invalid cart | `422 INVALID_ORDER_ITEMS`, receipt written, work becomes terminal `FAILED` on the client |

`expectedVersion` is omitted for `CreateOrder`. If a client sends it, it must be
absent or `1`; anything else is a `CONCURRENCY_CONFLICT` with no receipt.

### Ordering within one order

Commands for the same order are strictly ordered. The client assigns each a
monotonic `orderSequence` at enqueue time and the flusher walks that sequence in
order, stopping the moment a command does not reach `SYNCED`.

This matters because the later commands are not self-sufficient: `AcceptOrder`
needs the order to exist, `RecordPayment` needs an amount to match, `CreateKot`
needs an order in the kitchen. Sending them ahead of `CreateOrder` produced
`ORDER_NOT_FOUND` and a retry loop that could not converge.

The gate is per order, not global. A command whose predecessor is `FAILED`,
`BLOCKED` or held in another tab is deferred with a reason, and every *other*
order's queue continues to flush in the same pass. One poisoned order therefore
cannot stall the register.

### Payment integrity

- Client-recorded methods are `CASH`, `CARD`, `UPI_MANUAL`, `CHEQUE`,
  `BANK_TRANSFER`. They may only write `RECORDED` — an observed, human-collected
  payment.
- Gateway methods (`RAZORPAY`, `ONLINE`, `UPI_GATEWAY`, …) are rejected with
  `PROVIDER_VERIFIED_PAYMENT_REQUIRED`. Only a verified webhook may write
  `VERIFIED`.
- The amount must match the order's settleable balance; anything else is
  `PAYMENT_AMOUNT_MISMATCH`.
- The pre-existing payment gate still applies: an order does not enter the
  kitchen or dispatch until payment is verified, except for COD.

## Errors

Machine-readable `{ success: false, error: { code, message, retryable,
currentVersion? }, correlationId }`. The client classifies on `code`, never on
message text. `X-Correlation-Id` is honoured and echoed.

## Outbox

Every applied command writes `outbox/{tenantId}__{commandId}` with
`status: PENDING`. `dispatchOutboxBatch` drains it every
`ORDER_OUTBOX_DISPATCH_INTERVAL_MS` (default 15s) and on
`POST /api/cron/process-workers`.

- Receipts in `outbox_receipts/{eventId}__{handlerName}` make delivery idempotent.
  A handler name is required and must be unique per event type, because the name
  is part of the dedupe key.
- A failing handler is retried with exponential backoff plus full jitter and is
  not re-run for later handlers in the same pass.
- After `MAX_DELIVERY_ATTEMPTS` (8) the event moves to `outbox_dead_letter` with
  its payload and last error, and can be replayed with `replayDeadLetter`.
- An event with no subscriber stays `PENDING` and is logged; it is never marked
  delivered.
- `rebuildOrderProjection(collection)` rebuilds a projection from `orders`, which
  remain the source of truth.

### Runtime registration (required)

A dispatcher with an empty registry is worse than a stopped one: it scans the
pending events, finds no subscriber, logs `outbox.no_handler`, and moves on. The
events stay `PENDING` (correct) but nothing consumes them, and because
`dispatched` stays 0 even the summary log never fires — the failure is invisible
in normal operation.

Two things prevent a repeat, both in `server.ts`'s boot sequence:

1. `registerRequiredOrderOutboxHandlers()` runs before the timer is armed, so
   the registry is never empty in a live process.
2. `verifyOrderOutboxRegistration()` throws `OrderOutboxRegistrationError` when a
   required subscription is missing. Boot fails with exit code 1 rather than
   accumulating a permanently growing `PENDING` backlog that every 15-second pass
   walks and ignores.

| Subscription | Handler name | Required |
|---|---|---|
| `order.placed` | `order-intake-ledger` | yes |
| `*` | `order-lifecycle-projection` | yes |

Handler names are **constants, never `handler.name`**. The name is part of the
receipt id, so an incidental rename — a bundler, a refactor — would silently
re-run that handler against all history. Pinning the name makes it a test instead
of a code-review question.

`order.placed` is required because an offline POS creates its order through this
path: without the intake ledger, an order exists in `orders` with nothing
recording that it came from a queued offline command, and its unverified price is
never surfaced for review.

`dispatchOutboxBatch` additionally reports `unhandledRequired` — required event
types with no live handler — so the condition is visible in metrics as well as in
the boot check.

### The `order.placed` intake ledger

`handleOrderPlaced` writes `order_intake/{eventId}`:

| Field | Meaning |
|---|---|
| `eventId`, `tenantId`, `orderId`, `commandId`, `correlationId` | provenance |
| `orderVersion` | order version the event carried |
| `pricingSource` | `menu`, or `client_unverified`, or `unknown` |
| `requiresPricingReview` | true when no published menu priced every line |
| `holdsFulfillment` | true while the order must not reach the kitchen |
| `total` | the unverified total, so a reviewer sees what was charged |

The document is keyed by the outbox event id alone. That id is already
tenant-scoped (`{tenantId}__{commandId}`), so prefixing again would only produce a
longer key; keeping it derived from the event id is what makes a redelivery
rewrite the same row instead of appending a second one.

The event payload carries `pricingSource` and `total` for exactly this reason. An
`order.placed` event without them would make every offline-created order look
verified, because the handler would read `unknown` and flag nothing.

## Security rules

`firestore.rules` makes the receipt trail server-owned:

- `order_commands`, `outbox`, `outbox_receipts`, `order_lifecycle_projection`: no
  client writes at all. `outbox_dead_letter` is also server-write-only.
- Staff order updates are limited to lifecycle and operational fields. Money,
  tenant ownership and audit fields are rejected.
- No client may write `VERIFIED`, or any of `paymentVerifiedAt`,
  `paymentVerifiedBy`, `razorpayPaymentId`, `paymentRail`,
  `reconciliationSource`, `reconciliationEventId`.
- Settled payment states (`PAID`, `SETTLED`, `CAPTURED`, `REFUNDED`, …) are
  server-only. A client may create a `PENDING` payment with a provenance token,
  but cannot declare one settled.
- A `CreateOrder` may not set `paymentStatus` to a settled state, and an
  unauthenticated create may not set one at all.
- The prototype-tenant bypasses (`tenantId == 'bhojanos-inti-bojanam'`) are
  removed. Access follows `users` documents and tenant ownership.
- Custom claims are read defensively. Reading an absent claim raised a rule
  evaluation error and denied every staff read on a normal token; that is fixed.
- `tenantOf` **fails closed**: a document with no `tenantId`/`restaurantId`
  matches no tenant scope, and a tenant comparison against `null` is a denial
  rather than a match.

### Emulator coverage

`scripts/security/firestore-rules.test.ts` runs against the Firestore emulator
(`npm run test:rules`, 40 tests). It asserts the denials directly, because the
baseline suite was misleading in one specific way: a payment test passed only
because `/payments` was denied through a malformed boolean expression, not
because the rule was correct. The scenarios covered are:

- missing admin claims, empty tokens, and a tenant-less staff document
- cross-tenant reads and writes on orders, POS orders, payments and KOTs
- payment forgery — settled states, verification fields, provenance tokens
- anonymous order creation, and what it may not declare
- legacy POS write shapes
- dead-letter reads and writes
- admin access to its own queues

### Residual evaluation errors

Some `customers`, `subscriptions` and `referrals` blocks still contain fail-closed
evaluation errors. These are **not** grant paths — an error denies — but they
should be corrected before the rules are used for those collections. They are
out of Phase A scope and listed in Known gaps.

## Firestore indexes

The endpoint and dispatcher need these composite indexes:

| Collection | Fields |
|---|---|
| `outbox` | `status` ASC, `occurredAt` ASC |
| `orders` | `tenantId` ASC, `orderStatus` ASC (POS snapshot reads) |
| `orders` | `tenantId` ASC, `__name__` ASC (projection rebuild) |
| `order_intake` | `tenantId` ASC, `requiresPricingReview` ASC (review queue) |
| `order_intake` | `tenantId` ASC, `occurredAt` ASC |

The outbox index was previously declared on `nextRetryAt`, which is not the field
the dispatcher filters on. The query asks for `status` + `occurredAt`, so the
declared index would never have matched.

Deploy with the usual index deployment flow. A missing index surfaces as a
`FAILED_PRECONDITION` and appears in `outbox.lastError`; it does not lose data.

## POS client contract

The POS keeps every command in IndexedDB and flushes them through this endpoint.

- `Idempotency-Key` is the durable queue row id, so a retry reuses it verbatim.
- Queue states: `PENDING | SYNCING | SYNCED | FAILED | BLOCKED`.
- `401` blocks the queue for re-authentication and consumes no retry budget.
- `403`, `404`, `409 IDEMPOTENCY_KEY_CONFLICT`, `422` are permanent and shown to
  the operator with the server's message.
- `409 CONCURRENCY_CONFLICT`, `429`, `5xx` are retried with backoff.
- `SyncRetry: false` in the response stops automatic retries immediately.
- Interrupted `SYNCING` rows return to `PENDING` on restart.
- Only acknowledged rows are eligible for retention purge; unacknowledged work
  is never discarded.

### Durable sync lease

Multiple tabs on one device are normal, not exceptional. Without coordination
both flush the same queue, and a tab that was paused mid-request can wake up
after its work was already redone and overwrite the newer result.

Flush ownership is therefore a **durable, fenced lease** in IndexedDB:

| Property | Value |
|---|---|
| Table | `syncLeases`, single row `SYNC_LEASE_NAME` |
| Default term | 30s, renewed every 10s |
| Identity | `workerId`, unique per tab for the life of the page |
| Fence | `fencingToken`, incremented on every acquisition |

Because the lease lives in IndexedDB rather than in memory, a tab that is killed
mid-request does not take the lease with it. The next tab finds the lease, waits
for `expiresAt`, then takes it with a **higher token**. Every claim and every
outcome carries that token, and the following are refused once it is superseded:

- claiming a command, even a fresh `PENDING` one;
- writing an outcome onto a command already in flight;
- renewing the lease.

A fenced worker therefore cannot start new work, cannot finish old work, and
**discards its late response** rather than letting it overwrite the new owner's
result. `getLeaseStatus()` exposes `held`, `fence` and `lost` so the UI can tell
an operator why a device is not syncing.

Renewal is stoppable: `shutdown()` stops the heartbeat and releases the lease as
expired, so a second tab picks up immediately instead of waiting out the term.
`dispose()` only stops the timer — it deliberately does not release ownership,
because a component that is merely unmounting must not hand the lease away while
its request is still in flight.

### Recovery procedures

**A tab was killed mid-request.** No action needed. The lease expires within the
term, the next tab takes it with a higher token, and `recoverInFlightCommands`
returns the abandoned `SYNCING` row to `PENDING`. Because the command keeps its
original `commandId`, resending it replays the server receipt rather than
creating a second order or a second payment.

**Another tab already flushed it.** Nothing happens. The stale response is
dropped by the fence; the queue row reflects the current owner only.

**Work is stuck behind a `FAILED` or `BLOCKED` predecessor.** Deferred by
design, and surfaced in the UI rather than retried forever. Resolve the visible
error — `TENANT_REQUIRED` means the row was queued before tenant scoping existed
and needs a restaurant selected.

**An operator needs to prove what a device confirmed.** Acknowledged rows are
retained for 7 days specifically so an offline device can show its own history.
Only acknowledged rows are ever purgeable.

### Dexie migration (v2 → v3 → v4)

Additive at every step. Existing `payments`, `kots` and `syncQueue` rows are
preserved, including unsynced ones. v3 adds `tenantId`, `orderSequence`,
`nextAttemptAt`, `failureCode` and `failureDetail` to the queue; v4 adds the
`syncLeases` table plus `leaseFence` and `leaseOwner` columns.

- `tenantId` is recovered from the legacy payload's `restaurantId`.
- A legacy row with no recoverable tenant becomes `BLOCKED` with
  `TENANT_REQUIRED` and is visible in the UI, rather than sitting in IndexedDB
  where no tenant-scoped query would ever find it.
- A legacy `SYNCED` row gets `acknowledgedAt` from its `createdAt`, so retention
  can reclaim it.
- Legacy `CREATE_ORDER` rows are mapped onto `CreateOrder`, not onto
  `UpdateOrderStatus`. The legacy row never carried a server order id, so the
  client mints one and queues a real creation. A row whose payload cannot yield
  a line item becomes a visible `FAILED` — it is never discarded, and it is never
  silently downgraded into a status change that would not create an order.
- v4 upgrades a device mid-queue without inventing a lease. The first worker to
  ask takes token `1`, and a pre-lease `SYNCING` row carries no fence, which is
  exactly what makes it recoverable.

## POS tenant authorization

The POS shell used to bind itself to a hardcoded tenant id. Every order, KOT,
payment and queued command inherited that constant, so editing one string was
enough to point a terminal at another restaurant, and a signed-in member of any
restaurant saw one specific restaurant's data.

`GET /api/v1/pos/tenants` replaces it.

- Requires a verified Firebase ID token. No anonymous path, no identity from the
  body.
- The list is derived from the caller's memberships and filtered to POS counter
  roles (`owner`, `manager`, `cashier`, `kitchen`). A membership with **no** usable
  role is dropped, not defaulted: silently treating it as a cashier would let any
  signed-in account trade in a tenant it was never given authority for.
- An authenticated caller with no usable membership gets `200` with an empty
  list, not `403`. The request succeeded; the answer is "none". The client treats
  an empty list as locked out rather than as an error to retry.
- The strongest role wins when a tenant appears twice, so the picker shows the
  role that will actually be enforced.

`GET /api/v1/pos/tenants/{tenantId}/authorized` re-confirms one tenant. It reuses
`resolveActorForTenant` — the same function the command endpoint uses — so the
UI's idea of "authorized" and the command endpoint's cannot drift apart.

Client side (`posTenantSession.ts`, `useAuthorizedPosTenant.ts`):

- `tenantId` is `null` in every locked-out case. There is no fallback constant.
- A **transient** failure keeps the currently bound tenant and withdraws only the
  ability to switch. A terminal that dropped its tenant mid-service would strand
  queued orders with no way to retry the flush.
- Every switch is re-confirmed server-side before it takes effect.
- The remembered tenant is stored **per account uid** and is only used if the
  server still lists it, so signing in as someone else on a shared till does not
  inherit their restaurant.
- Switching calls `stopListening()` then `await shutdown()` — which releases the
  durable flush lease — *before* `initialize()` for the new tenant. Ownership is
  never held across a switch.

## Supervisor verification

`POST /api/v1/tenants/{tenantId}/pos/verify-supervisor`

The POS previously sent a staff-entered PIN to an endpoint that did not exist and
treated any non-throwing response as verified, so an offline or `404` endpoint left
the action unlocked. The server is now the only authority, and every refusal is
observable.

Request: `{ code, operation }`. That is all — the body cannot name an actor, a
role, or a tenant. Authentication is a verified ID token, and a caller who is not
a member of the tenant in the path is refused before the code is looked at.

Response on success is a **grant**, not a boolean:

```json
{
  "verified": true,
  "supervisorId": "<actor uid>",
  "grant": {
    "token": "…",
    "operation": "REOPEN_BUSINESS_DAY",
    "tenantId": "…",
    "actorUid": "…",
    "expiresAt": "2026-01-01T12:05:00.000Z"
  }
}
```

The grant is what makes this safe rather than a boolean:

- **Bound** to actor, tenant and the one operation it was issued for.
- **Short-lived** — `SUPERVISOR_GRANT_TTL_MS`, 5 minutes.
- **Single use.** `POST …/pos/supervisor-grants/redeem` consumes it in a
  transactional compare-and-set, so two callers redeeming the same grant
  concurrently cannot both succeed.
- **Not client-mintable** and not extendable.

`redeem` checks, in order: exists, unconsumed, unexpired, same actor, same tenant,
same operation. Any mismatch is a refusal, not a downgrade.

Operations are an allowlist (`SUPERVISOR_OPERATIONS`), never a free string:
`REOPEN_BUSINESS_DAY`, `RESOLVE_PRICING_REVIEW`.

### Credentials

A PIN is never stored in plaintext and never appears in a log line or an audit
record.

- `supervisor_credentials/{tenantId}` holds a per-credential salt and a scrypt
  hash, compared with `timingSafeEqual`.
- A tenant with no credential configured has no supervisor. Verification fails
  closed rather than accepting a default, because a default would make every
  unconfigured tenant's approvals forgeable.
- The grant document id is the **hash** of its token, so a leaked database does not
  hand over usable tokens and the documents cannot be enumerated.

### Rate limiting

`SUPERVISOR_MAX_ATTEMPTS` (5) per `SUPERVISOR_ATTEMPT_WINDOW_MS` (10 minutes) per
**tenant**, not per IP: a lockout must not let one terminal deny a whole office.

The limit is consulted **before** the code is inspected. If a malformed code were
rejected first, an attacker could send unlimited short codes, never see a lockout,
and never increment the counter protecting the real one. A lockout returns `429`
with `Retry-After`.

A successful verification clears the counter, so an operator who fumbles twice and
then gets it right is not left one attempt from a lockout.

### Audit

Every attempt — granted or refused — writes `audit_logs` with the actor, tenant,
operation, outcome and reason. Refusals are recorded because they are the
interesting ones, and the lockout itself is a record. A wrong code is correlated by
a short one-way `codeFingerprint` (sha256, tenant-salted, 12 hex chars) so
repeated guesses from one terminal are visible without retaining anything
reversible.

`NO_CREDENTIAL_CONFIGURED` and `INVALID_CODE` share one outward message — whether a
tenant has a supervisor configured is not something a caller should be able to
enumerate — while the code, status and audit record keep them apart for an
operator.

### Client usage

`verifySupervisorCode` returns `null` on every failure path and treats a
`verified: true` response **without a usable grant** as a failure: the boolean is
not authority, the grant is. `EodReconciliationScreen` then calls
`redeemSupervisorGrant` before performing the local reopen, which is what proves
the grant was real, unexpired, unspent and issued for this operation. An
authenticated owner session bypasses the code path entirely and is recorded as
`admin-session`.

## Unverified pricing policy

`CreateOrder` always creates the order. When no tenant menu document priced one or
more lines, the order is written with `pricingSource: 'client_unverified'` and the
bill rests on the terminal's cached price. The order is real and its payment is
untouched — but it must not quietly reach the kitchen.

The intake handler records `requiresPricingReview: true` and `holdsFulfillment:
true`. Recording the flag is only half a policy; somebody must be able to decide,
and the decision must be attributable.

`POST /api/v1/tenants/{tenantId}/pricing-reviews/{eventId}`
body: `{ decision: 'APPROVE' | 'REJECT', reason }`.

| Rule | Why |
|---|---|
| Only `owner`, `manager` or platform `admin` may resolve | a cashier or kitchen role cannot clear its own pricing hold |
| The decision is written once | a second attempt reports the existing decision instead of overwriting it, so two managers racing cannot produce two contradicting audit records |
| A reason of ≥ 8 characters is mandatory | an approval with no recorded justification is an unexplained price change |
| Approval stamps the order, not just the ledger | the order is what the kitchen, the bill and reconciliation read |

`APPROVE` clears `requiresPricingReview` and `holdsFulfillment`, and sets
`pricingVerifiedAt` plus `pricingOverride` on the **order**. `REJECT` keeps the
hold, sets `pricingOverride`, and marks the order `REJECTED` — the customer is not
served a bill the tenant refused to stand behind.

Both write an `audit_logs` record containing the flag itself
(`pricingSource`, `unverifiedTotal`), so an auditor can see what was decided.

The intake ledger, the order update and the audit record are written in **one
transaction**, so a decision is never recorded without its audit entry and an audit
entry is never recorded for a decision that did not apply.

Nothing in this path moves money. A payment recorded before the review was decided
is left exactly as it was, including its settlement state — approvals and
rejections do not rewrite reconciliation.

`GET /api/v1/tenants/{tenantId}/pricing-reviews` lists unresolved reviews for
one tenant, scoped and filtered in the query.

## Backup restore

`restoreBackup(backupData, credential, activeRestaurantId, hooks?, restoredBy?)`

Restore rewrites every table, so it fails rather than guessing. Every assumption a
restore would otherwise make silently is checked and reported with an actionable
message and a machine-readable `code`:

| Code | Refused when |
|---|---|
| `UNAUTHORIZED` | no server-verified credential |
| `INVALID_FILE` | not a POS backup, or the terminal has no authorized tenant bound |
| `UNSUPPORTED_VERSION` | a version this build cannot read |
| `TENANT_MISMATCH` | the backup is from another restaurant, or does not say which |
| `UNSYNCED_WORK` | any queued command is not yet acknowledged by the server |
| `RESTORE_IN_PROGRESS` | a restore is already running on this terminal |
| `RESTORE_FAILED` | the transaction failed; nothing was changed |

**Tenant scope is enforced.** A backup names the restaurant it came from, and a
restore into a different tenant is refused. Without that check, restoring a file
from another restaurant would import their orders, payments and audit log into this
terminal and then happily sync them onward.

**Schema version is enforced** with an explicit migration path. v1 and v2 are
brought forward — a missing table migrates to empty rather than being dropped,
because refusing a v1 backup would strand a terminal whose only copy of its data
predates the audit log.

**Queued work is never discarded.** A backup's queue is merged into the live queue
rather than replacing it, keyed by the durable command id. Where an entry exists in
both, the **local** version wins: it carries the acknowledgement timestamp and
lease fence that stop the command being re-sent, and a stale file copy of a payment
could otherwise cause a second capture. Anything not yet acknowledged is refused
outright.

**The audit log is restored.** A restore that silently emptied the audit trail
would destroy exactly the record a restore is supposed to leave behind. Business
day state is restored too, so a day a manager closed does not silently reopen.

**Lease ownership is coordinated** through injected `pauseSync` / `resumeSync`
hooks. `pauseSync` must release the durable flush lease, not merely ask the
flusher to wait, which is what stops another tab writing into a half-restored
database. `resumeSync` runs in a `finally`, so a failed restore cannot leave the
POS permanently paused.

**Exports are tenant-scoped.** `syncQueue` is filtered on `tenantId` and
`auditLogs` on `entityId` (which is where `logAudit` records the tenant) rather
than by index, because adding an index would mean a schema bump for a
once-per-shift operation.

The EOD screen exposes this with a specific message per refusal rather than a
generic "restore failed", and a success banner that states what was restored.

## Rollout

1. Deploy rules and indexes **first**. Two dependencies are ordering-sensitive:
   - The `/payments` list rules were broken; client payment reads were being
     denied. Confirm a staff payment list works after deploy.
   - The `order_intake` review-queue index must exist before the pricing review
     UI is enabled.
2. Create the composite indexes listed above. Deploy with the usual flow.
3. Confirm staff roles exist. An account with membership but no role is refused
   with `FORBIDDEN_ROLE`, and is **excluded from the POS tenant picker** rather
   than defaulted to a counter role.
4. Provision supervisor credentials for tenants that need them:
   `setSupervisorCredential(db, fieldValue, { tenantId, code, actorUid })`. Until
   one exists, `REOPEN_BUSINESS_DAY` fails closed with
   `NO_CREDENTIAL_CONFIGURED` — that is expected, not a fault.
5. Ship the POS client. It queues locally and syncs; no migration is needed.
6. Watch metrics at `GET /api/v1/ops/order-command-metrics` (admin only): replayed
   vs applied, concurrency conflicts, auth rejections, outbox lag, dead letters,
   and `unhandledRequired`.

### Feature flags

- `FF_ORDER_LIFECYCLE_PROJECTION_READS` gates **reads** from the lifecycle
  projection. `orders` remains the read path until that flag is on in production
  with parity checked; the outbox subscriber itself is not gated, because a
  projection that silently stops updating is worse than one nothing reads yet.
- `ORDER_OUTBOX_DISPATCH_INTERVAL_MS` controls the dispatch cadence. Setting it
  very high delays fulfillment; it does not disable registration.

## Rollback

- Stop the POS client writes: the queue keeps everything locally and retries.
- Drain or clear the outbox: `replayDeadLetter` re-queues dead letters; events
  with no subscriber stay `PENDING` and can be archived.
- Revert the server to the previous version. `order_commands`, `outbox`,
  `outbox_receipts`, `order_intake`, `supervisor_grants` and
  `supervisor_credentials` are additive collections and safe to leave in place;
  no destructive migration is required in either direction.
- `rebuildOrderProjection` regenerates any projection from `orders`.
- Reverting `firestore.rules` re-opens the `/payments` read denial and the settled-
  state write paths. Restore only with the POS client held back, or queued
  commands will fail permanently.
- A backup exported at `version: 3` cannot be read by a POS that has reverted to
  `version: 2`. Keep the safety backup the restore itself writes.

## Verification

Run from `manaintibojanam-backend`:

```
npm run test:rules                    # 40 tests, emulator-backed
node --import tsx --test backend-lib/orders/__tests__/*.test.ts   # 149 tests
```

Changed files typecheck clean. The repository's full `npx tsc --noEmit` still
reports pre-existing errors in `server.ts`, `src/sdk/**` and
`backend-lib/marketplace/projectSearch.ts` — none of them in the files listed
below. Do not read a green changed-file check as a green repository.

In `orderbhojan`:

```
node --import tsx --test tests/pos-*.test.ts    # 224 tests
npx tsc --noEmit
```

### What each suite proves

| Suite | Proves |
|---|---|
| `orderCommandProcessor.test.ts` | command validation, versioning, receipts, outbox writes |
| `orderCreateCommand.test.ts` | `CreateOrder` end to end, including concurrency and replay |
| `orderOutboxDispatcher.test.ts` | backoff, dead letters, replay, projection rebuild |
| `orderOutboxRegistration.test.ts` | `order.placed` through the **real** registration path: ordering, duplicate delivery, unverified pricing, and the dispatcher's missing-handler accounting |
| `pricingReview.test.ts` | the hold, approval, rejection, and that payments are untouched by either |
| `supervisorVerification.test.ts` | credential storage, grant binding, single use, expiry, rate limiting, audit completeness |
| `posTenantRoutes.test.ts` | which memberships a POS may bind to |
| `pos-command-planner`, `pos-create-order-command`, `pos-dependency-gating` | planning and same-order ordering |
| `pos-sync-lease`, `pos-offline-queue` | durable fenced lease and recovery |
| `pos-db-migration` | v2 → v4, including the `tenantId` recovery rules |
| `pos-backup-restore` | every restore refusal, the queue merge, and audit/business-day preservation |
| `pos-tenant-session` | the client never binds an unauthorized or invented tenant |
| `pos-hardening` | supervisor credential required for restore and day reopen |

## Completion matrix — Phase A

| # | Requirement | State | Evidence |
|---|---|---|---|
| 1 | Authoritative `CreateOrder` with server pricing | done | `orderCreateCommand.test.ts` (38), `pos-create-order-command.test.ts` (24) |
| 2 | Same-order dependency gating | done | `pos-dependency-gating.test.ts` (9) |
| 3 | Durable fenced lease, ownership per device | done | `pos-sync-lease.test.ts` (37) |
| 4 | Dexie v2 → v4 migration, unsynced rows preserved | done | `pos-db-migration.test.ts` (8) |
| 5 | Authorized POS tenant, no hardcoded id, fail closed | done | `pos-tenant-session.test.ts` (20), `posTenantRoutes.test.ts` (8) |
| 6 | Tenant switching releases the lease before rebinding | done | `PosApp.tsx` bind sequence; asserted via `shutdown()` in the effect cleanup |
| 7 | Supervisor verification: no client role, bound grant, short TTL | done | `supervisorVerification.test.ts` (27) |
| 8 | Rate limit and audit for supervisor attempts | done | same suite; lockout audited, keyed per tenant |
| 9 | Outbox handlers registered at boot, verified, fail loudly | done | `orderOutboxRegistration.test.ts` (13) |
| 10 | `order.placed` delivery, duplicate, backoff, dead letter, replay | done | `orderOutboxDispatcher.test.ts` (19) + registration suite |
| 11 | Rules: reads preserved, settlement/receipts/outbox server-owned | done | `npm run test:rules` (40) |
| 12 | Unverified pricing: hold, authorized approve/reject, audit | done | `pricingReview.test.ts` (13) |
| 13 | Payments and discrepancies untouched by a pricing decision | done | `pricingReview.test.ts`, "payments stay out of the decision" |
| 14 | Guarded restore: schema, tenant, lease, unsynced work | done | `pos-backup-restore.test.ts` (22) |
| 15 | Legacy `CREATE_ORDER` migration without data loss | done | `pos-db-migration.test.ts`; undecodable rows become visible `FAILED` |

## Known gaps

- **Ordering is guaranteed within one order, not across orders.** Two different
  orders may flush concurrently, which is intended. There is no cross-order
  barrier (for example, a cashier-scoped single-writer guarantee for cash
  reconciliation), so a per-drawer invariant is not yet enforced by the queue.
- **The lease is per device, not per user or per tenant.** Two different accounts
  signed in on the same tablet share one lease, so one session can be starved of
  sync until the other stops. That is safe (no duplicate or lost work) but not
  ideal. A tenant switch releases the lease, which narrows but does not close this.
- **Legacy `CREATE_ORDER` rows with no usable line items cannot be recovered
  automatically.** They become visible `FAILED` rows needing operator input; the
  original payload is preserved so nothing is lost, but the cart is not
  reconstructable from what v2 stored.
- **The lifecycle projection is not yet the read path**; `orders` is still read
  directly. Phase B moves reads to the projection with parity checks. Gated by
  `FF_ORDER_LIFECYCLE_PROJECTION_READS`.
- **Outbox subscribers for notifications and tracking are still not registered.**
  They are not on the required list, so boot does not fail for them, but their
  events stay `PENDING` until a subscriber exists.
- **No scheduled report of unverified prices.** The flag, the hold, the review
  queue and the audit trail all exist; nothing yet emails a manager a daily list.
  Until it does, reviews are surfaced only through
  `GET …/pricing-reviews`.
- **Residual fail-closed evaluation errors** remain in the `customers`,
  `subscriptions` and `referrals` rules blocks. They deny rather than grant, and
  are out of Phase A scope, but they should be fixed before those collections are
  relied on.
- **Supervisor rate-limit counters are in memory**, so a process restart clears
  them. The durable guard is the scrypt cost plus the audit trail; a per-tenant
  lockout in Firestore would survive restarts and is not implemented.
- Live realtime tracking is not yet authenticated or tenant-scoped end to end.
- The full repository typecheck is not clean. `server.ts`, `src/sdk/**` and
  `backend-lib/marketplace/projectSearch.ts` carry pre-existing errors unrelated to
  Phase A; changed files are clean.