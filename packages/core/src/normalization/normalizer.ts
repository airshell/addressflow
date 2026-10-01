import { NormalizedQuery } from '@addressflow/types';
import { STREET_ABBREVIATIONS } from './abbreviations.js';
import { computeQueryHash } from './hasher.js';

export const NORMALIZATION_VERSION = 'v1';

export interface NormalizerOptions {
  version?: string;
  countryCode?: string;
}

/**
 * Deterministically normalizes address query strings:
 * 1. Unicode NFKC normalization
 * 2. Lowercase transformation
 * 3. Whitespace compaction and trimming
 * 4. Punctuation stripping (commas, periods, hash symbols)
 * 5. Common street and unit abbreviation expansion/canonicalization
 * 6. Deterministic versioned query hash generation
 */
export function normalizeAddressQuery(
  rawQuery: string,
  options: NormalizerOptions = {}
): NormalizedQuery {
  const version = options.version ?? NORMALIZATION_VERSION;

  if (!rawQuery || typeof rawQuery !== 'string') {
    return {
      raw: '',
      value: '',
      version,
      hash: computeQueryHash('', version),
    };
  }

  // 1. Unicode NFKC normalization
  let normalized = rawQuery.normalize('NFKC');

  // 2. Lowercase
  normalized = normalized.toLowerCase();

  // 3. Strip special punctuation (replace with spaces)
  normalized = normalized.replace(/[,.#/\\()[\]{}:;!?"'`~_|-]/g, ' ');

  // 4. Tokenize & standardize abbreviations
  const tokens = normalized
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => {
      return STREET_ABBREVIATIONS[token] ?? token;
    });

  let canonicalString = tokens.join(' ').trim();

  // If a specific country code is provided, append it to prevent multi-country collision
  if (options.countryCode) {
    const code = options.countryCode.trim().toUpperCase();
    if (code.length === 2 && !canonicalString.endsWith(code.toLowerCase())) {
      canonicalString = `${canonicalString} ${code.toLowerCase()}`;
    }
  }

  const hash = computeQueryHash(canonicalString, version);

  return {
    raw: rawQuery,
    value: canonicalString,
    version,
    hash,
  };
}
