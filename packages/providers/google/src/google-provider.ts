import {
  ProviderCapabilities,
  ProviderSearchRequest,
  ProviderSearchResponse,
  ProviderResolveRequest,
  ProviderResolveResponse,
  ProviderReverseGeocodeRequest,
  ProviderReverseGeocodeResponse,
} from '@addressflow/types';
import { AddressFlowError } from '@addressflow/core';
import { BaseAddressProvider, withRetry } from '@addressflow/provider-base';
import { GOOGLE_MAPS_CAPABILITIES } from './policy.js';
import {
  mapGooglePlaceDetailToCanonical,
  mapGoogleGeocodeToCanonical,
  mapGoogleSuggestionToCandidate,
  GooglePlaceSuggestion,
  GooglePlaceDetail,
  GoogleGeocodeResult,
} from './mapper.js';

export interface GoogleProviderOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
}

export class GoogleAddressProvider extends BaseAddressProvider {
  public readonly name = 'google';
  public readonly capabilities: ProviderCapabilities = GOOGLE_MAPS_CAPABILITIES;

  private apiKey: string;
  private fetchFn: typeof fetch;

  constructor(options: GoogleProviderOptions) {
    super();
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  public async search(request: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    const startTime = Date.now();

    // Use Google Places API (New): https://places.googleapis.com/v1/places:autocomplete
    const body: Record<string, unknown> = {
      input: request.query,
    };

    if (request.sessionToken) {
      body.sessionToken = request.sessionToken;
    }

    if (request.language) {
      body.languageCode = request.language;
    }

    // Geographic boundary cost-prevention: inject includedRegionCodes
    const regions: string[] = [];
    if (request.countryCode) {
      regions.push(request.countryCode.toUpperCase());
    }
    if (request.countryCodes) {
      for (const c of request.countryCodes) {
        if (!regions.includes(c.toUpperCase())) {
          regions.push(c.toUpperCase());
        }
      }
    }
    // Google Places (New) supports max 5 region codes
    if (regions.length > 0) {
      body.includedRegionCodes = regions.slice(0, 5);
    }

    const data = await withRetry(
      async () => {
        const res = await this.fetchFn('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 429) {
            throw new AddressFlowError('PROVIDER_RATE_LIMITED', 'Google Places rate limit exceeded');
          }
          throw new AddressFlowError('PROVIDER_UNAVAILABLE', `Google Places API error (${res.status}): ${errText}`);
        }

        return (await res.json()) as { suggestions?: GooglePlaceSuggestion[] };
      },
      { maxRetries: 2 }
    );

    const candidates = (data.suggestions ?? []).map(mapGoogleSuggestionToCandidate);

    return {
      candidates,
      attributions: this.capabilities.attributionRequirements,
      rawLatencyMs: Date.now() - startTime,
    };
  }

  public async resolve(request: ProviderResolveRequest): Promise<ProviderResolveResponse> {
    const startTime = Date.now();

    // Google Places (New) Place Details: https://places.googleapis.com/v1/places/{id}
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(request.identifier)}`;
    const headers: Record<string, string> = {
      'X-Goog-Api-Key': this.apiKey,
      'X-Goog-FieldMask': 'id,formattedAddress,addressComponents,location,viewport',
    };

    if (request.sessionToken) {
      headers['X-Goog-Session-Token'] = request.sessionToken;
    }

    const detail = await withRetry(
      async () => {
        const res = await this.fetchFn(url, { headers });

        if (!res.ok) {
          if (res.status === 404) {
            throw new AddressFlowError('NOT_FOUND', `Google Place ID not found: ${request.identifier}`);
          }
          throw new AddressFlowError('PROVIDER_UNAVAILABLE', `Google Places details error: ${res.status}`);
        }

        return (await res.json()) as GooglePlaceDetail;
      },
      { maxRetries: 2 }
    );

    const address = mapGooglePlaceDetailToCanonical(detail);

    return {
      address,
      attributions: this.capabilities.attributionRequirements,
      rawLatencyMs: Date.now() - startTime,
    };
  }

  public async reverseGeocode(request: ProviderReverseGeocodeRequest): Promise<ProviderReverseGeocodeResponse> {
    const startTime = Date.now();
    const latlng = `${request.location.latitude},${request.location.longitude}`;
    const params = new URLSearchParams({
      latlng,
      key: this.apiKey,
    });

    if (request.language) {
      params.set('language', request.language);
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;

    const data = await withRetry(
      async () => {
        const res = await this.fetchFn(url);
        if (!res.ok) {
          throw new AddressFlowError('PROVIDER_UNAVAILABLE', `Google Geocoding API HTTP error: ${res.status}`);
        }
        return (await res.json()) as { status: string; results?: GoogleGeocodeResult[]; error_message?: string };
      },
      { maxRetries: 2 }
    );

    if (data.status === 'ZERO_RESULTS' || !data.results || data.results.length === 0) {
      return {
        addresses: [],
        attributions: this.capabilities.attributionRequirements,
        rawLatencyMs: Date.now() - startTime,
      };
    }

    if (data.status !== 'OK') {
      throw new AddressFlowError('PROVIDER_UNAVAILABLE', `Google Geocoding API status: ${data.status} - ${data.error_message}`);
    }

    const addresses = data.results.map(mapGoogleGeocodeToCanonical);

    return {
      addresses,
      attributions: this.capabilities.attributionRequirements,
      rawLatencyMs: Date.now() - startTime,
    };
  }
}
