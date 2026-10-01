import { describe, it, expect, vi } from 'vitest';
import { AddressFlowClient } from '../src/addressflow-client.js';

describe('AddressFlowClient SDK', () => {
  it('dispatches search request with Bearer authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'addr_1', formattedAddress: '12 Residency Rd, Bangalore' }],
        meta: { requestId: 'req_1', source: 'provider', coalesced: false, latencyMs: 25 },
      }),
    });

    const client = new AddressFlowClient({
      apiKey: 'af_live_secret123',
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as any,
    });

    const result = await client.address.search({ query: 'Residency Rd', countryCode: 'IN' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/v1/address/search');
    expect(init.headers['Authorization']).toBe('Bearer af_live_secret123');
    expect(result.data).toHaveLength(1);
  });
});
