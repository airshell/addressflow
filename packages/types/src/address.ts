export type AddressSource = 'application' | 'provider' | 'user';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface GeoBoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface AddressComponents {
  houseNumber?: string;
  unit?: string;
  building?: string;
  street?: string;
  neighborhood?: string;
  locality?: string;
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string; // ISO 3166-1 alpha-2, e.g., 'US', 'IN', 'GB'
}

export interface ProviderReference {
  provider: string; // e.g., 'google', 'nominatim', 'mapbox'
  type: string;     // e.g., 'place_id', 'osm_id'
  identifier: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface CanonicalAddress {
  id: string;
  formattedAddress: string;
  components: AddressComponents;
  location?: GeoLocation;
  boundingBox?: GeoBoundingBox;
  confidence?: number; // 0.0 to 1.0
  source: AddressSource;
  providerReferences?: ProviderReference[];
  normalizedQueryHash?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NormalizedQuery {
  raw: string;
  value: string;
  version: string;
  hash: string;
}
