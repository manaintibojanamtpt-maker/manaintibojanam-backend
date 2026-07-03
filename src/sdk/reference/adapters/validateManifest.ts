/**
 * ReferenceSDK — manifest validation before cache warm.
 */

import type { IndiaReferenceBundle } from '../../../data/reference/india/schema';
import { INDIA_REFERENCE_BUNDLE_VERSION } from '../../../data/reference/india/schema';

export interface ManifestValidationIssue {
  readonly code: string;
  readonly message: string;
}

export function validateReferenceBundleManifest(
  bundle: IndiaReferenceBundle
): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = [];
  const { manifest } = bundle;

  if (manifest.bundleVersion !== INDIA_REFERENCE_BUNDLE_VERSION) {
    issues.push({
      code: 'MANIFEST_VERSION_MISMATCH',
      message: `Expected bundleVersion ${INDIA_REFERENCE_BUNDLE_VERSION}, got ${manifest.bundleVersion}`,
    });
  }

  if (manifest.schemaVersion !== 1) {
    issues.push({
      code: 'MANIFEST_SCHEMA_UNSUPPORTED',
      message: `Unsupported schemaVersion ${manifest.schemaVersion}`,
    });
  }

  if (manifest.countryCode !== 'IN') {
    issues.push({
      code: 'MANIFEST_COUNTRY_UNSUPPORTED',
      message: `Expected countryCode IN, got ${manifest.countryCode}`,
    });
  }

  const counts = manifest.entityCounts;
  if (counts.states !== bundle.states.length) {
    issues.push({
      code: 'MANIFEST_COUNT_MISMATCH',
      message: `states count ${counts.states} != loaded ${bundle.states.length}`,
    });
  }
  if (counts.districts !== bundle.districts.length) {
    issues.push({
      code: 'MANIFEST_COUNT_MISMATCH',
      message: `districts count ${counts.districts} != loaded ${bundle.districts.length}`,
    });
  }
  if (counts.cities !== bundle.cities.length) {
    issues.push({
      code: 'MANIFEST_COUNT_MISMATCH',
      message: `cities count ${counts.cities} != loaded ${bundle.cities.length}`,
    });
  }
  if (counts.localities !== bundle.localities.length) {
    issues.push({
      code: 'MANIFEST_COUNT_MISMATCH',
      message: `localities count ${counts.localities} != loaded ${bundle.localities.length}`,
    });
  }
  if (counts.pincodes !== bundle.pincodes.length) {
    issues.push({
      code: 'MANIFEST_COUNT_MISMATCH',
      message: `pincodes count ${counts.pincodes} != loaded ${bundle.pincodes.length}`,
    });
  }
  if (counts.countries !== 1) {
    issues.push({
      code: 'MANIFEST_COUNT_MISMATCH',
      message: `countries count must be 1, manifest declares ${counts.countries}`,
    });
  }

  return issues;
}

export function assertValidReferenceBundleManifest(bundle: IndiaReferenceBundle): void {
  const issues = validateReferenceBundleManifest(bundle);
  if (issues.length > 0) {
    throw new Error(
      `Reference bundle manifest validation failed:\n${issues.map((i) => i.message).join('\n')}`
    );
  }
}
