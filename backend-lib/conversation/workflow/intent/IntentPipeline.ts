/**
 * Purpose: Pure orchestration of normalize → extract entities → resolve intent.
 * Public API: IntentPipeline, createDefaultIntentPipeline
 * Dependencies: TranscriptNormalizer, EntityResolver, IntentResolver, rules, extractors
 * Consumers: Future workflow / ConversationEngine wiring (not yet)
 *
 * Non-goals: Session mutation, LLM calls, ConversationEngine integration.
 */

import type { ConversationEntity } from '../../models/ConversationEntity.js';
import type { IntentResolutionResult } from './IntentResolutionResult.js';
import type { IntentResolutionContext } from './IntentRule.js';
import type { MenuCatalogItem } from './extractors/MenuFoodItemExtractor.js';
import { TranscriptNormalizer } from './TranscriptNormalizer.js';
import { EntityResolver } from './EntityResolver.js';
import { IntentResolver } from './IntentResolver.js';
import { IntentRuleRegistry } from './IntentRuleRegistry.js';
import { RegexQuantityExtractor } from './extractors/RegexQuantityExtractor.js';
import { MenuFoodItemExtractor } from './extractors/MenuFoodItemExtractor.js';
import { GreetingRule } from './rules/GreetingRule.js';
import { ConfirmationRule } from './rules/ConfirmationRule.js';
import { CancelRule } from './rules/CancelRule.js';
import { CheckoutRule } from './rules/CheckoutRule.js';
import { AddItemRule } from './rules/AddItemRule.js';
import { FallbackRule } from './rules/FallbackRule.js';

export interface IntentPipelineInput {
  readonly rawTranscript: string;
  readonly context?: IntentResolutionContext;
}

export interface IntentPipelineResult extends IntentResolutionResult {
  readonly extractedEntities: readonly ConversationEntity[];
}

export class IntentPipeline {
  constructor(
    private readonly normalizer: TranscriptNormalizer,
    private readonly entityResolver: EntityResolver,
    private readonly intentResolver: IntentResolver,
  ) {}

  /**
   * Runs the deterministic intent pipeline on a raw user utterance.
   */
  public run(input: IntentPipelineInput): IntentPipelineResult {
    const normalizedTranscript = this.normalizer.normalize(input.rawTranscript);
    const extractedEntities = this.entityResolver.extract(normalizedTranscript);
    const resolution = this.intentResolver.resolve(
      normalizedTranscript,
      input.context,
      extractedEntities,
    );

    return {
      ...resolution,
      extractedEntities,
    };
  }
}

export interface CreateDefaultIntentPipelineOptions {
  /** Injected restaurant/menu catalog for FoodItem matching. Empty = no food matches. */
  readonly menu?: readonly MenuCatalogItem[];
}

/**
 * Builds the standard Phase-3 rule + extractor stack.
 * Safe to construct in tests or gateway adapters without touching ConversationEngine.
 */
export function createDefaultIntentPipeline(
  options: CreateDefaultIntentPipelineOptions = {},
): IntentPipeline {
  const registry = new IntentRuleRegistry();
  registry.register(new GreetingRule());
  registry.register(new ConfirmationRule());
  registry.register(new CancelRule());
  registry.register(new CheckoutRule());
  registry.register(new AddItemRule());
  registry.register(new FallbackRule());

  const extractors = [
    new RegexQuantityExtractor(),
    new MenuFoodItemExtractor(options.menu ?? []),
  ];

  return new IntentPipeline(
    new TranscriptNormalizer(),
    new EntityResolver(extractors),
    new IntentResolver(registry),
  );
}
