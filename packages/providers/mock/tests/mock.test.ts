import { describe, it, expect } from 'vitest';
import { MockAddressProvider } from '../src/mock-provider.js';

describe('MockAddressProvider', () => {
  it('implements search, resolve, and reverseGeocode contracts', async () => {
    const provider = new MockAddressProvider();
    provider.simulatedLatencyMs = 0;

    const searchRes = await provider.search({ query: '123 Market St', countryCode: 'US' });
    expect(searchRes.candidates).toHaveLength(1);

    const resolveRes = await provider.resolve({ identifier: 'mock_place_101' });
    expect(resolveRes.address.formattedAddress).toContain('Market St');

    const revRes = await provider.reverseGeocode({ location: { latitude: 37.77, longitude: -122.41 } });
    expect(revRes.addresses).toHaveLength(1);
  });
});
