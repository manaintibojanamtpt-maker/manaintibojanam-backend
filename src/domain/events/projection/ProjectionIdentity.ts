/**
 * Projection domain — identity validation (pure, M6 PR-4).
 */

import type { ProjectionIdentity } from '../shared/ProjectionIdentityTypes';

export function projectionIdentityKey(identity: ProjectionIdentity): string {
  return `${identity.projectionName}@${identity.projectionVersion}@${identity.consumerGroup}`;
}

export function validateProjectionIdentity(identity: ProjectionIdentity): readonly string[] {
  const errors: string[] = [];
  if (!identity.projectionName) errors.push('projectionName is required');
  if (!identity.projectionVersion) errors.push('projectionVersion is required');
  if (!identity.consumerGroup) errors.push('consumerGroup is required');
  if (!identity.ownerPlatform) errors.push('ownerPlatform is required');
  if (!identity.checkpointStrategy) errors.push('checkpointStrategy is required');
  return errors;
}

export function isValidProjectionIdentity(identity: ProjectionIdentity): boolean {
  return validateProjectionIdentity(identity).length === 0;
}

export function isDuplicateProjectionIdentity(
  existing: readonly ProjectionIdentity[],
  candidate: ProjectionIdentity
): boolean {
  const key = projectionIdentityKey(candidate);
  return existing.some((e) => projectionIdentityKey(e) === key);
}

export function assertUniqueProjectionIdentity(
  existing: readonly ProjectionIdentity[],
  candidate: ProjectionIdentity
): readonly string[] {
  if (isDuplicateProjectionIdentity(existing, candidate)) {
    return [`Duplicate ProjectionIdentity: ${projectionIdentityKey(candidate)}`];
  }
  return [];
}
