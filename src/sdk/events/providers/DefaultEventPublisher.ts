/** @deprecated PR-1 — re-exports from adapters (M6 PR-2) */
export {
  createDefaultEventPublisher as createEventPublisher,
  createEventPublisher as createEventPublisherFromFactory,
} from '../adapters/DefaultEventPublisher';
export { DefaultEventPublisher } from '../adapters/DefaultEventPublisher';
export type { CreateDefaultEventPublisherOptions as CreateEventPublisherOptions } from '../adapters/DefaultEventPublisher';
