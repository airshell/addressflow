import { CanonicalAddress, GeoLocation, GeoBoundingBox, AddressComponents } from './address.js';

export interface AttributionRequirement {
  text: string;
  url?: string;
  logoUrl?: string;
  mustDisplay: boolean;
}

export interface RetentionPolicy {
  canStoreApplicationDataPermanently: boolean;
  canStoreProviderIdentifiersPermanently: boolean;
  maxResponseCacheTtlSeconds: number; // 0 = prohibited, otherwise TTL
}

export interface ProviderCapabilities {
  supportsAutocomplete: boolean;
  supportsGeocoding: boolean;
  supportsReverseGeocoding: boolean;
  supportsPlaceDetails: boolean;
  supportsPersistentProviderIds: boolean;
  requiresAttribution: boolean;
  attributionRequirements: AttributionRequirement[];
  retentionPolicy: RetentionPolicy;
}

export interface ProviderSearchRequest {
  query: string;
  countryCode?: string;
  countryCodes?: string[];
  boundingBox?: GeoBoundingBox;
  language?: string;
  limit?: number;
  sessionToken?: string;
}

export interface ProviderSearchCandidate {
  identifier: string;
  formattedAddress: string;
  components?: AddressComponents;
  location?: GeoLocation;
  confidence?: number;
  provider: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderSearchResponse {
  candidates: ProviderSearchCandidate[];
  attributions?: AttributionRequirement[];
  rawLatencyMs: number;
}

export interface ProviderResolveRequest {
  identifier: string;
  type?: string;
  sessionToken?: string;
  language?: string;
}

export interface ProviderResolveResponse {
  address: CanonicalAddress;
  attributions?: AttributionRequirement[];
  rawLatencyMs: number;
}

export interface ProviderReverseGeocodeRequest {
  location: GeoLocation;
  language?: string;
  limit?: number;
}

export interface ProviderReverseGeocodeResponse {
  addresses: CanonicalAddress[];
  attributions?: AttributionRequirement[];
  rawLatencyMs: number;
}

export interface ProviderHealth {
  provider: string;
  healthy: boolean;
  latencyMs?: number;
  errorRate?: number;
  lastCheckedAt: string;
  message?: string;
}

export interface AddressProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  search(request: ProviderSearchRequest): Promise<ProviderSearchResponse>;
  resolve(request: ProviderResolveRequest): Promise<ProviderResolveResponse>;
  reverseGeocode(request: ProviderReverseGeocodeRequest): Promise<ProviderReverseGeocodeResponse>;
  checkHealth(): Promise<ProviderHealth>;
}

export interface RoutingContext {
  projectId: string;
  queryType: 'search' | 'resolve' | 'reverse';
  countryCode?: string;
  language?: string;
  preferredProvider?: string;
}

export interface ProviderRouter {
  selectProvider(context: RoutingContext): Promise<AddressProvider>;
}
