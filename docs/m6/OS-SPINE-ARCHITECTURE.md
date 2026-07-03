# BhojanOS OS Spine Architecture

**Program:** BHOS-OS-SPINE-ARCHITECTURE  
**Date:** 2026-06-26  
**Status:** Architecture blueprint — no implementation  
**Authority:** Distinguished Engineer / Platform Architecture  
**Preserves:** M1–M5 frozen SDKs (Order, Location, Reference, Discovery, Search, Branch read/intelligence)

---

## Executive Summary

M1–M5 delivered **read/intelligence platforms** behind facades. The **operating system backbone** — events, commands, catalog, identity, money-adjacent config, notifications, audit, workflow, external APIs — does not exist yet.

The OS Spine introduces **15 horizontal platforms** that sit **alongside** (not inside) frozen SDKs. Frozen read SDKs become **consumers of projections** and **emitters/subscribers of events**, never replaced.

**Core principle:**

```
Commands → Domain → Events → Projections → Queries (frozen read SDKs + new read APIs)
```

**External world:** API Gateway → Commands/Queries only — never internal SDKs.

---

## Spine Layer Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Presentation · Partner Apps · POS · Aggregators · AI Agents            │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│  API Gateway Platform · AI Tool Gateway · Plugin Runtime                │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ Command Bus     │    │ Query / Read API    │    │ Webhooks / Streams  │
│ (Order, Menu,   │    │ (projections +      │    │ (Partner, Notify)   │
│  Inventory, …)  │    │  frozen read SDKs)  │    │                     │
└────────┬────────┘    └──────────┬──────────┘    └──────────┬──────────┘
         │                        │                            │
         ▼                        ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Domain Platforms (Menu, Order Command, Inventory, Pricing, Identity,   │
│  Workflow, Configuration, Audit)                                        │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Event Platform (bus + schema registry + outbox)                        │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ OLTP Adapters   │    │ Projection Writers  │    │ Analytics / Warehouse│
│ (Firestore v1)  │    │ (read models)       │    │ (future)             │
└─────────────────┘    └─────────────────────┘    └─────────────────────┘
```

**Frozen M1–M5 SDKs:** Remain public. Internally, adapters gradually read **projections** instead of raw Firestore where spine provides read models. **No signature changes** without major version + ADR.

---

# Platform Specifications

---

## 1. Event Platform

### Mission
Durable nervous system for BhojanOS — every state change that matters is an immutable, versioned event.

### Responsibilities
- Event schema registry and versioning
- Publish/subscribe bus abstraction
- Outbox pattern for reliable emit-after-write
- Dead-letter and replay tooling
- Correlation/causation ID standards
- Consumer idempotency contract

### Bounded Context
**Event metadata only.** Does not own business aggregates. Owns envelope, routing, retention policy, subscription contracts.

### Public SDK
`EventSDK` (new — spine)

| API | Purpose |
|-----|---------|
| `publish(event)` | Emit envelope |
| `subscribe(filter, handler)` | Consumer registration |
| `registerSchema(type, version, schema)` | Registry |
| `replay(from, filter)` | Admin/rebuild |

### Domain Model
- `DomainEvent` (envelope): `eventId`, `type`, `version`, `aggregateType`, `aggregateId`, `tenantId`, `occurredAt`, `correlationId`, `causationId`, `payload`, `metadata`
- `EventSchema` (registry entry)
- `Subscription` (consumer group, filter, DLQ policy)

### Repository Model
- **Event Store Port** (append-only log per partition)
- **Outbox Port** (transactional outbox table/collection)
- **Schema Registry Port**
- v1 adapter: Firestore outbox + Pub/Sub (or Cloud Tasks) — **architecture only; no migration ADR yet**

### Event Contracts
All platforms publish via envelope. Payload schemas owned by originating platform (see Event Catalog).

### Read Models
- Consumer offset ledger
- DLQ index
- Replay audit index

### Write Models
- Append-only event log
- Outbox queue

### Commands
`PublishEvent`, `RegisterSchema`, `ReplayEvents`, `PurgeDLQ` (admin)

### Queries
`GetEvent`, `ListEventsByAggregate`, `GetSchema`, `ListSubscriptions`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_EVENT_PLATFORM_ENABLED` | OFF |
| `FF_EVENT_OUTBOX_ENABLED` | OFF |
| `FF_EVENT_PUBLISH_ENABLED` | OFF |

### ADRs Required
- **ADR-018:** Event Platform architecture
- **ADR-019:** Event schema versioning policy
- **ADR-020:** Outbox + delivery guarantees (at-least-once)

### Dependencies
None (spine root)

### Consumers
Every other spine platform; projection workers; Analytics; Audit; Notifications; Workflow

### Rollback Strategy
`FF_EVENT_*` OFF → synchronous legacy paths; events dropped (dev only). Production: consumers flag-off individually.

### Production Rollout
1. Schema registry + envelope types only  
2. Outbox on Order Command writes (shadow publish)  
3. Enable consumers read-only (audit, analytics shadow)  
4. Enable publish on menu/inventory commands  

---

## 2. Order Command Platform

### Mission
Own **order lifecycle writes** — placement, mutation, cancellation, payment gating — as commands with idempotency and saga orchestration.

### Responsibilities
- Place order command
- Cancel / amend (pre-kitchen-accept)
- Idempotency keys
- Checkout saga orchestration (payment + branch assignment + inventory hold)
- Emit order domain events
- **Does not replace OrderSDK read API (frozen v1.0)**

### Bounded Context
Order **write** aggregate: draft → placed → accepted → … — separate from Order Read Platform.

### Public SDK
`OrderCommandSDK` (new)

| API | Purpose |
|-----|---------|
| `placeOrder(cmd)` | Idempotent place |
| `cancelOrder(cmd)` | Cancel with policy |
| `amendOrder(cmd)` | Pre-accept amendments |
| `confirmPayment(cmd)` | Server-side payment gate hook |

### Domain Model
- `Order` (write aggregate)
- `OrderLine`
- `OrderStatus` (FSM)
- `PaymentGate` (reference to Payments platform)
- `FulfillmentRef` (branchId from BranchSDK snapshot — **no selection here**)
- `IdempotencyRecord`

### Repository Model
- `OrderCommandRepository` (write aggregate persistence)
- `IdempotencyRepository`
- `SagaStateRepository`
- v1: Firestore orders collection (existing) via adapter — dual-write then cutover

### Event Contracts
`order.draft.created`, `order.placed`, `order.payment.pending`, `order.payment.confirmed`, `order.accepted`, `order.cancelled`, `order.branch.assigned` (from checkout snapshot)

### Read Models
**Consumed by frozen OrderSDK** via projection adapter (future): `OrderReadModel` projection worker updates read store.

### Write Models
Order aggregate document(s); saga state; outbox entries

### Commands
`PlaceOrder`, `CancelOrder`, `AmendOrder`, `AttachPaymentProof`, `AssignBranchFromCheckoutSnapshot`

### Queries
`GetOrderWriteState` (internal), `GetIdempotencyStatus` — **public reads stay OrderSDK**

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_ORDER_COMMAND_ENABLED` | OFF |
| `FF_ORDER_CHECKOUT_SAGA_ENABLED` | OFF |
| `FF_ORDER_COMMAND_IDEMPOTENCY_ENABLED` | OFF |

### ADRs Required
- **ADR-021:** Order Command vs Order Read separation
- **ADR-022:** Checkout saga (payment + branch + inventory)
- **ADR-023:** Order FSM canonical states

### Dependencies
Event Platform, Identity, Menu (validation), Inventory (hold), Pricing (snapshot), Branch (checkout snapshot only), Payments (server), Configuration

### Consumers
Checkout, Owner kitchen board (via events), Notifications, Workflow, Analytics, frozen OrderSDK (read projection)

### Rollback Strategy
Flag OFF → legacy `api.ts` order create path. Saga OFF → sequential legacy. Idempotency OFF → legacy (risk documented).

### Production Rollout
1. Shadow idempotency on legacy path  
2. Command path dry-run (validate only)  
3. 1% place order via command  
4. Saga enable with branch snapshot from CheckoutBranchFacade  
5. Retire legacy create after 30d soak  

---

## 3. Menu & Catalog Platform

### Mission
**Kernel of the restaurant OS** — what can be sold, with variants, modifiers, schedules, and branch overrides.

### Responsibilities
- Brand-level catalog
- Branch overrides (availability, price refs, prep time)
- Categories, items, variants, modifier groups
- Menu schedules (breakfast/lunch)
- Catalog validation for cart/checkout
- Emit menu change events

### Bounded Context
Sellable catalog — not inventory counts, not final price (Pricing), not order lines.

### Public SDK
`MenuSDK` (new)

| API | Purpose |
|-----|---------|
| `getMenu(query)` | Branch-effective menu |
| `getItem(itemId)` | Item detail |
| `validateCart(items)` | Structural validation |
| `publishMenuChange(cmd)` | Owner write |

### Domain Model
- `Catalog` (brand root)
- `MenuCategory`, `MenuItem`, `Variant`, `ModifierGroup`, `Modifier`
- `BranchMenuOverride`
- `MenuSchedule`
- `CatalogVersion`

### Repository Model
- `MenuRepository` (catalog tree)
- `BranchOverrideRepository`
- `CatalogVersionRepository`
- v1: Firestore `tenants/{id}/menu` migration from embedded menu

### Event Contracts
`menu.item.created`, `menu.item.updated`, `menu.item.86d`, `menu.override.applied`, `menu.version.published`

### Read Models
- `BranchMenuProjection` (effective menu for branch)
- `MarketplaceMenuSummaryProjection` (for Discovery/Search enrichment — **read only, no ranking**)

### Write Models
Catalog documents; version pointers; outbox

### Commands
`CreateItem`, `UpdateItem`, `ArchiveItem`, `SetBranchOverride`, `PublishCatalogVersion`, `ScheduleMenu`

### Queries
`GetEffectiveMenu`, `GetItem`, `ListCategories`, `ValidateCartStructure`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_MENU_PLATFORM_ENABLED` | OFF |
| `FF_MENU_BRANCH_OVERRIDE_ENABLED` | OFF |
| `FF_MENU_WRITE_ENABLED` | OFF |

### ADRs Required
- **ADR-024:** Menu & Catalog platform
- **ADR-025:** Branch override model
- **ADR-026:** Menu migration from tenant blob

### Dependencies
Event Platform, Identity, Configuration, Audit

### Consumers
Order Command, Inventory, Pricing, Search/Discovery (enrichment projections), Owner UI, Partner API, AI Tool Gateway

### Rollback Strategy
Flag OFF → legacy menu in tenant doc. Overrides OFF → brand-only menu.

### Production Rollout
1. Read projection mirrors legacy menu  
2. Owner read via MenuSDK projection  
3. Write behind flag on staging  
4. Checkout validates via MenuSDK  
5. Deprecate tenant embedded menu  

---

## 4. Inventory Platform

### Mission
Track **what can be fulfilled now** — stock, 86ing, capacity-linked depletion, holds during checkout.

### Responsibilities
- Stock levels (optional per item)
- Auto-86 / restore
- Checkout **hold** and **release**
- Branch-scoped inventory
- Emit availability events

### Bounded Context
Quantity and availability — not catalog structure (Menu), not price.

### Public SDK
`InventorySDK` (new)

| API | Purpose |
|-----|---------|
| `checkAvailability(query)` | Can fulfill? |
| `reserveHold(cmd)` | Checkout hold |
| `releaseHold(cmd)` | Timeout/cancel |
| `adjustStock(cmd)` | Owner/kitchen |

### Domain Model
- `StockItem`, `StockLevel`, `Hold`, `HoldPolicy`, `DepletionRule`

### Repository Model
- `InventoryRepository`
- `HoldRepository`
- v1: Firestore branch inventory subcollection (aligns with M5 ops design)

### Event Contracts
`inventory.stock.adjusted`, `inventory.item.86d`, `inventory.hold.created`, `inventory.hold.released`, `inventory.hold.expired`

### Read Models
`BranchAvailabilityProjection` (feeds Branch Operations SDK projection adapter — **no change to BranchSDK contract**)

### Write Models
Stock records; active holds

### Commands
`AdjustStock`, `CreateHold`, `ReleaseHold`, `Mark86`, `RestoreItem`

### Queries
`GetAvailability`, `GetActiveHolds`, `GetStockLevel`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_INVENTORY_PLATFORM_ENABLED` | OFF |
| `FF_INVENTORY_HOLD_ENABLED` | OFF |
| `FF_INVENTORY_AUTO_86_ENABLED` | OFF |

### ADRs Required
- **ADR-027:** Inventory platform
- **ADR-028:** Checkout hold semantics

### Dependencies
Event Platform, Menu (item IDs), Order Command, Branch (branch scope)

### Consumers
Order Command saga, Branch ops projections, Owner UI, Notifications

### Rollback Strategy
Holds OFF → checkout without reservation (legacy oversell risk). Platform OFF → menu `isAvailable` only.

### Production Rollout
After Menu platform read path live. Holds enabled in staging checkout saga before prod.

---

## 5. Pricing Platform

### Mission
Compute **what it costs** — base prices, branch overrides, taxes, fees, rounding — as snapshots at order time.

### Responsibilities
- Price lists per brand/branch/channel
- Tax rules (India GST hooks)
- Fee rules (delivery, packaging)
- **Price snapshot** for order line immutability
- No payment capture (Payments platform)

### Bounded Context
Monetary calculation rules — not payment rails.

### Public SDK
`PricingSDK` (new)

| API | Purpose |
|-----|---------|
| `quoteCart(query)` | Line totals + tax |
| `snapshotPrices(cmd)` | Freeze for order |
| `managePriceList(cmd)` | Owner write |

### Domain Model
- `PriceList`, `PriceRule`, `TaxRule`, `FeeRule`, `PriceSnapshot`, `RoundingPolicy`

### Repository Model
- `PricingRepository`
- `SnapshotRepository`

### Event Contracts
`pricing.list.updated`, `pricing.snapshot.created`, `pricing.tax.rule.changed`

### Read Models
`BranchPriceListProjection`, `CartQuoteProjection`

### Write Models
Price lists; immutable snapshots

### Commands
`UpdatePriceList`, `SetBranchPriceOverride`, `CreatePriceSnapshot`, `UpdateTaxRule`

### Queries
`QuoteCart`, `GetPriceList`, `GetSnapshot`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_PRICING_PLATFORM_ENABLED` | OFF |
| `FF_PRICING_TAX_ENGINE_ENABLED` | OFF |
| `FF_PRICING_BRANCH_OVERRIDE_ENABLED` | OFF |

### ADRs Required
- **ADR-029:** Pricing platform
- **ADR-030:** Tax engine India v1
- **ADR-031:** Converge legacy delivery fee engines

### Dependencies
Menu, Configuration, Event Platform, Identity, Audit

### Consumers
Order Command, Checkout, Partner API, Analytics, AI Tool Gateway (read quotes only)

### Rollback Strategy
OFF → legacy tenant fee fields. Tax OFF → simplified GST from tenant config.

### Production Rollout
After Menu. Parallel quote comparison with legacy in shadow mode.

---

## 6. Identity & Organization Platform

### Mission
**Who can do what** across org → brand → branch → channel — enterprise-ready authorization.

### Responsibilities
- Organization hierarchy
- Users, roles, permissions (RBAC)
- Service identities (API keys, partner apps)
- Session context for all command/query SDKs
- SCIM/SSO hooks (future)

### Bounded Context
Identity and authorization — not customer auth UI (Firebase remains IdP adapter).

### Public SDK
`IdentitySDK` (new)

| API | Purpose |
|-----|---------|
| `resolveContext(token)` | AuthN → context |
| `authorize(ctx, action, resource)` | AuthZ |
| `manageRole(cmd)` | Admin |

### Domain Model
- `Organization`, `Brand`, `Branch`, `User`, `Role`, `Permission`, `ServiceAccount`, `AccessContext`

### Repository Model
- `IdentityRepository`
- `RoleBindingRepository`

### Event Contracts
`identity.user.invited`, `identity.role.granted`, `identity.role.revoked`, `identity.serviceaccount.created`

### Read Models
`UserPermissionsProjection`, `OrgHierarchyProjection`

### Write Models
Role bindings; org graph

### Commands
`InviteUser`, `GrantRole`, `RevokeRole`, `CreateServiceAccount`, `LinkSSOProvider`

### Queries
`Authorize`, `ListUsers`, `GetOrgHierarchy`, `GetEffectivePermissions`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_IDENTITY_PLATFORM_ENABLED` | OFF |
| `FF_IDENTITY_RBAC_ENABLED` | OFF |
| `FF_IDENTITY_SSO_ENABLED` | OFF |

### ADRs Required
- **ADR-032:** Identity & Organization platform
- **ADR-033:** RBAC model (org/brand/branch)
- **ADR-034:** Service account model for partners

### Dependencies
Event Platform, Audit, Configuration

### Consumers
**Every** command platform, API Gateway, Owner UI, Partner Platform, AI Tool Gateway

### Rollback Strategy
OFF → Firebase Auth + implicit owner. RBAC OFF → all owners full access (legacy).

### Production Rollout
**Parallel with Event + Menu.** Required before enterprise pilot. Shadow authorize logging before enforce.

---

## 7. Notification Platform

### Mission
Deliver **messages** — SMS, WhatsApp, push, email — driven by events, not inline calls.

### Responsibilities
- Template management
- Channel routing (India: WhatsApp priority)
- Delivery tracking
- Retry/DLQ
- User preference/consent

### Bounded Context
Notification delivery — not event bus, not workflow decisions.

### Public SDK
`NotificationSDK` (new)

| API | Purpose |
|-----|---------|
| `send(cmd)` | Explicit send (rare) |
| `registerTemplate(cmd)` | Admin |
| `getDeliveryStatus(id)` | Query |

Primary path: **event consumers** call NotificationSDK internally.

### Domain Model
- `Notification`, `Template`, `Channel`, `DeliveryAttempt`, `Consent`

### Repository Model
- `NotificationRepository`
- `TemplateRepository`

### Event Contracts (consumes)
`order.placed`, `order.ready`, `inventory.item.86d`, `workflow.approval.required`, …

### Event Contracts (emits)
`notification.sent`, `notification.failed`, `notification.delivered`

### Read Models
`DeliveryLogProjection`, `OwnerAlertFeedProjection`

### Write Models
Notification jobs; delivery attempts

### Commands
`SendNotification`, `RegisterTemplate`, `UpdateConsent`

### Queries
`GetDeliveryStatus`, `ListTemplates`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_NOTIFICATION_PLATFORM_ENABLED` | OFF |
| `FF_NOTIFICATION_WHATSAPP_ENABLED` | OFF |
| `FF_NOTIFICATION_SMS_ENABLED` | OFF |

### ADRs Required
- **ADR-035:** Notification platform
- **ADR-036:** India channel priority (WhatsApp/SMS)

### Dependencies
Event Platform, Identity, Configuration, Audit

### Consumers
Order Command events, Workflow, Owner UI, Customer order tracking

### Rollback Strategy
OFF → legacy inline SMS/WhatsApp in server routes (deprecate gradually).

### Production Rollout
After Event Platform. Start with `order.placed` consumer shadow mode.

---

## 8. Configuration Platform

### Mission
**Typed, scoped configuration** — replace tenant god-document settings.

### Responsibilities
- Key-value and structured config per org/brand/branch
- Feature flag overrides (ops-level, not dev localStorage)
- Environment-scoped config
- Config change audit trail

### Bounded Context
Configuration values — not business aggregates.

### Public SDK
`ConfigurationSDK` (new)

| API | Purpose |
|-----|---------|
| `getConfig(scope, key)` | Read |
| `setConfig(cmd)` | Write (authorized) |

### Domain Model
- `ConfigScope` (org|brand|branch|env)
- `ConfigEntry`, `ConfigSchema`, `ConfigRevision`

### Repository Model
- `ConfigurationRepository`

### Event Contracts
`config.updated`, `config.revision.rolledback`

### Read Models
`EffectiveConfigProjection` (cached per scope)

### Write Models
Config entries with revision history

### Commands
`SetConfig`, `RollbackConfig`, `ImportConfig`

### Queries
`GetEffectiveConfig`, `ListRevisions`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_CONFIG_PLATFORM_ENABLED` | OFF |

### ADRs Required
- **ADR-037:** Configuration platform
- **ADR-038:** Tenant document decomposition plan

### Dependencies
Identity, Event Platform, Audit

### Consumers
All platforms; frozen SDK adapters (feature flag readers migrate to ConfigurationSDK)

### Rollback Strategy
OFF → tenant document fields (legacy).

### Production Rollout
Extract non-menu settings first (delivery radii, prep times). Menu/pricing migrate to their platforms.

---

## 9. Audit Platform

### Mission
**Immutable record** of who did what, when — compliance, support, AI accountability.

### Responsibilities
- Append-only audit log
- Subscribe to all domain events + explicit audit commands
- Tamper-evident storage policy
- Export for enterprise

### Bounded Context
Audit trail — not operational event bus.

### Public SDK
`AuditSDK` (new)

| API | Purpose |
|-----|---------|
| `record(entry)` | Explicit audit |
| `query(filter)` | Enterprise export |

Event consumer: auto-record from envelope metadata.

### Domain Model
- `AuditEntry`: actor, action, resource, before/after refs, correlationId, timestamp

### Repository Model
- `AuditRepository` (append-only, WORM policy)

### Event Contracts (consumes)
All domain events (filtered)

### Event Contracts (emits)
`audit.recorded` (meta)

### Read Models
`AuditQueryIndex` (by tenant, actor, resource, time)

### Write Models
Append-only audit log

### Commands
`RecordAudit`, `ExportAudit` (admin)

### Queries
`QueryAudit`, `GetAuditEntry`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_AUDIT_PLATFORM_ENABLED` | OFF |

### ADRs Required
- **ADR-039:** Audit platform
- **ADR-040:** Retention and GDPR erasure policy

### Dependencies
Event Platform, Identity

### Consumers
Enterprise compliance, Support tooling, AI Tool Gateway (action trace)

### Rollback Strategy
OFF → no audit (document risk). Never delete audit store on rollback.

### Production Rollout
Enable consumer in shadow before enforce. Required before enterprise SSO deals.

---

## 10. Workflow Platform

### Mission
**Long-running processes** — approvals, catering quotes, refunds, franchise change requests.

### Responsibilities
- Workflow definitions
- State machines with human tasks
- Timers and escalations
- Compensation hooks

### Bounded Context
Process orchestration — not core order FSM (Order Command).

### Public SDK
`WorkflowSDK` (new)

| API | Purpose |
|-----|---------|
| `startWorkflow(cmd)` | Begin |
| `signal(cmd)` | Human/system signal |
| `getInstance(id)` | Status |

### Domain Model
- `WorkflowDefinition`, `WorkflowInstance`, `Task`, `Timer`, `CompensationAction`

### Repository Model
- `WorkflowRepository`

### Event Contracts (consumes/emits)
`workflow.started`, `workflow.task.created`, `workflow.completed`, `workflow.failed`

### Read Models
`OwnerTaskInboxProjection`

### Write Models
Workflow instances

### Commands
`StartWorkflow`, `CompleteTask`, `CancelWorkflow`, `SignalTimer`

### Queries
`GetInstance`, `ListPendingTasks`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_WORKFLOW_PLATFORM_ENABLED` | OFF |

### ADRs Required
- **ADR-041:** Workflow platform (Temporal-style vs lightweight)

### Dependencies
Event Platform, Identity, Notification, Audit

### Consumers
Enterprise catering, Refund disputes, Franchise onboarding, Promotion approvals

### Rollback Strategy
OFF → manual ops in admin panels.

### Production Rollout
Year 2+. After Notification + Identity. One workflow type pilot (catering quote).

---

## 11. API Gateway Platform

### Mission
**Single external boundary** — partners, mobile, public developers, AI agents.

### Responsibilities
- OAuth2/OIDC for partners
- API keys + service accounts
- Rate limiting, quotas
- Request validation
- Versioned REST/GraphQL (architecture: REST v1)
- Webhook registration and signing

### Bounded Context
Edge API — maps HTTP → Commands/Queries, never internal SDKs directly in handlers.

### Public SDK
N/A — **this is the public surface.** Internal: `GatewayRouter` maps to Command/Query buses.

### Domain Model
- `ApiConsumer`, `OAuthClient`, `RateLimitPolicy`, `WebhookSubscription`, `ApiVersion`

### Repository Model
- `GatewayConsumerRepository`
- `WebhookRepository`

### Event Contracts
`api.request.received`, `api.rate.limited`, `webhook.delivered`

### Read Models
API usage metrics projection

### Write Models
Consumer registrations; webhook configs

### Commands
`RegisterClient`, `RotateSecret`, `RegisterWebhook`

### Queries
`GetUsage`, `ListWebhooks`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_API_GATEWAY_ENABLED` | OFF |
| `FF_API_PUBLIC_V1_ENABLED` | OFF |

### ADRs Required
- **ADR-042:** API Gateway platform
- **ADR-043:** Public API versioning policy
- **ADR-044:** Webhook signing standard

### Dependencies
Identity, Audit, all Command/Query platforms (routing)

### Consumers
Partners, Aggregators, Mobile apps, AI Tool Gateway, Marketplace externals

### Rollback Strategy
OFF → no external API (internal app only).

### Production Rollout
After Identity + Order Command + Menu read APIs stable. Partner sandbox first.

---

## 12. Partner Integration Platform

### Mission
**Inbound/outbound integrations** — Swiggy/Zomato-style aggregators, POS, accounting, riders.

### Responsibilities
- Connector framework
- Order/menu sync protocols
- Idempotent ingress mapping
- Outbound status sync
- Partner-specific adapters (plugin-hosted)

### Bounded Context
Integration logic — not core domain rules.

### Public SDK
`PartnerSDK` (new — internal; partners use API Gateway)

| API | Purpose |
|-----|---------|
| `registerConnector(cmd)` | Admin |
| `ingressOrder(cmd)` | Mapped place order |
| `syncMenu(cmd)` | Push/pull menu |

### Domain Model
- `Partner`, `Connector`, `MappingRule`, `IngressOrder`, `SyncJob`

### Repository Model
- `PartnerRepository`
- `SyncStateRepository`

### Event Contracts
`partner.order.received`, `partner.menu.synced`, `partner.status.pushed`

### Read Models
`PartnerSyncStatusProjection`

### Write Models
Partner configs; sync cursors

### Commands
`RegisterPartner`, `MapIngressOrder`, `PushStatus`, `SyncMenu`

### Queries
`GetSyncStatus`, `ListPartners`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_PARTNER_PLATFORM_ENABLED` | OFF |
| `FF_PARTNER_AGGREGATOR_INGRESS_ENABLED` | OFF |

### ADRs Required
- **ADR-045:** Partner Integration platform
- **ADR-046:** Aggregator ingress India v1

### Dependencies
API Gateway, Order Command, Menu, Inventory, Identity, Event Platform

### Consumers
Aggregator orders, POS systems, Accounting exports

### Rollback Strategy
Per-partner connector flag OFF.

### Production Rollout
One aggregator pilot after Order Command + Menu + Gateway live.

---

## 13. Analytics Platform

### Mission
**OLAP brain** — metrics, dashboards, ML features — fed by events, not Firestore scans.

### Responsibilities
- Event → warehouse pipeline
- Metric definitions
- Tenant/brand/branch dashboards
- Feature store export for ranking/assignment injectors

### Bounded Context
Analytics and metrics — not operational truth.

### Public SDK
`AnalyticsSDK` (new)

| API | Purpose |
|-----|---------|
| `queryMetric(query)` | Read metrics |
| `track(event)` | Explicit track (prefer event bus) |

### Domain Model
- `MetricDefinition`, `Dimension`, `Report`, `FeatureVector`

### Repository Model
- **Warehouse Port** (BigQuery/Snowflake — future)
- **Metric Cache Port**

### Event Contracts (consumes)
All business events (stream)

### Event Contracts (emits)
`analytics.report.generated`

### Read Models
Materialized aggregates in warehouse

### Write Models
None operational — append to warehouse

### Commands
`DefineMetric`, `RefreshReport` (admin)

### Queries
`QueryMetric`, `GetDashboard`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_ANALYTICS_PLATFORM_ENABLED` | OFF |

### ADRs Required
- **ADR-047:** Analytics platform
- **ADR-048:** Warehouse selection

### Dependencies
Event Platform (required)

### Consumers
Owner dashboard, Discovery ranking injectors (future ML), Executive reporting

### Rollback Strategy
OFF → legacy ad hoc Firestore queries (limited).

### Production Rollout
After Event Platform shadow stream stable. Year 2 primary.

---

## 14. AI Tool Gateway

### Mission
**Safe agent surface** — AI never touches Firestore or internal facades directly.

### Responsibilities
- Tool schema registry (MCP-compatible)
- Capability-scoped tokens
- Policy engine (allow/deny/approve)
- Idempotent command proxy
- Full audit trail

### Bounded Context
AI access layer — not ML models.

### Public SDK
`AIToolGatewaySDK` (new — external agents)

| Tool examples | Maps to |
|---------------|---------|
| `get_menu_summary` | MenuSDK query |
| `quote_cart` | PricingSDK query |
| `suggest_86` | Inventory command (approval required) |
| `get_order_status` | OrderSDK read |

### Domain Model
- `ToolDefinition`, `CapabilityToken`, `PolicyRule`, `ApprovalRequest`, `AgentSession`

### Repository Model
- `ToolRegistryRepository`
- `ApprovalRepository`

### Event Contracts
`ai.tool.invoked`, `ai.approval.requested`, `ai.action.executed`

### Read Models
`AgentSessionProjection`

### Write Models
Approval queue; tool invocations log

### Commands
`InvokeTool`, `RequestApproval`, `ApproveAction`

### Queries
`ListTools`, `GetApprovalStatus`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_AI_TOOL_GATEWAY_ENABLED` | OFF |
| `FF_AI_AUTO_EXECUTE_ENABLED` | OFF |

### ADRs Required
- **ADR-049:** AI Tool Gateway
- **ADR-050:** Human-in-the-loop policy

### Dependencies
API Gateway, Identity, Audit, Menu, Pricing, Inventory, Order read SDK

### Consumers
Owner copilot, Support automation, Internal ops agents

### Rollback Strategy
OFF → no AI tools. Auto-execute OFF → suggest-only mode.

### Production Rollout
After Audit + Identity + read-only tools. Writes require approval workflow Year 2+.

---

## 15. Plugin / Extension Platform

### Mission
**Third-party extensibility** — Shopify-style apps for POS, accounting, loyalty.

### Responsibilities
- Sandbox runtime
- Permission scopes
- App lifecycle (install, upgrade, revoke)
- Webhook + API access via Gateway

### Bounded Context
Extension hosting — not core domain.

### Public SDK
`PluginSDK` (new — for app developers)

| API | Purpose |
|-----|---------|
| `installApp(cmd)` | Tenant installs |
| `invokeHook(hook, payload)` | Core → plugin |

### Domain Model
- `App`, `Installation`, `Scope`, `HookSubscription`, `SandboxPolicy`

### Repository Model
- `AppRegistryRepository`
- `InstallationRepository`

### Event Contracts
`plugin.installed`, `plugin.invoked`, `plugin.revoked`

### Read Models
`InstalledAppsProjection`

### Write Models
Installations; app manifests

### Commands
`InstallApp`, `RevokeApp`, `PublishApp` (marketplace)

### Queries
`ListInstalledApps`, `GetAppManifest`

### Feature Flags
| Flag | Default |
|------|---------|
| `FF_PLUGIN_PLATFORM_ENABLED` | OFF |

### ADRs Required
- **ADR-051:** Plugin platform
- **ADR-052:** Sandbox security model

### Dependencies
API Gateway, Identity, Audit, Event Platform

### Consumers
POS vendors, Accounting, Loyalty apps, Custom franchise tools

### Rollback Strategy
Per-app kill switch. Platform OFF → no third-party apps.

### Production Rollout
Year 3+. After Public API v1 stable. Internal plugins first (POS sync).

---

# Aggregate Architecture Artifacts

---

## 1. Platform Dependency Graph

```
                    [Event Platform]
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   [Identity]        [Configuration]      [Audit]
        │                  │                  │
        └────────┬─────────┴─────────┬────────┘
                 │                   │
            [Menu & Catalog]    [Notification]
                 │
         ┌───────┼───────┐
         │       │       │
   [Inventory] [Pricing] │
         │       │       │
         └───────┼───────┘
                 │
         [Order Command] ←── [BranchSDK snapshot] (frozen, checkout)
                 │
    ┌────────────┼────────────┐
    │            │            │
[Workflow]  [Partner]    [Analytics]
    │            │
    └────────────┼────────────────────┐
                 │                    │
          [API Gateway]          [AI Tool Gateway]
                 │
          [Plugin Platform]

Frozen read/intelligence (unchanged, consume projections):
  OrderSDK · DiscoverySDK · SearchSDK · BranchSDK · LocationSDK · ReferenceSDK
```

**Rule:** Nothing depends on Presentation. Spine platforms depend down toward Event + Identity.

---

## 2. Event Flow (cross-platform)

```
Customer checkout
  → OrderCommand.PlaceOrder
  → emits order.placed
      → Notification (customer SMS/WhatsApp)
      → Analytics (warehouse)
      → Audit (record)
      → Partner (status push if aggregator order)
      → Workflow (if catering approval needed)

Owner 86s item
  → Inventory.Mark86
  → emits inventory.item.86d
      → Menu projection update (effective menu)
      → Branch ops projection (availability)
      → Notification (kitchen alert)
      → Search/Discovery projection refresh (async)

Menu publish
  → Menu.PublishCatalogVersion
  → emits menu.version.published
      → Partner sync job
      → Search/Discovery enrichment rebuild
      → Pricing recalc invalidation
```

---

## 3. Command Flow

```
HTTP/Partner/Owner UI
  → API Gateway (auth via IdentitySDK)
  → Command Bus (idempotency key)
  → Domain handler (Menu | Order | Inventory | …)
  → OLTP write + Outbox
  → Event Platform publish
  → Projection workers (async)
  → Frozen read SDKs serve updated read models
```

**Checkout saga (Order Command orchestrator):**
1. Validate cart (MenuSDK)  
2. Quote (PricingSDK)  
3. Reserve hold (InventorySDK)  
4. Assign branch (CheckoutBranchFacade → **frozen** BranchSDK) — snapshot only  
5. Payment gate (Payments — server, future Payments Platform)  
6. Place order (Order Command)  
7. Emit events  

---

## 4. Read Flow

```
UI / Partner / Agent
  → API Gateway OR internal Facade (legacy during migration)
  → Query Bus OR frozen read SDK
  → Read Model / Projection store
  → (never raw OLTP scan at scale)
```

**Frozen SDK path:** OrderSDK.getOrderById → OrderReadProjection (adapter swaps source, contract unchanged).

**M1–M5 intelligence path:** DiscoverySDK / SearchSDK / BranchSDK continue; enrichment projections fed by Menu/Location/GeoIndex workers.

---

## 5. Write Flow

```
Authorized actor (IdentitySDK)
  → Command + idempotency key
  → Domain validation
  → Single aggregate write (OLTP)
  → Outbox row
  → Transaction commit
  → Outbox relay → Event Platform
  → Consumers (async, at-least-once, idempotent)
```

**No dual writes without outbox.** Legacy path retired per domain.

---

## 6. Ownership Matrix

| Platform | Owning team | On-call | Review gate |
|----------|-------------|---------|-------------|
| Event Platform | Platform Core | P0 | ARB |
| Order Command | Orders | P0 | ARB + Order ADR |
| Menu & Catalog | Catalog | P0 | ARB |
| Inventory | Fulfillment | P1 | Domain lead |
| Pricing | Commerce | P1 | Finance + ARB |
| Identity | Platform Security | P0 | Security + ARB |
| Notification | Platform Core | P1 | Ops |
| Configuration | Platform Core | P2 | Platform lead |
| Audit | Platform Security | P1 | Compliance |
| Workflow | Enterprise | P2 | Enterprise lead |
| API Gateway | Platform Core | P0 | Security |
| Partner Integration | Integrations | P1 | Biz dev + Eng |
| Analytics | Data | P2 | Data lead |
| AI Tool Gateway | Platform AI | P1 | Security + ARB |
| Plugin Platform | Ecosystem | P2 | Security |
| M1–M5 frozen SDKs | Respective platform teams | P1 | No change without major ADR |

---

## 7. Bounded Context Map

| Context | Upstream | Downstream | Anti-corruption layer |
|---------|----------|------------|------------------------|
| Menu | Identity, Config | Order, Inventory, Pricing, Search enrich | MenuSDK |
| Order Command | Menu, Pricing, Inventory, Branch snapshot | Notification, Partner, OrderSDK read | OrderCommandSDK / projection adapter |
| Inventory | Menu, Order Command | Branch ops projection | InventorySDK |
| Pricing | Menu, Config | Order Command | PricingSDK |
| Identity | — | All commands | IdentitySDK |
| Event | All writers | All consumers | Event envelope |
| Discovery (frozen) | Location, Menu projection | Search | DiscoverySDK — **no branch scoring** |
| Search (frozen) | Discovery, Menu projection | Marketplace UI | SearchSDK |
| Branch (frozen) | Location, Inventory projection | Checkout snapshot | BranchSDK — **only selector** |
| Order Read (frozen) | Order Command events | UI | OrderSDK v1.0 |

---

## 8. Event Catalog (v1 spine)

| Event type | Producer | Key consumers |
|------------|----------|---------------|
| `order.placed` | Order Command | Notification, Analytics, Audit, Partner |
| `order.accepted` | Order Command | Notification, Partner |
| `order.cancelled` | Order Command | Inventory (release hold), Partner |
| `order.payment.confirmed` | Order Command | Notification, Workflow |
| `menu.version.published` | Menu | Search, Discovery, Partner, Pricing |
| `menu.item.86d` | Menu/Inventory | Branch ops, Notification |
| `inventory.hold.created` | Inventory | Order Command saga |
| `inventory.hold.released` | Inventory | Analytics |
| `pricing.snapshot.created` | Pricing | Order Command |
| `identity.role.granted` | Identity | Audit |
| `config.updated` | Configuration | All platforms (cache invalidate) |
| `audit.recorded` | Audit | Enterprise export |
| `workflow.task.created` | Workflow | Notification |
| `partner.order.received` | Partner | Order Command |
| `notification.delivered` | Notification | Analytics |
| `ai.action.executed` | AI Gateway | Audit |

*Full schema registry: owned by Event Platform ADR-019.*

---

## 9. Public SDK Catalog

| SDK | Status | Notes |
|-----|--------|-------|
| OrderSDK (read) | **Frozen v1.0** | Unchanged |
| SearchSDK | **Frozen v1.0** | Unchanged |
| BranchSDK | **Frozen v1.0** | Unchanged |
| DiscoverySDK | Foundation | Freeze after spine soak |
| LocationSDK | Foundation | Freeze after spine soak |
| ReferenceSDK | Library | Demote to package |
| EventSDK | **New spine** | |
| OrderCommandSDK | **New spine** | Write only |
| MenuSDK | **New spine** | |
| InventorySDK | **New spine** | |
| PricingSDK | **New spine** | |
| IdentitySDK | **New spine** | |
| NotificationSDK | **New spine** | |
| ConfigurationSDK | **New spine** | |
| AuditSDK | **New spine** | |
| WorkflowSDK | **New spine** | |
| PartnerSDK | **New spine** | Internal |
| AnalyticsSDK | **New spine** | |
| AIToolGatewaySDK | **New spine** | |
| PluginSDK | **New spine** | |

---

## 10. Repository Catalog

| Port | Owner platform | v1 adapter (conceptual) |
|------|----------------|-------------------------|
| EventStore | Event | Firestore/PubSub |
| Outbox | Event | Firestore |
| OrderCommandStore | Order Command | Firestore orders |
| MenuStore | Menu | Firestore menu subcollections |
| InventoryStore | Inventory | Firestore branch inventory |
| PricingStore | Pricing | Firestore price lists |
| IdentityStore | Identity | Firestore + IdP adapter |
| NotificationStore | Notification | Firestore + provider adapters |
| ConfigStore | Configuration | Firestore config |
| AuditStore | Audit | Append-only Firestore/BQ |
| WorkflowStore | Workflow | Firestore |
| GatewayConsumerStore | API Gateway | Firestore |
| PartnerStore | Partner | Firestore |
| WarehousePort | Analytics | BigQuery (future) |
| **Frozen repos** | M1–M5 | Unchanged ports; projection adapters added |

---

## 11. Recommended Implementation Order

| Phase | Milestone | Platforms |
|-------|-----------|-----------|
| **Spine 0** | M6-A | Event Platform ADR + Identity ADR + envelope standards |
| **Spine 1** | M6-B | Event Platform (outbox), Identity (shadow), Audit (shadow) |
| **Spine 2** | M7-A | Menu & Catalog (read projection + write) |
| **Spine 3** | M7-B | Pricing (quote shadow), Configuration (extract settings) |
| **Spine 4** | M8-A | Inventory (availability + holds) |
| **Spine 5** | M8-B | Order Command + Checkout saga |
| **Spine 6** | M9-A | Notification (event-driven) |
| **Spine 7** | M9-B | API Gateway + Partner (one aggregator pilot) |
| **Spine 8** | M10 | Analytics pipeline |
| **Spine 9** | M11 | Workflow (enterprise) |
| **Spine 10** | M12 | AI Tool Gateway |
| **Spine 11** | M13 | Plugin Platform |

**Parallel always:** Legacy burn-down per domain. Flag retirement per ADR.

**M1–M5:** No contract changes. Projection adapters only.

---

## 12. Migration Strategy (from current BhojanOS)

1. **Do not touch frozen SDK signatures.**  
2. **Introduce Event envelope** — shadow publish from legacy writes (no consumer dependency).  
3. **Menu projection** — build `BranchMenuProjection` from existing tenant menu; MenuSDK read behind flag.  
4. **Identity shadow** — log `Authorize` decisions without enforce.  
5. **Order Command** — idempotency wrapper on legacy create; then command path 1%.  
6. **OrderSDK read adapter** — switch internal adapter from direct Firestore to projection when parity proven.  
7. **Discovery/Search** — enrich from Menu projection instead of tenant scan fields.  
8. **Branch ops** — Inventory projection feeds operations adapter (BranchSDK contract unchanged).  
9. **Configuration extraction** — move delivery radii, prep times out of tenant blob.  
10. **Retire legacy** per domain after 30d soak with flag ON.

---

## 13. Legacy Retirement Strategy

| Legacy surface | Replacement | Retirement gate |
|----------------|-------------|-----------------|
| `api.ts` order create | OrderCommandSDK | 30d soak, idempotency proven |
| Tenant embedded menu | MenuSDK | Parity tests + owner soak |
| Tenant fee fields | PricingSDK | Quote shadow match |
| Inline notifications | NotificationSDK | Event consumer parity |
| Firebase-only authz | IdentitySDK RBAC | Enterprise pilot complete |
| Direct Firestore owner reads | Projections + SDKs | Lint guard zero violations |
| localStorage feature flags (prod) | ConfigurationSDK | Never in prod |
| Scan search repository | Search index ADR + projection | Index live |

**Rule:** Each domain has **one owner**, **one write path**, **one retirement date**.

---

## 14. Five-Year Architecture Roadmap

| Year | Focus |
|------|-------|
| **Y1** | Event + Identity + Menu + Order Command + Configuration extraction |
| **Y2** | Pricing + Inventory + Notification + API Gateway + Search index ADR + Analytics pipeline |
| **Y3** | Partner platform at scale + Workflow + AI Tool Gateway read-only + Plugin internal |
| **Y4** | Warehouse ML features + multi-region ADR + Plugin marketplace |
| **Y5** | Selective service extraction at proven bottlenecks only; global API tier |

---

## 15. Ten-Year Platform Vision

BhojanOS becomes **global commerce control plane for food operators**:

- **Event-native core** with regional OLTP adapters  
- **Frozen public APIs** at Gateway boundary (Shopify model)  
- **App ecosystem** (Toast/Square POS integrations)  
- **Aggregator hub** (Swiggy/Zomato patterns generalized)  
- **AI as supervised operator** on Tool Gateway (not on OLTP)  
- **Franchise-native** org hierarchy  
- **M1–M5 intelligence** as permanent ranking/search/assignment layer — fed by catalog projections, not raw scans  

Restaurants are the wedge. **Operators of physical commerce** are the platform.

---

## Architectural Laws (Spine — proposed ADR-018 bundle)

1. **All writes are commands** with idempotency keys (public boundary).  
2. **All state changes emit events** via outbox.  
3. **All reads at scale come from projections** — OLTP is not a query engine.  
4. **Frozen SDKs are not modified** — adapters evolve internally.  
5. **External world never calls internal SDKs** — API Gateway only.  
6. **AI never calls OLTP** — Tool Gateway + policy + audit.  
7. **Branch selection remains BranchSDK only** — Order Command stores snapshot.  
8. **Discovery ranks, Search finds, Branch assigns** — unchanged from M1–M5.  

---

## ADR Index (Spine program)

| ADR | Topic |
|-----|-------|
| ADR-018 | Event Platform |
| ADR-019 | Event schema versioning |
| ADR-020 | Outbox delivery guarantees |
| ADR-021 | Order Command vs Read |
| ADR-022 | Checkout saga |
| ADR-023 | Order FSM |
| ADR-024 | Menu & Catalog |
| ADR-025 | Branch menu override |
| ADR-026 | Menu migration |
| ADR-027 | Inventory |
| ADR-028 | Checkout holds |
| ADR-029 | Pricing |
| ADR-030 | India tax v1 |
| ADR-031 | Fee engine convergence |
| ADR-032 | Identity & Organization |
| ADR-033 | RBAC model |
| ADR-034 | Service accounts |
| ADR-035 | Notification |
| ADR-036 | India channels |
| ADR-037 | Configuration |
| ADR-038 | Tenant decomposition |
| ADR-039 | Audit |
| ADR-040 | Audit retention/GDPR |
| ADR-041 | Workflow |
| ADR-042 | API Gateway |
| ADR-043 | Public API versioning |
| ADR-044 | Webhook signing |
| ADR-045 | Partner Integration |
| ADR-046 | Aggregator ingress |
| ADR-047 | Analytics |
| ADR-048 | Warehouse |
| ADR-049 | AI Tool Gateway |
| ADR-050 | Human-in-the-loop AI |
| ADR-051 | Plugin platform |
| ADR-052 | Plugin sandbox |

*(ADR-017 Firestore branch migration remains separate — spine-compatible.)*

---

**End of blueprint.** Execution begins with ADR-018 (Event Platform) and ADR-032 (Identity) in parallel, then Menu — not another vertical read SDK certification.
