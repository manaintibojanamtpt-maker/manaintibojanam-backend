/**
 * EventSDK — stub projection worker (M6 PR-4).
 */

import type { ProjectionWorkerPort, ProjectionWorkerResult } from '../contracts/projectionPorts';
import type { EventEnvelope } from '../dto/EventEnvelope';
import type { SdkAsyncResult } from '../../core/result';
import { eventNotConfiguredAsync } from '../adapters/notConfigured';

const LAYER = 'StubProjectionWorker';

export class StubProjectionWorker implements ProjectionWorkerPort {
  process<TPayload>(_envelope: EventEnvelope<TPayload>): SdkAsyncResult<ProjectionWorkerResult> {
    return eventNotConfiguredAsync('process', LAYER);
  }
}

export function createStubProjectionWorker(): ProjectionWorkerPort {
  return new StubProjectionWorker();
}
