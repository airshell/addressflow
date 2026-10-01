import { CanonicalAddress } from './address.js';
import { AttributionRequirement } from './provider.js';

export interface SearchAddressRequestDto {
  query: string;
  countryCode?: string;
  language?: string;
  sessionToken?: string;
  limit?: number;
}

export interface ResolveAddressRequestDto {
  identifier: string;
  provider?: string;
  sessionToken?: string;
  language?: string;
}

export interface ReverseGeocodeRequestDto {
  latitude: number;
  longitude: number;
  language?: string;
  limit?: number;
}

export interface ApiResponseMeta {
  requestId: string;
  source: 'application' | 'provider' | 'coalesced' | 'guard';
  provider?: string;
  coalesced: boolean;
  latencyMs: number;
  attributions?: AttributionRequirement[];
}

export interface AddressSearchResponseDto {
  data: CanonicalAddress[];
  meta: ApiResponseMeta;
}

export interface AddressResolveResponseDto {
  data: CanonicalAddress;
  meta: ApiResponseMeta;
}

export interface AddressReverseResponseDto {
  data: CanonicalAddress[];
  meta: ApiResponseMeta;
}
