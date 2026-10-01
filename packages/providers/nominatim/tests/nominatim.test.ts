import { describe, it, expect, vi } from 'vitest';
import { NominatimAddressProvider } from '../src/nominatim-provider.js';

describe('NominatimAddressProvider (100% Free / Open Source)', () => {
  it('searches addresses and normalizes Nominatim JSON with attribution', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          place_id: 123456,
          osm_id: 987654,
          osm_type: 'way',
          display_name: '12, Residency Road, Shanthala Nagar, Bangalore, Karnataka, 560025, India',
          lat: '12.9716',
          lon: '77.5946',
          importance: 0.92,
          address: {
            house_number: '12',
            road: 'Residency Road',
            suburb: 'Shanthala Nagar',
            city: 'Bangalore',
            state: 'Karnataka',
            postcode: '560025',
            country: 'India',
            country_code: 'in',
          },
        },
      ],
    });

    const provider = new NominatimAddressProvider({ fetchFn: mockFetch as any });
    const response = await provider.search({
      query: '12 Residency Road Bangalore',
      countryCode: 'IN',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('countrycodes=in'); // Enforces country constraints!

    expect(response.candidates).toHaveLength(1);
    expect(response.candidates[0].formattedAddress).toContain('Residency Road');
    expect(response.candidates[0].components?.countryCode).toBe('IN');
    expect(response.attributions?.[0].text).toContain('OpenStreetMap contributors');
  });
});
