/**
 * SearchSDK — repository factory (M4 PR-3).
 */

import {
  readSearchFlagDefault,
  type SearchFeatureFlagReader,
} from '../core/featureFlags';
import type { SearchRepository } from './SearchRepository';
import type { FirestoreSearchPort } from './FirestoreSearchPort';
import { createFirestoreSearchRepository } from './FirestoreSearchRepository';
import { createSearchRepositoryAdapter } from './SearchRepositoryAdapter';
import { createStubSearchRepository } from './adapters/StubSearchRepository';

export interface CreateSearchRepositoryOptions {
  readonly firestoreSearchPort?: FirestoreSearchPort;
  readonly featureFlags?: SearchFeatureFlagReader;
  readonly repository?: SearchRepository;
}

export function resolveSearchRepositoryEnabled(
  options?: CreateSearchRepositoryOptions
): boolean {
  const readFlag: SearchFeatureFlagReader = options?.featureFlags ?? readSearchFlagDefault;
  return readFlag('FF_SEARCH_REPOSITORY_ENABLED');
}

export function createSearchRepository(options: CreateSearchRepositoryOptions = {}): SearchRepository {
  if (options.repository) {
    return options.repository;
  }

  if (!resolveSearchRepositoryEnabled(options) || !options.firestoreSearchPort) {
    return createStubSearchRepository();
  }

  const firestoreRepository = createFirestoreSearchRepository(options.firestoreSearchPort);
  return createSearchRepositoryAdapter(firestoreRepository);
}

export { createStubSearchRepository } from './adapters/StubSearchRepository';
