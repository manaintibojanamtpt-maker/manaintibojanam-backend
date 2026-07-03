/**
 * India Reference Data Bundle — schema types (M2 PR-4).
 * Aligns with ReferenceSDK DTOs + optional alias support.
 */

export const INDIA_REFERENCE_BUNDLE_VERSION = '2026.07' as const;

export interface ReferenceBundleManifest {
  readonly bundleVersion: typeof INDIA_REFERENCE_BUNDLE_VERSION;
  readonly schemaVersion: 1;
  readonly countryCode: 'IN';
  readonly generatedAt: string;
  readonly description: string;
  readonly entityCounts: ReferenceBundleEntityCounts;
}

export interface ReferenceBundleEntityCounts {
  readonly countries: number;
  readonly states: number;
  readonly districts: number;
  readonly cities: number;
  readonly localities: number;
  readonly pincodes: number;
  readonly aliasEntries: number;
}

/** Optional display-name aliases (e.g. Bengaluru ↔ Bangalore). */
export interface ReferenceBundleAliases {
  readonly aliases?: readonly string[];
}

export interface ReferenceBundleCountry extends ReferenceBundleAliases {
  readonly id: string;
  readonly officialCode: string;
  readonly displayName: string;
  readonly parentId: null;
  readonly active: boolean;
  readonly kind: 'country';
  readonly isoCode: 'IN';
}

export interface ReferenceBundleState extends ReferenceBundleAliases {
  readonly id: string;
  readonly officialCode: string;
  readonly displayName: string;
  readonly parentId: string;
  readonly active: boolean;
  readonly kind: 'state';
  readonly administrationType: 'state' | 'union_territory';
}

export interface ReferenceBundleDistrict extends ReferenceBundleAliases {
  readonly id: string;
  readonly officialCode: string;
  readonly displayName: string;
  readonly parentId: string;
  readonly active: boolean;
  readonly kind: 'district';
}

export interface ReferenceBundleCity extends ReferenceBundleAliases {
  readonly id: string;
  readonly officialCode: string;
  readonly displayName: string;
  readonly parentId: string;
  readonly active: boolean;
  readonly kind: 'city';
}

export interface ReferenceBundleLocality extends ReferenceBundleAliases {
  readonly id: string;
  readonly officialCode: string;
  readonly displayName: string;
  readonly parentId: string;
  readonly active: boolean;
  readonly kind: 'locality';
}

export interface ReferenceBundlePincode extends ReferenceBundleAliases {
  readonly id: string;
  readonly officialCode: string;
  readonly displayName: string;
  readonly parentId: string;
  readonly active: boolean;
  readonly kind: 'pincode';
  readonly postalCode: string;
}

export interface IndiaReferenceBundle {
  readonly manifest: ReferenceBundleManifest;
  readonly country: ReferenceBundleCountry;
  readonly states: readonly ReferenceBundleState[];
  readonly districts: readonly ReferenceBundleDistrict[];
  readonly cities: readonly ReferenceBundleCity[];
  readonly localities: readonly ReferenceBundleLocality[];
  readonly pincodes: readonly ReferenceBundlePincode[];
}

export type ReferenceBundleEntity =
  | ReferenceBundleCountry
  | ReferenceBundleState
  | ReferenceBundleDistrict
  | ReferenceBundleCity
  | ReferenceBundleLocality
  | ReferenceBundlePincode;

export type ReferenceBundleEntityList =
  | ReferenceBundleState[]
  | ReferenceBundleDistrict[]
  | ReferenceBundleCity[]
  | ReferenceBundleLocality[]
  | ReferenceBundlePincode[];
