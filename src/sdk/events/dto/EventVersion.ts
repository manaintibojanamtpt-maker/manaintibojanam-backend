/** Semantic version string for event payload schemas (e.g. "1.0.0"). */
export type EventVersion = string;

export interface EventVersionInfo {
  readonly version: EventVersion;
  readonly deprecated?: boolean;
  readonly supersededBy?: EventVersion;
}
