import {
  AddressProvider,
  ProviderCapabilities,
  ProviderSearchRequest,
  ProviderSearchResponse,
  ProviderResolveRequest,
  ProviderResolveResponse,
  ProviderReverseGeocodeRequest,
  ProviderReverseGeocodeResponse,
  ProviderHealth,
} from '@addressflow/types';

export abstract class BaseAddressProvider implements AddressProvider {
  public abstract readonly name: string;
  public abstract readonly capabilities: ProviderCapabilities;

  public abstract search(request: ProviderSearchRequest): Promise<ProviderSearchResponse>;
  public abstract resolve(request: ProviderResolveRequest): Promise<ProviderResolveResponse>;
  public abstract reverseGeocode(request: ProviderReverseGeocodeRequest): Promise<ProviderReverseGeocodeResponse>;

  public async checkHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      // Basic ping/search health check with a known stable query
      await this.search({ query: 'London', limit: 1 });
      const latencyMs = Date.now() - startTime;
      return {
        provider: this.name,
        healthy: true,
        latencyMs,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        provider: this.name,
        healthy: false,
        latencyMs: Date.now() - startTime,
        lastCheckedAt: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Unknown provider error',
      };
    }
  }
}
