/**
 * Purpose: Pre-processes raw transcripts by cleaning punctuation, standardizing spacing,
 * and normalizing multi-lingual synonyms to a canonical English intent format.
 * 
 * Public API: TranscriptNormalizer class
 * Dependencies: None (pure utility)
 */

export class TranscriptNormalizer {
  // Mapping of synonymous phrases (across EN, TE, HI) to canonical backend terms.
  // Using a flat map where keys are lowercased phrases.
  private readonly synonymMap: Map<string, string>;

  constructor() {
    this.synonymMap = new Map<string, string>([
      // Order types
      ['parcel', 'takeaway'],
      ['to go', 'takeaway'],
      ['togo', 'takeaway'],
      
      // Checkout / Payment
      ['bill', 'checkout'],
      ['pay', 'checkout'],
      ['payment', 'checkout'],

      // Schedule delivery (canonicalize common ASAP phrases)
      ['right now', 'asap'],
      ['deliver now', 'asap'],
      ['delivery now', 'asap'],
      ['immediately', 'asap'],
      ['as soon as possible', 'asap'],
      
      // Cancellation
      ['cancel', 'cancelorder'],
      ['never mind', 'cancelorder'],
      ['nevermind', 'cancelorder'],
      ['leave it', 'cancelorder'],
      ['stop', 'cancelorder'],
      
      // Affirmations
      ['yes', 'yes'],
      ['yeah', 'yes'],
      ['correct', 'yes'],
      ['okay', 'yes'],
      ['ok', 'yes'],
      ['proceed', 'yes'],
      ['avunu', 'yes'], // Telugu
      ['haan', 'yes'], // Hindi
      ['han', 'yes'],
      
      // Negations
      ['no', 'no'],
      ['nope', 'no'],
      ['dont', 'no'],
      ['do not', 'no'],
      ['vaddu', 'no'], // Telugu
      ['oddu', 'no'], // Telugu
      ['nahi', 'no'], // Hindi
      ['na', 'no']
    ]);
  }

  /**
   * Normalizes the transcript by lowercasing, stripping punctuation, 
   * collapsing whitespace, and replacing known synonyms.
   */
  public normalize(transcript: string): string {
    if (!transcript) return '';

    // 1. Lowercase and remove punctuation (keep only alphanumeric and spaces)
    let cleaned = transcript
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '') // unicode-aware alphanumeric
      .replace(/\s+/g, ' ')
      .trim();

    // 2. Multi-word synonym replacement (greedy approach for exact phrase replacement)
    // Note: Since phrases can be multi-word (e.g. 'never mind'), we replace iteratively.
    // In a production system, an Aho-Corasick automaton would be faster, but this suffices for Phase 3.
    for (const [synonym, canonical] of this.synonymMap.entries()) {
      // Use word boundaries to avoid replacing substrings (e.g. replacing 'ok' inside 'look')
      const regex = new RegExp(`\\b${synonym}\\b`, 'g');
      cleaned = cleaned.replace(regex, canonical);
    }

    return cleaned;
  }
}
