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
import { MAPBOX_CAPABILITIES } from './policy.js';
import {
  mapMapboxFeatureToCandidate,
  mapMapboxFeatureToCanonical,
  MapboxFeature,
} from './mapper.js';

export interface MapboxProviderOptions {
  accessToken: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export class MapboxAddressProvider extends BaseAddressProvider {
  public readonly name = 'mapbox';
  public readonly capabilities: ProviderCapabilities = MAPBOX_CAPABILITIES;

  private accessToken: string;
  private baseUrl: string;
  private fetchFn: typeof fetch;

  constructor(options: MapboxProviderOptions) {
    super();
    this.accessToken = options.accessToken;
    this.baseUrl = (options.baseUrl ?? 'https://api.mapbox.com/geocoding/v5/mapbox.places').replace(/\/$/, '');
    this.fetchFn = options.fetchFn ?? fetch;
  }

  public async search(request: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    const startTime = Date.now();
    const encodedQuery = encodeURIComponent(request.query);
    const params = new URLSearchParams({
      access_token: this.accessToken,
      limit: String(request.limit ?? 5),
    });

    if (request.language) {
      params.set('language', request.language);
    }

    // Geographic Country Restriction injection
    if (request.countryCode) {
      params.set('country', request.countryCode.toLowerCase());
    } else if (request.countryCodes && request.countryCodes.length > 0) {
      params.set('country', request.countryCodes.map((c) => c.toLowerCase()).join(','));
    }

    const url = `${this.baseUrl}/${encodedQuery}.json?${params.toString()}`;

    const data = await withRetry(
      async () => {
        const res = await this.fetchFn(url);
        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 429) {
            throw new AddressFlowError('PROVIDER_RATE_LIMITED', 'Mapbox rate limit exceeded');
          }
          throw new AddressFlowError('PROVIDER_UNAVAILABLE', `Mapbox geocoding error (${res.status}): ${errText}`);
        }
        return (await res.json()) as { features?: MapboxFeature[] };
      },
      { maxRetries: 2 }
    );

    const candidates = (data.features ?? []).map(mapMapboxFeatureToCandidate);

    return {
      candidates,
      attributions: this.capabilities.attributionRequirements,
      rawLatencyMs: Date.now() - startTime,
    };
  }

  public async resolve(request: ProviderResolveRequest): Promise<ProviderResolveResponse> {
    const startTime = Date.now();
    const encodedId = encodeURIComponent(request.identifier);
    const params = new URLSearchParams({
      access_token: this.accessToken,
    });

    const url = `${this.baseUrl}/${encodedId}.json?${params.toString()}`;

    const data = await withRetry(
      async () => {
        const res = await this.fetchFn(url);
        if (!res.ok) {
          throw new AddressFlowError('PROVIDER_UNAVAILABLE', `Mapbox lookup error (${res.status})`);
        }
        return (await res.json()) as { features?: MapboxFeature[] };
      },
      { maxRetries: 2 }
    );

    if (!data.features || data.features.length === 0) {
      throw new AddressFlowError('NOT_FOUND', `Mapbox place not found for identifier ${request.identifier}`);
    }

    const address = mapMapboxFeatureToCanonical(data.features[0]);

    return {
      address,
      attributions: this.capabilities.attributionRequirements,
      rawLatencyMs: Date.now() - startTime,
    };
  }

  public async reverseGeocode(request: ProviderReverseGeocodeRequest): Promise<ProviderReverseGeocodeResponse> {
    const startTime = Date.now();
    const coords = `${request.location.longitude},${request.location.latitude}`;
    const params = new URLSearchParams({
      access_token: this.accessToken,
      limit: String(request.limit ?? 1),
    });

    if (request.language) {
      params.set('language', request.language);
    }

    const url = `${this.baseUrl}/${coords}.json?${params.toString()}`;

    const data = await withRetry(
      async () => {
        const res = await this.fetchFn(url);
        if (!res.ok) {
          throw new AddressFlowError('PROVIDER_UNAVAILABLE', `Mapbox reverse geocoding error (${res.status})`);
        }
        return (await res.json()) as { features?: MapboxFeature[] };
      },
      { maxRetries: 2 }
    );

    const addresses = (data.features ?? []).map(mapMapboxFeatureToCanonical);

    return {
      addresses,
      attributions: this.capabilities.attributionRequirements,
      rawLatencyMs: Date.now() - startTime,
    };
  }
}
