/**
 * Platform tier controls Firestore-heavy client telemetry.
 * Prod defaults to "free" (Spark-safe) unless VITE_PLATFORM_TIER=standard.
 */
export type PlatformTier = "free" | "standard";

export const PlatformTierConfig = {
  getTier(): PlatformTier {
    const explicit = import.meta.env.VITE_PLATFORM_TIER;
    if (explicit === "standard") return "standard";
    if (explicit === "free") return "free";
    if (import.meta.env.PROD) return "free";
    return "standard";
  },

  isFreeTier(): boolean {
    return this.getTier() === "free";
  },

  enableClientTelemetry(): boolean {
    return this.getTier() === "standard";
  },
};
