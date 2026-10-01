import { CanonicalAddress, ProviderSearchCandidate, AddressComponents } from '@addressflow/types';

export interface GooglePlaceSuggestion {
  placePrediction?: {
    placeId: string;
    text: { text: string };
    structuredFormat?: {
      mainText?: { text: string };
      secondaryText?: { text: string };
    };
    types?: string[];
  };
}

export interface GooglePlaceDetail {
  id: string;
  formattedAddress?: string;
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
  }>;
  location?: {
    latitude: number;
    longitude: number;
  };
  viewport?: {
    low?: { latitude: number; longitude: number };
    high?: { latitude: number; longitude: number };
  };
}

export interface GoogleGeocodeResult {
  place_id: string;
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry: {
    location: { lat: number; lng: number };
    viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
}

export function mapGoogleComponents(
  components: Array<{ longText?: string; long_name?: string; shortText?: string; short_name?: string; types: string[] }>
): AddressComponents {
  const result: AddressComponents = {};

  for (const c of components) {
    const long = c.longText ?? c.long_name ?? '';
    const short = c.shortText ?? c.short_name ?? '';
    const types = c.types;

    if (types.includes('street_number')) result.houseNumber = long;
    else if (types.includes('route')) result.street = long;
    else if (types.includes('subpremise')) result.unit = long;
    else if (types.includes('premise')) result.building = long;
    else if (types.includes('sublocality') || types.includes('sublocality_level_1')) result.locality = long;
    else if (types.includes('neighborhood')) result.neighborhood = long;
    else if (types.includes('locality')) result.city = long;
    else if (types.includes('administrative_area_level_2')) result.district = long;
    else if (types.includes('administrative_area_level_1')) result.state = short || long;
    else if (types.includes('postal_code')) result.postalCode = long;
    else if (types.includes('country')) {
      result.country = long;
      result.countryCode = (short || long).toUpperCase();
    }
  }

  return result;
}

export function mapGooglePlaceDetailToCanonical(detail: GooglePlaceDetail): CanonicalAddress {
  const components = mapGoogleComponents(detail.addressComponents ?? []);

  const canonical: CanonicalAddress = {
    id: `addr_goog_${detail.id}`,
    formattedAddress: detail.formattedAddress ?? '',
    components,
    location: detail.location
      ? { latitude: detail.location.latitude, longitude: detail.location.longitude }
      : undefined,
    source: 'provider',
    confidence: 1.0,
    providerReferences: [
      {
        provider: 'google',
        type: 'place_id',
        identifier: detail.id,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  if (detail.viewport?.low && detail.viewport?.high) {
    canonical.boundingBox = {
      south: detail.viewport.low.latitude,
      north: detail.viewport.high.latitude,
      west: detail.viewport.low.longitude,
      east: detail.viewport.high.longitude,
    };
  }

  return canonical;
}

export function mapGoogleGeocodeToCanonical(result: GoogleGeocodeResult): CanonicalAddress {
  const components = mapGoogleComponents(result.address_components ?? []);

  const canonical: CanonicalAddress = {
    id: `addr_goog_${result.place_id}`,
    formattedAddress: result.formatted_address,
    components,
    location: {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
    },
    source: 'provider',
    confidence: 0.98,
    providerReferences: [
      {
        provider: 'google',
        type: 'place_id',
        identifier: result.place_id,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  if (result.geometry.viewport) {
    canonical.boundingBox = {
      south: result.geometry.viewport.southwest.lat,
      north: result.geometry.viewport.northeast.lat,
      west: result.geometry.viewport.southwest.lng,
      east: result.geometry.viewport.northeast.lng,
    };
  }

  return canonical;
}

export function mapGoogleSuggestionToCandidate(suggestion: GooglePlaceSuggestion): ProviderSearchCandidate {
  const pred = suggestion.placePrediction;
  if (!pred) {
    throw new Error('Malformed Google suggestion payload');
  }

  return {
    identifier: pred.placeId,
    formattedAddress: pred.text.text,
    provider: 'google',
    type: 'place_id',
    confidence: 0.95,
  };
}
