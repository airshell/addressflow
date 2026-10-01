import {
  ProviderCapabilities,
  ProviderSearchRequest,
  ProviderSearchResponse,
  ProviderResolveRequest,
  ProviderResolveResponse,
  ProviderReverseGeocodeRequest,
  ProviderReverseGeocodeResponse,
  CanonicalAddress,
} from '@addressflow/types';
import { BaseAddressProvider } from '@addressflow/provider-base';

export class MockAddressProvider extends BaseAddressProvider {
  public readonly name = 'mock';
  public searchCallCount = 0;
  public resolveCallCount = 0;
  public reverseCallCount = 0;
  public simulatedLatencyMs = 10;
  public shouldFail = false;

  public readonly capabilities: ProviderCapabilities = {
    supportsAutocomplete: true,
    supportsGeocoding: true,
    supportsReverseGeocoding: true,
    supportsPlaceDetails: true,
    supportsPersistentProviderIds: true,
    requiresAttribution: false,
    attributionRequirements: [],
    retentionPolicy: {
      canStoreApplicationDataPermanently: true,
      canStoreProviderIdentifiersPermanently: true,
      maxResponseCacheTtlSeconds: 86400,
    },
  };

  public async search(request: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    this.searchCallCount++;
    if (this.simulatedLatencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.simulatedLatencyMs));
    }
    if (this.shouldFail) {
      throw new Error('Simulated Mock Provider failure');
    }

    const country = request.countryCode ?? 'US';

    return {
      candidates: [
        {
          identifier: 'mock_place_101',
          formattedAddress: `${request.query}, Mock City, ${country}`,
          provider: 'mock',
          type: 'address',
          confidence: 0.95,
          location: { latitude: 37.7749, longitude: -122.4194 },
          components: {
            houseNumber: '101',
            street: 'Market St',
            city: 'Mock City',
            countryCode: country,
          },
        },
      ],
      rawLatencyMs: this.simulatedLatencyMs,
    };
  }

  public async resolve(request: ProviderResolveRequest): Promise<ProviderResolveResponse> {
    this.resolveCallCount++;
    if (this.simulatedLatencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.simulatedLatencyMs));
    }

    const address: CanonicalAddress = {
      id: `addr_${request.identifier}`,
      formattedAddress: `Resolved 101 Market St, Mock City, US`,
      components: {
        houseNumber: '101',
        street: 'Market St',
        city: 'Mock City',
        state: 'CA',
        postalCode: '94105',
        country: 'United States',
        countryCode: 'US',
      },
      location: { latitude: 37.7749, longitude: -122.4194 },
      source: 'provider',
      confidence: 1.0,
      providerReferences: [
        {
          provider: 'mock',
          type: 'place_id',
          identifier: request.identifier,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    return {
      address,
      rawLatencyMs: this.simulatedLatencyMs,
    };
  }

  public async reverseGeocode(request: ProviderReverseGeocodeRequest): Promise<ProviderReverseGeocodeResponse> {
    this.reverseCallCount++;
    const address: CanonicalAddress = {
      id: `addr_rev_${request.location.latitude}_${request.location.longitude}`,
      formattedAddress: `Reverse at ${request.location.latitude}, ${request.location.longitude}`,
      components: {
        city: 'Mock Reverse City',
        countryCode: 'US',
      },
      location: request.location,
      source: 'provider',
      confidence: 0.9,
    };

    return {
      addresses: [address],
      rawLatencyMs: this.simulatedLatencyMs,
    };
  }
}
