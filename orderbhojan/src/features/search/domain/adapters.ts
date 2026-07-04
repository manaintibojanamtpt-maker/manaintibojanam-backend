/** Future hook: typo normalization before search execution. */
export interface TypoToleranceAdapter {
  normalize(query: string): string;
}

export const passthroughTypoAdapter: TypoToleranceAdapter = {
  normalize: (query) => query.trim(),
};

/** Future hook: synonym expansion for search queries. */
export interface SynonymAdapter {
  expand(query: string): readonly string[];
}

export const passthroughSynonymAdapter: SynonymAdapter = {
  expand: (query) => [query.trim()],
};
