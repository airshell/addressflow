import { describe, it, expect, vi } from 'vitest';
import { MapboxAddressProvider } from '../src/mapbox-provider.js';

describe('MapboxAddressProvider', () => {
  it('searches places and applies country restrictions', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            id: 'address.12345',
            type: 'Feature',
            place_type: ['address'],
            relevance: 0.95,
            text: 'Residency Road',
            place_name: '12 Residency Road, Bangalore, Karnataka, India',
            address: '12',
            center: [77.5946, 12.9716],
            context: [
              { id: 'place.1', text: 'Bangalore' },
              { id: 'region.1', text: 'Karnataka', short_code: 'IN-KA' },
              { id: 'country.1', text: 'India', short_code: 'in' },
            ],
          },
        ],
      }),
    });

    const provider = new MapboxAddressProvider({
      accessToken: 'pk.test_mapbox_token',
      fetchFn: mockFetch as any,
    });

    const res = await provider.search({
      query: '12 Residency Road',
      countryCodes: ['IN'],
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('country=in'); // Verifies country constraint injection

    expect(res.candidates).toHaveLength(1);
    expect(res.candidates[0].formattedAddress).toContain('Residency Road');
    expect(res.candidates[0].components?.countryCode).toBe('IN');
    expect(res.attributions?.[0].text).toContain('Mapbox');
  });
});
