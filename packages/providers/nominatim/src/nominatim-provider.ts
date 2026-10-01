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
import { NOMINATIM_CAPABILITIES } from './policy.js';
import { mapNominatimToCandidate, mapNominatimToCanonical, NominatimRawItem } from './mapper.js';

export interface NominatimProviderOptions {
  baseUrl?: string;
  userAgent?: string;
  fetchFn?: typeof fetch;
}

export class NominatimAddressProvider extends BaseAddressProvider {
  public readonly name = 'nominatim';
  public readonly capabilities: ProviderCapabilities = NOMINATIM_CAPABILITIES;

  private baseUrl: string;
  private userAgent: string;
  private fetchFn: typeof fetch;

  constructor(options: NominatimProviderOptions = {}) {
    super();
    this.baseUrl = (options.baseUrl ?? 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
    this.userAgent = options.userAgent ?? 'AddressFlow/0.1.0 (https://addressflow.dev)';
    this.fetchFn = options.fetchFn ?? fetch;
  }

  public async search(request: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    const startTime = Date.now();
    const params = new URLSearchParams({
      q: request.query,
      format: 'json',
      addressdetails: '1',
      limit: String(request.limit ?? 5),
    });

    if (request.language) {
      params.set('accept-language', request.language);
    }

    // Geographic Country Restriction injection (cost-prevention / scope enforcement)
    if (request.countryCode) {
      params.set('countrycodes', request.countryCode.toLowerCase());
    } else if (request.countryCodes && request.countryCodes.length > 0) {
      params.set('countrycodes', request.countryCodes.map((c) => c.toLowerCase()).join(','));
    }

    const url = `${this.baseUrl}/search?${params.toString()}`;

    const data = await withRetry(
      async () => {
        const res = await this.fetchFn(url, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          throw new AddressFlowError('PROVIDER_UNAVAILABLE', `Nominatim HTTP error ${res.status}: ${res.statusText}`);
        }

        return (await res.json()) as NominatimRawItem[];
      },
      { maxRetries: 2 }
    );

    const candidates = Array.isArray(data) ? data.map(mapNominatimToCandidate) : [];

    return {
      candidates,
      attributions: this.capabilities.attributionRequirements,
      rawLatencyMs: Date.now() - startTime,
    };
  }

  public async resolve(request: ProviderResolveRequest): Promise<ProviderResolveResponse> {
    const startTime = Date.now();
    // In Nominatim, lookup details via /lookup?osm_ids=R12345,W12345 or /details
    const params = new URLSearchParams({
      osm_ids: request.type ? `${request.type[0].toUpperCase()}${request.identifier}` : `N${request.identifier}`,
      format: 'json',
      addressdetails: '1',
    });

    const url = `${this.baseUrl}/lookup?${params.toString()}`;

    const data = await withRetry(
      async () => {
        const res = await this.fetchFn(url, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          throw new AddressFlowError('PROVIDER_UNAVAILABLE', `Nominatim lookup HTTP error ${res.status}`);
        }

        return (await res.json()) as NominatimRawItem[];
      },
      { maxRetries: 2 }
    );

    if (!Array.isArray(data) || data.length === 0) {
      throw new AddressFlowError('NOT_FOUND', `Address not found in Nominatim for identifier ${request.identifier}`);
    }

    const address = mapNominatimToCanonical(data[0]);

    return {
      address,
      attributions: this.capabilities.attributionRequirements,
      rawLatencyMs: Date.now() - startTime,
    };
  }

  public async reverseGeocode(request: ProviderReverseGeocodeRequest): Promise<ProviderReverseGeocodeResponse> {
    const startTime = Date.now();
    const params = new URLSearchParams({
      lat: String(request.location.latitude),
      lon: String(request.location.longitude),
      format: 'json',
      addressdetails: '1',
    });

    if (request.language) {
      params.set('accept-language', request.language);
    }

    const url = `${this.baseUrl}/reverse?${params.toString()}`;

    const item = await withRetry(
      async () => {
        const res = await this.fetchFn(url, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          throw new AddressFlowError('PROVIDER_UNAVAILABLE', `Nominatim reverse HTTP error ${res.status}`);
        }

        return (await res.json()) as NominatimRawItem;
      },
      { maxRetries: 2 }
    );

    const address = mapNominatimToCanonical(item);

    return {
      addresses: [address],
      attributions: this.capabilities.attributionRequirements,
      rawLatencyMs: Date.now() - startTime,
    };
  }
}
