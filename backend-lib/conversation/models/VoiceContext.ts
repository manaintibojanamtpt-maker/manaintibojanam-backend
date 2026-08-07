/**
 * Purpose: Contextual parameters for the acoustic/UI environment and user settings.
 * Public API: VoiceContext interface
 * Dependencies: MenuCatalogItem (optional menu injection)
 * Consumers: ConversationEngine
 */

import type { MenuCatalogItem } from '../workflow/intent/extractors/MenuFoodItemExtractor.js';

export interface VoiceContext {
  readonly clientPlatform: 'web' | 'android' | 'ios' | 'unknown';
  readonly preferredLanguage?: string;
  readonly backgroundNoiseLevel?: number; // scale 0-1
  readonly deviceCapabilities?: {
    readonly supportsNativeSTT: boolean;
    readonly supportsNativeTTS: boolean;
  };
  /** Tenant / restaurant for session create + cart plans. */
  readonly tenantId?: string;
  readonly restaurantId?: string;
  /** Menu catalog for FoodItem extraction this turn. */
  readonly menu?: readonly MenuCatalogItem[];
  /** When true (default), create session if missing. */
  readonly ensureSession?: boolean;
}
