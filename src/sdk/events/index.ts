/** EventSDK public barrel (M6 PR-2). */
export {
  createEventSDK,
  resolveEventEnabled,
  createEventPublisher,
  createEventSubscriber,
  createOutboxRepository,
  createReplayService,
  createReplayEngine,
  createEventStore,
  createSchemaRegistry,
  createEventInfrastructure,
} from './createEventSDK';
export type { EventInfrastructure, CreateEventInfrastructureOptions } from './adapters/EventInfrastructureFactory';
export type { EventSDK, EventHandler, EventSDKFactory } from './contracts/EventSDK';
export type { CreateEventSDKOptions } from './shared/options';
export * from './dto';
export * from './types';
export * from './contracts/ports';
export * from './contracts/infrastructurePorts';
export {
  EVENT_SDK_FEATURE_FLAG_DEFAULTS,
  EVENT_SDK_FEATURE_FLAG_ENV_KEYS,
  readEventFlagDefault,
} from './core/featureFlags';
export type { EventSdkFeatureFlag, EventFeatureFlagReader } from './core/featureFlags';
export { EVENT_PLATFORM_LAW, EVENT_PLATFORM_LAW_STATEMENTS } from './core/platformLaw';
export { validateEventEnvelope } from './validation/validateEventEnvelope';
export { validateSchemaCompatibility } from './validation/validateSchemaCompatibility';
export { validateVersionCompatibility } from './validation/validateVersionCompatibility';
export { validateAggregateConsistency } from './validation/validateAggregateConsistency';
export { validateRequiredMetadata } from './validation/validateRequiredMetadata';
export { enrichEventEnvelope } from './validation/enrichEventEnvelope';
export { EVENT_ERROR_CODES } from './errors/eventErrors';
export type { EventSdkErrorCode } from './errors/eventErrors';
export type { EventInfrastructureTelemetryHook, EventInfrastructureTelemetryEvent } from './telemetry/EventInfrastructureTelemetry';
export {
  createFirestoreOutboxPersistence,
  createFirestoreEventStore,
  createFirestoreDeadLetterStore,
  createFirestoreIdempotencyStore,
  createShadowPublisherFactory,
  createFirestorePersistenceBundle,
} from './persistence/FirestorePersistenceFactory';
export { createShadowPublisher } from './persistence/ShadowPublisher';
export { createMockFirestorePersistence } from './persistence/MockFirestorePersistence';
export type { FirestorePersistencePort } from './persistence/FirestorePersistencePort';
export type { EventPersistenceCollectionNames } from './persistence/collectionNames';
export { DEFAULT_EVENT_PERSISTENCE_COLLECTIONS } from './persistence/collectionNames';
export type { EventPersistenceTelemetryHook, EventPersistenceTelemetryEvent } from './persistence/PersistenceTelemetry';
export {
  createProjectionInfrastructure,
  createProjectionWorker,
  createProjectionRegistry,
  createProjectionDispatcher,
  createProjectionRunner,
  createProjectionRebuildEngine,
} from './projection/ProjectionInfrastructureFactory';
export type {
  ProjectionInfrastructure,
  CreateProjectionInfrastructureOptions,
} from './projection/ProjectionInfrastructureFactory';
export * from './contracts/projectionPorts';
export type {
  ProjectionTelemetryHook,
  ProjectionTelemetryEvent,
  ProjectionWorkerTelemetryHook,
  ProjectionWorkerTelemetryEvent,
} from './projection/ProjectionTelemetry';
export {
  createOrderShadowPublisherFactory,
  createOrderShadowPublisher,
  createOrderEventMapper,
  createOrderEventValidator,
  createOrderEventFactory,
} from './business/orders/createOrderShadowPublisher';
export type {
  OrderShadowPublisher,
  OrderShadowPublishOutcome,
} from './business/orders/OrderShadowPublisher';
export type { OrderEventTelemetryHook, OrderEventTelemetryEvent } from './business/orders/OrderEventTelemetry';
export {
  createProjectionRuntimeInfrastructure,
  createProjectionRuntime,
  createProjectionCoordinator,
  createProjectionPersistence,
} from './projection/runtime/ProjectionRuntimeFactory';
export type { ProjectionRuntimeInfrastructure } from './projection/runtime/ProjectionRuntimeFactory';
export * from './contracts/projectionRuntimePorts';
export type {
  ProjectionRuntimeTelemetryHook,
  ProjectionRuntimeTelemetryEvent,
} from './projection/runtime/ProjectionRuntimeTelemetry';
export {
  createOrderProjectionWorkerBundle,
  createOrderProjectionWorker,
  createOrderProjectionRepository,
  createOrderProjectionSnapshotStore,
} from './projections/order/createOrderProjectionWorker';
export type {
  OrderProjectionWorkerBundle,
  CreateOrderProjectionWorkerOptions,
} from './projections/order/createOrderProjectionWorker';
export type {
  OrderProjectionRepositoryPort,
  OrderProjectionSnapshotPort,
  OrderProjectionWorkerPort,
  OrderProjectionProcessResult,
} from './contracts/orderProjectionPorts';
export type {
  OrderProjectionTelemetryHook,
  OrderProjectionTelemetryEvent,
} from './projections/order/OrderProjectionTelemetry';
export {
  createOrderParityInfrastructure,
  createOrderParityValidator,
  createOrderParityComparator,
  createOrderParityReportRepository,
  InMemoryLegacyOrderReadPort,
  InMemoryProjectionOrderReadPort,
} from './parity/order/OrderParityFactory';
export type {
  OrderParityInfrastructure,
  CreateOrderParityInfrastructureOptions,
} from './parity/order/OrderParityFactory';
export type {
  LegacyOrderReadPort,
  ProjectionOrderReadPort,
  ParityReportRepositoryPort,
  OrderParityInfrastructurePort,
} from './contracts/orderParityPorts';
export type {
  OrderParityTelemetryHook,
  OrderParityTelemetryEvent,
} from './parity/order/OrderParityTelemetry';
export {
  createProjectionParitySoakInfrastructure,
  createProjectionParitySoakRunner,
  createProjectionParityAnalyzer,
  createProjectionParityCertificationRepository,
  createInMemoryParitySoakReportSource,
  InMemoryParitySoakReportSource,
} from './parity/soak/ProjectionParityFactory';
export type {
  ProjectionParitySoakInfrastructure,
  CreateProjectionParitySoakInfrastructureOptions,
} from './parity/soak/ProjectionParityFactory';
export type {
  ParitySoakReportSourcePort,
  ParityCertificationRepositoryPort,
  ProjectionParitySoakInfrastructurePort,
  ProjectionParitySoakRunResult,
} from './contracts/paritySoakPorts';
export type {
  ProjectionParitySoakTelemetryHook,
  ProjectionParitySoakTelemetryEvent,
} from './parity/soak/ProjectionParityTelemetry';
export {
  createProjectionOperationalInfrastructure,
  createProjectionOperationalValidator,
  createInMemoryProjectionOperationalSampleSource,
  createInMemoryProjectionOperationalRepository,
  createInMemoryProjectionLagRepository,
  createInMemoryProjectionHealthRepository,
} from './operations/ProjectionOperationalFactory';
export type {
  ProjectionOperationalInfrastructure,
  CreateProjectionOperationalInfrastructureOptions,
} from './operations/ProjectionOperationalFactory';
export type {
  ProjectionOperationalSampleSourcePort,
  ProjectionOperationalRepositoryPort,
  ProjectionLagRepositoryPort,
  ProjectionHealthRepositoryPort,
  ProjectionOperationalInfrastructurePort,
  ProjectionOperationalValidationResult,
  ProjectionOperationalHealthSnapshot,
} from './contracts/projectionOperationalPorts';
export type {
  ProjectionOperationalTelemetryHook,
  ProjectionOperationalTelemetryEvent,
} from './operations/ProjectionOperationalTelemetry';
