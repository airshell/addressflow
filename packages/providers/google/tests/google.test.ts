import { describe, it, expect, vi } from 'vitest';
import { GoogleAddressProvider } from '../src/google-provider.js';

describe('GoogleAddressProvider (Places New & Geocoding)', () => {
  it('searches Places New autocomplete and injects includedRegionCodes', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          {
            placePrediction: {
              placeId: 'ChIJbU60yGQWrjsR4E9-AWtpAq8',
              text: { text: '12 Residency Rd, Ashok Nagar, Bengaluru, Karnataka, India' },
            },
          },
        ],
      }),
    });

    const provider = new GoogleAddressProvider({
      apiKey: 'test-google-key',
      fetchFn: mockFetch as any,
    });

    const response = await provider.search({
      query: '12 Residency Road',
      countryCodes: ['IN'],
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const postBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(postBody.includedRegionCodes).toEqual(['IN']);

    expect(response.candidates).toHaveLength(1);
    expect(response.candidates[0].identifier).toBe('ChIJbU60yGQWrjsR4E9-AWtpAq8');
    expect(response.attributions?.[0].text).toBe('Powered by Google');
  });
});
