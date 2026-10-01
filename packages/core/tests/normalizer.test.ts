import { describe, it, expect } from 'vitest';
import { normalizeAddressQuery } from '../src/normalization/normalizer.js';

describe('AddressFlow Normalizer', () => {
  it('normalizes whitespace, punctuation, and abbreviations deterministically', () => {
    const raw1 = '12, Residency Rd., Bangalore, India';
    const raw2 = '12   Residency Road, Bangalore, India';

    const result1 = normalizeAddressQuery(raw1);
    const result2 = normalizeAddressQuery(raw2);

    expect(result1.value).toBe('12 residency rd bangalore india');
    expect(result2.value).toBe('12 residency rd bangalore india');
    expect(result1.hash).toBe(result2.hash);
    expect(result1.version).toBe('v1');
  });

  it('normalizes Unicode NFKC characters and case', () => {
    const fullWidth = '１２３　Ｍａｉｎ　Ｓｔｒｅｅｔ';
    const normalized = normalizeAddressQuery(fullWidth);
    expect(normalized.value).toBe('123 main st');
  });

  it('handles empty or malformed strings gracefully', () => {
    const res = normalizeAddressQuery('');
    expect(res.value).toBe('');
    expect(res.hash).toBeDefined();
  });

  it('appends country code tag when specified to prevent collision', () => {
    const resUS = normalizeAddressQuery('100 Main St', { countryCode: 'US' });
    const resCA = normalizeAddressQuery('100 Main St', { countryCode: 'CA' });

    expect(resUS.value).toBe('100 main st us');
    expect(resCA.value).toBe('100 main st ca');
    expect(resUS.hash).not.toBe(resCA.hash);
  });
});
